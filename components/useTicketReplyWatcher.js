// components/useTicketReplyWatcher.js
//
// App-wide "looks live without websockets" watcher for support tickets. Mount it
// ONCE, inside the logged-in shell (app/appLayout/_layout.jsx), so it runs for
// the whole authenticated session and unmounts on logout. It polls for new
// SUPPORT replies and:
//   • Any open ticket that gains a staff reply → info toast (tap → open it).
//   • The ticket whose detail screen is open (registered via
//     setActiveWatchedTicket) is refreshed silently — fresh data is pushed
//     straight into its query cache, no toast, no extra request.
//
// It is deliberately frugal so leaving the app open doesn't hammer the backend:
//   1. GATED  — if there are NO open tickets it only does a light list-check
//               heartbeat (IDLE_MS); the expensive per-ticket detail calls only
//               happen when at least one ticket is open.
//   2. PAUSED — while the app is backgrounded (AppState) it stops entirely, and
//               does one immediate catch-up fetch when it returns to foreground.
//   3. BACKOFF— with an open-but-quiet ticket the cadence relaxes ACTIVE→…→MAX,
//               and snaps back to ACTIVE the moment a reply lands, the app
//               foregrounds, or the user engages (pokeTicketWatcher).
//
// Closed tickets are never polled.
import { useEffect } from 'react';
import { AppState } from 'react-native';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import { getTickets, getTicketDetail } from 'api/support';
import {
  TICKET_POLL_ACTIVE_MS,
  TICKET_POLL_MAX_MS,
  TICKET_POLL_IDLE_MS,
} from 'config/backendConfig';
import { navigateTo } from 'app/navigate';

// ── Module-level state (survives navigation; one watcher instance only) ────────

// Map<ticketId, signature-of-latest-staff-reply> — our "already seen" baseline.
const seenReplies = new Map();

// The ticket whose detail screen is currently open. Set by ticketDetail so the
// watcher refreshes it inline instead of toasting about a chat you're viewing.
let activeTicketId = null;

// The running watcher registers a "kick" here so other screens can force an
// immediate cycle + reset the backoff (e.g. after sending a reply / creating a
// ticket). Null when no watcher is mounted.
let kickWatcher = null;

/** Called by the ticket detail screen on focus/blur. */
export function setActiveWatchedTicket(id) {
  activeTicketId = id ? String(id) : null;
}

/** Force an immediate poll and reset the backoff to the fast cadence. */
export function pokeTicketWatcher() {
  if (kickWatcher) kickWatcher();
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isWatchable(status) {
  return String(status || '').toUpperCase() !== 'CLOSED';
}

// Signature of the newest SUPPORT reply on a ticket. The user's own (CUSTOMER)
// messages are ignored, so this only changes when staff actually reply.
function staffReplySignature(messages) {
  if (!Array.isArray(messages)) return 'none';
  const staff = messages.filter((m) => String(m?.senderType || '').toUpperCase() !== 'CUSTOMER');
  if (staff.length === 0) return 'none';
  const last = staff[staff.length - 1];
  return `${staff.length}:${last?.id ?? last?.createdAt ?? ''}`;
}

export function useTicketReplyWatcher() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;
    let running = false;
    // Current backoff delay while open tickets exist (starts fast).
    let activeDelay = TICKET_POLL_ACTIVE_MS;

    const clearTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const schedule = (delay) => {
      clearTimer();
      if (cancelled) return;
      timeoutId = setTimeout(runCycle, delay);
    };

    // One poll. Returns nothing; it reschedules itself with the next delay.
    const runCycle = async () => {
      if (cancelled) return;
      // Never poll while backgrounded — the AppState listener resumes us.
      if (AppState.currentState !== 'active') return;
      if (running) return;
      running = true;

      let nextDelay = TICKET_POLL_IDLE_MS;
      try {
        const listRes = await getTickets({ page: 0, size: 30 });
        if (cancelled || !listRes?.ok) return;

        const open = (listRes.data?.data?.content ?? []).filter((t) => isWatchable(t?.status));

        if (open.length === 0) {
          // Nothing open → cheap heartbeat, no detail calls, reset backoff.
          activeDelay = TICKET_POLL_ACTIVE_MS;
          nextDelay = TICKET_POLL_IDLE_MS;
          return;
        }

        // Pull each open ticket's conversation in parallel.
        const details = await Promise.all(
          open.map(async (t) => {
            const res = await getTicketDetail(t.id);
            return res?.ok ? { summary: t, ticket: res.data?.data ?? null } : null;
          })
        );
        if (cancelled) return;

        const activeId = activeTicketId;
        let sawChange = false;

        for (const entry of details) {
          if (!entry?.ticket) continue;
          const { summary, ticket } = entry;
          const id = summary.id;
          const sig = staffReplySignature(ticket.messages);
          const hadBefore = seenReplies.has(id);
          const prev = seenReplies.get(id);
          seenReplies.set(id, sig);

          // The chat the user is currently viewing: keep it live silently.
          if (String(id) === String(activeId)) {
            queryClient.setQueryData(['ticket', String(id)], ticket);
            continue;
          }

          // First time we've seen this ticket → record baseline, don't toast.
          if (!hadBefore) continue;

          // A brand-new support reply landed on some other ticket.
          if (prev !== sig && sig !== 'none') {
            sawChange = true;
            const name =
              ticket.subject?.trim() ||
              summary.subject?.trim() ||
              summary.ticketNumber ||
              'Your ticket';

            queryClient.setQueryData(['ticket', String(id)], ticket);
            queryClient.invalidateQueries({ queryKey: ['tickets'] });

            Toast.show({
              type: 'info',
              text1: 'New reply',
              text2: `Ticket "${name}" has been replied to.`,
              visibilityTime: 5000,
              onPress: () => {
                Toast.hide();
                navigateTo('ticketDetail', { id });
              },
            });
          }
        }

        // Snap back to fast on any change; otherwise relax toward MAX.
        activeDelay = sawChange
          ? TICKET_POLL_ACTIVE_MS
          : Math.min(activeDelay * 2, TICKET_POLL_MAX_MS);
        nextDelay = activeDelay;
      } catch (_e) {
        // Background poll — swallow and try again on the next tick.
      } finally {
        running = false;
        if (!cancelled) schedule(nextDelay);
      }
    };

    // Force an immediate cycle at the fast cadence (user engaged / new ticket).
    const kick = () => {
      if (cancelled || AppState.currentState !== 'active') return;
      activeDelay = TICKET_POLL_ACTIVE_MS;
      schedule(0);
    };
    kickWatcher = kick;

    // Pause in background; catch up immediately on return to foreground.
    const onAppStateChange = (state) => {
      if (state === 'active') {
        activeDelay = TICKET_POLL_ACTIVE_MS;
        schedule(0);
      } else {
        clearTimer();
      }
    };
    const sub = AppState.addEventListener('change', onAppStateChange);

    // First run.
    schedule(0);

    return () => {
      cancelled = true;
      clearTimer();
      sub.remove();
      if (kickWatcher === kick) kickWatcher = null;
    };
  }, [queryClient]);
}

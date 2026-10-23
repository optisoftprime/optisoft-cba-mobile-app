// screens/TicketDetail.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import {
  KeyboardAvoidingView,
  KeyboardController,
  KeyboardEvents,
  AndroidSoftInputModes,
} from 'react-native-keyboard-controller';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Header from 'components/header';
import EmptyState from 'components/EmptyState';
import { navigateBack } from 'app/navigate';
import { useTheme } from 'config/ThemeContext';
import { getTicketDetail, replyToTicket, closeTicket } from 'api/support';
import { setActiveWatchedTicket, pokeTicketWatcher } from 'components/useTicketReplyWatcher';
import { getUser } from 'config/storage';

// Small breathing gap kept between the composer and the keyboard (WhatsApp-like).
const KEYBOARD_GAP = 10;

// ─── Status / priority styling (kept local — small + display-only) ────────────
// Semantic hues come from the theme's status tokens (status `bg` / `fg` are
// class names; priority returns a real colour because it also tints an icon).
// Only the label is localised via the passed t().

function statusStyle(status, t) {
  switch (String(status || '').toUpperCase()) {
    case 'OPEN':
      return { bg: 'bg-info-soft', fg: 'text-on-info-soft', label: t('tickets.statusOpen') };
    case 'IN_PROGRESS':
    case 'IN PROGRESS':
      return {
        bg: 'bg-warning-soft',
        fg: 'text-on-warning-soft',
        label: t('tickets.statusInProgress'),
      };
    case 'RESOLVED':
      return {
        bg: 'bg-success-soft',
        fg: 'text-on-success-soft',
        label: t('tickets.statusResolved'),
      };
    case 'CLOSED':
      return { bg: 'bg-card-muted', fg: 'text-ink-muted', label: t('tickets.statusClosed') };
    default:
      return {
        bg: 'bg-card-muted',
        fg: 'text-ink-muted',
        label: status || t('tickets.statusUnknown'),
      };
  }
}

function priorityStyle(priority, t, colors) {
  switch (String(priority || '').toUpperCase()) {
    case 'LOW':
      return { fg: colors.success, label: t('tickets.priorityLow') };
    case 'MEDIUM':
      return { fg: colors.info, label: t('tickets.priorityMedium') };
    case 'HIGH':
      return { fg: colors.warning, label: t('tickets.priorityHigh') };
    case 'CRITICAL':
      return { fg: colors.danger, label: t('tickets.priorityCritical') };
    default:
      return { fg: colors.inkMuted, label: priority || '—' };
  }
}

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return (
    d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short' }) +
    ', ' +
    d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
}

// ─── Full-screen image viewer ─────────────────────────────────────────────────
// Conditionally mounted only while an image is selected (Fabric-safe — an
// always-mounted Modal crashes navigation transitions on the New Architecture).

function ImageViewerModal({ uri, onClose }) {
  const { colors } = useTheme();
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        {/* Photo-viewer scrim — near-black in both themes. */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: colors.black,
            opacity: 0.92,
          }}
        />
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={1}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 48,
            right: 20,
            width: 40,
            height: 40,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="close" size={22} color={colors.ink} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message, onRetry, onImagePress }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  // CUSTOMER messages are the ticket owner (align right); anything else is
  // support/staff (align left). Optimistic (not-yet-sent) messages are always
  // the customer's and carry a _localStatus of 'sending' | 'failed'.
  const isCustomer = String(message.senderType || '').toUpperCase() === 'CUSTOMER';
  const localStatus = message._localStatus; // undefined for server messages
  const failed = localStatus === 'failed';
  const sending = localStatus === 'sending';

  // Customer bubble is brand-coloured with on-primary text; staff bubble uses
  // the themed card surface with ink text.
  const bubbleColor = isCustomer ? colors.primary : colors.card;
  const textColor = isCustomer ? colors.onPrimary : colors.ink;
  const metaColor = isCustomer ? colors.onPrimary : colors.inkSoft;
  const metaOpacity = isCustomer ? 0.75 : 1;

  const Wrapper = failed ? TouchableOpacity : View;
  const wrapperProps = failed ? { onPress: () => onRetry?.(message), activeOpacity: 0.8 } : {};

  return (
    <Wrapper
      {...wrapperProps}
      style={{
        alignSelf: isCustomer ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        marginBottom: 12,
        opacity: sending ? 0.75 : 1,
      }}>
      {!isCustomer && message.senderName ? (
        <Text style={{ fontSize: 11, color: colors.inkMuted, marginBottom: 3, marginLeft: 4 }}>
          {message.senderName}
        </Text>
      ) : null}

      <View
        style={{
          backgroundColor: bubbleColor,
          borderRadius: 18,
          borderTopRightRadius: isCustomer ? 4 : 18,
          borderTopLeftRadius: isCustomer ? 18 : 4,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderWidth: isCustomer ? 0 : 1,
          borderColor: failed ? colors.danger : colors.line,
        }}>
        {message.imageUrl ? (
          <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress?.(message.imageUrl)}>
            <Image
              source={{ uri: message.imageUrl }}
              style={{
                width: 200,
                height: 140,
                borderRadius: 12,
                marginBottom: message.messageBody ? 8 : 0,
              }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ) : null}

        {message.messageBody ? (
          <Text style={{ color: textColor, fontSize: 14, lineHeight: 20 }}>
            {message.messageBody}
          </Text>
        ) : null}

        {/* Footer: sending / failed / timestamp */}
        {sending ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              marginTop: 5,
            }}>
            <Ionicons
              name="time-outline"
              size={11}
              color={metaColor}
              style={{ opacity: metaOpacity }}
            />
            <Text style={{ color: metaColor, opacity: metaOpacity, fontSize: 10, marginLeft: 3 }}>
              {t('tickets.sending')}
            </Text>
          </View>
        ) : failed ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              marginTop: 5,
            }}>
            <Ionicons name="alert-circle" size={11} color={textColor} />
            <Text style={{ color: textColor, fontSize: 10, marginLeft: 3, fontWeight: '600' }}>
              {t('tickets.notSentRetry')}
            </Text>
          </View>
        ) : (
          <Text
            style={{
              color: metaColor,
              opacity: metaOpacity,
              fontSize: 10,
              marginTop: 5,
              textAlign: 'right',
            }}>
            {formatWhen(message.createdAt)}
          </Text>
        )}
      </View>
    </Wrapper>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TicketDetail() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const ticketId = params?.id;
  const queryClient = useQueryClient();
  const listRef = useRef(null); // message list — used to auto-scroll to bottom
  const initialScrollDone = useRef(false); // first scroll jumps instantly, later ones animate

  const [replyText, setReplyText] = useState('');
  const [replyImageUri, setReplyImageUri] = useState('');
  const [replyImageBase64, setReplyImageBase64] = useState('');
  const [closing, setClosing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [viewerImage, setViewerImage] = useState(null); // uri shown full-screen
  const [manualRefreshing, setManualRefreshing] = useState(false); // pull-to-refresh only

  // Optimistic (WhatsApp-style) outgoing messages that haven't been confirmed
  // by the server yet. Each: { id, senderType:'CUSTOMER', messageBody, imageUrl,
  // _base64, createdAt, _localStatus:'sending'|'failed' }.
  const [pending, setPending] = useState([]);

  useEffect(() => {
    async function loadPhone() {
      const user = await getUser();
      if (user?.mobilePhone) setPhoneNumber(user.mobilePhone);
    }
    loadPhone();
  }, []);

  // Only THIS screen switches Android to adjustResize (so the WhatsApp-style
  // shrink-and-float behaviour works); the app default stays `pan`. Restore the
  // default on blur so every other screen keeps its original keyboard handling.
  useFocusEffect(
    useCallback(() => {
      KeyboardController.setInputMode(AndroidSoftInputModes.SOFT_INPUT_ADJUST_RESIZE);
      return () => KeyboardController.setDefaultMode();
    }, [])
  );

  const {
    data: ticket,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['ticket', String(ticketId)],
    enabled: !!ticketId,
    queryFn: async () => {
      const res = await getTicketDetail(ticketId);
      if (!res?.ok) throw new Error(res?.message || 'Failed to load ticket');
      return res.data?.data ?? null;
    },
    staleTime: 0,
  });

  // The app-wide reply watcher (mounted in appLayout) does the polling. Register
  // this ticket as "active" while the screen is focused so the watcher refreshes
  // it inline (pushing fresh data into this query's cache) instead of toasting
  // about a chat the user is already looking at. Poke it on focus so it catches
  // up immediately and resets its backoff to the fast cadence.
  useFocusEffect(
    useCallback(() => {
      setActiveWatchedTicket(ticketId);
      pokeTicketWatcher();
      return () => setActiveWatchedTicket(null);
    }, [ticketId])
  );

  const isClosed = String(ticket?.status || '').toUpperCase() === 'CLOSED';

  // Server messages + still-unsent optimistic ones, in order.
  const allMessages = useMemo(() => {
    const serverMsgs = Array.isArray(ticket?.messages) ? ticket.messages : [];
    return [...serverMsgs, ...pending];
  }, [ticket, pending]);

  // Reliable "open at the latest message". Once the ticket + its messages have
  // loaded, jump to the bottom. We retry over a few frames because bubbles with
  // images finish laying out slightly after the first render, so a single early
  // scroll lands short of the true bottom. onContentSizeChange (below) then keeps
  // it pinned as new messages arrive.
  useEffect(() => {
    if (!ticket || allMessages.length === 0 || initialScrollDone.current) return;
    const timers = [80, 250, 500].map((delay) =>
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), delay)
    );
    initialScrollDone.current = true;
    return () => timers.forEach(clearTimeout);
  }, [ticket, allMessages.length]);

  // WhatsApp behaviour: when the keyboard opens, keep the latest message in view.
  // The list shrinks as the keyboard rises, so we scroll to the bottom once the
  // show animation finishes (and once more a frame later, after the resize
  // settles) so the newest message sits just above the composer.
  useEffect(() => {
    const sub = KeyboardEvents.addListener('keyboardDidShow', () => {
      listRef.current?.scrollToEnd({ animated: true });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    });
    return () => sub.remove();
  }, []);

  // Pull-to-refresh. Uses its own flag so the spinner shows only on a manual
  // pull, not on the 30s background poll. refetch() is deduped by React Query,
  // so this is safe even if a poll or a post-reply refetch is already running.
  const onPullRefresh = async () => {
    setManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setManualRefreshing(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      setReplyImageUri(asset.uri);
      setReplyImageBase64(asset.base64 ?? '');
    }
  };

  // Fire the actual reply request for a given optimistic message. On success we
  // refetch (server truth) then drop the optimistic copy; on failure we keep it
  // marked 'failed' so the user can tap to retry.
  const attemptSend = async (msg) => {
    setPending((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, _localStatus: 'sending' } : m))
    );
    try {
      const res = await replyToTicket(ticketId, {
        message: msg.messageBody ?? '',
        imageUrl: msg._base64 ?? '',
        phoneNumber,
      });
      if (res.ok) {
        await refetch();
        setPending((prev) => prev.filter((m) => m.id !== msg.id));
      } else {
        setPending((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, _localStatus: 'failed' } : m))
        );
      }
    } catch (error) {
      setPending((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, _localStatus: 'failed' } : m))
      );
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim() && !replyImageBase64) {
      Toast.show({
        type: 'error',
        text1: t('tickets.emptyReplyTitle'),
        text2: t('tickets.emptyReplyMessage'),
      });
      return;
    }
    const msg = {
      id: `local-${Date.now()}`,
      senderType: 'CUSTOMER',
      senderName: 'You',
      messageBody: replyText.trim(),
      imageUrl: replyImageUri || '', // local uri for inline preview
      _base64: replyImageBase64 || '', // what actually gets sent
      createdAt: new Date().toISOString(),
      _localStatus: 'sending',
    };
    // Append immediately and clear the composer (WhatsApp-style).
    setPending((prev) => [...prev, msg]);
    setReplyText('');
    setReplyImageUri('');
    setReplyImageBase64('');
    attemptSend(msg);
    // User is actively chatting — keep the watcher on its fast cadence so any
    // staff reply shows up promptly.
    pokeTicketWatcher();
  };

  const handleRetry = (msg) => {
    if (msg._localStatus === 'sending') return;
    attemptSend(msg);
  };

  const doCloseTicket = async () => {
    setClosing(true);
    try {
      const res = await closeTicket(ticketId);
      if (res.ok) {
        Toast.show({
          type: 'success',
          text1: t('tickets.ticketClosedTitle'),
          text2: t('tickets.ticketClosedMessage'),
        });
        await refetch();
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
      } else {
        Toast.show({
          type: 'error',
          text1: t('tickets.closeFailedTitle'),
          text2: res.message || t('tickets.closeFailedMessage'),
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('tickets.closeFailedTitle'),
        text2: error?.message || t('tickets.closeFailedMessage'),
      });
    } finally {
      setClosing(false);
    }
  };

  const handleCloseTicket = () => {
    Alert.alert(t('tickets.closeAlertTitle'), t('tickets.closeAlertMessage'), [
      { text: t('tickets.cancel'), style: 'cancel' },
      { text: t('tickets.closeTicketButton'), style: 'destructive', onPress: doCloseTicket },
    ]);
  };

  // ── Loading / error ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('tickets.ticketFallback')} onLeftPress={navigateBack} showLeftIcon />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (isError || !ticket) {
    return (
      <View className="flex-1 bg-background">
        <Header title={t('tickets.ticketFallback')} onLeftPress={navigateBack} showLeftIcon />
        <EmptyState
          title={t('tickets.loadErrorTitle')}
          subtitle={t('tickets.loadErrorSubtitle')}
          iconName="alert-circle-outline"
        />
        <TouchableOpacity
          onPress={refetch}
          className="mx-auto mt-2 rounded-xl bg-primary px-5 py-3">
          <Text className="text-sm font-semibold text-on-primary">{t('tickets.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const s = statusStyle(ticket.status, t);
  const p = priorityStyle(ticket.priority, t, colors);

  // Ticket info card + "Conversation" label sit above the message list.
  const ListHeader = (
    <View>
      <View className="mt-2 rounded-2xl border border-line bg-card p-4">
        <View className="flex-row items-start justify-between">
          <Text className="flex-1 pr-3 text-base font-bold text-ink">
            {ticket.subject?.trim() || t('tickets.untitledTicket')}
          </Text>
          <View className={`rounded-full px-2.5 py-1 ${s.bg}`}>
            <Text className={`text-[11px] font-bold ${s.fg}`}>{s.label}</Text>
          </View>
        </View>

        <View className="mt-3 flex-row flex-wrap items-center">
          {ticket.categoryName ? (
            <View className="mr-3 flex-row items-center">
              <Ionicons name="pricetag-outline" size={13} color={colors.inkSoft} />
              <Text className="ml-1 text-xs text-ink-muted">{ticket.categoryName}</Text>
            </View>
          ) : null}
          <View className="mr-3 flex-row items-center">
            <Ionicons name="flag-outline" size={13} color={p.fg} />
            <Text className="ml-1 text-xs font-semibold" style={{ color: p.fg }}>
              {p.label}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={13} color={colors.inkSoft} />
            <Text className="ml-1 text-xs text-ink-muted">{formatWhen(ticket.createdAt)}</Text>
          </View>
        </View>
      </View>

      <Text className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {t('tickets.conversation')}
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      {/* Header stays fixed — only the list + composer live inside the
          keyboard-avoiding area, so the list shrinks (WhatsApp-style) while the
          header holds its place. */}
      <Header
        title={ticket.ticketNumber || t('tickets.ticketFallback')}
        onLeftPress={navigateBack}
        showLeftIcon
        size="text-lg"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={KEYBOARD_GAP}>
        <FlatList
          ref={listRef}
          className="flex-1"
          data={allMessages}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => (
            <MessageBubble message={item} onRetry={handleRetry} onImagePress={setViewerImage} />
          )}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <Text className="text-sm text-ink-soft">{t('tickets.noMessages')}</Text>
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // Keep pinned to the newest message as content grows (new messages,
          // images finishing layout). Instant until the initial open-scroll has
          // run, animated afterwards. The initial jump itself is owned by the
          // useEffect above (with retries) — this only reads the flag.
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: initialScrollDone.current })
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={manualRefreshing}
              onRefresh={onPullRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />

        {/* ── Reply composer / closed banner ──────────────────────────────────── */}
        {isClosed ? (
          <View className="flex-row items-center justify-center border-t border-line bg-card px-4 py-4">
            <Ionicons name="lock-closed-outline" size={16} color={colors.inkMuted} />
            <Text className="ml-2 text-sm text-ink-muted">{t('tickets.ticketClosedBanner')}</Text>
          </View>
        ) : (
          <View className="border-t border-line bg-card px-3 pb-3 pt-2">
            {/* Attached image preview */}
            {replyImageUri ? (
              <View className="mb-2 flex-row items-center">
                <Image
                  source={{ uri: replyImageUri }}
                  style={{ width: 44, height: 44, borderRadius: 10 }}
                />
                <TouchableOpacity
                  onPress={() => {
                    setReplyImageUri('');
                    setReplyImageBase64('');
                  }}
                  className="ml-2"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={20} color={colors.inkSoft} />
                </TouchableOpacity>
                <Text className="ml-2 text-xs text-ink-soft">{t('tickets.imageAttached')}</Text>
              </View>
            ) : null}

            <View className="flex-row items-end">
              <TouchableOpacity
                onPress={handlePickImage}
                className="mb-1 mr-2 h-10 w-10 items-center justify-center rounded-full bg-primary-light">
                <Ionicons name="image-outline" size={20} color={colors.primary} />
              </TouchableOpacity>

              <TextInput
                className="flex-1 rounded-2xl border border-line bg-background px-4 py-2.5 text-sm text-ink"
                value={replyText}
                onChangeText={setReplyText}
                placeholder={t('tickets.replyPlaceholder')}
                placeholderTextColor={colors.inkSoft}
                multiline
                style={{ maxHeight: 110 }}
              />

              <TouchableOpacity
                onPress={handleSendReply}
                activeOpacity={0.8}
                className="mb-1 ml-2 h-10 w-10 items-center justify-center rounded-full bg-primary">
                <Ionicons name="send" size={18} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>

            {/* Close ticket action */}
            <TouchableOpacity
              onPress={handleCloseTicket}
              disabled={closing || isRefetching}
              className="mt-2 flex-row items-center justify-center py-2"
              activeOpacity={0.7}>
              {closing ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <>
                  <Ionicons name="checkmark-done-outline" size={15} color={colors.danger} />
                  <Text className="ml-1 text-xs font-semibold text-danger">
                    {t('tickets.closeThisTicket')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Full-screen image viewer (mounted only while an image is selected) */}
      {viewerImage ? (
        <ImageViewerModal uri={viewerImage} onClose={() => setViewerImage(null)} />
      ) : null}
    </View>
  );
}

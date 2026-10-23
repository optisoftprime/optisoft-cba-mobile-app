import axiosCbaInstance from 'config/api';
import { routes } from 'config/backendConfig';
import { extractApiErrorMessage } from 'helper';

// GET /api/v1/support/faq
// Paginated. Accepts { search, categoryId, page, size }. Response envelope:
// { data: SpringPage<Faq>, success, message, errorCode } — the records live at
// data.data.content, and data.data.last / data.data.number drive pagination.
// An empty result set is NOT an error (HTTP 200, success:true, content: []).
export async function getFaqs(params) {
  try {
    const response = await axiosCbaInstance.get(routes?.supportFaq, { params });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error?.response?.data || error?.message, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

// GET /api/v1/support/faq/categories
// Plain array in data.data (NOT a SpringPage). Used to populate the category filter.
export async function getFaqCategories() {
  try {
    const response = await axiosCbaInstance.get(routes?.supportFaqCategories);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error?.response?.data || error?.message, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

// ─── Support Tickets ─────────────────────────────────────────────────────────

// GET /api/v1/support/tickets/categories
// Plain array in data.data: { id, name, description, active, ... }.
// Feeds the create-ticket category dropdown (categoryId = id).
export async function getTicketCategories() {
  try {
    const response = await axiosCbaInstance.get(routes?.supportTicketCategories);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error?.response?.data || error?.message, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

// GET /api/v1/support/tickets?page&size
// Paginated SpringPage at data.data: content[] of ticket summaries
// { id, ticketNumber, subject, status, priority, reporterName, reporterPhone,
//   assignedToName, categoryName, createdAt }, plus last / number / totalElements.
export async function getTickets(params) {
  try {
    const response = await axiosCbaInstance.get(routes?.supportTickets, { params });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error?.response?.data || error?.message, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

// GET /api/v1/support/tickets/{id}
// Full ticket at data.data including messages[] of
// { id, senderType, senderName, senderId, messageBody, imageUrl, createdAt, isInternalNote }.
export async function getTicketDetail(id) {
  try {
    const response = await axiosCbaInstance.get(`${routes?.supportTickets}/${id}`);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error?.response?.data || error?.message, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

// POST /api/v1/support/tickets/{id}/reply
// Body: { message, imageUrl, phoneNumber }. Response is a plain envelope
// (no data) — refetch the ticket detail to get the updated messages[].
export async function replyToTicket(id, payload) {
  try {
    const response = await axiosCbaInstance.post(`${routes?.supportTickets}/${id}/reply`, payload);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error?.response?.data || error?.message, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

// PUT /api/v1/support/tickets/{id}/close
// No body. Response is a plain envelope — refetch to reflect the CLOSED status.
export async function closeTicket(id) {
  try {
    const response = await axiosCbaInstance.put(`${routes?.supportTickets}/${id}/close`);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error?.response?.data || error?.message, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

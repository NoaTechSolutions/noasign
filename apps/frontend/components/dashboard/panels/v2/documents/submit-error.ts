// G1 — transport-vs-application error handling for document create / create-and-send.
//
// api.ts attaches a numeric `status` to every HTTP error (ApiError). A TRANSPORT
// failure — fetch rejected before any response arrived (server down/restarting,
// proxy/LB timeout on the long PDF-render+email request, the client losing the
// network) — throws a bare TypeError with NO `status`. In that case we cannot know
// whether the request reached the server: createInvoice/createReceipt commit the
// DRAFT before emailing, so a draft may ALREADY exist. Telling the user "nothing
// happened" would invite a duplicate (and a burned receipt number); telling them
// "it sent" would be a lie. Instead we point them at their list + the detail's Send.

/** True when the rejection is a transport failure (no HTTP status), not an ApiError. */
export function isTransportError(e: unknown): boolean {
  return !(typeof e === 'object' && e !== null && 'status' in e);
}

/** Guidance shown when a create / create-and-send fails at the transport layer. */
export function draftMaybeSavedMessage(kind: 'invoice' | 'receipt'): string {
  return (
    `We couldn't reach the server, so we can't confirm the ${kind} went through. ` +
    `It may already be saved as a draft — check your list of ${kind}s before ` +
    `creating it again; if it's there, open it and send it from the detail.`
  );
}

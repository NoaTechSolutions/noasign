import { AsyncLocalStorage } from 'node:async_hooks';

// Per-request store. Populated by the request-id middleware at the very start of
// each request; readable anywhere downstream (services, error handlers) via
// getRequestId() WITHOUT threading the id through every function signature.
interface RequestStore {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestStore>();

// Run `fn` (and everything it awaits) inside a context carrying `requestId`.
export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return storage.run({ requestId }, fn);
}

// The current request's correlation id, or undefined outside a request (e.g.
// during boot or a cron tick that didn't set one).
export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

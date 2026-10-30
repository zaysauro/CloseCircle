import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomBytes } from "node:crypto";
// Per-request store: a verified recovery-key flow receives the native Better Auth
// reset token here. It is never put in a response or shared between requests.
export const recoveryContext = new AsyncLocalStorage<{ token?: string }>();
export const recoveryHash = (code: string) =>
  createHash("sha256").update(code.trim()).digest("hex");
export const recoveryCode = () => "CC-" + randomBytes(32).toString("base64url");

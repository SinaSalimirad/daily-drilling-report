const TOKEN_BYTES = 32;

// 256 random bits, sent to the browser in the session cookie.
export const generateSessionToken = () =>
  Buffer.from(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES))).toString("base64url");

// A fast hash is enough here (unlike passwords): the token is random, so it can't be guessed
// from a dictionary, and the lookup runs on every request.
export const hashSessionToken = (token: string) =>
  new Bun.CryptoHasher("sha256").update(token).digest("hex");

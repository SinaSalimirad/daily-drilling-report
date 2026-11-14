const TOKEN_BYTES = 32;

// 256 random bits: the refresh token sent to the browser (cookie) or the desktop app (body).
export const generateRefreshToken = () =>
  Buffer.from(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES))).toString("base64url");

// A fast hash is enough here (unlike passwords): the token is random, so it can't be guessed
// from a dictionary. Only this hash is stored, so a database dump can't be used to refresh.
export const hashRefreshToken = (token: string) =>
  new Bun.CryptoHasher("sha256").update(token).digest("hex");

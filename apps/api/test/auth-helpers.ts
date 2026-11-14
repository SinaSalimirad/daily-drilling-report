import { eq } from "drizzle-orm";
import { db } from "@/db";
import { hashRefreshToken } from "@/features/auth/refresh-token";
import { refreshTokens, sessions } from "@/features/auth/sessions.schema";
import { callApi } from "./helpers";

// Set-Cookie headers of a response by cookie name, e.g. setCookies.get("access_token").
export const setCookiesOf = (response: Response) =>
  new Map(response.headers.getSetCookie().map((header) => [header.split("=")[0], header]));

// "access_token=<jwt>; Path=/api; ..." -> "access_token=<jwt>", ready to send back.
export const cookiePair = (setCookieHeader: string | undefined) => setCookieHeader?.split(";")[0];

export const refreshWithCookie = (refreshCookie: string | undefined) =>
  callApi("POST", "/auth/refresh", { cookie: refreshCookie, body: {} });

export const refreshWithBody = (refreshToken: string) =>
  callApi("POST", "/auth/refresh", { body: { refreshToken } });

export const updateRefreshToken = (
  token: string,
  changes: { expiresAt?: Date; rotatedAt?: Date },
) =>
  db
    .update(refreshTokens)
    .set(changes)
    .where(eq(refreshTokens.tokenHash, hashRefreshToken(token)));

export const findSession = async (sessionId: string) => {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  return session;
};

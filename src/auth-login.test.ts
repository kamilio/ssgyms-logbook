import { describe, expect, it, vi } from "vitest";
import { createOtpAuthenticator } from "./auth-login.js";
import type { CredentialProvider } from "./credentials.js";

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

describe("createOtpAuthenticator", () => {
  it("completes Auth0 redirect login and stores the Firebase refresh credential", async () => {
    const storeRefreshToken = vi.fn(async () => undefined);
    const credentials: CredentialProvider = { getRefreshToken: vi.fn(), storeRefreshToken, deleteRefreshToken: vi.fn() };
    const fetch = vi.fn<typeof globalThis.fetch>(async (request, init) => {
      const url = String(request);
      if (url.endsWith("/account/signin")) return jsonResponse({});
      if (url.endsWith("/passwordless/start")) {
        expect(init?.headers).toMatchObject({ origin: "https://app.ssgyms.com", referer: "https://app.ssgyms.com/" });
        return jsonResponse({ email: "person@example.com" });
      }
      if (url.endsWith("/co/authenticate")) {
        expect(init?.headers).toMatchObject({ origin: "https://app.ssgyms.com", referer: "https://app.ssgyms.com/" });
        return jsonResponse({ login_ticket: "ticket", co_id: "co", co_verifier: "verifier" }, 200, { "set-cookie": "auth0=session; Path=/" });
      }
      if (url.startsWith("https://auth.ssgyms.com/authorize?")) {
        expect(init?.headers).toMatchObject({ cookie: "auth0=session", origin: "https://app.ssgyms.com", referer: "https://app.ssgyms.com/" });
        return new Response(null, { status: 302, headers: { location: "https://app.ssgyms.com/#access_token=auth0-access&id_token=id&state=state" } });
      }
      if (url.endsWith("/account/firebase")) return jsonResponse({ firebaseToken: "firebase-custom" });
      if (url.includes("accounts:signInWithCustomToken")) return jsonResponse({ idToken: `x.${Buffer.from(JSON.stringify({ user_id: "email|person" })).toString("base64url")}.x`, refreshToken: "firebase-refresh" });
      throw new Error(`Unexpected URL: ${url} ${String(init?.body)}`);
    });
    const authenticator = createOtpAuthenticator({ credentials, fetch, readCode: async () => "1234", randomValue: () => "state" });

    await expect(authenticator.login({ email: "person@example.com" })).resolves.toEqual({
      authenticated: true,
      email: "person@example.com",
      storage: "encrypted-file",
      userId: "email|person"
    });
    expect(storeRefreshToken).toHaveBeenCalledWith("firebase-refresh");
    expect(fetch.mock.calls.map(([request]) => String(request))).toEqual([
      "https://api.startingstrengthgyms.com/account/signin",
      "https://auth.ssgyms.com/passwordless/start",
      "https://auth.ssgyms.com/co/authenticate",
      expect.stringContaining("https://auth.ssgyms.com/authorize?"),
      "https://api.startingstrengthgyms.com/account/firebase",
      expect.stringContaining("accounts:signInWithCustomToken")
    ]);
  });

  it("rejects expired verification codes without storing credentials", async () => {
    const credentials: CredentialProvider = { getRefreshToken: vi.fn(), storeRefreshToken: vi.fn(), deleteRefreshToken: vi.fn() };
    const fetch = vi.fn<typeof globalThis.fetch>(async (request) => {
      if (String(request).endsWith("/account/signin")) return jsonResponse({});
      if (String(request).endsWith("/passwordless/start")) return jsonResponse({});
      return jsonResponse({ error: "access_denied", error_description: "The verification code has expired." }, 403);
    });
    const authenticator = createOtpAuthenticator({ credentials, fetch, readCode: async () => "expired", randomValue: () => "state" });

    await expect(authenticator.login({ email: "person@example.com" })).rejects.toThrow("verification code has expired");
    expect(credentials.storeRefreshToken).not.toHaveBeenCalled();
  });
});

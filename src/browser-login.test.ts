import { describe, expect, it, vi } from "vitest";
import { createBrowserAuthenticator, type BrowserLoginSession } from "./browser-login.js";
import type { CredentialProvider } from "./credentials.js";

describe("createBrowserAuthenticator", () => {
  it("stores the refresh credential captured after browser login", async () => {
    const storeRefreshToken = vi.fn(async () => undefined);
    const credentials: CredentialProvider = {
      getRefreshToken: vi.fn(),
      storeRefreshToken,
      deleteRefreshToken: vi.fn()
    };
    const session: BrowserLoginSession = {
      open: vi.fn(async () => undefined),
      readAuthenticatedUser: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ userId: "email|person", email: "person@example.com", refreshToken: "new-refresh-token" }),
      close: vi.fn(async () => undefined)
    };
    const authenticator = createBrowserAuthenticator({
      credentials,
      openSession: async () => session,
      sleep: async () => undefined,
      now: () => 0
    });

    await expect(authenticator.login({ timeoutMs: 1000 })).resolves.toEqual({
      authenticated: true,
      userId: "email|person",
      email: "person@example.com",
      storage: "encrypted-file"
    });
    expect(storeRefreshToken).toHaveBeenCalledWith("new-refresh-token");
    expect(session.close).toHaveBeenCalledOnce();
  });

  it("closes the browser when sign-in times out", async () => {
    let currentTime = 0;
    const session: BrowserLoginSession = {
      open: vi.fn(async () => undefined),
      readAuthenticatedUser: vi.fn(async () => null),
      close: vi.fn(async () => undefined)
    };
    const authenticator = createBrowserAuthenticator({
      credentials: { getRefreshToken: vi.fn(), storeRefreshToken: vi.fn(), deleteRefreshToken: vi.fn() },
      openSession: async () => session,
      sleep: async () => { currentTime = 2000; },
      now: () => currentTime
    });

    await expect(authenticator.login({ timeoutMs: 1000 })).rejects.toThrow("Timed out waiting for SSGYMS sign-in");
    expect(session.close).toHaveBeenCalledOnce();
  });
});

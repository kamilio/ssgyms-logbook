import { describe, expect, it, vi } from "vitest";
import { createSsgymsClient } from "./client.js";
import type { CredentialProvider } from "./credentials.js";

const storeRefreshToken = vi.fn(async () => undefined);
const tokenProvider: CredentialProvider = {
  getRefreshToken: async () => "stored-refresh-token",
  storeRefreshToken,
  deleteRefreshToken: async () => undefined
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function createFetch(databaseResponse: unknown = null) {
  return vi.fn<typeof fetch>(async (request, init) => {
    const url = String(request);
    if (url.startsWith("https://securetoken.googleapis.com/")) {
      return jsonResponse({ access_token: "access-token", refresh_token: "rotated-refresh-token", user_id: "email|person" });
    }
    expect(url).toContain("https://ss-gyms-logbook.firebaseio.com/users/email%7Cperson/logbook");
    expect(url).toContain("auth=access-token");
    return jsonResponse(databaseResponse);
  });
}

describe("createSsgymsClient", () => {
  it("persists rotated Firebase refresh credentials automatically", async () => {
    storeRefreshToken.mockClear();
    const client = createSsgymsClient({ fetch: createFetch(null), credentials: tokenProvider });

    await client.validateAuthentication();

    expect(storeRefreshToken).toHaveBeenCalledWith("rotated-refresh-token");
  });

  it("lists workouts from the authenticated Firebase logbook", async () => {
    const fetch = createFetch({ first: { date: "2026-05-20", timestamp: 10 }, second: { date: "2026-05-22", timestamp: 20 } });
    const client = createSsgymsClient({ fetch, credentials: tokenProvider });

    await expect(client.listWorkouts()).resolves.toEqual([
      { id: "second", date: "2026-05-22", timestamp: 20 },
      { id: "first", date: "2026-05-20", timestamp: 10 }
    ]);
  });

  it("creates an app-compatible workout record", async () => {
    const fetch = createFetch({ name: "generated-id" });
    const client = createSsgymsClient({ fetch, credentials: tokenProvider });
    const workout = { date: "2026-06-01", timestamp: 1780272000, createdAt: "2026-05-22T14:00:00-05:00", exercises: {} };

    await expect(client.createWorkout(workout)).resolves.toEqual({ id: "generated-id", ...workout });
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({ method: "POST", body: JSON.stringify(workout) });
  });

  it("logs completed exercises by patching an existing record", async () => {
    const fetch = createFetch({});
    const client = createSsgymsClient({ fetch, credentials: tokenProvider });
    const update = { exercises: { squat: { id: "squat", title: "Squat", pos: 0, mandatory: true, exerciseSets: {} } }, note: "done", isCompleated: true as const };

    await expect(client.logWorkout("workout-id", update)).resolves.toEqual({ id: "workout-id", ...update });
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({ method: "PATCH", body: JSON.stringify(update) });
  });

  it("deletes the requested workout record", async () => {
    const fetch = createFetch(null);
    const client = createSsgymsClient({ fetch, credentials: tokenProvider });

    await expect(client.deleteWorkout("workout-id")).resolves.toEqual({ id: "workout-id", deleted: true });
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({ method: "DELETE" });
  });
});

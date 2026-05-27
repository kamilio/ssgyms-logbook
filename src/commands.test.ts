import { describe, expect, it, vi } from "vitest";
import { logbook } from "./commands.js";
import type { SsgymsClient } from "./client.js";
import type { BrowserAuthenticator } from "./browser-login.js";

function getCommand(name: string) {
  const command = logbook.children.find((child) => child.kind === "command" && child.name === name);
  if (!command || command.kind !== "command") {
    throw new Error(`Missing command ${name}`);
  }
  return command;
}

function context(params: object, client: SsgymsClient) {
  return { params, client, secrets: {}, fetch: globalThis.fetch, fs: undefined as never, env: undefined as never, progress: () => undefined };
}

describe("workout commands", () => {
  it("exposes list, create, log, and delete on MCP", () => {
    expect(logbook.children.filter((child) => child.kind === "command").map((child) => child.name)).toEqual([
      "list-workouts", "create-workout", "log-workout", "delete-workout"
    ]);
    expect(logbook.children.filter((child) => child.kind === "command").every((child) => child.scope.includes("mcp"))).toBe(true);
  });

  it("delegates create and log actions to the client", async () => {
    const client = {
      listWorkouts: vi.fn(async () => []), createWorkout: vi.fn(async (value) => ({ id: "new", ...value })),
      logWorkout: vi.fn(async (id, value) => ({ id, ...value })), deleteWorkout: vi.fn(), validateAuthentication: vi.fn()
    } as unknown as SsgymsClient;
    await getCommand("create-workout").handler(context({ date: "2026-06-01", exercise: ["squat=3x5@225"] }, client) as never);
    await getCommand("log-workout").handler(context({ id: "new", exercise: ["squat=3x5@230"] }, client) as never);
    expect(client.createWorkout).toHaveBeenCalledOnce();
    expect(client.logWorkout).toHaveBeenCalledWith("new", expect.objectContaining({ isCompleated: true }));
  });

  it("does not create duplicate-date workouts", async () => {
    const client = {
      listWorkouts: vi.fn(async () => [{ id: "existing", date: "2026-06-01T00:00:00-05:00", timestamp: 0, createdAt: "", exercises: {} }]),
      createWorkout: vi.fn(), logWorkout: vi.fn(), deleteWorkout: vi.fn(), validateAuthentication: vi.fn()
    } as unknown as SsgymsClient;
    await expect(getCommand("create-workout").handler(context({ date: "2026-06-01", exercise: ["squat=3x5@225"] }, client) as never)).rejects.toThrow("already exists");
    expect(client.createWorkout).not.toHaveBeenCalled();
  });
});

describe("auth commands", () => {
  it("delegates browser-assisted login", async () => {
    const auth = logbook.children.find((child) => child.kind === "group" && child.name === "auth");
    if (!auth || auth.kind !== "group") throw new Error("Missing auth group");
    const login = auth.children.find((child) => child.kind === "command" && child.name === "login");
    if (!login || login.kind !== "command") throw new Error("Missing login command");
    const browserAuthenticator: BrowserAuthenticator = { login: vi.fn(async () => ({ authenticated: true as const, storage: "encrypted-file" as const, userId: "person" })) };
    await login.handler({ params: { timeoutSeconds: 15 }, browserAuthenticator, secrets: {}, fetch: globalThis.fetch, fs: undefined as never, env: undefined as never, progress: () => undefined } as never);
    expect(browserAuthenticator.login).toHaveBeenCalledWith({ timeoutMs: 15000 });
  });

  it("stores a token provided over stdin for SSH provisioning", async () => {
    const auth = logbook.children.find((child) => child.kind === "group" && child.name === "auth");
    if (!auth || auth.kind !== "group") throw new Error("Missing auth group");
    const save = auth.children.find((child) => child.kind === "command" && child.name === "save");
    if (!save || save.kind !== "command") throw new Error("Missing save command");
    const storeRefreshToken = vi.fn(async () => undefined);
    await save.handler({
      params: { tokenStdin: true },
      credentials: { getRefreshToken: vi.fn(), storeRefreshToken, deleteRefreshToken: vi.fn() },
      readStdin: async () => "from-stdin",
      secrets: {}, fetch: globalThis.fetch, fs: undefined as never, env: undefined as never, progress: () => undefined
    } as never);
    expect(storeRefreshToken).toHaveBeenCalledWith("from-stdin");
  });
});

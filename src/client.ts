import { UserError } from "toolcraft";
import { createCredentialProvider, type CredentialProvider } from "./credentials.js";
import type { Workout } from "./workouts.js";

const FIREBASE_API_KEY = "AIzaSyCSx2GmAVHrI3PyZMS9xSeRf3sm9iRFxS4";
const FIREBASE_DATABASE_URL = "https://ss-gyms-logbook.firebaseio.com";

interface FirebaseSession {
  idToken: string;
  userId: string;
}

export interface StoredWorkout extends Workout {
  id: string;
}

export interface WorkoutUpdate {
  exercises: Workout["exercises"];
  isCompleated: true;
  note?: string;
}

export interface SsgymsClient {
  listWorkouts(): Promise<StoredWorkout[]>;
  createWorkout(workout: Workout): Promise<StoredWorkout>;
  logWorkout(id: string, update: WorkoutUpdate): Promise<{ id: string } & WorkoutUpdate>;
  deleteWorkout(id: string): Promise<{ id: string; deleted: true }>;
  validateAuthentication(): Promise<{ authenticated: true; userId: string }>;
}

interface ClientOptions {
  fetch?: typeof globalThis.fetch;
  credentials?: CredentialProvider;
}

export function createSsgymsClient(options: ClientOptions = {}): SsgymsClient {
  const fetch = options.fetch ?? globalThis.fetch;
  const credentials = options.credentials ?? createCredentialProvider();

  async function authenticate(): Promise<FirebaseSession> {
    const refreshToken = await credentials.getRefreshToken();
    const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken })
    });
    const payload = await readJson<{ id_token?: string; access_token?: string; refresh_token?: string; user_id?: string }>(response, "refresh SSGYMS authentication");
    const idToken = payload.id_token ?? payload.access_token;
    if (!idToken || !payload.user_id) {
      throw new UserError("SSGYMS authentication returned an invalid Firebase session.");
    }
    if (payload.refresh_token && payload.refresh_token !== refreshToken) {
      await credentials.storeRefreshToken(payload.refresh_token);
    }
    return { idToken, userId: payload.user_id };
  }

  async function request<T>(suffix: string, init: RequestInit = {}): Promise<T> {
    const session = await authenticate();
    const encodedUserId = encodeURIComponent(session.userId);
    const encodedSuffix = suffix ? `/${suffix}` : "";
    const url = `${FIREBASE_DATABASE_URL}/users/${encodedUserId}/logbook${encodedSuffix}.json?auth=${encodeURIComponent(session.idToken)}`;
    return readJson<T>(await fetch(url, init), "access the SSGYMS logbook");
  }

  return {
    async listWorkouts() {
      const workouts = await request<Record<string, Workout> | null>("");
      return Object.entries(workouts ?? {})
        .map(([id, workout]) => ({ id, ...workout }))
        .sort((left, right) => right.timestamp - left.timestamp);
    },
    async createWorkout(workout) {
      const result = await request<{ name: string }>("", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(workout)
      });
      return { id: result.name, ...workout };
    },
    async logWorkout(id, update) {
      await request<unknown>(encodeURIComponent(id), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(update)
      });
      return { id, ...update };
    },
    async deleteWorkout(id) {
      await request<unknown>(encodeURIComponent(id), { method: "DELETE" });
      return { id, deleted: true };
    },
    async validateAuthentication() {
      const session = await authenticate();
      return { authenticated: true, userId: session.userId };
    }
  };
}

async function readJson<T>(response: Response, operation: string): Promise<T> {
  const payload = await response.json().catch(() => null) as T | { error?: { message?: string } } | null;
  if (!response.ok) {
    const firebaseMessage = payload && typeof payload === "object" && "error" in payload
      ? payload.error?.message
      : undefined;
    throw new UserError(`Failed to ${operation}${firebaseMessage ? `: ${firebaseMessage}` : ` (HTTP ${response.status})`}.`);
  }
  return payload as T;
}

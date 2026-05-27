import { UserError } from "toolcraft";
import { createCredentialProvider } from "./credentials.js";
const FIREBASE_API_KEY = "AIzaSyCSx2GmAVHrI3PyZMS9xSeRf3sm9iRFxS4";
const FIREBASE_DATABASE_URL = "https://ss-gyms-logbook.firebaseio.com";
export function createSsgymsClient(options = {}) {
    const fetch = options.fetch ?? globalThis.fetch;
    const credentials = options.credentials ?? createCredentialProvider();
    async function authenticate() {
        const refreshToken = await credentials.getRefreshToken();
        const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken })
        });
        const payload = await readJson(response, "refresh SSGYMS authentication");
        const idToken = payload.id_token ?? payload.access_token;
        if (!idToken || !payload.user_id) {
            throw new UserError("SSGYMS authentication returned an invalid Firebase session.");
        }
        if (payload.refresh_token && payload.refresh_token !== refreshToken) {
            await credentials.storeRefreshToken(payload.refresh_token);
        }
        return { idToken, userId: payload.user_id };
    }
    async function request(suffix, init = {}) {
        const session = await authenticate();
        const encodedUserId = encodeURIComponent(session.userId);
        const encodedSuffix = suffix ? `/${suffix}` : "";
        const url = `${FIREBASE_DATABASE_URL}/users/${encodedUserId}/logbook${encodedSuffix}.json?auth=${encodeURIComponent(session.idToken)}`;
        return readJson(await fetch(url, init), "access the SSGYMS logbook");
    }
    return {
        async listWorkouts() {
            const workouts = await request("");
            return Object.entries(workouts ?? {})
                .map(([id, workout]) => ({ id, ...workout }))
                .sort((left, right) => right.timestamp - left.timestamp);
        },
        async createWorkout(workout) {
            const result = await request("", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(workout)
            });
            return { id: result.name, ...workout };
        },
        async logWorkout(id, update) {
            await request(encodeURIComponent(id), {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(update)
            });
            return { id, ...update };
        },
        async deleteWorkout(id) {
            await request(encodeURIComponent(id), { method: "DELETE" });
            return { id, deleted: true };
        },
        async validateAuthentication() {
            const session = await authenticate();
            return { authenticated: true, userId: session.userId };
        }
    };
}
async function readJson(response, operation) {
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const firebaseMessage = payload && typeof payload === "object" && "error" in payload
            ? payload.error?.message
            : undefined;
        throw new UserError(`Failed to ${operation}${firebaseMessage ? `: ${firebaseMessage}` : ` (HTTP ${response.status})`}.`);
    }
    return payload;
}

import { S, UserError, defineCommand, defineGroup } from "toolcraft";
import { createBrowserAuthenticator } from "./browser-login.js";
import { createSsgymsClient } from "./client.js";
import { createCredentialProvider, CREDENTIAL_FILE } from "./credentials.js";
import { buildWorkout, buildWorkoutExercises } from "./workouts.js";
function client(services) {
    return services.client ?? createSsgymsClient({ credentials: services.credentials });
}
const emptyParams = S.Object({});
const createParams = S.Object({
    date: S.String({ description: "Workout date as YYYY-MM-DD." }),
    exercise: S.Array(S.String(), { description: "Lift set entry such as squat=3x5@225." }),
    note: S.Optional(S.String({ description: "Optional workout note." }))
});
const logParams = S.Object({
    id: S.String({ description: "Workout id returned by list-workouts or create-workout." }),
    exercise: S.Array(S.String(), { description: "Lift set entry such as squat=3x5@225." }),
    note: S.Optional(S.String({ description: "Optional workout note." }))
});
const deleteParams = S.Object({ id: S.String({ description: "Workout id to delete." }) });
const authSaveParams = S.Object({
    refreshToken: S.Optional(S.String({ description: "Firebase refresh token to store securely.", secret: true })),
    tokenStdin: S.Optional(S.Boolean({ description: "Read the Firebase refresh token from standard input." }))
});
const authLoginParams = S.Object({
    timeoutSeconds: S.Optional(S.Number({ description: "Maximum seconds to wait for browser sign-in.", default: 300, minimum: 1 }))
});
const listWorkouts = defineCommand({
    name: "list-workouts",
    aliases: ["list"],
    description: "List workouts in your SSGYMS logbook.",
    scope: ["cli", "mcp", "sdk"],
    params: emptyParams,
    handler: async (ctx) => client(ctx).listWorkouts()
});
const createWorkout = defineCommand({
    name: "create-workout",
    aliases: ["create"],
    description: "Create a planned workout with its initial lift sets.",
    scope: ["cli", "mcp", "sdk"],
    params: createParams,
    handler: async (ctx) => {
        const logbookClient = client(ctx);
        const existing = (await logbookClient.listWorkouts()).find((workout) => workout.date.slice(0, 10) === ctx.params.date);
        if (existing) {
            throw new UserError(`A workout already exists for ${ctx.params.date}: ${existing.id}.`);
        }
        return logbookClient.createWorkout(buildWorkout({
            date: ctx.params.date,
            entries: ctx.params.exercise,
            note: ctx.params.note
        }));
    }
});
const logWorkout = defineCommand({
    name: "log-workout",
    aliases: ["log"],
    description: "Record completed lift sets and mark a workout complete.",
    scope: ["cli", "mcp", "sdk"],
    params: logParams,
    handler: async (ctx) => client(ctx).logWorkout(ctx.params.id, {
        exercises: buildWorkoutExercises(ctx.params.exercise),
        ...(ctx.params.note ? { note: ctx.params.note } : {}),
        isCompleated: true
    })
});
const deleteWorkout = defineCommand({
    name: "delete-workout",
    aliases: ["delete"],
    description: "Delete a workout from your SSGYMS logbook.",
    scope: ["cli", "mcp", "sdk"],
    params: deleteParams,
    handler: async (ctx) => client(ctx).deleteWorkout(ctx.params.id)
});
const authSave = defineCommand({
    name: "save",
    description: "Store a Firebase refresh credential in the encrypted credential file.",
    scope: ["cli"],
    params: authSaveParams,
    handler: async (ctx) => {
        const credentials = ctx.credentials ?? createCredentialProvider();
        const refreshToken = ctx.params.tokenStdin
            ? await (ctx.readStdin ?? readStdin)()
            : ctx.params.refreshToken;
        if (!refreshToken) {
            throw new UserError("Pass --refresh-token or --token-stdin to store a credential.");
        }
        await credentials.storeRefreshToken(refreshToken);
        return { stored: true, file: CREDENTIAL_FILE };
    }
});
const authLogin = defineCommand({
    name: "login",
    description: "Open the SSGYMS sign-in page and securely save the authenticated session.",
    scope: ["cli"],
    params: authLoginParams,
    handler: async (ctx) => {
        const authenticator = ctx.browserAuthenticator ?? createBrowserAuthenticator({ credentials: ctx.credentials });
        return authenticator.login({ timeoutMs: (ctx.params.timeoutSeconds ?? 300) * 1000 });
    }
});
const authStatus = defineCommand({
    name: "status",
    description: "Validate the configured SSGYMS credential.",
    scope: ["cli"],
    params: emptyParams,
    handler: async (ctx) => client(ctx).validateAuthentication()
});
const authRemove = defineCommand({
    name: "remove",
    description: "Delete the encrypted credential file.",
    scope: ["cli"],
    params: emptyParams,
    handler: async (ctx) => {
        const credentials = ctx.credentials ?? createCredentialProvider();
        await credentials.deleteRefreshToken();
        return { removed: true };
    }
});
const authChildren = [authLogin, authSave, authStatus, authRemove];
const auth = defineGroup({
    name: "auth",
    description: "Credential utilities backed by an encrypted SSH-friendly file.",
    scope: ["cli"],
    children: authChildren
});
const children = [listWorkouts, createWorkout, logWorkout, deleteWorkout, auth];
export const logbook = defineGroup({
    name: "ssgyms-logbook",
    description: "Starting Strength Gyms logbook tools.",
    scope: ["cli", "mcp", "sdk"],
    children
});
async function readStdin() {
    let value = "";
    for await (const chunk of process.stdin) {
        value += String(chunk);
    }
    return value.trim();
}

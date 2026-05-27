import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stderr } from "node:process";
import { UserError } from "toolcraft";
import { createCredentialProvider } from "./credentials.js";
const AUTH0_DOMAIN = "https://auth.ssgyms.com";
const AUTH0_CLIENT_ID = "Vo9h4EvNMGRQ2SklidtK75Qs5qQXXRGs";
const AUTH0_AUDIENCE = "https://ssgyms";
const REDIRECT_URI = "https://app.ssgyms.com/";
const APP_REQUEST_HEADERS = { origin: "https://app.ssgyms.com", referer: REDIRECT_URI };
const API_URL = "https://api.startingstrengthgyms.com";
const FIREBASE_API_KEY = "AIzaSyCSx2GmAVHrI3PyZMS9xSeRf3sm9iRFxS4";
const OTP_GRANT_TYPE = "http://auth0.com/oauth/grant-type/passwordless/otp";
export function createOtpAuthenticator(options = {}) {
    const credentials = options.credentials ?? createCredentialProvider();
    const fetch = options.fetch ?? globalThis.fetch;
    const readCode = options.readCode ?? promptForVerificationCode;
    const randomValue = options.randomValue ?? (() => randomBytes(24).toString("base64url"));
    return {
        async login({ email }) {
            const normalizedEmail = email.trim();
            if (!normalizedEmail)
                throw new UserError("Email address cannot be empty.");
            const state = randomValue();
            const nonce = randomValue();
            await postJson(`${API_URL}/account/signin`, { email: normalizedEmail }, fetch, "start SSGYMS sign-in");
            await postJson(`${AUTH0_DOMAIN}/passwordless/start`, {
                client_id: AUTH0_CLIENT_ID,
                connection: "email",
                send: "code",
                email: normalizedEmail,
                authParams: {
                    response_type: "token id_token",
                    redirect_uri: REDIRECT_URI,
                    audience: AUTH0_AUDIENCE,
                    state,
                    nonce
                }
            }, fetch, "send the SSGYMS verification code", APP_REQUEST_HEADERS);
            stderr.write(`Verification code sent to ${normalizedEmail}.\n`);
            const code = (await readCode()).trim();
            if (!code)
                throw new UserError("Verification code cannot be empty.");
            const authenticated = await postJsonWithResponse(`${AUTH0_DOMAIN}/co/authenticate`, {
                client_id: AUTH0_CLIENT_ID,
                username: normalizedEmail,
                otp: code,
                realm: "email",
                credential_type: OTP_GRANT_TYPE
            }, fetch, "verify the SSGYMS login code", APP_REQUEST_HEADERS);
            if (!authenticated.payload.login_ticket)
                throw new UserError("SSGYMS authentication did not return a login ticket.");
            const cookie = readCookies(authenticated.response);
            const authorizeUrl = new URL(`${AUTH0_DOMAIN}/authorize`);
            authorizeUrl.search = new URLSearchParams({
                client_id: AUTH0_CLIENT_ID,
                response_type: "token id_token",
                redirect_uri: REDIRECT_URI,
                audience: AUTH0_AUDIENCE,
                scope: "openid profile email",
                state,
                nonce,
                login_ticket: authenticated.payload.login_ticket
            }).toString();
            const authorization = await fetch(authorizeUrl, {
                method: "GET",
                redirect: "manual",
                headers: { ...APP_REQUEST_HEADERS, ...(cookie ? { cookie } : {}) }
            });
            const location = authorization.headers.get("location");
            if (!location)
                throw new UserError("SSGYMS authentication did not redirect with an access token.");
            const callback = new URL(location);
            const fragment = new URLSearchParams(callback.hash.slice(1));
            if (fragment.get("state") !== state)
                throw new UserError("SSGYMS authentication returned an invalid state value.");
            const accessToken = fragment.get("access_token");
            if (!accessToken)
                throw new UserError(`Failed to authorize SSGYMS login: ${fragment.get("error_description") ?? "access token missing"}.`);
            const firebaseExchange = await postJson(`${API_URL}/account/firebase`, {}, fetch, "request Firebase authentication", {
                authorization: `Bearer ${accessToken}`
            });
            if (!firebaseExchange.firebaseToken)
                throw new UserError("SSGYMS authentication did not return a Firebase token.");
            const firebaseSession = await postJson(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`, { token: firebaseExchange.firebaseToken, returnSecureToken: true }, fetch, "create the Firebase session");
            const userId = firebaseSession.localId ?? readFirebaseUserId(firebaseSession.idToken);
            if (!userId || !firebaseSession.refreshToken)
                throw new UserError("Firebase authentication did not return a reusable session.");
            await credentials.storeRefreshToken(firebaseSession.refreshToken);
            return { authenticated: true, email: normalizedEmail, storage: "encrypted-file", userId };
        }
    };
}
function readFirebaseUserId(idToken) {
    if (!idToken)
        return undefined;
    try {
        const encodedPayload = idToken.split(".")[1];
        if (!encodedPayload)
            return undefined;
        const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
        return payload.user_id ?? payload.sub;
    }
    catch {
        return undefined;
    }
}
function readCookies(response) {
    const headers = response.headers;
    const setCookies = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
    const values = setCookies.length > 0 ? setCookies : response.headers.get("set-cookie")?.split(",") ?? [];
    const cookie = values.map((value) => value.split(";", 1)[0]).filter(Boolean).join("; ");
    return cookie || undefined;
}
async function promptForVerificationCode() {
    if (!stdin.isTTY) {
        let code = "";
        for await (const chunk of stdin)
            code += String(chunk);
        return code;
    }
    const terminal = createInterface({ input: stdin, output: stderr });
    try {
        return await terminal.question("Verification code: ");
    }
    finally {
        terminal.close();
    }
}
async function postJson(url, body, fetch, operation, extraHeaders = {}) {
    return (await postJsonWithResponse(url, body, fetch, operation, extraHeaders)).payload;
}
async function postJsonWithResponse(url, body, fetch, operation, extraHeaders = {}) {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...extraHeaders }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const details = payload && typeof payload === "object" ? ("error_description" in payload ? payload.error_description : undefined) ?? ("message" in payload ? payload.message : undefined) : undefined;
        throw new UserError(`Failed to ${operation}${details ? `: ${details}` : ` (HTTP ${response.status})`}.`);
    }
    return { payload: payload, response };
}

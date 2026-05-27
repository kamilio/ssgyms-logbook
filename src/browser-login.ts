import { chromium, type Browser, type Page } from "playwright-core";
import { UserError } from "toolcraft";
import { createCredentialProvider, type CredentialProvider } from "./credentials.js";

const APP_URL = "https://app.ssgyms.com/logbook";
const FIREBASE_STORAGE_KEY_PREFIX = "firebase:authUser:";
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 1000;

export interface AuthenticatedBrowserUser {
  email?: string;
  refreshToken: string;
  userId: string;
}

export interface BrowserLoginSession {
  open(): Promise<void>;
  readAuthenticatedUser(): Promise<AuthenticatedBrowserUser | null>;
  close(): Promise<void>;
}

export interface BrowserAuthenticator {
  login(options?: { timeoutMs?: number }): Promise<{
    authenticated: true;
    email?: string;
    storage: "encrypted-file";
    userId: string;
  }>;
}

interface BrowserAuthenticatorOptions {
  credentials?: CredentialProvider;
  openSession?: () => Promise<BrowserLoginSession>;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
}

export function createBrowserAuthenticator(options: BrowserAuthenticatorOptions = {}): BrowserAuthenticator {
  const credentials = options.credentials ?? createCredentialProvider();
  const openSession = options.openSession ?? openChromiumSession;
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const now = options.now ?? Date.now;

  return {
    async login({ timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
      const session = await openSession();
      const expiresAt = now() + timeoutMs;
      try {
        await session.open();
        while (now() <= expiresAt) {
          const authenticatedUser = await session.readAuthenticatedUser();
          if (authenticatedUser) {
            await credentials.storeRefreshToken(authenticatedUser.refreshToken);
            return {
              authenticated: true,
              ...(authenticatedUser.email ? { email: authenticatedUser.email } : {}),
              storage: "encrypted-file",
              userId: authenticatedUser.userId
            };
          }
          await sleep(POLL_INTERVAL_MS);
        }
        throw new UserError("Timed out waiting for SSGYMS sign-in. Run auth login again and complete the browser flow.");
      } finally {
        await session.close();
      }
    }
  };
}

async function openChromiumSession(): Promise<BrowserLoginSession> {
  let browser: Browser | undefined;
  let page: Page | undefined;
  return {
    async open() {
      try {
        browser = await chromium.launch({ channel: "chrome", headless: false });
      } catch {
        browser = await chromium.launch({ headless: false });
      }
      page = await browser.newPage();
      await page.goto(APP_URL);
    },
    async readAuthenticatedUser() {
      if (!page || page.url().startsWith("https://app.ssgyms.com/") === false) {
        return null;
      }
      return page.evaluate(async (prefix) => {
        const databases = await indexedDB.databases();
        if (!databases.some((database) => database.name === "firebaseLocalStorageDb")) {
          return null;
        }
        return new Promise<AuthenticatedBrowserUser | null>((resolve, reject) => {
          const request = indexedDB.open("firebaseLocalStorageDb");
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const database = request.result;
            const transaction = database.transaction("firebaseLocalStorage", "readonly");
            const read = transaction.objectStore("firebaseLocalStorage").getAll();
            read.onerror = () => reject(read.error);
            read.onsuccess = () => {
              database.close();
              const authRecord = read.result.find((record: { fbase_key?: string }) => record.fbase_key?.startsWith(prefix));
              const value = authRecord?.value as {
                email?: string;
                stsTokenManager?: { refreshToken?: string };
                uid?: string;
              } | undefined;
              if (!value?.uid || !value.stsTokenManager?.refreshToken) {
                resolve(null);
                return;
              }
              resolve({
                ...(value.email ? { email: value.email } : {}),
                refreshToken: value.stsTokenManager.refreshToken,
                userId: value.uid
              });
            };
          };
        });
      }, FIREBASE_STORAGE_KEY_PREFIX);
    },
    async close() {
      await browser?.close();
    }
  };
}

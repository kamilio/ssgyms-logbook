import { type CredentialProvider } from "./credentials.js";
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
    login(options?: {
        timeoutMs?: number;
    }): Promise<{
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
export declare function createBrowserAuthenticator(options?: BrowserAuthenticatorOptions): BrowserAuthenticator;
export {};

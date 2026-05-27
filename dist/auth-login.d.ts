import { type CredentialProvider } from "./credentials.js";
export interface OtpAuthenticator {
    login(options: {
        email: string;
    }): Promise<{
        authenticated: true;
        email: string;
        storage: "encrypted-file";
        userId: string;
    }>;
}
interface OtpAuthenticatorOptions {
    credentials?: CredentialProvider;
    fetch?: typeof globalThis.fetch;
    readCode?: () => Promise<string>;
    randomValue?: () => string;
}
export declare function createOtpAuthenticator(options?: OtpAuthenticatorOptions): OtpAuthenticator;
export {};

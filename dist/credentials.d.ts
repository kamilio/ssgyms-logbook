export declare const CREDENTIAL_DIRECTORY: string;
export declare const CREDENTIAL_FILE: string;
interface CredentialProviderOptions {
    filePath?: string;
    getMachineIdentity?: () => string | Promise<string>;
}
export interface CredentialProvider {
    getRefreshToken(): Promise<string>;
    storeRefreshToken(token: string): Promise<void>;
    deleteRefreshToken(): Promise<void>;
}
export declare function createCredentialProvider(options?: CredentialProviderOptions): CredentialProvider;
export {};

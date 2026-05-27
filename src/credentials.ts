import { createCipheriv, createDecipheriv, randomBytes, scrypt as scryptCallback } from "node:crypto";
import { mkdir, chmod, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir, hostname, userInfo } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { UserError } from "toolcraft";

const scrypt = promisify(scryptCallback);
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTION_VERSION = 1;
const KEY_BYTES = 32;
const IV_BYTES = 12;
const FILE_MODE = 0o600;
const DIRECTORY_MODE = 0o700;
const ENCRYPTION_SALT = "ssgyms-logbook:firebase-refresh-token:v1";

export const CREDENTIAL_DIRECTORY = path.join(homedir(), ".config", "ssgyms-logbook");
export const CREDENTIAL_FILE = path.join(CREDENTIAL_DIRECTORY, "credentials.enc");

interface EncryptedCredential {
  authTag: string;
  ciphertext: string;
  iv: string;
  version: number;
}

interface CredentialProviderOptions {
  filePath?: string;
  getMachineIdentity?: () => string | Promise<string>;
}

export interface CredentialProvider {
  getRefreshToken(): Promise<string>;
  storeRefreshToken(token: string): Promise<void>;
  deleteRefreshToken(): Promise<void>;
}

export function createCredentialProvider(options: CredentialProviderOptions = {}): CredentialProvider {
  const filePath = options.filePath ?? CREDENTIAL_FILE;
  const getMachineIdentity = options.getMachineIdentity ?? (() => `${hostname()}:${userInfo().username}`);

  async function encryptionKey(): Promise<Buffer> {
    return Buffer.from(await scrypt(await getMachineIdentity(), ENCRYPTION_SALT, KEY_BYTES) as Buffer);
  }

  return {
    async getRefreshToken() {
      let rawDocument: string;
      try {
        rawDocument = await readFile(filePath, "utf8");
      } catch (error) {
        if (isNotFoundError(error)) {
          throw new UserError("No SSGYMS credential found. Run `ssgyms-logbook auth login` to authenticate.");
        }
        throw new UserError("Could not read the encrypted SSGYMS credential file.");
      }

      try {
        const document = JSON.parse(rawDocument) as EncryptedCredential;
        if (document.version !== ENCRYPTION_VERSION) {
          throw new Error("Unsupported encrypted credential version.");
        }
        const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, await encryptionKey(), Buffer.from(document.iv, "base64"));
        decipher.setAuthTag(Buffer.from(document.authTag, "base64"));
        const token = Buffer.concat([
          decipher.update(Buffer.from(document.ciphertext, "base64")),
          decipher.final()
        ]).toString("utf8").trim();
        if (!token) {
          throw new Error("Credential is empty.");
        }
        return token;
      } catch {
        throw new UserError("The encrypted SSGYMS credential could not be decrypted on this machine and user account.");
      }
    },
    async storeRefreshToken(token) {
      const normalizedToken = token.trim();
      if (!normalizedToken) {
        throw new UserError("Refresh token cannot be empty.");
      }
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv(ENCRYPTION_ALGORITHM, await encryptionKey(), iv);
      const ciphertext = Buffer.concat([cipher.update(normalizedToken, "utf8"), cipher.final()]);
      const document: EncryptedCredential = {
        version: ENCRYPTION_VERSION,
        iv: iv.toString("base64"),
        authTag: cipher.getAuthTag().toString("base64"),
        ciphertext: ciphertext.toString("base64")
      };
      const directory = path.dirname(filePath);
      await mkdir(directory, { recursive: true, mode: DIRECTORY_MODE });
      await chmod(directory, DIRECTORY_MODE);
      await writeFile(filePath, JSON.stringify(document), { encoding: "utf8", mode: FILE_MODE });
      await chmod(filePath, FILE_MODE);
    },
    async deleteRefreshToken() {
      try {
        await unlink(filePath);
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw new UserError("Could not remove the encrypted SSGYMS credential file.");
        }
      }
    }
  };
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

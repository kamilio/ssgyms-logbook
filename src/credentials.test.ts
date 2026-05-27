import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createCredentialProvider } from "./credentials.js";

describe("createCredentialProvider", () => {
  it("stores credentials encrypted in a permission-restricted file", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "ssgyms-credentials-"));
    const filePath = path.join(directory, "credentials.enc");
    const credentials = createCredentialProvider({
      filePath,
      getMachineIdentity: () => "headless-macmini:ssh-user"
    });

    await credentials.storeRefreshToken("refresh-secret");

    const encrypted = await readFile(filePath, "utf8");
    expect(encrypted).not.toContain("refresh-secret");
    await expect(credentials.getRefreshToken()).resolves.toBe("refresh-secret");
    expect((await stat(filePath)).mode & 0o777).toBe(0o600);
  });

  it("cannot decrypt a credential copied to a different machine identity", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "ssgyms-credentials-"));
    const filePath = path.join(directory, "credentials.enc");
    await createCredentialProvider({ filePath, getMachineIdentity: () => "host-a:user" }).storeRefreshToken("refresh-secret");

    await expect(
      createCredentialProvider({ filePath, getMachineIdentity: () => "host-b:user" }).getRefreshToken()
    ).rejects.toThrow("could not be decrypted");
  });

  it("deletes the encrypted credential file", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "ssgyms-credentials-"));
    const filePath = path.join(directory, "credentials.enc");
    const credentials = createCredentialProvider({ filePath, getMachineIdentity: () => "host:user" });
    await credentials.storeRefreshToken("refresh-secret");
    await credentials.deleteRefreshToken();

    await expect(credentials.getRefreshToken()).rejects.toThrow("No SSGYMS credential found");
  });
});

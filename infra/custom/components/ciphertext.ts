import { createCipheriv } from "node:crypto";
import { writeFileSync } from "node:fs";

export interface CiphertextArgs {
  plaintext: $util.Input<string>;
  writeToFile: $util.Input<string>;
}

export class Ciphertext extends $util.ComponentResource {
  private _encryptionKey: random.RandomBytes;

  constructor(
    name: string,
    args: CiphertextArgs,
    opts?: $util.ComponentResourceOptions,
  ) {
    super("pd:resource:Ciphertext", name, args, opts);

    this._encryptionKey = new random.RandomBytes(`${name}EncryptionKey`, {
      length: 32,
    });

    $resolve([
      this._encryptionKey.hex,
      args.plaintext,
      args.writeToFile,
    ] as const).apply(([key, plaintext, writeToFile]) => {
      const cipher = createCipheriv(
        "aes-256-gcm",
        Buffer.from(key, "hex"),
        Buffer.alloc(12, 0),
      );

      const ciphertext = Buffer.concat([
        Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]),
        cipher.getAuthTag(),
      ]);

      writeFileSync(writeToFile, ciphertext);
    });

    this.registerOutputs({
      encryptionKey: this._encryptionKey.id,
    });
  }

  get encryptionKey() {
    return this._encryptionKey.base64;
  }
}

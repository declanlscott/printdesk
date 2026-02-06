import { createCipheriv } from "node:crypto";
import { writeFileSync } from "node:fs";

import type { Link } from "~/.sst/platform/src/components/link";

export interface CiphertextArgs {
  plaintext: $util.Input<string>;
  writeToFile: $util.Input<string>;
}

export class Ciphertext
  extends $util.ComponentResource
  implements Link.Linkable
{
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
        new Uint8Array(Buffer.from(key, "hex")),
        new Uint8Array(Buffer.alloc(12, 0)),
      );

      const ciphertext = new Uint8Array(
        Buffer.concat([
          new Uint8Array(
            Buffer.concat([
              new Uint8Array(cipher.update(plaintext, "utf-8")),
              new Uint8Array(cipher.final()),
            ]),
          ),
          new Uint8Array(cipher.getAuthTag()),
        ]),
      );

      writeFileSync(writeToFile, ciphertext);
    });

    this.registerOutputs({
      encryptionKey: this._encryptionKey.id,
    });
  }

  get encryptionKey() {
    return this._encryptionKey.base64;
  }

  getSSTLink() {
    return {
      properties: {
        encryptionKey: this.encryptionKey,
      },
    };
  }
}

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

import { decodeJWT } from "@oslojs/jwt";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { AuthContract } from "./contract";

export class CryptoError extends Data.TaggedError("CryptoError")<{
  readonly cause: unknown;
}> {}

export class Crypto extends Effect.Service<Crypto>()(
  "@printdesk/core/auth/Crypto",
  {
    accessors: true,
    sync: () => {
      const generateToken = (size = 32) =>
        Effect.try({
          try: () => randomBytes(size).toString("hex"),
          catch: (cause) => new CryptoError({ cause }),
        });

      const deriveKeyFromSecret = (secret: string, salt: string) =>
        Effect.tryPromise({
          try: () =>
            new Promise<string>((resolve, reject) =>
              scrypt(secret.normalize(), salt, 64, (error, derivedKey) =>
                error ? reject(error) : resolve(derivedKey.toString("hex")),
              ),
            ),
          catch: (cause) => new CryptoError({ cause }),
        });

      const hashSecret = (secret: string) =>
        Effect.gen(function* () {
          const salt = yield* generateToken(16);
          const derivedKey = yield* deriveKeyFromSecret(secret, salt);

          const encode = Schema.encode(AuthContract.Token);

          return yield* encode([salt, derivedKey]);
        });

      const verifySecret = (secret: string, hash: string) =>
        Effect.gen(function* () {
          const decode = Schema.decode(AuthContract.Token);
          const tokens = yield* decode(hash);
          const [salt, storedKey] = tokens;
          if (tokens.length !== 2 || !salt || !storedKey)
            return yield* Effect.fail(
              new CryptoError({
                cause: new globalThis.Error("Invalid hash"),
              }),
            );

          const derivedKey = yield* deriveKeyFromSecret(secret, salt);

          const storedKeyBuffer = yield* Effect.try({
            try: () => Buffer.from(storedKey, "hex"),
            catch: (cause) => new CryptoError({ cause }),
          });

          const derivedKeyBuffer = yield* Effect.try({
            try: () => Buffer.from(derivedKey, "hex"),
            catch: (cause) => new CryptoError({ cause }),
          });

          return yield* Effect.try({
            try: () => timingSafeEqual(storedKeyBuffer, derivedKeyBuffer),
            catch: (cause) => new CryptoError({ cause }),
          });
        });

      const decodeJwt = (jwt: string) =>
        Effect.try({
          try: () => decodeJWT(jwt),
          catch: (cause) => new CryptoError({ cause }),
        });

      return {
        generateToken,
        deriveKeyFromSecret,
        hashSecret,
        verifySecret,
        decodeJwt,
      } as const;
    },
  },
) {}

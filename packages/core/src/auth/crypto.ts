import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

import { decodeJWT } from "@oslojs/jwt";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import * as Redacted from "effect/Redacted";

import { CryptoContract } from "./contracts";

export class Crypto extends Effect.Service<Crypto>()(
  "@printdesk/core/auth/Crypto",
  {
    accessors: true,
    sync: () => {
      const generateToken = Effect.fn("CryptoClient.generateToken")(
        // eslint-disable-next-line @typescript-eslint/no-inferrable-types
        (size: number = 32) =>
          Effect.try({
            try: () => Redacted.make(randomBytes(size).toString("base64")),
            catch: (cause) =>
              new CryptoContract.TokenGenerationError({ cause }),
          }),
      );

      const deriveKeyFromSecret = Effect.fn("CryptoClient.deriveKeyFromSecret")(
        (secret: Redacted.Redacted<string>, salt: Redacted.Redacted<string>) =>
          Effect.tryPromise({
            try: () =>
              new Promise<Redacted.Redacted<string>>((resolve, reject) =>
                scrypt(
                  Redacted.value(secret).normalize(),
                  Redacted.value(salt),
                  64,
                  (error, derivedKey) =>
                    error
                      ? reject(error)
                      : resolve(Redacted.make(derivedKey.toString("base64"))),
                ),
              ),
            catch: (cause) => new CryptoContract.KeyDerivationError({ cause }),
          }),
      );

      const hashSecret = Effect.fn("CryptoClient.hashSecret")(
        (secret: Redacted.Redacted<string>) =>
          Effect.gen(function* () {
            const salt = yield* generateToken(16);
            const derivedKey = yield* deriveKeyFromSecret(secret, salt);

            return new CryptoContract.Hash({ salt, derivedKey });
          }),
      );

      const verifySecret = Effect.fn("CryptoClient.verifySecret")(
        (
          secret: Redacted.Redacted<string>,
          { salt, derivedKey: storedKey }: CryptoContract.Hash,
        ) =>
          Effect.gen(function* () {
            const derivedKey = yield* deriveKeyFromSecret(secret, salt);

            const storedKeyBuffer = yield* Effect.try({
              try: () => Buffer.from(storedKey.pipe(Redacted.value), "base64"),
              catch: (cause) => new CryptoContract.KeyBufferError({ cause }),
            });

            const derivedKeyBuffer = yield* Effect.try({
              try: () => Buffer.from(derivedKey.pipe(Redacted.value), "base64"),
              catch: (cause) => new CryptoContract.KeyBufferError({ cause }),
            });

            yield* Effect.try({
              try: () => timingSafeEqual(storedKeyBuffer, derivedKeyBuffer),
              catch: (cause) =>
                new CryptoContract.KeyVerificationError({ cause }),
            }).pipe(
              Effect.filterOrFail(
                Predicate.isTruthy,
                () => new CryptoContract.InvalidSecretError(),
              ),
            );
          }),
      );

      const decodeJwt = Effect.fn("CryptoClient.decodeJwt")((jwt: string) =>
        Effect.try({
          try: () => decodeJWT(jwt),
          catch: (cause) => new CryptoContract.JwtDecodeError({ cause }),
        }),
      );

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

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

import { decodeJWT } from "@oslojs/jwt";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import * as Redacted from "effect/Redacted";

import { AuthContract } from "./contract";

export class TokenGenerationError extends Data.TaggedError(
  "TokenGenerationError",
)<{ readonly cause: unknown }> {}

export class KeyDerivationError extends Data.TaggedError("KeyDerivationError")<{
  readonly cause: unknown;
}> {}

export class KeyBufferError extends Data.TaggedError("KeyBufferError")<{
  readonly cause: unknown;
}> {}

export class KeyVerificationError extends Data.TaggedError(
  "KeyVerificationError",
)<{ readonly cause: unknown }> {}

export class InvalidSecretError extends Data.TaggedError(
  "InvalidSecretError",
) {}

export class JwtDecodeError extends Data.TaggedError("JwtDecodeError")<{
  readonly cause: unknown;
}> {}

export class Crypto extends Effect.Service<Crypto>()(
  "@printdesk/core/auth/Crypto",
  {
    accessors: true,
    sync: () => {
      const generateToken = (size = 32) =>
        Effect.try({
          try: () => Redacted.make(randomBytes(size).toString("base64")),
          catch: (cause) => new TokenGenerationError({ cause }),
        });

      const deriveKeyFromSecret = (
        secret: Redacted.Redacted<string>,
        salt: Redacted.Redacted<string>,
      ) =>
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
          catch: (cause) => new KeyDerivationError({ cause }),
        });

      const hashSecret = (secret: Redacted.Redacted<string>) =>
        Effect.gen(function* () {
          const salt = yield* generateToken(16);
          const derivedKey = yield* deriveKeyFromSecret(secret, salt);

          return new AuthContract.Hash({ salt, derivedKey });
        });

      const verifySecret = (
        secret: Redacted.Redacted<string>,
        { salt, derivedKey: storedKey }: AuthContract.Hash,
      ) =>
        Effect.gen(function* () {
          const derivedKey = yield* deriveKeyFromSecret(secret, salt);

          const storedKeyBuffer = yield* Effect.try({
            try: () => Buffer.from(storedKey.pipe(Redacted.value), "base64"),
            catch: (cause) => new KeyBufferError({ cause }),
          });

          const derivedKeyBuffer = yield* Effect.try({
            try: () => Buffer.from(derivedKey.pipe(Redacted.value), "base64"),
            catch: (cause) => new KeyBufferError({ cause }),
          });

          yield* Effect.try({
            try: () => timingSafeEqual(storedKeyBuffer, derivedKeyBuffer),
            catch: (cause) => new KeyVerificationError({ cause }),
          }).pipe(
            Effect.filterOrFail(
              Predicate.isTruthy,
              () => new InvalidSecretError(),
            ),
          );
        });

      const decodeJwt = (jwt: string) =>
        Effect.try({
          try: () => decodeJWT(jwt),
          catch: (cause) => new JwtDecodeError({ cause }),
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

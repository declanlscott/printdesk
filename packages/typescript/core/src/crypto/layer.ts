import { scrypt, timingSafeEqual } from "node:crypto";

import * as EffectCrypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as PlatformError from "effect/PlatformError";
import * as Predicate from "effect/Predicate";
import * as Redacted from "effect/Redacted";

import { Crypto } from ".";
import { CryptoContract } from "./contract";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const crypto = yield* EffectCrypto.Crypto;

  const generateToken = Effect.fn("Crypto.generateToken")((size: number = 32) =>
    crypto.randomBytes(size).pipe(
      Effect.map((bytes) => Buffer.from(bytes).toString("base64")),
      Effect.map(Redacted.make),
      Effect.map((secret) => CryptoContract.Secret.make(secret)),
    ),
  );

  const deriveKeyFromSecret = Effect.fn("Crypto.deriveKeyFromSecret")(
    (secret: CryptoContract.Secret, salt: CryptoContract.Secret) =>
      Effect.tryPromise({
        try: () =>
          // oxlint-disable-next-line effecttsgo/new-promise
          new Promise<CryptoContract.Secret>((resolve, reject) =>
            scrypt(
              secret.pipe(Redacted.value).normalize(),
              salt.pipe(Redacted.value),
              64,
              (error, derivedKey) =>
                error
                  ? reject(error)
                  : resolve(
                      CryptoContract.Secret.make(Redacted.make(derivedKey.toString("base64"))),
                    ),
            ),
          ),
        catch: (cause) =>
          PlatformError.systemError({
            module: "Crypto",
            method: "deriveKeyFromSecret",
            _tag: "Unknown",
            description: "Could not derive key from secret",
            cause,
          }),
      }),
  );

  const hashSecret = Effect.fn("Crypto.hashSecret")(function* (secret: CryptoContract.Secret) {
    const salt = yield* generateToken(16);
    const derivedKey = yield* deriveKeyFromSecret(secret, salt);

    return new CryptoContract.Hash({ salt, derivedKey });
  });

  const verifySecret = Effect.fn("Crypto.verifySecret")(function* (
    secret: CryptoContract.Secret,
    { salt, derivedKey: storedKey }: CryptoContract.Hash,
  ) {
    const derivedKey = yield* deriveKeyFromSecret(secret, salt);

    const storedKeyBuffer = yield* Effect.try({
      try: () => Buffer.from(storedKey.pipe(Redacted.value), "base64"),
      catch: (cause) =>
        PlatformError.badArgument({
          module: "Crypto",
          method: "verifySecret",
          description: "Could not parse stored key",
          cause,
        }),
    });

    const derivedKeyBuffer = yield* Effect.try({
      try: () => Buffer.from(derivedKey.pipe(Redacted.value), "base64"),
      catch: (cause) =>
        PlatformError.badArgument({
          module: "Crypto",
          method: "verifySecret",
          description: "Could not parse derived key",
          cause,
        }),
    });

    yield* Effect.try({
      try: () => timingSafeEqual(storedKeyBuffer, derivedKeyBuffer),
      catch: (cause) =>
        PlatformError.badArgument({
          module: "Crypto",
          method: "verifySecret",
          description: "Could not verify secret",
          cause,
        }),
    }).pipe(Effect.filterOrFail(Predicate.isTruthy, () => new CryptoContract.InvalidSecretError()));
  });

  return {
    generateToken,
    deriveKeyFromSecret,
    hashSecret,
    verifySecret,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(Crypto));

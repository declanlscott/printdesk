import { scrypt, timingSafeEqual } from "node:crypto";

import { decodeJWT } from "@oslojs/jwt";
import * as EffectCrypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as PlatformError from "effect/PlatformError";
import * as Predicate from "effect/Predicate";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as SchemaIssue from "effect/SchemaIssue";

import { Crypto } from ".";
import { CryptoContract } from "./contract";

import type { ParseOptions } from "effect/SchemaAST";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const crypto = yield* EffectCrypto.Crypto;

  const generateToken = Effect.fn("Crypto.generateToken")((size: number = 32) =>
    crypto.randomBytes(size).pipe(
      Effect.map((bytes) => Buffer.from(bytes).toString("base64")),
      Effect.map(Redacted.make),
    ),
  );

  const deriveKeyFromSecret = Effect.fn("Crypto.deriveKeyFromSecret")(
    (secret: Redacted.Redacted<string>, salt: Redacted.Redacted<string>) =>
      Effect.tryPromise({
        try: () =>
          new Promise<Redacted.Redacted<string>>((resolve, reject) =>
            scrypt(
              secret.pipe(Redacted.value).normalize(),
              salt.pipe(Redacted.value),
              64,
              (error, derivedKey) =>
                error ? reject(error) : resolve(Redacted.make(derivedKey.toString("base64"))),
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

  const hashSecret = Effect.fn("Crypto.hashSecret")(function* (secret: Redacted.Redacted<string>) {
    const salt = yield* generateToken(16);
    const derivedKey = yield* deriveKeyFromSecret(secret, salt);

    return new CryptoContract.Hash({ salt, derivedKey });
  });

  const verifySecret = Effect.fn("Crypto.verifySecret")(function* (
    secret: Redacted.Redacted<string>,
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

  const decodeJwt = Effect.fn("Crypto.decodeJwt")(function* <TType, TServices>(
    jwt: string,
    Decoder: Schema.ConstraintDecoder<TType, TServices>,
    parseOptions?: ParseOptions,
  ) {
    const decode = Schema.NonEmptyString.pipe(
      Schema.decodeTo(Decoder, {
        decode: SchemaGetter.transformOrFail((jwt) =>
          Effect.try({
            try: () => decodeJWT(jwt),
            catch: (cause) => new CryptoContract.JwtDecodeError({ cause }),
          }).pipe(
            Effect.mapError(
              (e) => new SchemaIssue.InvalidValue(Option.some(jwt), { message: e.message }),
            ),
          ),
        ),
        encode: SchemaGetter.forbidden(() => "Not implemented"),
      }),
      Schema.decodeEffect,
    );

    return yield* decode(jwt, parseOptions);
  });

  return {
    generateToken,
    deriveKeyFromSecret,
    hashSecret,
    verifySecret,
    decodeJwt,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(Crypto));

import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { LicensesManager } from ".";
import { Crypto } from "../../crypto";
import { TenantsRepository } from "../../tenants/repositories";
import { LicensesContract } from "../contract";
import { LicensesRepository } from "../repository";

import type { License } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* LicensesRepository;
  const tenantsRepository = yield* TenantsRepository;
  const crypto = yield* Crypto;

  const issue = Effect.gen(function* () {
    const key = yield* crypto.generateToken();

    const { id } = yield* crypto
      .hashSecret(key)
      .pipe(Effect.flatMap((keyHash) => repository.create({ keyHash })));

    return new LicensesContract.KeyPair({ id, key });
  }).pipe(Effect.withSpan("Licenses.Manager.issue"));

  const verifyKeyPair = Effect.fn("Licenses.Manager.verifyKeyPair")(
    (keyPair: LicensesContract.KeyPair) =>
      repository
        .findById(keyPair.id)
        .pipe(Effect.tap((license) => crypto.verifySecret(keyPair.key, license.keyHash))),
  );

  const verifyKeyPairForUpdate = Effect.fn("Licenses.Manager.verifyKeyPairForUpdate")(
    (keyPair: LicensesContract.KeyPair) =>
      repository
        .findByIdForUpdate(keyPair.id)
        .pipe(Effect.tap((license) => crypto.verifySecret(keyPair.key, license.keyHash))),
  );

  const isAvailable = Effect.fn("Licenses.Manager.isAvailable")((id: License["id"]) =>
    tenantsRepository
      .findByLicenseId(id)
      .pipe(Effect.catchNoSuchElement, Effect.map(Option.isNone)),
  );

  const setExpiration = Effect.fn("Licenses.Manager.setExpiration")(
    (id: License["id"], addition: Partial<DateTime.DateTime.PartsForMath> = { years: 1 }) =>
      DateTime.now.pipe(
        Effect.map(DateTime.add(addition)),
        Effect.flatMap((expiresAt) => repository.updateById(id, { expiresAt })),
      ),
  );

  const renewExpiration = Effect.fn("Licenses.Manager.renewExpiration")(
    (id: License["id"], addition: Partial<DateTime.DateTime.PartsForMath> = { years: 1 }) =>
      repository.findByIdForUpdate(id).pipe(
        Effect.map(Struct.get("expiresAt")),
        Effect.filterOrElse(Predicate.isNotNull, () => DateTime.now),
        Effect.map(DateTime.add(addition)),
        Effect.flatMap((expiresAt) => repository.updateById(id, { expiresAt })),
      ),
  );

  const resetExpiration = Effect.fn("Licenses.Manager.resetExpiration")((id: License["id"]) =>
    repository.updateById(id, { expiresAt: null }),
  );

  return {
    issue,
    verifyKeyPair,
    verifyKeyPairForUpdate,
    isAvailable,
    setExpiration,
    renewExpiration,
    resetExpiration,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(LicensesManager));

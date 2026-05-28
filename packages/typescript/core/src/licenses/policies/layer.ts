import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

import { LicensesPolicies } from ".";
import { AccessControl } from "../../access-control";
import { PoliciesContract } from "../../policies/contract";
import { LicensesContract } from "../contract";
import { LicensesRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* LicensesRepository;

  const isAvailable = PoliciesContract.makePolicy(LicensesContract.isAvailable, {
    make: Effect.fn("Tenants.LicensesPolicies.isAvailable.make")(({ key }) =>
      repository.findByKeyWithTenant(key).pipe(
        Effect.map(
          ({ license, tenant }) =>
            license.status === "active" &&
            (license.tenantId === null || tenant?.status === "setup"),
        ),
        AccessControl.policy({
          name: LicensesContract.Table.name,
          id: key.pipe(Redacted.value),
        }),
      ),
    ),
  });

  return { isAvailable } as const;
});

export const layer = makeService.pipe(Layer.effect(LicensesPolicies));

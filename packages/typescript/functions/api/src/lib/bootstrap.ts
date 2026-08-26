import { Lambda } from "@effect-aws/client-lambda";
import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import { Bootstrap } from "@printdesk/core/bootstrap";
import * as ClientsRepository from "@printdesk/core/clients/repository/layer";
import * as Crypto from "@printdesk/core/crypto/layer";
import * as LicensesManager from "@printdesk/core/licenses/manager/layer";
import * as LicensesRepository from "@printdesk/core/licenses/repository/layer";
import { SstResource } from "@printdesk/core/sst/resource";
import * as TenantsRepositories from "@printdesk/core/tenants/repositories/layers";
import * as Layer from "effect/Layer";

import { databaseLayer } from "./database";

export const bootstrapLayer = Bootstrap.layer.pipe(
  Layer.provide([Lambda.defaultLayer, LicensesManager.layer, SstResource.layer]),
  Layer.provide([ClientsRepository.layer, Crypto.layer]),
  Layer.provide([LicensesRepository.layer, NodeCrypto.layer, TenantsRepositories.repositoryLayer]),
  Layer.provide(databaseLayer),
);

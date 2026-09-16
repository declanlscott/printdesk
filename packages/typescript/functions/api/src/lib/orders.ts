import { assetsS3BucketLayer } from "@printdesk/core/assets/bucket";
import { AssetsPresigner } from "@printdesk/core/assets/presigner";
import * as OrderObjectsPresigner from "@printdesk/core/orders/objects/presigner/layer";
import * as OrderObjectMetadataRepositories from "@printdesk/core/orders/objects/repositories/layers";
import { SstResource } from "@printdesk/core/sst/resource";
import * as Layer from "effect/Layer";

import { s3ClientCacheLayer } from "./aws";
import { databaseLayer } from "./database";

export const orderObjectsPresignerLayer = OrderObjectsPresigner.layer.pipe(
  Layer.provide([AssetsPresigner.layer, OrderObjectMetadataRepositories.repositoryLayer]),
  Layer.provide([assetsS3BucketLayer, databaseLayer, s3ClientCacheLayer]),
  Layer.provide(SstResource.layer),
);

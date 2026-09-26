import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import { AssetsPresigner } from "@printdesk/core/assets/presigner";
import * as Crypto from "@printdesk/core/crypto/layer";
import { Graph } from "@printdesk/core/graph";
import { ImagesPresigner } from "@printdesk/core/images/presigner";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";

import { appLayer } from "../lib/app";
import { assetsS3BucketLayer } from "../lib/assets";
import { entraIdClientCredentials } from "../lib/auth";
import { s3ClientCacheLayer } from "../lib/aws";
import { cloudflareLayer } from "../lib/cloudflare";
import { SstResource } from "../lib/sst";

export const runtime = Layer.mergeAll(
  appLayer,
  cloudflareLayer,
  Crypto.layer,
  entraIdClientCredentials,
  Graph.layer,
  ImagesPresigner.layer,
  SstResource.layer,
).pipe(
  Layer.provideMerge(FetchHttpClient.layer),
  Layer.provide([AssetsPresigner.layer, NodeCrypto.layer]),
  Layer.provide([assetsS3BucketLayer, s3ClientCacheLayer]),
  ManagedRuntime.make,
);

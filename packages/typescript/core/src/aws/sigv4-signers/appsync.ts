import * as Context from "effect/Context";
import * as Layer from "effect/Layer";

import { makeSigV4Signer } from "./factory";

export class AppsyncSigner extends Context.Service<AppsyncSigner>()(
  "@printdesk/core/aws/AppsyncSigner",
  { make: makeSigV4Signer("appsync") },
) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}

import * as ByteSize from "effect/ByteSize";
import * as Schema from "effect/Schema";

import { AssetsContract } from "../assets/contract";
import { NonEmptyString } from "../utils";
import { Constants } from "../utils/constants";

export namespace ImagesContract {
  export class PresignedUrlPayload extends AssetsContract.PresignedUrlPayload.extend<PresignedUrlPayload>(
    "PresignedUrlPayload",
  )({
    mimeType: Schema.Literals(Constants.IMAGE_MIME_TYPE_WHITELIST),
    byteSize: Schema.ByteSizeFromNumber.pipe(
      Schema.check(
        Schema.makeFilter(
          ByteSize.isLessThanOrEqualTo(ByteSize.fromInputUnsafe(Constants.IMAGE_BYTE_SIZE_LIMIT)),
        ),
      ),
    ),
  }) {}

  export const Key = Schema.TemplateLiteralParser(["images/", NonEmptyString]);
  export type Key = typeof Key.Type;
  export type EncodedKey = typeof Key.Encoded;
}

import { Api } from "../tenants/api";
import { Constants } from "../utils/constants";

export namespace Assets {
  export async function getBucketName() {
    const buckets = await Api.getBuckets();

    return buckets.assets;
  }

  export const getMimeTypes = () => Constants.ASSETS_MIME_TYPES;
}

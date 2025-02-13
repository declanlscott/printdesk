import { Constants } from "../utils/constants";
import { Api } from "./api";

export namespace Assets {
  export async function getBucket() {
    const buckets = await Api.getBuckets();

    return buckets.assets;
  }

  export const getMimeTypes = () => Constants.ASSETS_MIME_TYPES;
}

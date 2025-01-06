import * as v from "valibot";

import { Api } from "../tenants/api";
import { Ssm } from "../utils/aws";
import { Constants } from "../utils/constants";
import { HttpError } from "../utils/errors";

export namespace Documents {
  export async function getBucketName() {
    const buckets = await Api.getBuckets();

    return buckets.documents;
  }

  export async function setMimeTypes(mimeTypes: Array<string>) {
    const name = Constants.DOCUMENTS_MIME_TYPES_PARAMETER_NAME;

    await Ssm.putParameter({
      Name: name,
      Value: JSON.stringify(mimeTypes),
      Type: "StringList",
    });

    await Api.invalidateCache([`/parameters${name}`]);
  }

  export async function getMimeTypes() {
    const res = await Api.send(
      `/parameters${Constants.DOCUMENTS_MIME_TYPES_PARAMETER_NAME}`,
      { method: "GET" },
    );
    if (!res.ok)
      throw new HttpError.BadGateway({
        upstream: {
          error: new HttpError.Error(res.statusText, res.status),
          text: await res.text(),
        },
      });

    return v.parse(v.array(v.string()), await res.json());
  }

  export async function setSizeLimit(byteSize: number) {
    const name = Constants.DOCUMENTS_SIZE_LIMIT_PARAMETER_NAME;

    await Ssm.putParameter({
      Name: name,
      Value: byteSize.toString(),
      Type: "String",
    });

    await Api.invalidateCache([`/parameters${name}`]);
  }

  export async function getSizeLimit() {
    const res = await Api.send(
      `/parameters${Constants.DOCUMENTS_SIZE_LIMIT_PARAMETER_NAME}`,
      { method: "GET" },
    );
    if (!res.ok)
      throw new HttpError.BadGateway({
        upstream: {
          error: new HttpError.Error(res.statusText, res.status),
          text: await res.text(),
        },
      });

    return v.parse(v.number(), await res.text());
  }
}

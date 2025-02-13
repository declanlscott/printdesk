import { Resource } from "sst";
import * as v from "valibot";

import { useTenant } from "../tenants/context";
import { Ssm } from "../utils/aws";
import { Api } from "./api";

export namespace Documents {
  export async function getBucket() {
    const buckets = await Api.getBuckets();

    return buckets.documents;
  }

  export async function setMimeTypes(mimeTypes: Readonly<Array<string>>) {
    const name = Ssm.buildName(
      Resource.Aws.tenant.parameters.documentsMimeTypes.nameTemplate,
      useTenant().id,
    );

    await Ssm.putParameter({
      Name: name,
      Value: JSON.stringify(mimeTypes),
      Type: "StringList",
      Overwrite: true,
    });

    await Api.invalidateCache([`/parameters${name}`]);
  }

  export const getMimeTypes = async () =>
    v.parse(
      v.array(v.string()),
      JSON.parse(
        await Api.getParameter(
          Ssm.buildName(
            Resource.Aws.tenant.parameters.documentsMimeTypes.nameTemplate,
            useTenant().id,
          ),
        ),
      ),
    );

  export async function setSizeLimit(byteSize: number) {
    const name = Ssm.buildName(
      Resource.Aws.tenant.parameters.documentsSizeLimit.nameTemplate,
      useTenant().id,
    );

    await Ssm.putParameter({
      Name: name,
      Value: byteSize.toString(),
      Type: "String",
      Overwrite: true,
    });

    await Api.invalidateCache([`/parameters${name}`]);
  }

  export const getSizeLimit = async () =>
    v.parse(
      v.pipe(v.string(), v.transform(Number)),
      await Api.getParameter(
        Ssm.buildName(
          Resource.Aws.tenant.parameters.documentsSizeLimit.nameTemplate,
          useTenant().id,
        ),
      ),
    );
}

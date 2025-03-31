import { WaiterState } from "@smithy/util-waiter";

import {
  logicalName,
  physicalName,
} from "~/.sst/platform/src/components/naming";

import type {
  CreateClusterCommandInput,
  CreateClusterOutput,
  DSQLClient,
} from "@aws-sdk/client-dsql";

type ClusterInputs = Omit<CreateClusterCommandInput, "tags">;
export type ClusterProviderInputs = ClusterInputs;

type ClusterOutputs = {
  [TKey in keyof Omit<CreateClusterOutput, "creationTime">]: NonNullable<
    CreateClusterOutput[TKey]
  >;
} & {
  creationTime: string;
};
export interface ClusterProviderOutputs extends ClusterOutputs {
  tags: Record<string, string>;
}

export class ClusterProvider implements $util.dynamic.ResourceProvider {
  private _logicalName: string;

  constructor(name: string) {
    this._logicalName = logicalName(name);
  }

  private static _getSdk = async () => import("@aws-sdk/client-dsql");

  private static _getClient = async () =>
    ClusterProvider._getSdk().then((sdk) => new sdk.DSQLClient());

  private static async _untilActive(
    client: DSQLClient | undefined,
    identifier: string,
  ) {
    const result = await ClusterProvider._getSdk().then(async (sdk) =>
      sdk.waitUntilClusterActive(
        {
          client: client ?? (await ClusterProvider._getClient()),
          maxWaitTime: 900,
        },
        { identifier },
      ),
    );

    if (result.state !== WaiterState.SUCCESS)
      throw new Error(
        `Unsuccessfully waited for cluster "${identifier}" to be active, result state is "${result.state}": ${JSON.stringify(result.reason)}`,
      );
  }

  private static async _untilDeleted(
    client: DSQLClient | undefined,
    identifier: string,
  ) {
    const result = await ClusterProvider._getSdk().then(async (sdk) =>
      sdk.waitUntilClusterNotExists(
        {
          client: client ?? (await ClusterProvider._getClient()),
          maxWaitTime: 900,
        },
        { identifier },
      ),
    );

    if (result.state !== WaiterState.SUCCESS)
      throw new Error(
        `Unsuccessfully waited for cluster "${identifier}" to be deleted, result state is "${result.state}": ${JSON.stringify(result.reason)}`,
      );
  }

  private static _isValidOutput(
    output: Partial<ClusterOutputs>,
    metadata: unknown,
  ): output is ClusterOutputs {
    for (const key in output)
      if (output[key as keyof ClusterOutputs] === undefined) {
        console.error(metadata);
        return false;
      }

    return true;
  }

  async create(
    inputs: ClusterProviderInputs,
  ): Promise<$util.dynamic.CreateResult<ClusterProviderOutputs>> {
    const client = await ClusterProvider._getClient();

    const tags = {
      Name: physicalName(256, this._logicalName),
      "sst:app": $app.name,
      "sst:stage": $app.stage,
    };

    const output = await client.send(
      await ClusterProvider._getSdk().then(
        (sdk) => new sdk.CreateClusterCommand({ tags, ...inputs }),
      ),
    );

    const cluster = {
      identifier: output.identifier,
      arn: output.arn,
      status: output.status,
      creationTime: output.creationTime?.toISOString(),
      deletionProtectionEnabled: output.deletionProtectionEnabled,
    };

    if (!ClusterProvider._isValidOutput(cluster, output.$metadata))
      throw new Error("Failed to create cluster");

    await ClusterProvider._untilActive(client, cluster.identifier);

    return {
      id: cluster.identifier,
      outs: { ...cluster, status: "ACTIVE", tags },
    };
  }

  async read(
    id: string,
    props: ClusterProviderOutputs,
  ): Promise<$util.dynamic.ReadResult<ClusterProviderOutputs>> {
    const client = await ClusterProvider._getClient();

    const output = await client.send(
      await ClusterProvider._getSdk().then(
        (sdk) => new sdk.GetClusterCommand({ identifier: id }),
      ),
    );

    const cluster = {
      identifier: output.identifier,
      arn: output.arn,
      status: output.status,
      creationTime: output.creationTime?.toISOString(),
      deletionProtectionEnabled: output.deletionProtectionEnabled,
    };

    if (!ClusterProvider._isValidOutput(cluster, output.$metadata))
      throw new Error("Failed to read cluster");

    return {
      id,
      props: {
        ...props,
        ...cluster,
      },
    };
  }

  async update(
    id: string,
    olds: ClusterProviderOutputs,
    news: ClusterProviderInputs,
  ): Promise<$util.dynamic.UpdateResult<ClusterProviderOutputs>> {
    const client = await ClusterProvider._getClient();

    const output = await client.send(
      await ClusterProvider._getSdk().then(
        (sdk) => new sdk.UpdateClusterCommand({ identifier: id, ...news }),
      ),
    );

    const cluster = {
      identifier: output.identifier,
      arn: output.arn,
      status: output.status,
      creationTime: output.creationTime?.toISOString(),
      deletionProtectionEnabled: output.deletionProtectionEnabled,
    };

    if (!ClusterProvider._isValidOutput(cluster, output.$metadata))
      throw new Error("Failed to update cluster");

    await ClusterProvider._untilActive(client, cluster.identifier);

    return {
      outs: {
        ...olds,
        ...cluster,
        status: "ACTIVE",
      },
    };
  }

  async delete(id: string, _props: ClusterProviderOutputs): Promise<void> {
    const client = await ClusterProvider._getClient();

    const output = await client.send(
      await ClusterProvider._getSdk().then(
        (sdk) => new sdk.DeleteClusterCommand({ identifier: id }),
      ),
    );

    const cluster = {
      identifier: output.identifier,
      arn: output.arn,
      status: output.status,
      creationTime: output.creationTime?.toISOString(),
      deletionProtectionEnabled: output.deletionProtectionEnabled,
    };

    if (!ClusterProvider._isValidOutput(cluster, output.$metadata))
      throw new Error("Failed to delete cluster");

    await ClusterProvider._untilDeleted(client, id);
  }
}

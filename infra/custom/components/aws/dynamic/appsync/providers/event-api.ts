import {
  logicalName,
  physicalName,
} from "~/.sst/platform/src/components/naming";

import type { Api, CreateApiCommandInput } from "@aws-sdk/client-appsync";

type EventApiInputs = {
  [TKey in keyof Omit<CreateApiCommandInput, "tags">]: NonNullable<
    CreateApiCommandInput[TKey]
  >;
};
export interface EventApiProviderInputs extends Omit<EventApiInputs, "name"> {
  name?: string;
}

type EventApiOutputs = Required<Api>;
export type EventApiProviderOutputs = EventApiOutputs;

export class EventApiProvider implements $util.dynamic.ResourceProvider {
  private _logicalName: string;

  constructor(name: string) {
    this._logicalName = logicalName(name);
  }

  private static _getSdk = async () => import("@aws-sdk/client-appsync");

  private static _getClient = async () =>
    EventApiProvider._getSdk().then((sdk) => new sdk.AppSyncClient());

  async create(
    inputs: EventApiProviderInputs,
  ): Promise<$util.dynamic.CreateResult<EventApiProviderOutputs>> {
    const client = await EventApiProvider._getClient();

    const output = await client.send(
      await EventApiProvider._getSdk().then(
        (sdk) =>
          new sdk.CreateApiCommand({
            name: physicalName(50, this._logicalName),
            tags: {
              "sst:app": $app.name,
              "sst:stage": $app.stage,
            },
            ...inputs,
          }),
      ),
    );
    if (!output.api)
      throw new Error(`Failed creating api "${this._logicalName}"`);

    const api = output.api as EventApiOutputs;

    return {
      id: api.apiId,
      outs: api,
    };
  }

  async read(
    id: string,
    props: EventApiProviderOutputs,
  ): Promise<$util.dynamic.ReadResult<EventApiProviderOutputs>> {
    const client = await EventApiProvider._getClient();

    const output = await client.send(
      await EventApiProvider._getSdk().then(
        (sdk) => new sdk.GetApiCommand({ apiId: id }),
      ),
    );
    if (!output.api) throw new Error(`Failed reading api "${id}"`);

    const api = output.api as EventApiOutputs;

    return {
      id,
      props: { ...props, ...api },
    };
  }

  async update(
    id: string,
    olds: EventApiProviderOutputs,
    news: EventApiProviderInputs,
  ): Promise<$util.dynamic.UpdateResult<EventApiProviderOutputs>> {
    const client = await EventApiProvider._getClient();

    const output = await client.send(
      await EventApiProvider._getSdk().then(
        (sdk) =>
          new sdk.UpdateApiCommand({ apiId: id, name: olds.name, ...news }),
      ),
    );
    if (!output.api) throw new Error(`Failed updating api "${id}"`);

    const api = output.api as EventApiOutputs;

    return {
      outs: { ...olds, ...api },
    };
  }

  async delete(id: string, _props: EventApiProviderOutputs) {
    const client = await EventApiProvider._getClient();

    await client.send(
      await EventApiProvider._getSdk().then(
        (sdk) => new sdk.DeleteApiCommand({ apiId: id }),
      ),
    );
  }
}

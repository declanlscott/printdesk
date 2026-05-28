import * as Context from "effect/Context";
import * as Schema from "effect/Schema";
import { Replicache as _Replicache } from "replicache";

import type { ReplicacheOptions as _ReplicacheOptions, WriteTransaction } from "replicache";
import type { ServiceShape } from "./layer";

export namespace Replicache {
  type Mutators = Record<
    string,
    // oxlint-disable-next-line typescript/no-explicit-any
    (tx: WriteTransaction, args?: any) => any
  >;

  type InferMutator<
    // oxlint-disable-next-line typescript/no-explicit-any
    TMutator extends (tx: WriteTransaction, ...args: Array<any>) => any,
  > = TMutator extends (tx: WriteTransaction, ...args: infer TArgs) => infer TReturn
    ? (...args: TArgs) => TReturn extends Promise<Awaited<TReturn>> ? TReturn : Promise<TReturn>
    : never;

  type InferMutate<TMutators extends Mutators> = {
    readonly [TKey in keyof TMutators]: InferMutator<TMutators[TKey]>;
  };

  export interface Options<
    TMutators extends Mutators,
    // oxlint-disable-next-line typescript/no-empty-object-type
  > extends _ReplicacheOptions<{}> {
    mutators: TMutators;
  }

  export class Client<TMutators extends Mutators> extends _Replicache {
    // oxlint-disable-next-line no-useless-constructor
    public constructor(opts: Options<TMutators>) {
      super(opts);
    }

    public override get mutate() {
      return super.mutate as InferMutate<TMutators>;
    }
  }

  export class ClientError extends Schema.TaggedErrorClass<ClientError>()("ReplicacheClientError", {
    cause: Schema.Defect,
  }) {}

  export class QueryError extends Schema.TaggedErrorClass<QueryError>()("ReplicacheQueryError", {
    cause: Schema.Defect,
  }) {}

  export class SubscribeError extends Schema.TaggedErrorClass<SubscribeError>()(
    "ReplicacheSubscribeError",
    { cause: Schema.Defect },
  ) {}

  export class MutateError extends Schema.TaggedErrorClass<MutateError>()("ReplicacheMutateError", {
    cause: Schema.Defect,
  }) {}

  export class PullError extends Schema.TaggedErrorClass<PullError>()("ReplicachePullError", {
    cause: Schema.Defect,
  }) {}

  export class CloseError extends Schema.TaggedErrorClass<CloseError>()("ReplicacheCloseError", {
    cause: Schema.Defect,
  }) {}

  export class Replicache extends Context.Service<Replicache, ServiceShape>()(
    "@printdesk/core/replicache/client/Replicache",
  ) {}
}

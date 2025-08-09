import { Data, Effect, HashMap, Iterable, Schema } from "effect";

import { AccessControl } from "../access-control2";
import { ReplicacheContract } from "../replicache2/contracts";

import type { Tenant } from "../tenants2/sql";
import type { User } from "../users2/sql";

// TODO: Implement real session service in another module
interface Session {
  userId: User["id"];
  tenantId: Tenant["id"];
}

export namespace DataAccess {
  export class PolicySignature<
    TName extends string = string,
    TArgs extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
  > extends Data.Class<{ readonly name: TName; readonly Args: TArgs }> {}

  export type MakePolicyShape<
    TArgs extends Schema.Schema.AnyNoContext,
    TError,
    TContext,
  > = Effect.Effect<
    { readonly make: AccessControl.MakePolicy<TArgs, TError, TContext> },
    TError,
    TContext
  >;

  export const makePolicy = <
    TName extends string,
    TArgs extends Schema.Schema.AnyNoContext,
    TError,
    TContext,
  >(
    _signature: PolicySignature<TName, TArgs>,
    makePolicy: MakePolicyShape<TArgs, TError, TContext>,
  ) => makePolicy;

  type PolicySignatureRegister<
    TName extends string = string,
    TSignature extends PolicySignature = PolicySignature,
  > = Record<TName, TSignature>;

  type InferPolicySignature<TRegister extends PolicySignatureRegister> = {
    [TName in keyof TRegister]: Schema.Struct<{
      name: Schema.Literal<[TName & string]>;
      args: TRegister[TName]["Args"];
    }>;
  }[keyof TRegister];

  export class PolicySignatureRegistry<
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    TRegister extends PolicySignatureRegister = {},
  > {
    #signatures = HashMap.empty<string, PolicySignature>();

    register<TName extends string, TArgs extends Schema.Schema.AnyNoContext>(
      signature: PolicySignature<TName, TArgs>,
    ): PolicySignatureRegistry<
      TRegister & PolicySignatureRegister<TName, PolicySignature<TName, TArgs>>
    > {
      this.#signatures = HashMap.set(
        this.#signatures,
        signature.name,
        signature,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
      return this as any;
    }

    dispatch<TName extends keyof TRegister & string, TError, TContext>(
      name: TName,
      args: Schema.Schema.Type<TRegister[TName]["Args"]>,
      makePolicy: MakePolicyShape<TRegister[TName]["Args"], TError, TContext>,
    ) {
      return makePolicy.pipe(
        Effect.flatMap(({ make }) => make(args)),
        Effect.withSpan("DataAccess.PolicySignatureRegistry.dispatch", {
          attributes: { name },
        }),
      );
    }

    get Schema() {
      return Schema.Union(
        ...this.#signatures.pipe(
          HashMap.values,
          Iterable.map(
            (policy) =>
              Schema.Struct({
                name: Schema.Literal(policy.name),
                args: policy.Args,
              }) as InferPolicySignature<TRegister>,
          ),
        ),
      );
    }
  }

  export class MutationSignature<
    TName extends string = string,
    TArgs extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
  > extends Data.Class<{ readonly name: TName; readonly Args: TArgs }> {}

  export type Mutator<
    TArgs extends Schema.Schema.AnyNoContext,
    TSuccess,
    TError,
    TContext,
  > = (
    args: Schema.Schema.Type<TArgs>,
    session: Session,
  ) => Effect.Effect<TSuccess, TError, TContext>;

  export type MutationShape<
    TArgs extends Schema.Schema.AnyNoContext,
    TPolicyError,
    TPolicyContext,
    TMutatorSuccess,
    TMutatorError,
    TMutatorContext,
    TMutationError,
    TMutationContext,
  > = Effect.Effect<
    {
      readonly makePolicy: AccessControl.MakePolicy<
        TArgs,
        TPolicyError,
        TPolicyContext
      >;
      readonly mutator: Mutator<
        TArgs,
        TMutatorSuccess,
        TMutatorError,
        TMutatorContext
      >;
    },
    TMutationError,
    TMutationContext
  >;

  export const makeMutation = <
    TName extends string,
    TArgs extends Schema.Schema.AnyNoContext,
    TPolicyError,
    TPolicyContext,
    TMutatorSuccess,
    TMutatorError,
    TMutatorContext,
    TMutationError,
    TMutationContext,
  >(
    _signature: MutationSignature<TName, TArgs>,
    mutation: MutationShape<
      TArgs,
      TPolicyError,
      TPolicyContext,
      TMutatorSuccess,
      TMutatorError,
      TMutatorContext,
      TMutationError,
      TMutationContext
    >,
  ) => mutation;

  type MutationSignatureRegister<
    TName extends string = string,
    TSignature extends MutationSignature = MutationSignature,
  > = Record<TName, TSignature>;

  type InferMutationSignature<TRegister extends MutationSignatureRegister> = {
    [TName in keyof TRegister]: Schema.Struct<{
      name: Schema.Literal<[TName & string]>;
      args: TRegister[TName]["Args"];
    }>;
  }[keyof TRegister];

  export class MutationSignatureRegistry<
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    TRegister extends MutationSignatureRegister = {},
  > extends Data.Class<{ readonly session: Session }> {
    #signatures = HashMap.empty<string, MutationSignature>();

    register<TName extends string, TArgs extends Schema.Schema.AnyNoContext>(
      signature: MutationSignature<TName, TArgs>,
    ): MutationSignatureRegistry<
      TRegister &
        MutationSignatureRegister<TName, MutationSignature<TName, TArgs>>
    > {
      this.#signatures = HashMap.set(
        this.#signatures,
        signature.name,
        signature,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
      return this as any;
    }

    dispatch<
      TName extends keyof TRegister & string,
      TPolicyError,
      TPolicyContext,
      TMutatorSuccess,
      TMutatorError,
      TMutatorContext,
      TMutationError,
      TMutationContext,
    >(
      name: TName,
      args: Schema.Schema.Type<TRegister[TName]["Args"]>,
      mutation: MutationShape<
        TRegister[TName]["Args"],
        TPolicyError,
        TPolicyContext,
        TMutatorSuccess,
        TMutatorError,
        TMutatorContext,
        TMutationError,
        TMutationContext
      >,
    ) {
      return mutation.pipe(
        Effect.flatMap(({ makePolicy, mutator }) =>
          mutator(args, this.session).pipe(
            AccessControl.enforce(makePolicy(args)),
          ),
        ),
        Effect.withSpan("DataAccess.MutationSignatureRegistry.dispatch", {
          attributes: { name },
        }),
      );
    }

    get ReplicacheMutation() {
      return Schema.Union(
        ...this.#signatures.pipe(
          HashMap.values,
          Iterable.map((signature) =>
            Schema.extend(
              ReplicacheContract.MutationV1.omit("name", "args"),
              Schema.Struct({
                name: Schema.Literal(signature.name),
                args: signature.Args,
              }) as InferMutationSignature<TRegister>,
            ),
          ),
        ),
      );
    }
  }
}

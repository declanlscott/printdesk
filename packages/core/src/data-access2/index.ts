import { Data, Effect, HashMap } from "effect";

import type { Schema } from "effect";
import type { AccessControl } from "../access-control2";
import type { AuthContract } from "../auth2/contract";

export namespace DataAccess {
  export class Function<
    TName extends string = string,
    TArgs extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
    TReturns extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
  > extends Data.Class<{
    readonly name: TName;
    readonly Args: TArgs;
    readonly Returns: TReturns;
  }> {
    makeInvocation = (args: Schema.Schema.Type<TArgs>) => ({
      name: this.name,
      args,
    });
  }

  type FunctionRecord<TFunction extends Function = Function> = Record<
    TFunction["name"],
    TFunction
  >;

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export class Functions<TRecord extends FunctionRecord = {}, TIsDone = false> {
    #isDone = false;
    #map = HashMap.empty<Function["name"], Function>();

    readonly RecordType = {} as {
      [TName in keyof TRecord]: Function<
        TName & string,
        TRecord[TName]["Args"]
      >;
    };

    add<TFunction extends Function>(
      fn: TIsDone extends false ? TFunction : never,
    ): Functions<TRecord & FunctionRecord<TFunction>, TIsDone> {
      if (!this.#isDone) this.#map = HashMap.set(this.#map, fn.name, fn);

      return this;
    }

    done(
      this: TIsDone extends false ? Functions<TRecord, TIsDone> : never,
    ): Functions<TRecord, true> {
      this.#isDone = true;

      return this;
    }

    get map() {
      return this.#map;
    }
  }

  export type MakePolicyShape<
    TName extends string,
    TArgs extends Schema.Schema.AnyNoContext,
    TPolicyError,
    TPolicyContext,
    TMakePolicyError,
    TMakePolicyContext,
  > = Effect.Effect<
    {
      readonly name: TName;
      readonly make: AccessControl.MakePolicy<
        TArgs,
        TPolicyError,
        TPolicyContext
      >;
    },
    TMakePolicyError,
    TMakePolicyContext
  >;

  export const makePolicy = <
    TFunction extends Function,
    TPolicyError,
    TPolicyContext,
    TMakePolicyError,
    TMakePolicyContext,
  >(
    fn: TFunction,
    make: Effect.Effect<
      Omit<
        Effect.Effect.Success<
          MakePolicyShape<
            TFunction["name"],
            TFunction["Args"],
            TPolicyError,
            TPolicyContext,
            TMakePolicyError,
            TMakePolicyContext
          >
        >,
        "name"
      >,
      TMakePolicyError,
      TMakePolicyContext
    >,
  ): MakePolicyShape<
    TFunction["name"],
    TFunction["Args"],
    TPolicyError,
    TPolicyContext,
    TMakePolicyError,
    TMakePolicyContext
  > => make.pipe(Effect.map((rest) => ({ name: fn.name, ...rest })));

  export type Mutator<
    TArgs extends Schema.Schema.AnyNoContext,
    TSuccess,
    TError,
    TContext,
  > = (
    args: Schema.Schema.Type<TArgs>,
    session: AuthContract.Session,
  ) => Effect.Effect<TSuccess, TError, TContext>;

  export type MutationShape<
    TName extends string,
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
      readonly name: TName;
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
    TFunction extends Function,
    TPolicyError,
    TPolicyContext,
    TMutatorSuccess extends Schema.Schema.Type<TFunction["Returns"]>,
    TMutatorError,
    TMutatorContext,
    TMutationError,
    TMutationContext,
  >(
    fn: TFunction,
    make: Effect.Effect<
      Omit<
        Effect.Effect.Success<
          MutationShape<
            TFunction["name"],
            TFunction["Args"],
            TPolicyError,
            TPolicyContext,
            TMutatorSuccess,
            TMutatorError,
            TMutatorContext,
            TMutationError,
            TMutationContext
          >
        >,
        "name"
      >,
      TMutationError,
      TMutationContext
    >,
  ): MutationShape<
    TFunction["name"],
    TFunction["Args"],
    TPolicyError,
    TPolicyContext,
    TMutatorSuccess,
    TMutatorError,
    TMutatorContext,
    TMutationError,
    TMutationContext
  > => make.pipe(Effect.map((rest) => ({ name: fn.name, ...rest })));
}

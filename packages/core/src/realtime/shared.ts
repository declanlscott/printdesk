import * as v from "valibot";

const successMessageObject = <TSuccessName extends string>(
  successName: TSuccessName,
): v.ObjectSchema<
  {
    readonly type: v.LiteralSchema<`${TSuccessName}_success`, undefined>;
    readonly id: v.StringSchema<undefined>;
  },
  undefined
> =>
  v.object({
    type: v.literal(`${successName}_success`),
    id: v.string(),
  });

const errorMessageObject = <TErrorName extends string>(
  errorName: TErrorName,
): v.ObjectSchema<
  {
    readonly type: v.LiteralSchema<`${TErrorName}_error`, undefined>;
    readonly id: v.StringSchema<undefined>;
    readonly errors: v.ArraySchema<
      v.ObjectSchema<
        {
          readonly errorType: v.StringSchema<undefined>;
          readonly message: v.StringSchema<undefined>;
        },
        undefined
      >,
      undefined
    >;
  },
  undefined
> =>
  v.object({
    type: v.literal(`${errorName}_error`),
    id: v.string(),
    errors: v.array(v.object({ errorType: v.string(), message: v.string() })),
  });

const messageObjects = <TName extends string>(name: TName) =>
  [successMessageObject(name), errorMessageObject(name)] as const;

export const messageSchema = v.variant("type", [
  v.object({
    type: v.literal("connection_ack"),
    connectionTimeoutMs: v.number(),
  }),
  ...messageObjects("subscribe"),
  v.object({ type: v.literal("data"), id: v.string(), event: v.unknown() }),
  errorMessageObject("broadcast"),
  v.object({ type: v.literal("ka") }),
  ...messageObjects("unsubscribe"),
]);

export type Message = v.InferOutput<typeof messageSchema>;

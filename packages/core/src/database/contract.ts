import * as HttpApiSchema from "@effect/platform/HttpApiSchema";
import * as Schema from "effect/Schema";

export namespace DatabaseContract {
  export class TransactionError extends Schema.TaggedError<TransactionError>(
    "TransactionError",
  )(
    "TransactionError",
    { cause: Schema.Defect },
    HttpApiSchema.annotations({ status: 500 }),
  ) {}

  export class QueryBuilderError extends Schema.TaggedError<QueryBuilderError>(
    "QueryBuilderError",
  )(
    "QueryBuilderError",
    { cause: Schema.Defect },
    HttpApiSchema.annotations({ status: 500 }),
  ) {}
}

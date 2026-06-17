import { parse } from "aws-cron-parser";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";

export namespace AwsCron {
  export class ParseExpressionError extends Schema.TaggedErrorClass<ParseExpressionError>()(
    "AwsCronParseExpressionError",
    { cause: Schema.Defect() },
  ) {}

  export const parseExpression = (expression: string) =>
    Result.try({
      try: () => parse(expression),
      catch: (error) => new ParseExpressionError({ cause: error }),
    });

  export const Expression = Schema.NonEmptyString.pipe(
    Schema.check(
      Schema.makeFilter((expression) => {
        const result = parseExpression(expression);
        if (Result.isFailure(result)) return result.failure.message;
      }),
    ),
  );
}

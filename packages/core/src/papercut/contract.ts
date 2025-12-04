import * as Schema from "effect/Schema";

export namespace PapercutContract {
  export const TailnetUri = Schema.NonEmptyString.pipe(
    Schema.brand("PapercutTailnetUri"),
    Schema.Redacted,
  );
  export type TailnetUri = typeof TailnetUri.Type;

  export const AuthToken = Schema.NonEmptyString.pipe(
    Schema.brand("PapercutAuthToken"),
    Schema.Redacted,
  );
  export type AuthToken = typeof AuthToken.Type;
}

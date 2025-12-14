import * as Schema from "effect/Schema";

export namespace PapercutContract {
  export class TailscaleService extends Schema.Class<TailscaleService>(
    "TailscaleService",
  )({
    domain: Schema.NonEmptyString.pipe(Schema.trimmed()),
    path: Schema.NonEmptyString.pipe(
      Schema.trimmed(),
      Schema.optionalWith({ default: () => "/" }),
    ),
  }) {}

  export const WebServicesAuthToken = Schema.NonEmptyString.pipe(
    Schema.brand("PapercutWebServicesAuthToken"),
    Schema.Redacted,
  );
  export type WebServicesAuthToken = typeof WebServicesAuthToken.Type;
}

import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as Effect from "effect/Effect";

import { Api } from "../api";

export namespace Storage {
  export namespace Documents {
    export class Client extends Effect.Service<Client>()(
      "@printdesk/core/storage/DocumentsClient",
      {
        accessors: true,
        dependencies: [Api.HttpClient.Default],
        effect: Effect.gen(function* () {
          const { execute } = yield* Api.HttpClient;

          const getMimeTypes = HttpClientRequest.get(
            "/documents/mime-types",
          ).pipe(execute, Effect.withSpan("Storage.Documents.getMimeTypes"));

          const setMimeTypes = Effect.fn(
            "Storage.Documents.Client.setMimeTypes",
          )(() => HttpClientRequest.put("/documents/mime-types").pipe(execute));

          const getSizeLimit = HttpClientRequest.get(
            "/documents/size-limit",
          ).pipe(execute, Effect.withSpan("Storage.Documents.getSizeLimit"));

          const setSizeLimit = Effect.fn(
            "Storage.Documents.Client.setSizeLimit",
          )(() => HttpClientRequest.put("/documents/size-limit").pipe(execute));

          return {
            getMimeTypes,
            setMimeTypes,
            getSizeLimit,
            setSizeLimit,
          } as const;
        }),
      },
    ) {}
  }
}

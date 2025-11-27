import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as Effect from "effect/Effect";

import { Api } from "../api";

export namespace Files {
  export namespace Documents {
    export class Client extends Effect.Service<Client>()(
      "@printdesk/core/files/DocumentsClient",
      {
        accessors: true,
        dependencies: [Api.Http.Default],
        effect: Effect.gen(function* () {
          const httpClient = yield* Api.Http.client;

          const getMimeTypes = HttpClientRequest.get(
            "/documents/mime-types",
          ).pipe(
            httpClient.execute,
            Effect.withSpan("Files.Documents.getMimeTypes"),
          );

          const setMimeTypes = Effect.fn("Files.Documents.Client.setMimeTypes")(
            () =>
              HttpClientRequest.put("/documents/mime-types").pipe(
                httpClient.execute,
              ),
          );

          const getSizeLimit = HttpClientRequest.get(
            "/documents/size-limit",
          ).pipe(
            httpClient.execute,
            Effect.withSpan("Files.Documents.getSizeLimit"),
          );

          const setSizeLimit = Effect.fn("Files.Documents.Client.setSizeLimit")(
            () =>
              HttpClientRequest.put("/documents/size-limit").pipe(
                httpClient.execute,
              ),
          );

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

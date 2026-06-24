import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";
import * as Cache from "effect/Cache";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Redacted from "effect/Redacted";
import * as RequestResolver from "effect/RequestResolver";
import * as Struct from "effect/Struct";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";

import {
  PapercutApi,
  PapercutApiRequest,
  SharedAccountBalanceAdjustmentFailure,
  sharedAccountPropertySchemas,
  UserAndGroupSyncFailure,
  type SharedAccountPropertySchemas,
} from ".";
import { Actor } from "../../actors";
import { Config } from "../../config";
import { SstResource } from "../../sst/resource";
import { TenantId, tenantTemplate } from "../../utils";
import { Constants } from "../../utils/constants";
import { XmlRpcContract } from "../../xml/contracts";
import { XmlRpc } from "../../xml/rpc";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const config = yield* Config;
  const resource = yield* SstResource;
  const xmlRpc = yield* XmlRpc.XmlRpc;

  const textEncoder = new TextEncoder();
  const httpClientCache = yield* Cache.make({
    capacity: 10,
    lookup: Effect.fn(function* (tenantId: TenantId) {
      const httpClient = yield* HttpClient.HttpClient;

      const url = tenantTemplate(
        resource.Hostnames.pipe(Redacted.value).papercutApiTemplate,
        TenantId.make(encodeBase32LowerCaseNoPadding(textEncoder.encode(tenantId)), {
          disableChecks: true,
        }),
      );

      return httpClient.pipe(
        HttpClient.mapRequest(HttpClientRequest.prependUrl(url)),
        HttpClient.filterStatusOk,
      );
    }),
  });

  const resolver = RequestResolver.make<PapercutApiRequest>((entries) =>
    Effect.forEach(entries, (entry) =>
      Actor.use(Struct.get("assertPrivate")).pipe(
        Effect.provideContext(entry.context),
        Effect.flatMap(({ tenantId }) => httpClientCache.pipe(Cache.get(tenantId))),
        Effect.flatMap((client) => client.execute(entry.request)),
        Effect.exit,
        Effect.map(entry.completeUnsafe),
      ),
    ),
  ).pipe(
    RequestResolver.setDelay(Constants.PAPERCUT_API_REQUEST_BATCH_DELAY),
    RequestResolver.batchN(Constants.PAPERCUT_API_REQUEST_BATCH_SIZE),
    RequestResolver.withSpan("Papercut.Api.resolver"),
  );

  const batchRequest = Effect.fn("Papercut.Api.batchRequest")(
    (request: HttpClientRequest.HttpClientRequest) =>
      new PapercutApiRequest(request).pipe(Effect.request(resolver)),
  );

  const adjustSharedAccountAccountBalance = Effect.fn(
    "Papercut.Api.adjustSharedAccountAccountBalance",
  )((sharedAccountName: string, amount: number, comment: string) =>
    config.getPapercutApiAuthToken.pipe(
      Effect.flatMap((authToken) =>
        xmlRpc.request("api.adjustSharedAccountAccountBalance", [
          XmlRpc.string(authToken.pipe(Redacted.value)),
          XmlRpc.string(sharedAccountName),
          XmlRpc.double(amount),
          XmlRpc.string(comment),
        ]),
      ),
      Effect.flatMap(batchRequest),
      Effect.flatMap(xmlRpc.response(XmlRpcContract.BooleanResponse)),
      Effect.filterOrFail(Predicate.isTruthy, () => new SharedAccountBalanceAdjustmentFailure()),
      Effect.asVoid,
    ),
  );

  const getGroupMembers = Effect.fn("Papercut.Api.getGroupMembers")(
    (groupName: string, offset: number, limit: number) =>
      config.getPapercutApiAuthToken.pipe(
        Effect.flatMap((authToken) =>
          xmlRpc.request("api.getGroupMembers", [
            XmlRpc.string(authToken.pipe(Redacted.value)),
            XmlRpc.string(groupName),
            XmlRpc.int(offset),
            XmlRpc.int(limit),
          ]),
        ),
        Effect.flatMap(batchRequest),
        Effect.flatMap(
          xmlRpc.response(XmlRpcContract.arrayResponse(XmlRpcContract.Value.fields.value)),
        ),
      ),
  );

  // NOTE: Not using `Effect.fn` here because TypeScript will error with:
  // "Type instantiation is excessively deep and possibly infinite."
  const getSharedAccountProperties = <
    TPropertyKeys extends Array<keyof SharedAccountPropertySchemas>,
  >(
    sharedAccountName: string,
    ...propertyKeys: TPropertyKeys
  ) =>
    config.getPapercutApiAuthToken.pipe(
      Effect.flatMap((authToken) =>
        xmlRpc.request("api.getSharedAccountProperties", [
          XmlRpc.string(authToken.pipe(Redacted.value)),
          XmlRpc.string(sharedAccountName),
          XmlRpc.stringArray(propertyKeys),
        ]),
      ),
      Effect.flatMap(batchRequest),
      Effect.flatMap(
        xmlRpc.response(
          XmlRpcContract.tupleResponse(
            ...(propertyKeys.map((key) => sharedAccountPropertySchemas[key]) as {
              [TKey in keyof TPropertyKeys]: SharedAccountPropertySchemas[TPropertyKeys[TKey]];
            }),
          ),
        ),
      ),
      Effect.withSpan("Papercut.Api.getSharedAccountProperties"),
    );

  const getTaskStatus = xmlRpc
    .request("api.getTaskStatus", [])
    .pipe(
      Effect.flatMap(batchRequest),
      Effect.flatMap(
        xmlRpc.response(
          XmlRpcContract.structResponse(
            XmlRpcContract.member("completed", XmlRpcContract.Boolean.fields.value),
            XmlRpcContract.member("message", XmlRpcContract.Value.fields.value),
          ),
        ),
      ),
      Effect.withSpan("Papercut.Api.getTaskStatus"),
    );

  const getTotalUsers = config.getPapercutApiAuthToken.pipe(
    Effect.flatMap((authToken) =>
      xmlRpc.request("api.getTotalUsers", [XmlRpc.string(authToken.pipe(Redacted.value))]),
    ),
    Effect.flatMap(batchRequest),
    Effect.flatMap(xmlRpc.response(XmlRpcContract.IntResponse)),
    Effect.withSpan("Papercut.Api.getTotalUsers"),
  );

  const listSharedAccounts = Effect.fn("Papercut.Api.listSharedAccounts")(
    (offset: number, limit: number) =>
      config.getPapercutApiAuthToken.pipe(
        Effect.flatMap((authToken) =>
          xmlRpc.request("api.listSharedAccounts", [
            XmlRpc.string(authToken.pipe(Redacted.value)),
            XmlRpc.int(offset),
            XmlRpc.int(limit),
          ]),
        ),
        Effect.flatMap(batchRequest),
        Effect.flatMap(
          xmlRpc.response(XmlRpcContract.arrayResponse(XmlRpcContract.Value.fields.value)),
        ),
      ),
  );

  const listUserGroups = Effect.fn("Papercut.Api.listUserGroups")((offset: number, limit: number) =>
    config.getPapercutApiAuthToken.pipe(
      Effect.flatMap((authToken) =>
        xmlRpc.request("api.listUserGroups", [
          XmlRpc.string(authToken.pipe(Redacted.value)),
          XmlRpc.int(offset),
          XmlRpc.int(limit),
        ]),
      ),
      Effect.flatMap(batchRequest),
      Effect.flatMap(
        xmlRpc.response(XmlRpcContract.arrayResponse(XmlRpcContract.Value.fields.value)),
      ),
    ),
  );

  const performUserAndGroupSync = config.getPapercutApiAuthToken.pipe(
    Effect.flatMap((authToken) =>
      xmlRpc.request("api.performUserAndGroupSync", [
        XmlRpc.string(authToken.pipe(Redacted.value)),
      ]),
    ),
    Effect.flatMap(batchRequest),
    Effect.flatMap(xmlRpc.response(XmlRpcContract.BooleanResponse)),
    Effect.filterOrFail(Predicate.isTruthy, () => new UserAndGroupSyncFailure()),
    Effect.asVoid,
    Effect.withSpan("Papercut.Api.performUserAndGroupSync"),
  );

  return {
    adjustSharedAccountAccountBalance,
    getGroupMembers,
    getSharedAccountProperties,
    getTaskStatus,
    getTotalUsers,
    listSharedAccounts,
    listUserGroups,
    performUserAndGroupSync,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(PapercutApi));

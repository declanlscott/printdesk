import * as Cache from "effect/Cache";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Redacted from "effect/Redacted";
import * as RequestResolver from "effect/RequestResolver";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as Stream from "effect/Stream";
import * as Tuple from "effect/Tuple";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";

import {
  PapercutApi,
  PapercutApiRequest,
  SharedAccountBalanceAdjustmentFailure,
  sharedAccountPropertySchemas,
  UserAndGroupSyncFailure,
} from ".";
import { Actor } from "../../actors";
import { Config } from "../../config";
import { CustomerGroupsContract } from "../../groups/contracts";
import { Oauth } from "../../oauth";
import { SharedAccountsContract } from "../../shared-accounts/contracts";
import { SstResource } from "../../sst/resource";
import { TenantsContract } from "../../tenants/contract";
import { UsersContract } from "../../users/contract";
import { TenantId, tenantTemplate } from "../../utils";
import { Constants } from "../../utils/constants";
import { XmlRpcContract } from "../../xml/contracts";
import { XmlRpc } from "../../xml/rpc";

import type { ActorsContract } from "../../actors/contract";
import type { OauthContract } from "../../oauth/contract";
import type { SharedAccountPropertySchemas } from ".";

export type ServiceShape = Effect.Success<typeof makeService>;

export class HttpClientCacheLookupKey extends Data.Class<{
  actor: ActorsContract.Actor;
  accessToken: OauthContract.Tokens["access"];
}> {}

export const makeService = Effect.gen(function* () {
  const config = yield* Config;
  const resource = yield* SstResource;
  const xmlRpc = yield* XmlRpc.XmlRpc;

  const baseHttpClient = yield* HttpClient.HttpClient;
  const httpClientCache = yield* Cache.make({
    capacity: 10,
    lookup: Effect.fn(function* (key: HttpClientCacheLookupKey) {
      const hostname = yield* key.actor.tenantId.pipe(
        Effect.flatMap(Schema.encodeEffect(TenantsContract.IdFromUnpaddedBase32String)),
        Effect.map((base32) => TenantId.make(base32, { disableChecks: true })),
        Effect.map(tenantTemplate(resource.Hostnames.pipe(Redacted.value).papercutApiTemplate)),
      );

      return baseHttpClient.pipe(
        HttpClient.mapRequest(HttpClientRequest.prependUrl(`https://${hostname}`)),
        HttpClient.mapRequest(
          HttpClientRequest.setHeader(
            "Proxy-Authorization",
            `Bearer ${key.accessToken.pipe(Redacted.value)}`,
          ),
        ),
        HttpClient.filterStatusOk,
      );
    }),
  });

  const resolver = RequestResolver.make<PapercutApiRequest>(
    Effect.forEach((entry) =>
      httpClientCache.pipe(
        Cache.get(
          new HttpClientCacheLookupKey({
            actor: entry.context.pipe(Context.get(Actor)),
            accessToken: entry.context.pipe(Context.get(Oauth.AccessToken)),
          }),
        ),
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
      Effect.request(new PapercutApiRequest(request), resolver),
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
          xmlRpc.response(
            XmlRpcContract.arrayResponse(
              XmlRpcContract.Value.fields.value.pipe(
                Schema.decodeTo(UsersContract.Username, {
                  decode: SchemaGetter.passthrough(),
                  encode: SchemaGetter.passthrough(),
                }),
              ),
            ),
          ),
        ),
      ),
  );

  const getGroupMembersStream = (groupName: string) =>
    Stream.paginate(0, (offset) =>
      getGroupMembers(groupName, offset, Constants.PAPERCUT_API_PAGINATION_LIMIT).pipe(
        Effect.map((page) =>
          Tuple.make(
            page,
            page.length >= Constants.PAPERCUT_API_PAGINATION_LIMIT
              ? Option.some(offset + page.length)
              : Option.none(),
          ),
        ),
      ),
    ).pipe(Stream.withSpan("Papercut.Api.getGroupMembersStream"));

  const getSharedAccountProperties = <
    const TPropertyKeys extends Array<keyof SharedAccountPropertySchemas>,
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
          xmlRpc.response(
            XmlRpcContract.arrayResponse(
              XmlRpcContract.Value.fields.value.pipe(
                Schema.decodeTo(SharedAccountsContract.Name, {
                  decode: SchemaGetter.passthrough(),
                  encode: SchemaGetter.passthrough(),
                }),
              ),
            ),
          ),
        ),
      ),
  );

  const listSharedAccountsStream = Stream.paginate(0, (offset) =>
    listSharedAccounts(offset, Constants.PAPERCUT_API_PAGINATION_LIMIT).pipe(
      Effect.map((page) =>
        Tuple.make(
          page,
          page.length >= Constants.PAPERCUT_API_PAGINATION_LIMIT
            ? Option.some(offset + page.length)
            : Option.none(),
        ),
      ),
    ),
  ).pipe(Stream.withSpan("Papercut.Api.listSharedAccountsStream"));

  const listUserAccounts = Effect.fn("Papercut.Api.listUserAccounts")(
    (offset: number, limit: number) =>
      config.getPapercutApiAuthToken.pipe(
        Effect.flatMap((authToken) =>
          xmlRpc.request("api.listUserAccounts", [
            XmlRpc.string(authToken.pipe(Redacted.value)),
            XmlRpc.int(offset),
            XmlRpc.int(limit),
          ]),
        ),
        Effect.flatMap(batchRequest),
        Effect.flatMap(
          xmlRpc.response(
            XmlRpcContract.arrayResponse(
              XmlRpcContract.Value.fields.value.pipe(
                Schema.decodeTo(UsersContract.Username, {
                  decode: SchemaGetter.passthrough(),
                  encode: SchemaGetter.passthrough(),
                }),
              ),
            ),
          ),
        ),
      ),
  );

  const listUserAccountsStream = Stream.paginate(0, (offset) =>
    listUserAccounts(offset, Constants.PAPERCUT_API_PAGINATION_LIMIT).pipe(
      Effect.map((page) =>
        Tuple.make(
          page,
          page.length >= Constants.PAPERCUT_API_PAGINATION_LIMIT
            ? Option.some(offset + page.length)
            : Option.none(),
        ),
      ),
    ),
  ).pipe(Stream.withSpan("Papercut.Api.listUserAccountsStream"));

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
        xmlRpc.response(
          XmlRpcContract.arrayResponse(
            XmlRpcContract.Value.fields.value.pipe(
              Schema.decodeTo(CustomerGroupsContract.Name, {
                decode: SchemaGetter.passthrough(),
                encode: SchemaGetter.passthrough(),
              }),
            ),
          ),
        ),
      ),
    ),
  );

  const listUserGroupsStream = Stream.paginate(0, (offset) =>
    listUserGroups(offset, Constants.PAPERCUT_API_PAGINATION_LIMIT).pipe(
      Effect.map((page) =>
        Tuple.make(
          page,
          page.length >= Constants.PAPERCUT_API_PAGINATION_LIMIT
            ? Option.some(offset + page.length)
            : Option.none(),
        ),
      ),
    ),
  ).pipe(Stream.withSpan("Papercut.Api.listUserGroupsStream"));

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
    getGroupMembersStream,
    getSharedAccountProperties,
    getTaskStatus,
    getTotalUsers,
    listSharedAccounts,
    listSharedAccountsStream,
    listUserAccounts,
    listUserAccountsStream,
    listUserGroups,
    listUserGroupsStream,
    performUserAndGroupSync,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(PapercutApi));

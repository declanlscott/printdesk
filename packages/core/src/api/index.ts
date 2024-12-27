import { HttpRequest } from "@smithy/protocol-http";
import { addMinutes } from "date-fns";
import { Resource } from "sst";
import * as v from "valibot";

import { Tenants } from "../tenants";
import { Utils } from "../utils";
import { Cloudfront, SignatureV4 } from "../utils/aws";
import { HttpError } from "../utils/errors";

import type { StartsWith } from "../utils/types";

export namespace Api {
  export async function getAccountId() {
    const res = await send(
      `/.well-known/appspecific/${Utils.reverseDns(Tenants.getFqdn())}.account-id.txt`,
    );
    if (!res.ok)
      throw new HttpError.BadGateway({
        upstream: {
          error: new HttpError.Error(res.statusText, res.status),
          text: await res.text(),
        },
      });

    return res.text();
  }

  export async function getCloudfrontKeyPairId() {
    const res = await send(
      `/.well-known/appspecific/${Utils.reverseDns(Tenants.getFqdn())}.cloudfront-key-pair-id.txt`,
    );

    const text = await res.text();

    if (!res.ok)
      throw new HttpError.BadGateway({
        upstream: {
          error: new HttpError.Error(res.statusText, res.status),
          text,
        },
      });

    return text;
  }

  export async function getAppsyncEventsDomainNames() {
    const res = await send(
      `/.well-known/appspecific/${Utils.reverseDns(Tenants.getFqdn())}.appsync-events-domain-names.json`,
    );
    if (!res.ok)
      throw new HttpError.BadGateway({
        upstream: {
          error: new HttpError.Error(res.statusText, res.status),
          text: await res.text(),
        },
      });

    return v.parse(
      v.object({
        http: v.string(),
        realtime: v.string(),
      }),
      await res.json(),
    );
  }

  export async function getBuckets() {
    const res = await send(
      `/.well-known/appspecific/${Utils.reverseDns(Tenants.getFqdn())}.buckets.json`,
    );
    if (!res.ok)
      throw new HttpError.BadGateway({
        upstream: {
          error: new HttpError.Error(res.statusText, res.status),
          text: await res.text(),
        },
      });

    return v.parse(
      v.object({
        assets: v.string(),
        documents: v.string(),
      }),
      await res.json(),
    );
  }

  export async function papercutSync() {
    const res = await send("/papercut/sync", { method: "POST" });
    if (!res.ok)
      throw new HttpError.BadGateway({
        upstream: {
          error: new HttpError.Error(res.statusText, res.status),
          text: await res.text(),
        },
      });

    const output = v.parse(
      v.object({
        Entries: v.array(
          v.object({
            ErrorCode: v.optional(v.string()),
            ErrorMessage: v.optional(v.string()),
            EventId: v.optional(v.string()),
          }),
        ),
        FailedEntryCount: v.number(),
      }),
      await res.json(),
    );

    if (output.FailedEntryCount > 0)
      throw new HttpError.InternalServerError("Papercut sync event failure");

    const eventId = output.Entries.at(0)?.EventId;
    if (!eventId)
      throw new HttpError.InternalServerError("Missing papercut sync event id");

    return { eventId };
  }

  export async function invalidateCache(paths: Array<string>) {
    const res = await send("/cdn/invalidation", {
      method: "POST",
      body: JSON.stringify({ paths }),
    });
    if (!res.ok)
      throw new HttpError.BadGateway({
        upstream: {
          error: new HttpError.Error(res.statusText, res.status),
          text: await res.text(),
        },
      });
  }

  export async function send<TPath extends string>(
    path: StartsWith<"/", TPath>,
    init?: RequestInit,
  ): Promise<Response> {
    const url = Cloudfront.buildUrl({
      fqdn: Tenants.getFqdn(),
      path: `/api${path}`,
    });

    const req = await SignatureV4.sign(
      "execute-api",
      new HttpRequest({
        method: init?.method ?? "GET",
        protocol: url.protocol,
        hostname: url.hostname,
        path: url.pathname,
        query: Object.fromEntries(
          new URLSearchParams(url.searchParams).entries(),
        ),
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
        body: init?.body,
      }),
    );

    // NOTE: Requests to `/.well-known` should NOT use a signed URL
    if (path.startsWith("/.well-known"))
      return fetch(url, {
        method: "GET",
        headers: req.headers,
      });

    return fetch(
      Cloudfront.getSignedUrl({
        keyPairId: await getCloudfrontKeyPairId(),
        privateKey: Resource.CloudfrontPrivateKey.pem,
        url: url.toString(),
        dateLessThan: addMinutes(Date.now(), 1).toISOString(),
      }),
      {
        method: req.method,
        headers: req.headers,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        body: req.body,
      },
    );
  }
}

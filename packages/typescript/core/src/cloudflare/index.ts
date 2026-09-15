import * as Context from "effect/Context";
import * as Redacted from "effect/Redacted";

export interface CloudflareShape {
  account: { id: string };
  apiToken: Redacted.Redacted;
}

export class Cloudflare extends Context.Service<Cloudflare, CloudflareShape>()(
  "@printdesk/core/cloudflare/Cloudflare",
) {}

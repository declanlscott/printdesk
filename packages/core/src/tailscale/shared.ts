import * as v from "valibot";

export const tailscaleOauthClientSchema = v.object({
  id: v.string(),
  secret: v.string(),
});

export type TailscaleOauthClient = v.InferOutput<
  typeof tailscaleOauthClientSchema
>;

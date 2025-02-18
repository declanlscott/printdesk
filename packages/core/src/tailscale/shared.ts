import * as v from "valibot";

export const tailscaleOauthClientSchema = v.object({
  id: v.pipe(v.string(), v.trim(), v.nonEmpty("Client ID cannot be empty.")),
  secret: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Client secret cannot be empty."),
  ),
});

export type TailscaleOauthClient = v.InferOutput<
  typeof tailscaleOauthClientSchema
>;

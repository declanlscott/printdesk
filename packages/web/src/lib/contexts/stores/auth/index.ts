import { createClient } from "@openauthjs/openauth/client";
import { subjects } from "@printdesk/core/auth/subjects";
import { redirect } from "@tanstack/react-router";
import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

import { createStoreApiContext } from "~/lib/contexts/store";

import type { Challenge, Client, Tokens } from "@openauthjs/openauth/client";
import type {
  Oauth2ProviderKind,
  UserSubjectProperties,
} from "@printdesk/core/auth/shared";
import type { Tenant } from "@printdesk/core/tenants/sql";
import type { ViteResource } from "~/types";

export type AuthStore = {
  client: Client;
  subdomain: Tenant["subdomain"] | null;
  flow: {
    challenge: Challenge;
    redirectUri: URL;
  } | null;
  tokens: Tokens | null;
  user: UserSubjectProperties | null;
  actions: {
    authorize: (
      subdomain: Tenant["subdomain"],
      oauthProviderKind: Oauth2ProviderKind,
      from?: string,
    ) => Promise<string>;
    exchange: (
      subdomain: Tenant["subdomain"],
      code: string,
      state: string,
    ) => Promise<void>;
    verify: (subdomain: Tenant["subdomain"]) => Promise<void>;
    refresh: () => Promise<void>;
    getAuth: () => string;
    logout: () => void;
  };
};

export const AuthStoreApi = createStoreApiContext<
  AuthStore,
  { resource: ViteResource }
>(({ resource }) =>
  createStore(
    persist(
      (set, get) => ({
        client: createClient({
          clientID: "web",
          issuer: resource.Auth.url,
        }),
        subdomain: null,
        flow: null,
        tokens: null,
        user: null,
        actions: {
          authorize: async (subdomain, provider, from) => {
            const redirectUri = new URL("/callback", window.location.origin);
            if (
              resource.AppData.isDev ||
              window.location.hostname === "localhost"
            )
              redirectUri.searchParams.set("subdomain", subdomain);
            if (from) redirectUri.searchParams.set("from", from);

            const result = await get().client.authorize(
              redirectUri.toString(),
              "code",
              { provider, pkce: true },
            );

            set(() => ({
              subdomain,
              flow: {
                challenge: result.challenge,
                redirectUri,
              },
            }));

            return result.url;
          },
          exchange: async (subdomain, code, state) => {
            const flow = get().flow;
            if (flow?.challenge.state !== state)
              throw new Error("Invalid state");

            const result = await get().client.exchange(
              code,
              flow.redirectUri.toString(),
              flow.challenge.verifier,
            );
            if (result.err) throw result.err;

            if (get().subdomain !== subdomain)
              throw new Error("Subdomain mismatch");

            set(() => ({ flow: null, tokens: result.tokens }));
          },
          verify: async (subdomain) => {
            const tokens = get().tokens;
            if (!tokens) throw new Error("Missing tokens");

            const result = await get().client.verify(subjects, tokens.access, {
              refresh: tokens.refresh,
            });
            if (result.err) throw result.err;

            if (get().subdomain !== subdomain)
              throw new Error("Subdomain mismatch");

            set(() => ({
              tokens: result.tokens,
              user: result.subject.properties,
            }));
          },
          refresh: async () => {
            const tokens = get().tokens;
            if (!tokens) throw new Error("Missing tokens");

            const result = await get().client.refresh(tokens.refresh);
            if (result.err) throw result.err;

            set(() => ({ tokens: result.tokens }));
          },
          getAuth: () => {
            const tokens = get().tokens;
            if (!tokens) throw new Error("Missing tokens");

            return `Bearer ${tokens.access}`;
          },
          logout: () => {
            set(() => ({
              subdomain: null,
              flow: null,
              tokens: null,
              user: null,
            }));

            throw redirect({ to: "/login" });
          },
        },
      }),
      {
        name: "auth",
        partialize: (store) => ({
          subdomain: store.subdomain,
          flow: store.flow,
          tokens: store.tokens,
          user: store.user,
        }),
      },
    ),
  ),
);

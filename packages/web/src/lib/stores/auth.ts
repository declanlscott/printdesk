import { createClient } from "@openauthjs/openauth/client";
import { subjects } from "@printworks/core/auth/subjects";
import { ApplicationError } from "@printworks/core/utils/errors";
import { redirect } from "@tanstack/react-router";
import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

import { createStoreApiContext } from "~/lib/contexts/store";

import type { Challenge, Client, Tokens } from "@openauthjs/openauth/client";
import type { SubjectPayload } from "@openauthjs/openauth/subject";
import type { Oauth2ProviderType } from "@printworks/core/auth/shared";

export type AuthStore = {
  client: Client;
  flow: {
    challenge: Required<Challenge>;
    redirectUri: URL;
  } | null;
  tokens: Tokens | null;
  user:
    | Extract<SubjectPayload<typeof subjects>, { type: "user" }>["properties"]
    | null;
  actions: {
    authorize: (provider: Oauth2ProviderType, from?: string) => Promise<string>;
    exchange: (code: string, state: string) => Promise<void>;
    verify: () => Promise<void>;
    refresh: () => Promise<void>;
    getAuth: () => string;
    logout: () => void;
  };
};

export const AuthStoreApi = createStoreApiContext<
  AuthStore,
  { issuer: string }
>(({ issuer }) =>
  createStore(
    persist(
      (set, get) => ({
        client: createClient({
          clientID: "web",
          issuer,
        }),
        flow: null,
        tokens: null,
        user: null,
        actions: {
          authorize: async (provider, from) => {
            const redirectUri = new URL("/callback", window.location.origin);
            if (from) redirectUri.searchParams.set("from", from);

            const result = await get().client.authorize(
              redirectUri.toString(),
              "code",
              { provider, pkce: true },
            );

            set(() => ({
              flow: {
                challenge: result.challenge as Required<Challenge>,
                redirectUri,
              },
            }));

            return result.url;
          },
          exchange: async (code, state) => {
            const { flow, client } = get();

            if (flow?.challenge.state !== state)
              throw new ApplicationError.Unauthenticated("Invalid state");

            const result = await client.exchange(
              code,
              flow.redirectUri.toString(),
              flow.challenge.verifier,
            );

            if (result.err) throw result.err;

            set(() => ({ flow: null, tokens: result.tokens }));
          },
          verify: async () => {
            const { client, tokens } = get();
            if (!tokens)
              throw new ApplicationError.Unauthenticated("Missing tokens");

            const result = await client.verify(subjects, tokens.access, {
              refresh: tokens.refresh,
            });

            if (result.err) throw result.err;

            set(() => ({
              tokens: result.tokens,
              user: result.subject.properties,
            }));
          },
          refresh: async () => {
            const { client, tokens } = get();
            if (!tokens)
              throw new ApplicationError.Unauthenticated("Missing tokens");

            const result = await client.refresh(tokens.refresh);
            if (result.err) throw result.err;

            set(() => ({ tokens: result.tokens }));
          },
          getAuth: () => {
            const accessToken = get().tokens?.access;
            if (!accessToken)
              throw new ApplicationError.Unauthenticated(
                "Missing access token",
              );

            return `Bearer ${accessToken}`;
          },
          logout: () => {
            set(() => ({ flow: null, tokens: null, user: null }));

            throw redirect({ to: "/login" });
          },
        },
      }),
      {
        name: "auth",
        partialize: (store) => ({
          flow: store.flow,
          tokens: store.tokens,
          user: store.user,
        }),
      },
    ),
  ),
);

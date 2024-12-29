import { createClient } from "@openauthjs/openauth/client";
import { subjects } from "@printworks/core/auth/shared";
import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

import { createZustandContext } from "~/lib/contexts/zustand";

import type { Challenge, Tokens } from "@openauthjs/openauth/client";
import type { Oauth2ProviderType } from "@printworks/core/auth/shared";

export type AuthStore = {
  client: ReturnType<typeof createClient>;
  challenge: Challenge | null;
  tokens: Tokens | null;
  actions: {
    authorize: () => Promise<void>;
    exchange: (code: string, state: string) => Promise<void>;
    verify: () => Promise<void>;
  };
};

export const AuthStore = createZustandContext<
  AuthStore,
  { issuer: string; provider: Oauth2ProviderType }
>(({ issuer, provider }) =>
  createStore(
    persist(
      (set, get) => ({
        client: createClient({
          clientID: "web",
          issuer,
        }),
        challenge: null,
        tokens: null,
        actions: {
          authorize: async () => {
            const { challenge, url } = await get().client.authorize(
              window.location.origin,
              "code",
              { provider, pkce: true },
            );

            set(() => ({ challenge }));

            window.location.href = url;
          },
          exchange: async (code, state) => {
            const { client, challenge } = get();

            if (challenge && state === challenge.state && challenge.verifier) {
              const exchanged = await client.exchange(
                code,
                window.location.origin,
                challenge.verifier,
              );

              if (!exchanged.err)
                set(() => ({
                  challenge: null,
                  tokens: exchanged.tokens,
                }));
            }

            window.location.replace("/");
          },
          verify: async () => {
            const { client, tokens } = get();

            if (tokens) {
              const verified = await client.verify(subjects, tokens.access, {
                refresh: tokens.refresh,
              });

              if (!verified.err) {
                const tokens = verified.tokens;

                if (tokens) set(() => ({ tokens }));
              }
            }
          },
        },
      }),
      {
        name: "auth",
        partialize: (store) => ({
          challenge: store.challenge,
          tokens: store.tokens,
        }),
      },
    ),
  ),
);

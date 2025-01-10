import { useState } from "react";
import { ApplicationError } from "@printworks/core/utils/errors";
import { getRouteApi } from "@tanstack/react-router";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { AuthStoreApi } from "~/lib/stores/auth";

export const useAuth = () =>
  useStore(
    AuthStoreApi.use(),
    useShallow(({ client, tokens, user }) => ({
      client,
      tokens,
      user,
    })),
  );

export const useAuthActions = () =>
  useStore(
    AuthStoreApi.use(),
    useShallow(({ actions }) => actions),
  );

export function useUserSubject() {
  const { user } = useAuth();

  if (!user) throw new ApplicationError.Unauthenticated();

  return user;
}

export const useAuthenticatedRouteApi = () =>
  useState(() => getRouteApi("/_authenticated"))[0];

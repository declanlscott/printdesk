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

export function useUserSubject() {
  const { user } = useAuth();

  if (!user) throw new Error("User not authenticated");

  return user;
}

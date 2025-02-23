import { assertPrivateActor } from "../actors/context";

export const useTenant = () => ({
  id: assertPrivateActor().properties.tenantId,
});

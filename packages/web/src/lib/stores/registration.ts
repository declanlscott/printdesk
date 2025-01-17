import { defaultPapercutSyncSchedule } from "@printworks/core/tenants/shared";
import { Constants } from "@printworks/core/utils/constants";
import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

import { createStoreApiContext } from "~/lib/contexts/store";

import type {
  Registration,
  RegistrationWizardStep1,
  RegistrationWizardStep2,
  RegistrationWizardStep3,
  RegistrationWizardStep4,
  RegistrationWizardStep5,
} from "@printworks/core/tenants/shared";

export type CompleteStepProps =
  | ({
      step: 1;
    } & Omit<RegistrationWizardStep1, "tenantSlug">)
  | ({
      step: 2;
    } & RegistrationWizardStep2)
  | ({
      step: 3;
    } & RegistrationWizardStep3)
  | ({
      step: 4;
    } & RegistrationWizardStep4)
  | ({
      step: 5;
    } & RegistrationWizardStep5);

export type RegistrationStore = Registration & {
  actions: {
    complete: (props: CompleteStepProps) => void;
  };
};

export const RegistrationStoreApi = createStoreApiContext<
  RegistrationStore,
  { tenantSlug: string }
>(({ tenantSlug }) =>
  createStore(
    persist(
      (set, _get) => ({
        // Step 1
        licenseKey: "",
        tenantName: "",
        tenantSlug,

        // Step 2
        userOauthProviderType: Constants.ENTRA_ID,
        userOauthProviderId: "",

        // Step 3
        tailscaleOauthClientId: "",
        tailscaleOauthClientSecret: "",

        // Step 4
        tailnetPapercutServerUri: "",
        papercutServerAuthToken: "",

        // Step 5
        papercutSyncSchedule: defaultPapercutSyncSchedule,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

        // Actions
        actions: {
          complete: (props) => {
            switch (props.step) {
              case 1:
                set(() => ({
                  licenseKey: props.licenseKey,
                  tenantName: props.tenantName,
                }));
                break;
              case 2:
                set(() => ({
                  userOauthProviderType: props.userOauthProviderType,
                  userOauthProviderId: props.userOauthProviderId,
                }));
                break;
              case 3:
                set(() => ({
                  tailscaleOauthClientId: props.tailscaleOauthClientId,
                  tailscaleOauthClientSecret: props.tailscaleOauthClientSecret,
                }));
                break;
              case 4:
                set(() => ({
                  tailnetPapercutServerUri: props.tailnetPapercutServerUri,
                  papercutServerAuthToken: props.papercutServerAuthToken,
                }));
                break;
              case 5:
                set(() => ({
                  papercutSyncSchedule: props.papercutSyncSchedule,
                  timezone: props.timezone,
                }));
                break;
              default:
                break;
            }
          },
        },
      }),
      {
        name: "registration-wizard",
        partialize: ({ actions: _actions, ...store }) => store,
      },
    ),
  ),
);

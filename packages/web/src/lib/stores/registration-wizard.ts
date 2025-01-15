import { defaultPapercutSyncSchedule } from "@printworks/core/tenants/shared";
import { Constants } from "@printworks/core/utils/constants";
import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

import { createStoreApiContext } from "~/lib/contexts/store";

import type {
  RegistrationWizard,
  RegistrationWizardStep1,
  RegistrationWizardStep2,
  RegistrationWizardStep3,
  RegistrationWizardStep4,
  RegistrationWizardStep5,
} from "@printworks/core/tenants/shared";

export type SubmitStepProps =
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

export type RegistrationWizardStore = RegistrationWizard & {
  actions: {
    submit: (props: SubmitStepProps) => void;
  };
};

export const RegistrationWizardStoreApi = createStoreApiContext<
  RegistrationWizardStore,
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
          submit: (props) => {
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

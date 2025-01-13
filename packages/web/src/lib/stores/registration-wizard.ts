import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

import { createStoreApiContext } from "~/lib/contexts/store";

import type { RegistrationStep1 } from "@printworks/core/tenants/shared";

export type SubmitStepProps =
  | {
      step: 1;
      licenseKey: string;
      tenantName: string;
    }
  | {
      step: 2;
    };

export type RegistrationWizardStore = RegistrationStep1 & {
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
              default:
                break;
            }
          },
        },
      }),
      {
        name: "registration-wizard",
        partialize: (store) => ({
          licenseKey: store.licenseKey,
          tenantName: store.tenantName,
          tenantSlug: store.tenantSlug,
        }),
      },
    ),
  ),
);

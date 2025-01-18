import { defaultPapercutSyncSchedule } from "@printworks/core/tenants/shared";
import { Constants } from "@printworks/core/utils/constants";
import { assign, setup } from "xstate";

import type {
  Registration,
  RegistrationWizardStep1,
  RegistrationWizardStep2,
  RegistrationWizardStep3,
  RegistrationWizardStep4,
  RegistrationWizardStep5,
} from "@printworks/core/tenants/shared";
import type { Tenant } from "@printworks/core/tenants/sql";

export const registrationMachine = setup({
  types: {
    input: {} as Pick<Registration, "tenantSlug">,
    context: {} as Registration & {
      tenantId: Tenant["id"];
      dispatchId: string;
    },
    events: {} as
      | { type: "wizard.back" }
      | ({ type: "wizard.step1.next" } & Omit<
          RegistrationWizardStep1,
          "tenantSlug"
        >)
      | ({ type: "wizard.step2.next" } & RegistrationWizardStep2)
      | ({ type: "wizard.step3.next" } & RegistrationWizardStep3)
      | ({ type: "wizard.step4.next" } & RegistrationWizardStep4)
      | ({ type: "wizard.step5.next" } & RegistrationWizardStep5)
      | { type: "wizard.register" }
      | { type: "status.dispatchInfra" }
      | { type: "status.waitForBackend" }
      | { type: "status.startPapercutSync" }
      | { type: "status.successfulPapercutSync" },
  },
}).createMachine({
  id: "registration",
  context: ({ input }) => ({
    // Wizard Step 1
    licenseKey: "",
    tenantName: "",
    tenantSlug: input.tenantSlug,

    // Wizard Step 2
    userOauthProviderType: Constants.ENTRA_ID,
    userOauthProviderId: "",

    // Wizard Step 3
    tailscaleOauthClientId: "",
    tailscaleOauthClientSecret: "",

    // Wizard Step 4
    tailnetPapercutServerUri: "",
    papercutServerAuthToken: "",

    // Wizard Step 5
    papercutSyncSchedule: defaultPapercutSyncSchedule,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

    tenantId: "",
    dispatchId: "",
  }),
  initial: "wizard",
  states: {
    wizard: {
      initial: "step1",
      states: {
        step1: {
          on: {
            "wizard.step1.next": {
              target: "step2",
              actions: assign({
                licenseKey: ({ event }) => event.licenseKey,
                tenantName: ({ event }) => event.tenantName,
              }),
            },
          },
        },
        step2: {
          on: {
            "wizard.back": "step1",
            "wizard.step2.next": {
              target: "step3",
              actions: assign({
                userOauthProviderType: ({ event }) =>
                  event.userOauthProviderType,
                userOauthProviderId: ({ event }) => event.userOauthProviderId,
              }),
            },
          },
        },
        step3: {
          on: {
            "wizard.back": "step2",
            "wizard.step3.next": {
              target: "step4",
              actions: assign({
                tailscaleOauthClientId: ({ event }) =>
                  event.tailscaleOauthClientId,
                tailscaleOauthClientSecret: ({ event }) =>
                  event.tailscaleOauthClientSecret,
              }),
            },
          },
        },
        step4: {
          on: {
            "wizard.back": "step3",
            "wizard.step4.next": {
              target: "step5",
              actions: assign({
                tailnetPapercutServerUri: ({ event }) =>
                  event.tailnetPapercutServerUri,
                papercutServerAuthToken: ({ event }) =>
                  event.papercutServerAuthToken,
              }),
            },
          },
        },
        step5: {
          on: {
            "wizard.back": "step4",
            "wizard.step5.next": {
              target: "review",
              actions: assign({
                papercutSyncSchedule: ({ event }) => event.papercutSyncSchedule,
                timezone: ({ event }) => event.timezone,
              }),
            },
          },
        },
        review: {
          on: {
            "wizard.back": "step5",
            "wizard.register": "#registration.status",
          },
        },
      },
    },
    status: {
      initial: "registering",
      states: {
        registering: {
          on: {
            "status.dispatchInfra": {
              target: "provisioningInfra",
            },
          },
        },
        provisioningInfra: {
          on: {
            "status.waitForBackend": {
              target: "waitingForBackend",
            },
          },
        },
        waitingForBackend: {
          on: {
            "status.startPapercutSync": {
              target: "waitingForPapercutSync",
            },
          },
        },
        waitingForPapercutSync: {
          on: {
            "status.successfulPapercutSync": {
              target: "completed",
            },
          },
        },
        completed: {
          type: "final",
        },
      },
    },
  },
});

import { getBackendFqdn } from "@printworks/core/backend/shared";
import { Constants } from "@printworks/core/utils/constants";
import { HttpError } from "@printworks/core/utils/errors";
import { buildUrl } from "@printworks/core/utils/shared";
import { Client } from "@printworks/functions/api/client";
import { assign, fromPromise, setup } from "xstate";

import { ViteResource } from "~/types";

import type {
  Registration,
  RegistrationWizardStep1,
  RegistrationWizardStep2,
  RegistrationWizardStep3,
  RegistrationWizardStep4,
  RegistrationWizardStep5,
} from "@printworks/core/tenants/shared";
import type { License, Tenant } from "@printworks/core/tenants/sql";

type RegisterInput = Omit<
  Registration,
  keyof (RegistrationWizardStep3 & RegistrationWizardStep4)
>;
type RegisterOutput = { tenantId: Tenant["id"]; dispatchId: string };

type HealthcheckInput = { tenantId: Tenant["id"] };
type HealthcheckOutput = { isHealthy: boolean };

type SyncInput = { licenseKey: License["key"]; tenantId: Tenant["id"] };
type SyncOutput = { dispatchId: string };

export const getRegistrationMachine = (api: Client, resource: ViteResource) =>
  setup({
    types: {
      input: {} as Pick<Registration, "tenantSlug">,
      context: {} as Registration & {
        tenantId: Tenant["id"];
        dispatchId: string;
        isHealthy: boolean;
        failedStatus: string | null;
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
        | { type: "status.healthcheck" }
        | { type: "status.sync" }
        | { type: "status.complete" }
        | { type: "status.back" },
    },
    actors: {
      register: fromPromise<RegisterOutput, RegisterInput>(
        async ({ input: json }) => {
          const res = await api.public.tenants.$post({ json });
          if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

          return res.json();
        },
      ),
      healthcheck: fromPromise<HealthcheckOutput, HealthcheckInput>(
        async ({ input }) => {
          const res = await fetch(
            buildUrl({
              fqdn: getBackendFqdn(
                input.tenantId,
                resource.AppData.domainName.fullyQualified,
              ),
              path: "/api/health",
            }),
            { method: "GET" },
          );

          return { isHealthy: res.ok };
        },
      ),
      sync: fromPromise<SyncOutput, SyncInput>(async ({ input: json }) => {
        const res = await api.public.tenants["initial-sync"].$post({ json });
        if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

        return res.json();
      }),
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
      isHealthy: false,
      failedStatus: null,
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
                  papercutSyncSchedule: ({ event }) =>
                    event.papercutSyncSchedule,
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
        initial: "register",
        states: {
          register: {
            invoke: {
              src: "register",
              input: ({ context }) => ({
                licenseKey: context.licenseKey,
                tenantName: context.tenantName,
                tenantSlug: context.tenantSlug,
                userOauthProviderType: context.userOauthProviderType,
                userOauthProviderId: context.userOauthProviderId,
                papercutSyncSchedule: context.papercutSyncSchedule,
                timezone: context.timezone,
              }),
              onDone: {
                target: "waitForInfra",
                actions: ({ event }) => assign(event.output),
              },
              onError: {
                target: "failed",
                actions: assign({ failedStatus: "register" }),
              },
            },
          },
          waitForInfra: { on: { "status.healthcheck": "healthcheck" } },
          waitForGoodHealth: { after: { 3000: "healthcheck" } },
          healthcheck: {
            invoke: {
              src: "healthcheck",
              input: ({ context }) => ({ tenantId: context.tenantId }),
              onDone: {
                target: "determineHealth",
                actions: ({ event }) => assign(event.output),
              },
              onError: {
                target: "failed",
                actions: assign({ failedStatus: "healthcheck" }),
              },
            },
          },
          determineHealth: {
            always: [
              {
                guard: ({ context }) => !context.isHealthy,
                target: "waitForGoodHealth",
              },
              { target: "sync" },
            ],
          },
          sync: {
            invoke: {
              src: "sync",
              input: ({ context }) => ({
                licenseKey: context.licenseKey,
                tenantId: context.tenantId,
              }),
              onDone: {
                target: "waitForSync",
                actions: ({ event }) => assign(event.output),
              },
              onError: {
                target: "failed",
                actions: assign({ failedStatus: "sync" }),
              },
            },
          },
          waitForSync: {
            on: { "status.complete": "completed" },
          },
          failed: {
            on: {
              "status.back": {
                target: "#registration.wizard.review",
                actions: assign({ failedStatus: null }),
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

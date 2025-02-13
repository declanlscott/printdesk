import { getBackendFqdn } from "@printworks/core/backend/shared";
import { Constants } from "@printworks/core/utils/constants";
import { ApplicationError, HttpError } from "@printworks/core/utils/errors";
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
} from "@printworks/core/tenants/shared";
import type { Tenant } from "@printworks/core/tenants/sql";

type RegistrationMachineWizardContext = Registration;
type RegistrationMachineStatusContext = {
  tenantId: Tenant["id"] | null;
  dispatchId: string | null;
  apiKey: string | null;
  isHealthy: boolean;
  failedStatus: string | null;
};
type RegistrationMachineContext = RegistrationMachineWizardContext &
  RegistrationMachineStatusContext;

const getInitialWizardContext = (tenantSlug: Registration["tenantSlug"]) =>
  ({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

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
  }) as const satisfies RegistrationMachineWizardContext;

const initialStatusContext = {
  tenantId: null,
  dispatchId: null,
  apiKey: null,
  isHealthy: false,
  failedStatus: null,
} as const satisfies RegistrationMachineStatusContext;

type RegisterInput = Omit<
  RegistrationMachineWizardContext,
  keyof (RegistrationWizardStep3 & RegistrationWizardStep4)
>;
type RegisterOutput = {
  tenantId: Tenant["id"];
  dispatchId: string;
  apiKey: string;
};

type HealthcheckInput = Pick<RegistrationMachineStatusContext, "tenantId">;
type HealthcheckOutput = { isHealthy: boolean };

type InitializeInput = Pick<
  RegistrationMachineStatusContext,
  "apiKey" | "tenantId"
> &
  Pick<
    RegistrationMachineWizardContext,
    keyof (RegistrationWizardStep3 & RegistrationWizardStep4)
  >;
type InitializeOutput = { dispatchId: string };

export const getRegistrationMachine = (api: Client, resource: ViteResource) =>
  setup({
    types: {
      input: {} as Pick<Registration, "tenantSlug">,
      context: {} as RegistrationMachineContext,
      events: {} as
        | { type: "wizard.back" }
        | ({ type: "wizard.step1.next" } & Omit<
            RegistrationWizardStep1,
            "tenantSlug"
          >)
        | ({ type: "wizard.step2.next" } & RegistrationWizardStep2)
        | ({ type: "wizard.step3.next" } & RegistrationWizardStep3)
        | ({ type: "wizard.step4.next" } & RegistrationWizardStep4)
        | { type: "wizard.register" }
        | { type: "status.healthcheck" }
        | { type: "status.complete" }
        | { type: "status.back" },
    },
    actors: {
      register: fromPromise<RegisterOutput, RegisterInput>(
        async ({ input: json }) => {
          const res = await api.public.tenants.register.$post({ json });
          if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

          return res.json();
        },
      ),
      healthcheck: fromPromise<HealthcheckOutput, HealthcheckInput>(
        async ({ input }) => {
          if (!input.tenantId)
            throw new ApplicationError.Error("Missing tenant ID");

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
      initialize: fromPromise<InitializeOutput, InitializeInput>(
        async ({ input: { apiKey, tenantId, ...json } }) => {
          if (!apiKey || !tenantId)
            throw new ApplicationError.Error("Missing API key or tenant ID");

          const res = await api.public.tenants.initialize.$post({
            header: {
              authorization: `Bearer ${apiKey}`,
              "x-tenant-id": tenantId,
            },
            json,
          });
          if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

          return res.json();
        },
      ),
    },
  }).createMachine({
    id: "registration",
    context: ({ input }) => ({
      ...getInitialWizardContext(input.tenantSlug),
      ...initialStatusContext,
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
                target: "review",
                actions: assign({
                  tailnetPapercutServerUri: ({ event }) =>
                    event.tailnetPapercutServerUri,
                  papercutServerAuthToken: ({ event }) =>
                    event.papercutServerAuthToken,
                }),
              },
            },
          },
          review: {
            on: {
              "wizard.back": "step4",
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
              { target: "initialize" },
            ],
          },
          initialize: {
            invoke: {
              src: "initialize",
              input: ({ context }) => ({
                apiKey: context.apiKey,
                tenantId: context.tenantId,
                tailscaleOauthClientId: context.tailscaleOauthClientId,
                tailscaleOauthClientSecret: context.tailscaleOauthClientSecret,
                tailnetPapercutServerUri: context.tailnetPapercutServerUri,
                papercutServerAuthToken: context.papercutServerAuthToken,
              }),
              onDone: {
                target: "waitForSync",
                actions: ({ event }) => assign(event.output),
              },
              onError: {
                target: "failed",
                actions: assign({ failedStatus: "initialize" }),
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
                actions: assign(initialStatusContext),
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

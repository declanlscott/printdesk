import { getBackendFqdn } from "@printworks/core/backend/shared";
import { Constants } from "@printworks/core/utils/constants";
import { buildUrl } from "@printworks/core/utils/shared";
import { assign, fromPromise, setup } from "xstate";

import type {
  ConfigureData,
  InitializeData,
  RegisterData,
  SetupWizard,
  SetupWizardStep1,
  SetupWizardStep2,
  SetupWizardStep3,
  SetupWizardStep4,
} from "@printworks/core/tenants/shared";
import type { Tenant } from "@printworks/core/tenants/sql";
import type { ViteResource } from "~/types";

type SetupMachineWizardContext = SetupWizard;
type SetupMachineStatusContext = {
  tenantId: Tenant["id"] | null;
  dispatchId: string | null;
  apiKey: string | null;
  isHealthy: boolean;
  failureStatus:
    | "initialize"
    | "register"
    | "dispatchInfra"
    | "waitForInfra"
    | "healthcheck"
    | "determineHealth"
    | "waitForGoodHealth"
    | "configure"
    | "testPapercutConnection"
    | null;
};
type SetupMachineContext = SetupMachineWizardContext &
  SetupMachineStatusContext;

const getInitialWizardContext = (tenantSlug: Tenant["slug"]) =>
  ({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

    // Step 1
    licenseKey: "",
    tenantName: "",
    tenantSlug,

    // Step 2
    userOauthProviderKind: Constants.ENTRA_ID,
    userOauthProviderId: "",

    // Step 3
    tailscaleOauthClientId: "",
    tailscaleOauthClientSecret: "",

    // Step 4
    tailnetPapercutServerUri: "",
    papercutServerAuthToken: "",
  }) as const satisfies SetupMachineWizardContext;

const initialStatusContext = {
  tenantId: null,
  dispatchId: null,
  apiKey: null,
  isHealthy: false,
  failureStatus: null,
} as const satisfies SetupMachineStatusContext;

const initialize = fromPromise<
  { tenantId: Tenant["id"]; apiKey: string },
  InitializeData
>(async ({ input: json }) => {
  const res = await api.public.setup.initialize.$put({ json });
  if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

  return res.json();
});

const register = fromPromise<
  void,
  RegisterData & Pick<SetupMachineStatusContext, "apiKey" | "tenantId">
>(async ({ input: { apiKey, tenantId, ...json } }) => {
  if (!apiKey || !tenantId) throw new Error("Missing API key or tenant ID");

  const res = await api.public.setup.register.$put({
    header: {
      authorization: `Bearer ${apiKey}`,
      [Constants.HEADER_NAMES.TENANT_ID]: tenantId,
    },
    json,
  });
  if (!res.ok) throw new HttpError.Error(res.statusText, res.status);
});

const dispatchInfra = fromPromise<
  { dispatchId: string },
  Pick<SetupMachineStatusContext, "apiKey" | "tenantId">
>(async ({ input: { apiKey, tenantId } }) => {
  if (!apiKey || !tenantId) throw new Error("Missing API key or tenant ID");

  const res = await api.public.setup["dispatch-infra"].$post({
    header: {
      authorization: `Bearer ${apiKey}`,
      [Constants.HEADER_NAMES.TENANT_ID]: tenantId,
    },
  });
  if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

  return res.json();
});

const healthcheck = (resource: ViteResource) =>
  fromPromise<
    { isHealthy: boolean },
    Pick<SetupMachineStatusContext, "tenantId">
  >(async ({ input }) => {
    if (!input.tenantId) throw new Error("Missing tenant ID");

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
  });

const configure = (api: Client) =>
  fromPromise<
    void,
    ConfigureData & Pick<SetupMachineStatusContext, "apiKey" | "tenantId">
  >(async ({ input: { apiKey, tenantId, ...json } }) => {
    if (!apiKey || !tenantId) throw new Error("Missing API key or tenant ID");

    const res = await api.public.setup.configure.$put({
      header: {
        authorization: `Bearer ${apiKey}`,
        [Constants.HEADER_NAMES.TENANT_ID]: tenantId,
      },
      json,
    });
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);
  });

const testPapercutConnection = (api: Client) =>
  fromPromise<void, Pick<SetupMachineStatusContext, "apiKey" | "tenantId">>(
    async ({ input: { apiKey, tenantId } }) => {
      if (!apiKey || !tenantId) throw new Error("Missing API key or tenant ID");

      const res = await api.public.setup["test-papercut-connection"].$post({
        header: {
          authorization: `Bearer ${apiKey}`,
          [Constants.HEADER_NAMES.TENANT_ID]: tenantId,
        },
      });
      if (!res.ok) throw new HttpError.Error(res.statusText, res.status);
    },
  );

export const getSetupMachine = (resource: ViteResource) =>
  setup({
    types: {
      input: {} as Pick<SetupWizard, "tenantSlug">,
      context: {} as SetupMachineContext,
      events: {} as
        | { type: "wizard.back" }
        | ({ type: "wizard.step1.next" } & Omit<SetupWizardStep1, "tenantSlug">)
        | ({ type: "wizard.step2.next" } & SetupWizardStep2)
        | ({ type: "wizard.step3.next" } & SetupWizardStep3)
        | ({ type: "wizard.step4.next" } & SetupWizardStep4)
        | { type: "wizard.register" }
        | { type: "status.healthcheck" }
        | { type: "status.back" }
        | { type: "status.fail" },
    },
    actors: {
      initialize: initialize(api),
      register: register(api),
      dispatchInfra: dispatchInfra(api),
      healthcheck: healthcheck(resource),
      configure: configure(api),
      testPapercutConnection: testPapercutConnection(api),
    },
  }).createMachine({
    id: "setup",
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
                  userOauthProviderKind: ({ event }) =>
                    event.userOauthProviderKind,
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
              "wizard.register": "#setup.status",
            },
          },
        },
      },
      status: {
        initial: "initialize",
        states: {
          initialize: {
            invoke: {
              src: "initialize",
              input: ({ context }) => ({
                licenseKey: context.licenseKey,
                timezone: context.timezone,
              }),
              onDone: {
                target: "register",
                actions: ({ event }) => assign(event.output),
              },
              onError: {
                target: "failure",
                actions: assign({ failureStatus: "initialize" }),
              },
            },
          },
          register: {
            invoke: {
              src: "register",
              input: ({ context }) => ({
                apiKey: context.apiKey,
                tenantId: context.tenantId,
                tenantName: context.tenantName,
                tenantSlug: context.tenantSlug,
                userOauthProviderKind: context.userOauthProviderKind,
                userOauthProviderId: context.userOauthProviderId,
              }),
              onDone: "dispatchInfra",
              onError: {
                target: "failure",
                actions: assign({ failureStatus: "register" }),
              },
            },
          },
          dispatchInfra: {
            invoke: {
              src: "dispatchInfra",
              input: ({ context }) => ({
                apiKey: context.apiKey,
                tenantId: context.tenantId,
              }),
            },
            onDone: "waitForInfra",
            onError: {
              target: "failure",
              actions: assign({ failureStatus: "dispatchInfra" }),
            },
          },
          waitForInfra: {
            on: {
              "status.healthcheck": "healthcheck",
              "status.fail": {
                target: "failure",
                actions: assign({ failureStatus: "waitForInfra" }),
              },
            },
          },
          healthcheck: {
            invoke: {
              src: "healthcheck",
              input: ({ context }) => ({ tenantId: context.tenantId }),
              onDone: {
                target: "determineHealth",
                actions: ({ event }) => assign(event.output),
              },
              onError: {
                target: "failure",
                actions: assign({ failureStatus: "healthcheck" }),
              },
            },
          },
          determineHealth: {
            always: [
              {
                guard: ({ context }) => !context.isHealthy,
                target: "waitForGoodHealth",
              },
              { target: "configure" },
            ],
          },
          waitForGoodHealth: { after: { 3000: "healthcheck" } },
          configure: {
            invoke: {
              src: "configure",
              input: ({ context }) => ({
                apiKey: context.apiKey,
                tenantId: context.tenantId,
                tailscaleOauthClientId: context.tailscaleOauthClientId,
                tailscaleOauthClientSecret: context.tailscaleOauthClientSecret,
                tailnetPapercutServerUri: context.tailnetPapercutServerUri,
                papercutServerAuthToken: context.papercutServerAuthToken,
              }),
              onDone: { target: "testPapercutConnection" },
              onError: {
                target: "failure",
                actions: assign({ failureStatus: "configure" }),
              },
            },
          },
          testPapercutConnection: {
            invoke: {
              src: "testPapercutConnection",
              input: ({ context }) => ({
                apiKey: context.apiKey,
                tenantId: context.tenantId,
              }),
              onDone: { target: "complete" },
              onError: {
                target: "failure",
                actions: assign({ failureStatus: "testPapercutConnection" }),
              },
            },
          },
          failure: {
            on: {
              "status.back": {
                target: "#setup.wizard.review",
                actions: assign(initialStatusContext),
              },
            },
          },
          complete: { type: "final" },
        },
      },
    },
  });

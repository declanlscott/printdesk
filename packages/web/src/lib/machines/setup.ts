import { getBackendFqdn } from "@printdesk/core/backend/shared";
import { Constants } from "@printdesk/core/utils/constants";
import { buildUrl } from "@printdesk/core/utils/shared";
import { toast } from "sonner";
import { assign, fromPromise, setup } from "xstate";

import { createTrpcClient } from "~/lib/trpc";

import type {
  SetupWizard,
  SetupWizardStep1,
  SetupWizardStep2,
  SetupWizardStep3,
  SetupWizardStep4,
} from "@printdesk/core/tenants/shared";
import type { Tenant } from "@printdesk/core/tenants/sql";
import type { SetupRouterIO } from "@printdesk/functions/api/trpc/routers/setup";
import type { TenantsRouterIO } from "@printdesk/functions/api/trpc/routers/tenants";
import type { ViteResource } from "~/types";

interface SetupMachineInput extends Pick<SetupWizard, "tenantSubdomain"> {
  resource: ViteResource;
  trpcClient: ReturnType<typeof createTrpcClient>;
}

interface SetupMachineContext extends SetupWizard {
  resource: SetupMachineInput["resource"];
  trpcClient: SetupMachineInput["trpcClient"];
  tenantId: Tenant["id"] | null;
  dispatchId: string | null;
  failureStatus:
    | "initialize"
    | "register"
    | "dispatchInfra"
    | "waitForInfra"
    | "healthcheck"
    | "waitForGoodHealth"
    | "configure"
    | "testPapercutConnection"
    | null;
}

const isLicenseKeyAvailable = fromPromise<
  TenantsRouterIO<"output">["public"]["isLicenseKeyAvailable"],
  Pick<SetupMachineContext, "trpcClient"> &
    TenantsRouterIO<"input">["public"]["isLicenseKeyAvailable"]
>(async ({ input: { trpcClient, ...input } }) =>
  trpcClient.tenants.public.isLicenseKeyAvailable.query(input, {
    context: { skipBatch: true },
  }),
);

const initialize = fromPromise<
  SetupRouterIO<"output">["public"]["initialize"],
  Pick<SetupMachineContext, "trpcClient"> &
    SetupRouterIO<"input">["public"]["initialize"]
>(async ({ input: { trpcClient, ...input } }) =>
  trpcClient.setup.public.initialize.mutate(input),
);

const register = fromPromise<
  SetupRouterIO<"output">["register"],
  Pick<SetupMachineContext, "trpcClient"> & SetupRouterIO<"input">["register"]
>(async ({ input: { trpcClient, ...input } }) =>
  trpcClient.setup.register.mutate(input),
);

const dispatchInfra = fromPromise<
  SetupRouterIO<"output">["dispatchInfra"],
  Pick<SetupMachineContext, "trpcClient">
>(async ({ input }) => input.trpcClient.setup.dispatchInfra.mutate());

const healthcheck = fromPromise<
  { isHealthy: boolean },
  Pick<SetupMachineContext, "tenantId" | "resource">
>(async ({ input }) => {
  if (!input.tenantId) throw new Error("Missing tenant ID");

  const res = await fetch(
    buildUrl({
      fqdn: getBackendFqdn(input.tenantId, input.resource.Domains.web),
      path: "/api/health",
    }),
    { method: "GET" },
  );

  return { isHealthy: res.ok };
});

const configure = fromPromise<
  SetupRouterIO<"output">["configure"],
  Pick<SetupMachineContext, "trpcClient"> & SetupRouterIO<"input">["configure"]
>(async ({ input: { trpcClient, ...input } }) =>
  trpcClient.setup.configure.mutate(input),
);

const testPapercutConnection = fromPromise<
  SetupRouterIO<"output">["testPapercutConnection"],
  Pick<SetupMachineContext, "trpcClient">
>(async ({ input }) => input.trpcClient.setup.testPapercutConnection.query());

export const setupMachine = setup({
  types: {
    input: {} as SetupMachineInput,
    context: {} as SetupMachineContext,
    events: {} as
      | { type: "wizard.back" }
      | ({ type: "wizard.step1.next" } & Omit<
          SetupWizardStep1,
          "tenantSubdomain"
        >)
      | ({ type: "wizard.step2.next" } & SetupWizardStep2)
      | ({ type: "wizard.step3.next" } & SetupWizardStep3)
      | ({ type: "wizard.step4.next" } & SetupWizardStep4)
      | { type: "wizard.register" }
      | { type: "status.healthcheck" }
      | { type: "status.back" }
      | { type: "status.fail" },
  },
  actors: {
    isLicenseKeyAvailable,
    initialize,
    register,
    dispatchInfra,
    healthcheck,
    configure,
    testPapercutConnection,
  },
}).createMachine({
  id: "setup",
  context: ({ input }) => ({
    resource: input.resource,
    trpcClient: input.trpcClient,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

    // Step 1
    licenseKey: "",
    tenantName: "",
    tenantSubdomain: input.tenantSubdomain,

    // Step 2
    identityProviderKind: Constants.ENTRA_ID,
    identityProviderId: "",

    // Step 3
    tailscaleOauthClientId: "",
    tailscaleOauthClientSecret: "",

    // Step 4
    tailnetPapercutServerUri: "",
    papercutServerAuthToken: "",

    tenantId: null,
    dispatchId: null,
    failureStatus: null,
  }),
  initial: "wizard",
  states: {
    wizard: {
      initial: "step1",
      states: {
        step1: {
          on: {
            "wizard.step1.next": {
              target: "isLicenseKeyAvailable",
              actions: assign({
                licenseKey: ({ event }) => event.licenseKey,
                tenantName: ({ event }) => event.tenantName,
              }),
            },
          },
        },
        isLicenseKeyAvailable: {
          invoke: {
            src: "isLicenseKeyAvailable",
            input: ({ context }) => ({
              trpcClient: context.trpcClient,
              licenseKey: context.licenseKey,
            }),
            onDone: [
              { guard: ({ event }) => event.output, target: "step2" },
              {
                target: "step1",
                actions: () => {
                  toast.error("License key is not available.");
                },
              },
            ],
            onError: {
              target: "step1",
              actions: () => {
                toast.error("Something went wrong.");
              },
            },
          },
        },
        step2: {
          on: {
            "wizard.back": "step1",
            "wizard.step2.next": {
              target: "step3",
              actions: assign({
                identityProviderKind: ({ event }) => event.identityProviderKind,
                identityProviderId: ({ event }) => event.identityProviderId,
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
              trpcClient: context.trpcClient,
              licenseKey: context.licenseKey,
              timezone: context.timezone,
            }),
            onDone: {
              target: "register",
              actions: assign({
                tenantId: ({ event }) => event.output.tenantId,
                trpcClient: ({ context, event }) =>
                  createTrpcClient(
                    new URL("/trpc", `https://${context.resource.Domains.api}`),
                    `Bearer ${event.output.apiKey}`,
                    event.output.tenantId,
                  ),
              }),
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
              trpcClient: context.trpcClient,
              tenantName: context.tenantName,
              tenantSubdomain: context.tenantSubdomain,
              identityProviderKind: context.identityProviderKind,
              identityProviderId: context.identityProviderId,
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
            input: ({ context }) => ({ trpcClient: context.trpcClient }),
            onDone: {
              target: "waitForInfra",
              actions: assign({
                dispatchId: ({ event }) => event.output.dispatchId,
              }),
            },
            onError: {
              target: "failure",
              actions: assign({ failureStatus: "dispatchInfra" }),
            },
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
            input: ({ context }) => ({
              tenantId: context.tenantId,
              resource: context.resource,
            }),
            onDone: [
              {
                guard: ({ event }) => !event.output.isHealthy,
                target: "waitForGoodHealth",
              },
              { target: "configure" },
            ],
            onError: {
              target: "failure",
              actions: assign({ failureStatus: "healthcheck" }),
            },
          },
        },
        waitForGoodHealth: { after: { 3000: "healthcheck" } },
        configure: {
          invoke: {
            src: "configure",
            input: ({ context }) => ({
              trpcClient: context.trpcClient,
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
            input: ({ context }) => ({ trpcClient: context.trpcClient }),
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
              actions: assign({
                trpcClient: ({ context }) =>
                  createTrpcClient(
                    new URL("/trpc", `https://${context.resource.Domains.api}`),
                  ),
                tenantId: null,
                dispatchId: null,
                failureStatus: null,
              }),
            },
          },
        },
        complete: { type: "final" },
      },
    },
  },
});

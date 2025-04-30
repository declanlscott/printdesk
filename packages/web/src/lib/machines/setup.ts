import { getBackendFqdn } from "@printdesk/core/backend/shared";
import { Constants } from "@printdesk/core/utils/constants";
import { buildUrl } from "@printdesk/core/utils/shared";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { toast } from "sonner";
import { assign, fromPromise, setup } from "xstate";

import type {
  SetupWizard,
  SetupWizardStep1,
  SetupWizardStep2,
  SetupWizardStep3,
  SetupWizardStep4,
} from "@printdesk/core/tenants/shared";
import type { Tenant } from "@printdesk/core/tenants/sql";
import type { NonNullableProperties } from "@printdesk/core/utils/types";
import type { TrpcRouter } from "@printdesk/functions/api/trpc/routers";
import type { RealtimeRouterIO } from "@printdesk/functions/api/trpc/routers/realtime";
import type { SetupRouterIO } from "@printdesk/functions/api/trpc/routers/setup";
import type { TenantsRouterIO } from "@printdesk/functions/api/trpc/routers/tenants";
import type { ViteResource } from "~/types";

interface SetupMachineInput extends Pick<SetupWizard, "tenantSlug"> {
  resource: ViteResource;
  trpcClient: ReturnType<typeof createTRPCClient<TrpcRouter>>;
}

interface SetupMachineContext extends SetupWizard {
  resource: SetupMachineInput["resource"];
  trpcClient: SetupMachineInput["trpcClient"];
  tenantId: Tenant["id"] | null;
  dispatchId: string | null;
  realtimeAuth: RealtimeRouterIO<"output">["public"]["getAuth"] | null;
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
  trpcClient.tenants.public.isLicenseKeyAvailable.query(input),
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
  NonNullableProperties<
    Pick<SetupMachineContext, "dispatchId" | "realtimeAuth">
  >,
  Pick<SetupMachineContext, "trpcClient">
>(async ({ input }) => {
  const { dispatchId } = await input.trpcClient.setup.dispatchInfra.mutate();

  const realtimeAuth = await input.trpcClient.realtime.public.getAuth.query(
    { channel: `/events/${dispatchId}` },
  );

  return { dispatchId, realtimeAuth };
});

const healthcheck = fromPromise<
  { isHealthy: boolean },
  Pick<SetupMachineContext, "tenantId" | "resource">
>(async ({ input }) => {
  if (!input.tenantId) throw new Error("Missing tenant ID");

  const res = await fetch(
    buildUrl({
      fqdn: getBackendFqdn(
        input.tenantId,
        input.resource.AppData.domainName.fullyQualified,
      ),
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
    tenantSlug: input.tenantSlug,

    // Step 2
    userOauthProviderKind: Constants.ENTRA_ID,
    userOauthProviderId: "",

    // Step 3
    tailscaleOauthClientId: "",
    tailscaleOauthClientSecret: "",

    // Step 4
    tailnetPapercutServerUri: "",
    papercutServerAuthToken: "",

    tenantId: null,
    dispatchId: null,
    realtimeAuth: null,
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
              trpcClient: context.trpcClient,
              licenseKey: context.licenseKey,
              timezone: context.timezone,
            }),
            onDone: {
              target: "register",
              actions: assign({
                tenantId: ({ event }) => event.output.tenantId,
                trpcClient: ({ context, event }) =>
                  createTRPCClient<TrpcRouter>({
                    links: [
                      httpBatchLink({
                        url: new URL(
                          "/trpc",
                          context.resource.ApiReverseProxy.url,
                        ),
                        headers: {
                          Authorization: `Bearer ${event.output.apiKey}`,
                          [Constants.HEADER_NAMES.TENANT_ID]:
                            event.output.tenantId,
                        },
                      }),
                    ],
                  }),
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
            input: ({ context }) => ({ trpcClient: context.trpcClient }),
            onDone: {
              target: "waitForInfra",
              actions: assign({
                dispatchId: ({ event }) => event.output.dispatchId,
                realtimeAuth: ({ event }) => event.output.realtimeAuth,
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
                  createTRPCClient<TrpcRouter>({
                    links: [
                      httpBatchLink({
                        url: new URL(
                          "/trpc",
                          context.resource.ApiReverseProxy.url,
                        ),
                      }),
                    ],
                  }),
                tenantId: null,
                dispatchId: null,
                realtimeAuth: null,
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

import { AppSyncClient, CreateApiCommand } from "@aws-sdk/client-appsync";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

async function createApi() {
  const client = new AppSyncClient({
    region: "us-east-2",
    credentials: fromNodeProviderChain({ profile: "wood-dragon-dev" }),
  });

  const { api } = await client.send(
    new CreateApiCommand({
      name: "from-script",
      eventConfig: {
        authProviders: [{ authType: "API_KEY" }],
        connectionAuthModes: [{ authType: "API_KEY" }],
        defaultPublishAuthModes: [{ authType: "API_KEY" }],
        defaultSubscribeAuthModes: [{ authType: "API_KEY" }],
      },
    }),
  );
  if (!api) throw new Error("Failed creating api");

  console.log(JSON.stringify(api, null, 2));
}

void createApi();

import { Appsync, Sts, withAws } from "@printworks/core/utils/aws";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { Account } from "./components/account";
import { Api } from "./components/api";
import { Events } from "./components/events";
import { Functions } from "./components/functions";
import { Realtime } from "./components/realtime";
import { Router } from "./components/router";
import { Ssl } from "./components/ssl";
import { Storage } from "./components/storage";
import { useResource } from "./resource";

import type { TenantInfraProgramInput } from "@printworks/core/tenants/shared";
import type { Tenant } from "@printworks/core/tenants/sql";

export const getProgram =
  (tenantId: Tenant["id"], input: TenantInfraProgramInput) => async () => {
    const { papercutSyncSchedule, timezone } = input;
    const {
      AppData,
      Aws,
      CloudfrontPublicKey,
      InvoicesProcessor,
      PapercutSync,
    } = useResource();

    const account = Account.getInstance({ tenantId });

    const cloudfrontPublicKey = new aws.cloudfront.PublicKey(
      "CloudfrontPublicKey",
      { encodedKey: CloudfrontPublicKey.pem },
      { provider: account.provider },
    );

    const ssl = Ssl.getInstance(
      { tenantId },
      { providers: [account.provider] },
    );

    const gateway = new aws.apigateway.RestApi(
      "Gateway",
      { endpointConfiguration: { types: "REGIONAL" } },
      { provider: account.provider },
    );

    const storage = Storage.getInstance({ providers: [account.provider] });

    // NOTE: Since the realtime component uses dynamic providers, we need to manually
    // provide credentials for the appsync client via iam role chaining
    const realtime = account.assumeRoleArn.apply(async (roleArn) =>
      withAws(
        {
          sts: {
            client: new Sts.Client({
              credentials: await Sts.getAssumeRoleCredentials({
                type: "arn",
                roleArn: Aws.organization.managementRole.arn,
                roleSessionName: "StsClient",
              }),
            }),
          },
        },
        async () =>
          withAws(
            {
              appsync: {
                client: new Appsync.Client({
                  credentials: await Sts.getAssumeRoleCredentials({
                    type: "arn",
                    roleArn,
                    roleSessionName: "AppsyncClient",
                  }),
                }),
              },
            },
            () => Realtime.getInstance(),
          ),
      ),
    );

    const router = Router.getInstance(
      {
        domainName: ssl.domainName,
        certificateArn: ssl.certificateArn,
        keyPairId: cloudfrontPublicKey.id,
        origins: {
          api: {
            domainName: pulumi.interpolate`${gateway.id}.execute-api.${aws.getRegionOutput({}, { provider: account.provider }).name}.amazonaws.com`,
            originPath: `/${AppData.stage}`,
          },
          assets: {
            domainName: storage.buckets.assets.regionalDomainName,
          },
          documents: {
            domainName: storage.buckets.documents.regionalDomainName,
          },
        },
      },
      { providers: [account.provider] },
    );

    const functions = Functions.getInstance({
      providers: [account.provider],
    });

    Api.getInstance(
      {
        gateway,
        tenantId,
        domainName: ssl.domainName,
        certificateArn: ssl.certificateArn,
        cloudfrontKeyPairId: cloudfrontPublicKey.id,
        appsyncDns: realtime.dns,
        buckets: storage.buckets,
        papercutSecureReverseProxyFunction: {
          invokeArn: functions.papercutSecureReverseProxy.invokeArn,
        },
        invoicesProcessorQueue: {
          arn: storage.queues.invoicesProcessor.arn,
          name: storage.queues.invoicesProcessor.name,
          url: storage.queues.invoicesProcessor.url,
        },
        distributionId: router.distributionId,
      },
      { providers: [account.provider] },
    );

    Events.getInstance(
      {
        tenantId,
        domainName: ssl.domainName,
        events: {
          papercutSync: {
            functionArn: pulumi.output(PapercutSync.arn),
            scheduleExpression: `cron(${papercutSyncSchedule})`,
            timezone,
          },
          invoicesProcessor: {
            queueArn: storage.queues.invoicesProcessor.arn,
            functionArn: pulumi.output(InvoicesProcessor.arn),
          },
        },
      },
      { providers: [account.provider] },
    );
  };

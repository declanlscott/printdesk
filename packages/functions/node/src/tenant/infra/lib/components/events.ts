import { Utils } from "@printworks/core/utils";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

export interface EventsArgs {
  tenantId: pulumi.Input<string>;
  domainName: aws.acm.Certificate["domainName"];
  events: {
    papercutSync: {
      functionArn: aws.lambda.Function["arn"];
      scheduleExpression: pulumi.Input<string>;
      timezone: pulumi.Input<string>;
    };
    invoicesProcessor: {
      queueArn: aws.sqs.Queue["arn"];
      functionArn: aws.lambda.Function["arn"];
    };
  };
}

export class Events extends pulumi.ComponentResource {
  private static _instance: Events;

  private _events: Array<ScheduledEvent | PatternedEvent> = [];
  private _invoicesProcessorPipeRole: aws.iam.Role;
  private _invoicesProcessorPipe: aws.pipes.Pipe;

  static getInstance(args: EventsArgs, opts: pulumi.ComponentResourceOptions) {
    if (!this._instance) this._instance = new Events(args, opts);

    return this._instance;
  }

  private constructor(...[args, opts]: Parameters<typeof Events.getInstance>) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Events`, "Events", args, opts);

    this._events.push(
      new ScheduledEvent(
        "ScheduledPapercutSync",
        {
          scheduleExpression: args.events.papercutSync.scheduleExpression,
          flexibleTimeWindow: {
            mode: "FLEXIBLE",
            maximumWindowInMinutes: 15,
          },
          timezone: args.events.papercutSync.timezone,
          functionTarget: {
            arn: args.events.papercutSync.functionArn,
            input: pulumi.jsonStringify({ tenantId: args.tenantId }),
          },
        },
        { parent: this },
      ),
    );

    this._events.push(
      new PatternedEvent(
        "PatternedPapercutSync",
        {
          pattern: pulumi.jsonStringify({
            "detail-type": ["PapercutSync"],
            source: args.domainName.apply(Utils.reverseDns),
          }),
          functionTarget: {
            arn: args.events.papercutSync.functionArn,
            createPermission: false,
          },
        },
        { parent: this },
      ),
    );

    this._invoicesProcessorPipeRole = new aws.iam.Role(
      "InvoicesProcessorPipeRole",
      {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
          Service: "pipes.amazonaws.com",
        }),
      },
      { parent: this },
    );
    new aws.iam.RolePolicy(
      "InvoicesProcessorPipeRoleInlinePolicy",
      {
        role: this._invoicesProcessorPipeRole.name,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                actions: [
                  "sqs:ReceiveMessage",
                  "sqs:DeleteMessage",
                  "sqs:GetQueueAttributes",
                ],
                resources: [args.events.invoicesProcessor.queueArn],
              },
              {
                actions: ["events:PutEvents"],
                resources: [
                  aws.cloudwatch.getEventBusOutput(
                    { name: "default" },
                    { parent: this },
                  ).arn,
                ],
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );

    this._invoicesProcessorPipe = new aws.pipes.Pipe(
      "InvoicesProcessorPipe",
      {
        roleArn: this._invoicesProcessorPipeRole.arn,
        source: args.events.invoicesProcessor.queueArn,
        sourceParameters: {
          sqsQueueParameters: {
            batchSize: 10,
            maximumBatchingWindowInSeconds: 60,
          },
        },
        target: args.events.invoicesProcessor.functionArn,
        targetParameters: {
          eventbridgeEventBusParameters: {
            detailType: "InvoicesProcessor",
            source: args.events.invoicesProcessor.queueArn,
          },
        },
      },
      { parent: this },
    );

    this._events.push(
      new PatternedEvent(
        "PatternedInvoicesProcessor",
        {
          pattern: pulumi.jsonStringify({
            "detail-type": ["InvoicesProcessor"],
            source: [args.events.invoicesProcessor.queueArn],
          }),
          functionTarget: {
            arn: args.events.invoicesProcessor.functionArn,
            createPermission: false,
          },
          withDeadLetterQueue: true,
        },
        { parent: this },
      ),
    );

    this.registerOutputs({
      invoicesProcessorPipeRole: this._invoicesProcessorPipeRole.id,
      invoicesProcessorPipe: this._invoicesProcessorPipe.id,
    });
  }
}

interface ScheduledEventArgs {
  scheduleExpression: pulumi.Input<string>;
  flexibleTimeWindow: aws.types.input.scheduler.ScheduleFlexibleTimeWindow;
  timezone?: pulumi.Input<string>;
  functionTarget: {
    arn: aws.lambda.Function["arn"];
    input?: pulumi.Input<string>;
  };
}

class ScheduledEvent extends pulumi.ComponentResource {
  private _role: aws.iam.Role;
  private _schedule: aws.scheduler.Schedule;

  constructor(
    name: string,
    args: ScheduledEventArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:ScheduledEvent`, name, args, opts);

    this._role = new aws.iam.Role(
      `${name}Role`,
      {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
          Service: "scheduler.amazonaws.com",
        }),
      },
      { parent: this },
    );

    new aws.iam.RolePolicy(
      `${name}RoleInlinePolicy`,
      {
        role: this._role.name,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                actions: ["lambda:InvokeFunction"],
                resources: [args.functionTarget.arn],
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );

    this._schedule = new aws.scheduler.Schedule(
      `${name}Schedule`,
      {
        scheduleExpression: args.scheduleExpression,
        flexibleTimeWindow: args.flexibleTimeWindow,
        scheduleExpressionTimezone: args.timezone ?? "UTC",
        target: {
          arn: args.functionTarget.arn,
          roleArn: this._role.arn,
          input: args.functionTarget.input,
        },
      },
      { parent: this },
    );

    this.registerOutputs({
      role: this._role.id,
      schedule: this._schedule.id,
    });
  }
}

interface PatternedEventArgs {
  pattern: pulumi.Input<string>;
  functionTarget: {
    arn: aws.lambda.Function["arn"];
    createPermission: boolean;
  };
  withDeadLetterQueue?: boolean;
}

class PatternedEvent extends pulumi.ComponentResource {
  private _rule: aws.cloudwatch.EventRule;
  private _deadLetterQueue?: aws.sqs.Queue;
  private _target: aws.cloudwatch.EventTarget;
  private _permission?: aws.lambda.Permission;

  constructor(
    name: string,
    args: PatternedEventArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:PatternedEvent`, name, args, opts);

    this._rule = new aws.cloudwatch.EventRule(
      `${name}Rule`,
      { eventPattern: args.pattern },
      { parent: this },
    );

    if (args.withDeadLetterQueue)
      this._deadLetterQueue = new aws.sqs.Queue(
        "DeadLetterQueue",
        {
          messageRetentionSeconds: 1209600, // 14 days
        },
        { parent: this },
      );

    this._target = new aws.cloudwatch.EventTarget(
      `${name}Target`,
      {
        arn: args.functionTarget.arn,
        rule: this._rule.name,
        deadLetterConfig:
          args.withDeadLetterQueue && this._deadLetterQueue
            ? { arn: this._deadLetterQueue.arn }
            : undefined,
      },
      { parent: this },
    );

    if (args.functionTarget.createPermission)
      this._permission = new aws.lambda.Permission(
        `${name}Permission`,
        {
          action: "lambda:InvokeFunction",
          function: args.functionTarget.arn,
          principal: "events.amazonaws.com",
          sourceArn: this._rule.arn,
        },
        { parent: this },
      );

    this.registerOutputs({
      rule: this._rule.id,
      target: this._target.id,
      permission: this._permission?.id,
    });
  }
}

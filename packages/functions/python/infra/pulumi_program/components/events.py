import json

import pulumi
import pulumi_aws as aws

from utilities import resource, tags

from typing import Optional


class EventsArgs:
    def __init__(
        self,
        tenant_id: str,
        event_bus: pulumi.Input[aws.cloudwatch.EventBus],
        invoices_processor_queue_arn: pulumi.Input[str],
        papercut_sync_schedule: pulumi.Input[str],
        timezone: pulumi.Input[str],
        reverse_dns: pulumi.Input[str],
    ):
        self.tenant_id = tenant_id
        self.event_bus = event_bus
        self.invoices_processor_queue_arn = invoices_processor_queue_arn
        self.papercut_sync_schedule = papercut_sync_schedule
        self.timezone = timezone
        self.reverse_dns = reverse_dns


class Events(pulumi.ComponentResource):
    def __init__(self, args: EventsArgs, opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__(
            t="pw:resource:Events", name="Events", props=vars(args), opts=opts
        )

        self.__invoices_processor_event_source_mapping = aws.lambda_.EventSourceMapping(
            resource_name="InvoicesProcessorEventSourceMapping",
            args=aws.lambda_.EventSourceMappingArgs(
                event_source_arn=args.invoices_processor_queue_arn,
                function_name=resource["InvoicesProcessor"]["name"],
                function_response_types=["ReportBatchItemFailures"],
                batch_size=10,
                maximum_batching_window_in_seconds=0,
                tags=tags(tenant_id=args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_sync_dead_letter_queue = aws.sqs.Queue(
            resource_name="PapercutSyncDeadLetterQueue",
            args=aws.sqs.QueueArgs(
                message_retention_seconds=1209600,  # 14 days
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__scheduled_papercut_sync = ScheduledEvent(
            name="PapercutSync",
            args=ScheduledEventArgs(
                tenant_id=args.tenant_id,
                schedule_expression=pulumi.Output.format(
                    "cron({0})", args.papercut_sync_schedule
                ),
                flexible_time_window=aws.scheduler.ScheduleFlexibleTimeWindowArgs(
                    mode="FLEXIBLE",
                    maximum_window_in_minutes=15,
                ),
                function_target_arn=resource["PapercutSync"]["arn"],
                function_target_name=resource["PapercutSync"]["name"],
                function_target_input=json.dumps({"tenantId": args.tenant_id}),
                dead_letter_queue_arn=self.__papercut_sync_dead_letter_queue.arn,
                timezone=args.timezone,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__patterned_papercut_sync = PatternedEvent(
            name="PapercutSync",
            args=PatternedEventArgs(
                tenant_id=args.tenant_id,
                event_bus_name=args.event_bus.name,
                pattern=pulumi.Output.json_dumps(
                    {
                        "detail-type": ["PapercutSync"],
                        "source": [args.reverse_dns],
                    }
                ),
                function_target_arn=resource["PapercutSync"]["arn"],
                function_target_name=resource["PapercutSync"]["name"],
                dead_letter_queue_arn=self.__papercut_sync_dead_letter_queue.arn,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.register_outputs(
            {
                "invoices_processor_event_source_mapping": self.__invoices_processor_event_source_mapping.id,
                "papercut_sync_dead_letter_queue": self.__papercut_sync_dead_letter_queue.id,
            }
        )


class ScheduledEventArgs:
    def __init__(
        self,
        tenant_id: str,
        schedule_expression: pulumi.Input[str],
        flexible_time_window: pulumi.Input[
            aws.scheduler.ScheduleFlexibleTimeWindowArgs
        ],
        function_target_arn: pulumi.Input[str],
        function_target_input: pulumi.Input[str],
        function_target_name: pulumi.Input[str],
        dead_letter_queue_arn: pulumi.Input[str],
        timezone: Optional[pulumi.Input[str]] = None,
    ):
        self.tenant_id = tenant_id
        self.schedule_expression = schedule_expression
        self.flexible_time_window = flexible_time_window
        self.function_target_arn = function_target_arn
        self.function_target_input = function_target_input
        self.function_target_name = function_target_name
        self.dead_letter_queue_arn = dead_letter_queue_arn
        self.timezone = timezone


class ScheduledEvent(pulumi.ComponentResource):
    def __init__(
        self, name: str, args: ScheduledEventArgs, opts: pulumi.ResourceOptions = None
    ):
        super().__init__(
            t="pw:resource:ScheduledEvent",
            name=f"{name}ScheduledEvent",
            props=vars(args),
            opts=opts,
        )

        self.__role = aws.iam.Role(
            resource_name=f"{name}Role",
            args=aws.iam.RoleArgs(
                assume_role_policy=aws.iam.get_policy_document_output(
                    statements=[
                        aws.iam.GetPolicyDocumentStatementArgs(
                            principals=[
                                aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                    type="Service",
                                    identifiers=["scheduler.amazonaws.com"],
                                )
                            ],
                            actions=["sts:AssumeRole"],
                        )
                    ]
                ).minified_json,
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__role_policy: pulumi.Output[
            aws.iam.RolePolicy
        ] = pulumi.Output.from_input(args.function_target_arn).apply(
            lambda arn: aws.iam.RolePolicy(
                resource_name=f"{name}RolePolicy",
                args=aws.iam.RolePolicyArgs(
                    role=self.__role.name,
                    policy=aws.iam.get_policy_document(
                        statements=[
                            aws.iam.GetPolicyDocumentStatementArgs(
                                actions=["lambda:InvokeFunction"],
                                resources=[arn],
                            )
                        ]
                    ).minified_json,
                ),
            )
        )

        self.__schedule = aws.scheduler.Schedule(
            resource_name=f"{name}Schedule",
            args=aws.scheduler.ScheduleArgs(
                schedule_expression=args.schedule_expression,
                flexible_time_window=args.flexible_time_window,
                schedule_expression_timezone=(
                    args.timezone if args.timezone is not None else "UTC"
                ),
                target=aws.scheduler.ScheduleTargetArgs(
                    arn=args.function_target_arn,
                    role_arn=self.__role.arn,
                    input=args.function_target_input,
                    dead_letter_config=aws.scheduler.ScheduleTargetDeadLetterConfigArgs(
                        arn=args.dead_letter_queue_arn,
                    ),
                ),
                description=f"{name} Scheduled Event ({args.tenant_id})",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__permission = aws.lambda_.Permission(
            resource_name=f"{name}Permission",
            args=aws.lambda_.PermissionArgs(
                function=args.function_target_name,
                action="lambda:InvokeFunction",
                principal="scheduler.amazonaws.com",
                source_arn=self.__schedule.arn,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.register_outputs(
            {
                "role": self.__role.id,
                "role_policy": self.__role_policy.apply(lambda policy: policy.id),
                "schedule": self.__schedule.id,
                "permission": self.__permission.id,
            }
        )


class PatternedEventArgs:
    def __init__(
        self,
        tenant_id: str,
        event_bus_name: pulumi.Input[str],
        pattern: pulumi.Input[str],
        function_target_arn: pulumi.Input[str],
        function_target_name: pulumi.Input[str],
        dead_letter_queue_arn: pulumi.Input[str],
    ):
        self.tenant_id = tenant_id
        self.event_bus_name = event_bus_name
        self.pattern = pattern
        self.function_target_arn = function_target_arn
        self.function_target_name = function_target_name
        self.dead_letter_queue_arn = dead_letter_queue_arn


class PatternedEvent(pulumi.ComponentResource):
    def __init__(
        self, name: str, args: PatternedEventArgs, opts: pulumi.ResourceOptions
    ):
        super().__init__(
            t="pw:resource:PatternedEvent",
            name=f"{name}PatternedEvent",
            props=vars(args),
            opts=opts,
        )

        self.__rule = aws.cloudwatch.EventRule(
            resource_name=f"{name}Rule",
            args=aws.cloudwatch.EventRuleArgs(
                event_bus_name=args.event_bus_name,
                event_pattern=args.pattern,
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__target = aws.cloudwatch.EventTarget(
            resource_name=f"{name}Target",
            args=aws.cloudwatch.EventTargetArgs(
                event_bus_name=args.event_bus_name,
                arn=args.function_target_arn,
                rule=self.__rule.name,
                dead_letter_config=aws.cloudwatch.EventTargetDeadLetterConfigArgs(
                    arn=args.dead_letter_queue_arn,
                ),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__permission = aws.lambda_.Permission(
            resource_name=f"{name}Permission",
            args=aws.lambda_.PermissionArgs(
                function=args.function_target_name,
                action="lambda:InvokeFunction",
                principal="events.amazonaws.com",
                source_arn=self.__rule.arn,
            ),
        )

        self.register_outputs(
            {
                "rule": self.__rule.id,
                "target": self.__target.id,
                "permission": self.__permission.id,
            }
        )

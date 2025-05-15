import json

import pulumi
import pulumi_aws as aws
from sst import Resource

from src.utilities import tags

from typing import Optional


class EventsArgs:
    def __init__(
        self,
        tenant_id: str,
        reverse_dns: pulumi.Input[str],
        invoices_processor_queue_arn: pulumi.Input[str],
        papercut_sync_cron_expression: pulumi.Input[str],
        timezone: pulumi.Input[str],
    ):
        self.tenant_id = tenant_id
        self.reverse_dns = reverse_dns
        self.invoices_processor_queue_arn = invoices_processor_queue_arn
        self.papercut_sync_cron_expression = papercut_sync_cron_expression
        self.timezone = timezone


class Events(pulumi.ComponentResource):
    def __init__(self, args: EventsArgs, opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__(
            t="pd:resource:Events", name="Events", props=vars(args), opts=opts
        )

        self.__event_bus = aws.cloudwatch.EventBus(
            resource_name="EventBus",
            args=aws.cloudwatch.EventBusArgs(
                tags=tags(args.tenant_id),
                description=f"{args.tenant_id} event bus",
            ),
        )

        self.__invoices_processor_event_source_mapping = aws.lambda_.EventSourceMapping(
            resource_name="InvoicesProcessorEventSourceMapping",
            args=aws.lambda_.EventSourceMappingArgs(
                event_source_arn=args.invoices_processor_queue_arn,
                function_name=Resource.InvoicesProcessor.name,
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

        self.__papercut_sync_event_rule = aws.cloudwatch.EventRule(
            resource_name=f"PapercutSyncEventRule",
            args=aws.cloudwatch.EventRuleArgs(
                event_bus_name=self.__event_bus.name,
                event_pattern=pulumi.Output.json_dumps(
                    {
                        "detail-type": ["PapercutSync"],
                        "source": [args.reverse_dns, "schedule"],
                    }
                ),
                description=f"papercut sync event rule ({args.tenant_id})",
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_sync_event_target = aws.cloudwatch.EventTarget(
            resource_name=f"PapercutSyncEventTarget",
            args=aws.cloudwatch.EventTargetArgs(
                event_bus_name=self.__event_bus.name,
                arn=Resource.PapercutSync.arn,
                rule=self.__papercut_sync_event_rule.name,
                dead_letter_config=aws.cloudwatch.EventTargetDeadLetterConfigArgs(
                    arn=self.__papercut_sync_dead_letter_queue.arn,
                ),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_sync_permission = aws.lambda_.Permission(
            resource_name=f"PapercutSyncPermission",
            args=aws.lambda_.PermissionArgs(
                function=Resource.PapercutSync.name,
                action="lambda:InvokeFunction",
                principal="events.amazonaws.com",
                source_arn=self.__papercut_sync_event_rule.arn,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__papercut_sync_schedule_role = aws.iam.Role(
            resource_name="PapercutSyncScheduleRole",
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

        self.__papercut_sync_schedule_role_policy: pulumi.Output[aws.iam.RolePolicy] = (
            self.__event_bus.arn.apply(
                lambda event_bus_arn: aws.iam.RolePolicy(
                    resource_name="PapercutSyncScheduleRolePolicy",
                    args=aws.iam.RolePolicyArgs(
                        role=self.__papercut_sync_schedule_role.name,
                        policy=aws.iam.get_policy_document_output(
                            statements=[
                                aws.iam.GetPolicyDocumentStatementArgs(
                                    actions=["events:PutEvents"],
                                    resources=[event_bus_arn],
                                )
                            ],
                        ).minified_json,
                    ),
                    opts=pulumi.ResourceOptions(parent=self),
                )
            )
        )

        self.__papercut_sync_schedule = aws.scheduler.Schedule(
            resource_name="PapercutSyncSchedule",
            args=aws.scheduler.ScheduleArgs(
                schedule_expression=pulumi.Output.format(
                    "cron({0})", args.papercut_sync_cron_expression
                ),
                flexible_time_window=aws.scheduler.ScheduleFlexibleTimeWindowArgs(
                    mode="FLEXIBLE",
                    maximum_window_in_minutes=15,
                ),
                schedule_expression_timezone=args.timezone,
                target=aws.scheduler.ScheduleTargetArgs(
                    arn=self.__event_bus.arn,
                    role_arn=self.__papercut_sync_schedule_role.arn,
                    eventbridge_parameters=aws.scheduler.ScheduleTargetEventbridgeParametersArgs(
                        detail_type="PapercutSync",
                        source="schedule",
                    ),
                    input=json.dumps({"tenantId": args.tenant_id}),
                ),
                description=f"papercut sync schedule ({args.tenant_id})",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.register_outputs(
            {
                "event_bus": self.__event_bus.id,
                "invoices_processor_event_source_mapping": self.__invoices_processor_event_source_mapping.id,
                "papercut_sync_dead_letter_queue": self.__papercut_sync_dead_letter_queue.id,
                "papercut_sync_event_rule": self.__papercut_sync_event_rule.id,
                "papercut_sync_event_target": self.__papercut_sync_event_target.id,
                "papercut_sync_permission": self.__papercut_sync_permission.id,
                "papercut_sync_schedule_role": self.__papercut_sync_schedule_role.id,
                "papercut_sync_schedule_role_policy": self.__papercut_sync_schedule_role_policy.apply(
                    lambda policy: policy.id
                ),
                "papercut_sync_schedule": self.__papercut_sync_schedule.id,
            }
        )

    @property
    def event_bus(self):
        return self.__event_bus

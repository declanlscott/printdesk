import json
from importlib.metadata import version

import boto3
import requests
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.batch import (
    BatchProcessor,
    EventType,
    process_partial_response,
)
from aws_lambda_powertools.utilities.data_classes.sqs_event import SQSRecord
from aws_lambda_powertools.utilities.parser import parse
from aws_lambda_powertools.utilities.typing import LambdaContext
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
import pulumi
from sst import Resource

from models import sqs_record
from program import inline
from utils import is_prod_stage, get_realtime_credentials, transform

processor = BatchProcessor(EventType.SQS)
logger = Logger()
tracer = Tracer()


@logger.inject_lambda_context
@tracer.capture_lambda_handler
def handler(event, context: LambdaContext):
    return process_partial_response(event, record_handler, processor, context)


@tracer.capture_method
def record_handler(record: SQSRecord):
    logger.info("Parsing record body ...")
    payload = parse(model=sqs_record.Payload, event=record.json_body)
    logger.info("Successfully parsed record body.")

    logger.info("Initializing stack ...")
    project_name = f"{Resource.AppData.name}-{Resource.AppData.stage}-infra"
    stack_name = payload.tenantId
    stack = pulumi.automation.create_or_select_stack(
        project_name=project_name,
        stack_name=stack_name,
        program=lambda: inline(payload),
        opts=pulumi.automation.LocalWorkspaceOptions(
            pulumi_home="/tmp/pulumi_home",
            project_settings=pulumi.automation.ProjectSettings(
                name=project_name,
                runtime="python",
                backend=pulumi.automation.ProjectBackend(
                    url=f"s3://{Resource.PulumiBucket.name}/{project_name}"
                ),
            ),
        ),
    )
    logger.info(f"Successfully initialized stack {stack.name}.")

    logger.info("Installing plugins ...")
    stack.workspace.install_plugin("aws", f"v{version('pulumi-aws')}")
    stack.workspace.install_plugin("cloudflare", f"v{version('pulumi-cloudflare')}")
    logger.info("Successfully installed plugins.")

    logger.info("Setting stack configuration ...")
    stack.set_config("aws:region", pulumi.automation.ConfigValue(Resource.Aws.region))
    stack.set_config(
        "aws:assumeRole.roleArn",
        pulumi.automation.ConfigValue(Resource.PulumiRole.arn),
        path=True,
    )
    stack.set_config(
        "aws:assumeRole.externalId",
        pulumi.automation.ConfigValue(Resource.PulumiRoleExternalId.value),
        path=True,
    )
    stack.set_config(
        "cloudflare:apiToken",
        pulumi.automation.ConfigValue(Resource.CloudflareApiToken.value, True),
    )
    logger.info("Successfully set stack configuration.")

    logger.info("Registering stack transformations ...")
    pulumi.runtime.register_stack_transformation(transform.name(payload.tenantId))
    logger.info("Successfully registered stack transformations.")

    result: pulumi.automation.UpResult | pulumi.automation.DestroyResult
    if payload.destroy is False:
        exception: Exception | None = None
        try:
            logger.info("Updating stack ...")
            result = stack.up(on_output=print)
            logger.info(
                f"Update summary: \n{json.dumps(result.summary.resource_changes, indent=2)}"
            )
        except Exception as e:
            exception = e

        try:
            success = True if exception is None else False

            aws_request = AWSRequest(
                method="POST",
                url=f"https://{Resource.Domains.realtime}/event",
                headers={"Content-Type": "application/json"},
                data=json.dumps(
                    {
                        "channel": f"/events/{record.message_id}",
                        "events": [
                            json.dumps(
                                {
                                    "kind": "infra_provision_result",
                                    "success": success,
                                    "dispatchId": record.message_id,
                                    "retrying": not success
                                    & (
                                        int(record.attributes.approximate_receive_count)
                                        < 3
                                    ),
                                }
                            )
                        ],
                    }
                ),
            )

            credentials = get_realtime_credentials("InfraFunction")
            SigV4Auth(
                credentials=boto3.Session(
                    aws_access_key_id=credentials["AccessKeyId"],
                    aws_secret_access_key=credentials["SecretAccessKey"],
                    aws_session_token=credentials["SessionToken"],
                ).get_credentials(),
                service_name="appsync",
                region_name=Resource.Aws.region,
            ).add_auth(aws_request)

            aws_prepared_request = aws_request.prepare()
            requests.Session().send(
                requests.Request(
                    method=aws_prepared_request.method,
                    url=aws_prepared_request.url,
                    headers=aws_prepared_request.headers,
                    data=aws_prepared_request.body,
                ).prepare()
            ).raise_for_status()
        except Exception as e:
            logger.info("Failed to publish realtime event.")
            logger.exception(e)

        if exception is not None:
            raise RuntimeError("Failed to update stack.") from exception
    else:
        logger.info("Destroying stack ...")
        result = stack.destroy(on_output=print)
        logger.info(
            f"Destroy summary: \n{json.dumps(result.summary.resource_changes, indent=2)}"
        )

        if not is_prod_stage:
            stack.workspace.remove_stack(stack_name=stack_name)

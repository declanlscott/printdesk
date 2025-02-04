import json
from importlib.metadata import version

import boto3
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.batch import (
    BatchProcessor,
    EventType,
    process_partial_response,
)
from aws_lambda_powertools.utilities.data_classes.sqs_event import SQSRecord
from aws_lambda_powertools.utilities.parser import parse
from aws_lambda_powertools.utilities.typing import LambdaContext
from botocore.awsrequest import AWSRequest
from botocore.auth import SigV4Auth
from pulumi import automation
import requests

from models import sqs_record
from pulumi_program import program
from utilities import resource, app, stage, region
from utilities.aws import get_realtime_credentials
from utilities.parameters import cloudflare_api_token

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
    project_name = f"{app}-{stage}-infra"
    stack_name = payload.tenantId
    stack = automation.create_or_select_stack(
        project_name=project_name,
        stack_name=stack_name,
        program=lambda: program.inline(payload),
        opts=automation.LocalWorkspaceOptions(
            pulumi_home="/tmp/pulumi_home",
            project_settings=automation.ProjectSettings(
                name=project_name,
                runtime="python",
                backend=automation.ProjectBackend(
                    url=f"s3://{resource["PulumiBucket"]["name"]}/{project_name}"
                ),
            ),
        ),
    )
    logger.info(f"Successfully initialized stack {stack.name}.")

    logger.info("Installing plugins ...")
    stack.workspace.install_plugin("aws", f"v{version("pulumi-aws")}")
    stack.workspace.install_plugin("cloudflare", f"v{version("pulumi-cloudflare")}")
    logger.info("Successfully installed plugins.")

    logger.info("Setting stack configuration ...")
    stack.set_config("aws:region", automation.ConfigValue(region))
    stack.set_config(
        "aws:assumeRole.roleArn",
        automation.ConfigValue(resource["Aws"]["roles"]["pulumi"]["arn"]),
        path=True,
    )
    stack.set_config(
        "cloudflare:apiToken",
        automation.ConfigValue(cloudflare_api_token, True),
    )
    logger.info("Successfully set stack configuration.")

    result: automation.UpResult | automation.DestroyResult
    if payload.destroy is False:
        success: bool = False
        exception: Exception | None = None
        try:
            logger.info("Updating stack ...")
            result = stack.up(on_output=print)
            logger.info(
                f"Update summary: \n{json.dumps(result.summary.resource_changes, indent=2)}"
            )
            success = True
        except Exception as e:
            exception = e

        try:
            aws_request = AWSRequest(
                method="POST",
                url=f"https://{resource["AppsyncEventApi"]["dns"]["http"]}/event",
                headers={"Content-Type": "application/json"},
                data=json.dumps(
                    {
                        "channel": f"/events/{record.message_id}",
                        "events": [
                            json.dumps(
                                {
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
                region_name=region,
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

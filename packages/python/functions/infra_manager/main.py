import json
from importlib.metadata import version
import os

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.batch import (
    BatchProcessor,
    EventType,
    process_partial_response,
)
from aws_lambda_powertools.utilities.typing import LambdaContext
import pulumi
from sst import Resource

from program import inline
from utils import is_prod_stage, naming
from models import InputDynamoDBStreamRecord

processor = BatchProcessor(
    event_type=EventType.DynamoDBStreams, model=InputDynamoDBStreamRecord
)
logger = Logger()
tracer = Tracer()


@logger.inject_lambda_context
@tracer.capture_lambda_handler
def handler(event, context: LambdaContext):
    return process_partial_response(
        event=event, record_handler=record_handler, processor=processor, context=context
    )


@tracer.capture_method
def record_handler(record: InputDynamoDBStreamRecord):
    logger.info(f"Processing event stream record {record.eventID} ...")

    tenant_id = record.dynamodb.Keys.tenant_id
    is_destroy = record.eventName == "REMOVE"

    logger.info(f"Initializing stack for tenant {tenant_id} ...")
    project_name = f"{Resource.App.name}-{Resource.App.stage}-infra"
    stack_name = tenant_id
    stack = pulumi.automation.create_or_select_stack(
        project_name=project_name,
        stack_name=stack_name,
        program=lambda: inline(
            tenant_id=tenant_id,
            _input=record.dynamodb.OldImage if is_destroy else record.dynamodb.NewImage,
        ),
        opts=pulumi.automation.LocalWorkspaceOptions(
            pulumi_home=os.environ("PULUMI_HOME"),
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
    stack.workspace.install_plugin(
        name="aws",
        version=f"v{version('pulumi-aws')}",
    )
    stack.workspace.install_plugin(
        name="cloudflare",
        version=f"v{version('pulumi-cloudflare')}",
    )
    stack.workspace.install_plugin(
        name="time",
        version=f"v{version('pulumiverse-time')}",
    )
    logger.info("Successfully installed plugins.")

    logger.info("Setting stack configuration ...")
    stack.set_config(
        key="aws:region",
        value=pulumi.automation.ConfigValue(value=Resource.Aws.region),
    )
    stack.set_config(
        key="aws:assumeRoles[0].roleArn",
        value=pulumi.automation.ConfigValue(value=Resource.PulumiRole.arn),
        path=True,
    )
    stack.set_config(
        key="aws:assumeRoles[0].externalId",
        value=pulumi.automation.ConfigValue(value=Resource.PulumiRole.externalId),
        path=True,
    )
    stack.set_config(
        key="aws:defaultTags",
        value=pulumi.automation.ConfigValue(
            value=json.dumps(
                {
                    "tags": {
                        "sst:app": Resource.App.name,
                        "sst:stage": Resource.App.stage,
                        "pd:tenantId": tenant_id,
                    }
                }
            )
        ),
    )
    stack.set_config(
        key="cloudflare:apiToken",
        value=pulumi.automation.ConfigValue(
            value=Resource.Cloudflare.apiToken, secret=True
        ),
    )
    stack.set_config(
        key="cloudflareAccountId",
        value=pulumi.automation.ConfigValue(value=Resource.Cloudflare.account.id),
    )
    logger.info("Successfully set stack configuration.")

    logger.info("Registering stack transformations ...")
    pulumi.runtime.register_stack_transformation(naming.transform_resource(tenant_id))
    logger.info("Successfully registered stack transformations.")

    if not is_destroy:
        try:
            logger.info("Updating stack ...")
            result = stack.up(on_output=logger.info, on_error=logger.error)
            logger.info(
                f"Update summary: \n{json.dumps(obj=result.summary.resource_changes, indent=2)}"
            )

            if result.summary.result != "succeeded":
                error_message = (
                    f"Unexpected stack update result: {result.summary.result}"
                )
                logger.error(error_message)
                raise RuntimeError(error_message)
        except pulumi.automation.CommandError as e:
            logger.error(f"Stack update error: {e.name}")
            raise
        except Exception:
            logger.error("Unexpected stack update error")
            raise
    else:
        try:
            logger.info("Destroying stack ...")
            result = stack.destroy(on_output=logger.info, on_error=logger.error)
            logger.info(
                f"Destroy summary: \n{json.dumps(result.summary.resource_changes, indent=2)}"
            )

            if result.summary.result != "succeeded":
                error_message = (
                    f"Unexpected stack destroy result: {result.summary.result}"
                )
                logger.error(error_message)
                raise RuntimeError(error_message)

            if not is_prod_stage:
                stack.workspace.remove_stack(stack_name=stack_name)
        except pulumi.automation.CommandError as e:
            logger.error(f"Stack destroy error: {e.name}")
            raise
        except Exception:
            logger.error("Unexpected stack destroy error")
            raise

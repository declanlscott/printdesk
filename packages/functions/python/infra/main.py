from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.batch import (
    BatchProcessor,
    EventType,
    process_partial_response,
)
from aws_lambda_powertools.utilities.data_classes.sqs_event import SQSRecord
from aws_lambda_powertools.utilities.parser import parse
from aws_lambda_powertools.utilities.typing import LambdaContext
from pulumi import automation

from models import sqs_record
from pulumi_program import program
from utilities import resource

processor = BatchProcessor(EventType.SQS)
logger = Logger()
tracer = Tracer()


@logger.inject_lambda_context
@tracer.capture_lambda_handler
def handler(event, context: LambdaContext):
    return process_partial_response(event, record_handler, processor, context)


@tracer.capture_method
def record_handler(record: SQSRecord):
    app_name = resource["AppData"]["name"]
    app_stage = resource["AppData"]["stage"]

    logger.info("Parsing record body ...")

    payload = parse(model=sqs_record.Payload, event=record.json_body)
    logger.info("Successfully parsed record body.")

    logger.info("Initializing stack ...")
    project_name = f"{app_name}-{app_stage}-tenants"
    stack_name = f"{app_name}-{app_stage}-tenant-{payload.tenantId}"

    stack = automation.create_or_select_stack(
        project_name=project_name,
        stack_name=stack_name,
        program=lambda: program.create(payload),
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

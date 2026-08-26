from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.batch import BatchProcessor, EventType
from models import InputDynamoDBStreamRecord

processor = BatchProcessor(
    event_type=EventType.DynamoDBStreams, model=InputDynamoDBStreamRecord
)
logger = Logger()
tracer = Tracer()

from typing import Optional, Annotated

from aws_lambda_powertools.utilities.parser.models import (
    DynamoDBStreamChangedRecordModel,
    DynamoDBStreamRecordModel,
)
from pydantic import Field

from models.io import InputKeys, Input


class InputDynamoDBStreamChangedRecord(DynamoDBStreamChangedRecordModel):
    Keys: InputKeys
    NewImage: Annotated[Optional[Input], Field(default=None)]
    OldImage: Annotated[Optional[Input], Field(default=None)]


class InputDynamoDBStreamRecord(DynamoDBStreamRecordModel):
    dynamodb: InputDynamoDBStreamChangedRecord

from typing import Annotated

from aws_lambda_powertools.utilities.parser.models import (
    DynamoDBStreamChangedRecordModel,
    DynamoDBStreamRecordModel,
)
from pydantic import Field

from models.io import Input, InputKeys


class InputDynamoDBStreamChangedRecord(DynamoDBStreamChangedRecordModel):
    Keys: InputKeys
    NewImage: Annotated[Input | None, Field(default=None)]
    OldImage: Annotated[Input | None, Field(default=None)]


class InputDynamoDBStreamRecord(DynamoDBStreamRecordModel):
    dynamodb: InputDynamoDBStreamChangedRecord

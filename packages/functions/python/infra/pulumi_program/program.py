import json

from models import sqs_record


def create(payload: sqs_record.Payload):
    print(f"program payload: {json.dumps(payload)}")
    return

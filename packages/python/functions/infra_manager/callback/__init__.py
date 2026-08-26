import threading
from contextlib import contextmanager

import boto3
from botocore.exceptions import BotoCoreError
from powertools import logger
from types_boto3_lambda import LambdaClient

HEARTBEAT_INTERVAL_SECONDS = 30
_client: LambdaClient = boto3.client("lambda")


@contextmanager
def heartbeat(callback_id: str, client: LambdaClient = _client):
    stop = threading.Event()

    def beat():
        try:
            client.send_durable_execution_callback_heartbeat(CallbackId=callback_id)
            logger.debug(f"Sent heartbeat for callback {callback_id}.")
        except (
            client.exceptions.CallbackTimeoutException,
            client.exceptions.ResourceNotFoundException,
        ) as e:
            logger.warning(
                f"Callback {callback_id} is closed or expired ({e.response['Error']['Code']}); stopping heartbeats."
            )
            return False
        except (client.exceptions.ClientError, BotoCoreError) as e:
            logger.warning(
                f"Heartbeat for callback {callback_id} failed ({e!s}); retrying next interval."
            )

        return True

    def send_heartbeats():
        while beat() and not stop.wait(HEARTBEAT_INTERVAL_SECONDS):
            pass

    thread = threading.Thread(
        target=send_heartbeats, name="callback-heartbeat", daemon=True
    )
    thread.start()
    try:
        yield
    finally:
        stop.set()
        thread.join(timeout=HEARTBEAT_INTERVAL_SECONDS + 5)


def resolve_success(callback_id: str, result_json: str, client: LambdaClient = _client):
    try:
        client.send_durable_execution_callback_success(
            CallbackId=callback_id, Result=result_json
        )
        logger.info(f"Resolved success for callback {callback_id}.")
    except (
        client.exceptions.ResourceNotFoundException,
        client.exceptions.CallbackTimeoutException,
    ) as e:
        logger.warning(
            f"Callback {callback_id} already closed ({e.response['Error']['Code']}); skipping resolution."
        )

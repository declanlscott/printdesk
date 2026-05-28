from dataclasses import dataclass
import time
from typing import Optional, Any, List, Dict

import requests


@dataclass
class RequestError:
    code: int
    message: str
    error_chain: Optional[List["RequestError"]] = None


@dataclass
class ResultInfo:
    page: int
    per_page: int
    count: int
    total_count: int


@dataclass
class Response:
    success: bool
    result: Dict[str, Any]
    errors: List[RequestError]
    messages: Optional[List[str]] = None
    result_info: Optional[ResultInfo] = None


class CloudflareApiError(Exception):
    def __init__(self, message: str, errors=None, messages=None):
        super().__init__(message)
        self.errors = errors or []
        self.messages = messages or []


class Cloudflare:
    def __init__(
        self,
        account_id: str,
        api_token: str,
        base_url="https://api.cloudflare.com/client/v4",
    ):
        self.account_id = account_id
        self._api_token = api_token
        self._base_url = base_url
        self._session = requests.Session()
        self._session.headers.update(
            {
                "Authorization": f"Bearer {self._api_token}",
            }
        )

    def request(
        self, resource: str, method="GET", max_retries=3, **request_kwargs: Any
    ):
        last_error: Optional[Exception] = None

        for attempt in range(max_retries + 1):
            try:
                response = self._session.request(
                    method=method, url=f"{self._base_url}{resource}", **request_kwargs
                ).json()

                if response.get("success"):
                    return Response(
                        success=True,
                        result=response.get("result"),
                        errors=[RequestError(**e) for e in response.get("errors", [])],
                        messages=response.get("messages"),
                        result_info=ResultInfo(**response["result_info"])
                        if response.get("result_info")
                        else None,
                    )

                last_error = CloudflareApiError(
                    f"A request to the Cloudflare API ({resource}) failed.",
                    errors=response.get("errors"),
                    messages=response.get("messages"),
                )
            except Exception as e:
                last_error = e

            # exponential backoff
            if attempt < max_retries:
                time.sleep((2**attempt) * 0.2)

        raise last_error

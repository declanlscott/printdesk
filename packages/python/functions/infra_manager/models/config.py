from typing import Literal, Union, Sequence, Optional, Annotated
from zoneinfo import ZoneInfo

from pydantic import BaseModel, Field, field_validator
from pyawscron import AWSCron

from utils import ipv4_pattern

ipv4 = Annotated[str, Field(pattern=ipv4_pattern)]


class PapercutMfApiHostNameConfig(BaseModel):
    _tag: Literal["PapercutMfApiHostNameConfig"]
    name: str
    resolver_ips: Annotated[
        Optional[Sequence[ipv4]], Field(alias="resolverIps", default=None)
    ]


class PapercutMfApiHostIpv4Config(BaseModel):
    _tag: Literal["PapercutMfApiHostIpv4Config"]
    ipv4: ipv4


PapercutMfApiHostConfig = Union[
    PapercutMfApiHostNameConfig, PapercutMfApiHostIpv4Config
]


class PapercutMfApiConfig(BaseModel):
    protocol: Literal["http", "https"]
    host: Annotated[PapercutMfApiHostConfig, Field(discriminator="_tag")]
    port: Annotated[int, Field(gt=0, lt=2**16)]


class PapercutMfSyncConfig(BaseModel):
    cron_expression: Annotated[str, Field(alias="cronExpression")]
    timezone: str

    @field_validator("cron_expression")
    def validate_cron_expression(self, cron_expression: str):
        AWSCron(cron_expression)
        return cron_expression

    @field_validator("timezone")
    def validate_timezone(self, timezone: str):
        ZoneInfo(timezone)
        return timezone


class PapercutMfEnabledConfig(BaseModel):
    enabled: Literal[True] = True
    api: PapercutMfApiConfig
    sync: PapercutMfSyncConfig


class PapercutMfDisabledConfig(BaseModel):
    enabled: Literal[False] = False


PapercutMfConfig = Union[PapercutMfEnabledConfig, PapercutMfDisabledConfig]

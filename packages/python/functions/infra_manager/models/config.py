from typing import Literal, Union, Sequence, Optional, Annotated
from zoneinfo import ZoneInfo

from pydantic import BaseModel, Field, field_validator

from utils import ipv4_pattern

ipv4 = Annotated[str, Field(pattern=ipv4_pattern)]


class PapercutApiHostNameConfig(BaseModel):
    _tag: Literal["PapercutApiHostNameConfig"]
    name: str
    resolver_ips: Annotated[
        Optional[Sequence[ipv4]], Field(alias="resolverIps", default=None)
    ]


class PapercutApiHostIpv4Config(BaseModel):
    _tag: Literal["PapercutApiHostIpv4Config"]
    ipv4: ipv4


PapercutApiHostConfig = Union[PapercutApiHostNameConfig, PapercutApiHostIpv4Config]


class PapercutApiConfig(BaseModel):
    protocol: Literal["http", "https"]
    host: Annotated[PapercutApiHostConfig, Field(discriminator="_tag")]
    port: Annotated[int, Field(gt=0, lt=65535)]


class PapercutSyncConfig(BaseModel):
    cron_expression: Annotated[str, Field(alias="cronExpression")]
    timezone: str

    @field_validator
    def validate_timezone(self, timezone: str):
        ZoneInfo(timezone)
        return timezone


class PapercutEnabledConfig(BaseModel):
    enabled: Literal[True] = True
    api: PapercutApiConfig
    sync: PapercutSyncConfig


class PapercutDisabledConfig(BaseModel):
    enabled: Literal[False] = False


PapercutConfig = Union[PapercutEnabledConfig, PapercutDisabledConfig]

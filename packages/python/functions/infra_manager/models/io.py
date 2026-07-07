from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, Field, computed_field
from sst import Resource

from utils import (
    SEPARATOR,
    tenant_id_key_pattern,
    tenant_deployment_id_key_pattern,
    infra_input_key_pattern,
    infra_output_key_pattern,
)
from models.config import PapercutMfConfig


class InputKeys(BaseModel):
    pk: Annotated[
        str, Field(alias=Resource.Dynamo.hashKey, pattern=tenant_id_key_pattern)
    ]
    sk: Annotated[
        str, Field(alias=Resource.Dynamo.rangeKey, pattern=infra_input_key_pattern)
    ]
    gsi1_pk: Annotated[
        str,
        Field(
            alias=Resource.Dynamo.globalSecondaryIndexes.gsi1.hashKey,
            pattern=tenant_deployment_id_key_pattern,
        ),
    ]
    gsi1_sk: Annotated[
        str,
        Field(
            alias=Resource.Dynamo.globalSecondaryIndexes.gsi1.rangeKey,
            pattern=infra_input_key_pattern,
        ),
    ]

    @computed_field
    @property
    def tenant_id(self):
        return self.pk.split(SEPARATOR)[1]

    @computed_field
    @property
    def deployment_id(self):
        return self.gsi1_pk.split(SEPARATOR)[3]


class Input(InputKeys):
    papercut_mf_config: Annotated[PapercutMfConfig, Field(alias="papercutMfConfig")]
    callback_id: Annotated[Optional[str], Field(alias="callbackId", default=None)]
    created_at: Annotated[datetime, Field(alias="createdAt")]


class Output(BaseModel):
    pk: Annotated[
        str, Field(alias=Resource.Dynamo.hashKey, pattern=tenant_id_key_pattern)
    ]
    sk: Annotated[
        str, Field(alias=Resource.Dynamo.rangeKey, pattern=infra_output_key_pattern)
    ]
    gsi1_pk: Annotated[
        str,
        Field(
            alias=Resource.Dynamo.globalSecondaryIndexes.gsi1.hashKey,
            pattern=tenant_deployment_id_key_pattern,
        ),
    ]
    gsi1_sk: Annotated[
        str,
        Field(
            alias=Resource.Dynamo.globalSecondaryIndexes.gsi1.rangeKey,
            pattern=infra_output_key_pattern,
        ),
    ]
    papercut_mf_api_tunnel_id: Annotated[
        Optional[str], Field(alias="papercutMfApiTunnelId", default=None)
    ]
    deployed_at: Annotated[datetime, Field(alias="deployedAt")]

from sst import Resource

from .credentials import get_pulumi_credentials, get_realtime_credentials
from . import naming

is_prod_stage = Resource.AppData.stage == "production"


def tags(tenant_id: str):
    return {
        "sst:app": Resource.AppData.name,
        "sst:stage": Resource.AppData.stage,
        "tenant-id": tenant_id,
    }


__all__ = [
    "get_pulumi_credentials",
    "get_realtime_credentials",
    "is_prod_stage",
    "naming",
    "tags",
]

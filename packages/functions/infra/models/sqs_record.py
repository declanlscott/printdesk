from pydantic import BaseModel

from typing import Optional


class Payload(BaseModel):
    tenant_id: str
    papercut_sync_cron_expression: str
    timezone: str
    destroy: Optional[bool] = False

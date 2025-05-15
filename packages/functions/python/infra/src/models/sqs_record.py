from pydantic import BaseModel

from typing import Optional


class Payload(BaseModel):
    destroy: Optional[bool] = False
    tenantId: str
    papercutSyncCronExpression: str
    timezone: str

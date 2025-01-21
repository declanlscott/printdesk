from pydantic import BaseModel


class Payload(BaseModel):
    tenantId: str
    papercutSyncSchedule: str
    timezone: str

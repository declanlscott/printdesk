from typing import Optional

import pulumi


class StorageArgs:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id


class Storage(pulumi.ComponentResource):
    def __init__(self, args: StorageArgs, opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__(
            t="pd:resource:Storage",
            name="Storage",
            props=vars(args),
            opts=opts
        )

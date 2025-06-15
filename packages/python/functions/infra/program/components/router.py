from typing import Optional

import pulumi
import pulumi_cloudflare as cloudflare
from sst import Resource

from . import ssl
from utils import build_name


class RouterArgs:
    def __init__(self, tenant_id: str, secret: pulumi.Input[str]):
        self.tenant_id = tenant_id
        self.secret = secret


class Router(pulumi.ComponentResource):
    def __init__(self, args: RouterArgs, opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__(
            t="pd:resource:Router",
            name="Router",
            props=vars(args),
            opts=opts
        )

        self.__api_ssl = ssl.Ssl(
            name="Api",
            args=ssl.SslArgs(
                tenant_id=args.tenant_id,
                domain_name_template=Resource.TenantDomains.api.nameTemplate,
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__api_alias_record = cloudflare.Record(
            resource_name="ApiAliasRecord",
            args=cloudflare.RecordArgs(
                zone_id=Resource.Zone.id,
                type="CNAME",
                name=self.__api_ssl.certificate.domain_name,
                content=build_name(
                    name_template=Resource.TenantDomains.api.nameTemplate,
                    tenant_id=args.tenant_id,
                ),
                ttl=1,
                proxied=True,
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                delete_before_replace=True,
            )
        )

        self.__files_ssl = ssl.Ssl(
            name="Files",
            args=ssl.SslArgs(
                tenant_id=args.tenant_id,
                domain_name_template=Resource.TenantDomains.files.nameTemplate,
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__files_alias_record = cloudflare.Record(
            resource_name="FilesAliasRecord",
            args=cloudflare.RecordArgs(
                zone_id=Resource.Zone.id,
                type="CNAME",
                name=self.__files_ssl.certificate.domain_name,
                content=build_name(
                    name_template=Resource.TenantDomains.files.nameTemplate,
                    tenant_id=args.tenant_id,
                ),
                ttl=1,
                proxied=True,
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                delete_before_replace=True,
            )
        )

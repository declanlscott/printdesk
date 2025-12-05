from typing import Optional

import pulumi
import pulumi_aws as aws
import pulumi_cloudflare as cloudflare
from sst import Resource

from . import ssl
from utils import naming, tags


class RouterArgs:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id


class Router(pulumi.ComponentResource):
    def __init__(self, args: RouterArgs, opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__(
            t="pd:resource:Router",
            name="Router",
            props=vars(args),
            opts=opts
        )

        cdn_domain_name = naming.template(Resource.TenantDomains.cdn.nameTemplate, args.tenant_id)
        api_domain_name = naming.template(Resource.TenantDomains.api.nameTemplate, args.tenant_id)
        storage_domain_name = naming.template(Resource.TenantDomains.storage.nameTemplate, args.tenant_id)

        self.__cdn_ssl = ssl.DnsValidatedCertificate(
            name="Cdn",
            args=ssl.DnsValidatedCertificateArgs(
                tenant_id=args.tenant_id,
                domain_name=cdn_domain_name,
                subject_alternative_names=[api_domain_name,  storage_domain_name],
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__distribution = aws.cloudfront.Distribution(
            resource_name="Distribution",
            args=aws.cloudfront.DistributionArgs(
                enabled=True,
                comment=f"{args.tenant_id} router",
                origins=[
                    aws.cloudfront.DistributionOriginArgs(
                        origin_id="default",
                        domain_name="placeholder.printdesk.app",
                        custom_origin_config=aws.cloudfront.DistributionOriginCustomOriginConfigArgs(
                            http_port=80,
                            https_port=443,
                            origin_protocol_policy="https-only",
                            origin_read_timeout=20,
                            origin_ssl_protocols=["TLSv1.2"]
                        )
                    )
                ],
                default_cache_behavior=aws.cloudfront.DistributionDefaultCacheBehaviorArgs(
                    target_origin_id="default",
                    viewer_protocol_policy="redirect-to-https",
                    allowed_methods=[
                        "DELETE",
                        "GET",
                        "HEAD",
                        "OPTIONS",
                        "PATCH",
                        "POST",
                        "PUT",
                    ],
                    cached_methods=["GET", "HEAD"],
                    compress=True,
                    cache_policy_id=Resource.CloudfrontApiCachePolicy.id,
                    origin_request_policy_id=aws.cloudfront.get_origin_request_policy_output(
                        name="Managed-AllViewerExceptHostHeader",
                    ).id,
                    trusted_key_groups=[Resource.CloudfrontKeyGroup.id],
                    function_associations=[
                        aws.cloudfront.DistributionDefaultCacheBehaviorFunctionAssociationArgs(
                            event_type="viewer-request",
                            function_arn=Resource.CloudfrontRequestFunction.arn,
                        ),
                    ]
                ),
                restrictions=aws.cloudfront.DistributionRestrictionsArgs(
                    geo_restriction=aws.cloudfront.DistributionRestrictionsGeoRestrictionArgs(
                        restriction_type="none"
                    )
                ),
                aliases=[cdn_domain_name, api_domain_name, storage_domain_name],
                viewer_certificate=aws.cloudfront.DistributionViewerCertificateArgs(
                    acm_certificate_arn=self.__cdn_ssl.certificate.arn,
                    ssl_support_method="sni-only",
                    minimum_protocol_version="TLSv1.2_2021",
                ),
                wait_for_deployment=False,
                price_class="PriceClass_100",
                tags=tags(args.tenant_id)
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__cdn_alias_record = cloudflare.Record(
            resource_name="CdnAliasRecord",
            args=cloudflare.RecordArgs(
                zone_id=Resource.Zone.id,
                type="CNAME",
                name=cdn_domain_name,
                content=self.__distribution.domain_name,
                ttl=1,
                proxied=True,
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                delete_before_replace=True,
            )
        )

        self.__api_alias_record = cloudflare.Record(
            resource_name="ApiAliasRecord",
            args=cloudflare.RecordArgs(
                zone_id=Resource.Zone.id,
                type="CNAME",
                name=api_domain_name,
                content=self.__distribution.domain_name,
                ttl=1,
                proxied=True,
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                delete_before_replace=True,
            )
        )

        self.__storage_alias_record = cloudflare.Record(
            resource_name="StorageAliasRecord",
            args=cloudflare.RecordArgs(
                zone_id=Resource.Zone.id,
                type="CNAME",
                name=storage_domain_name,
                content=self.__distribution.domain_name,
                ttl=1,
                proxied=True,
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                delete_before_replace=True,
            )
        )

        self.register_outputs({
            "cdn_alias_record": self.__cdn_alias_record.id,
            "distribution": self.__distribution.id,
            "api_alias_record": self.__api_alias_record.id,
            "storage_alias_record": self.__storage_alias_record.id,
        })

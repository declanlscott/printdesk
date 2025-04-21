import pulumi
import pulumi_aws as aws
import pulumi_cloudflare as cloudflare

from utilities import resource, tags

from typing import Optional


class RouterArgs:
    def __init__(
        self,
        tenant_id: str,
        alias: pulumi.Input[str],
        certificate_arn: pulumi.Input[str],
        api_origin_domain_name: pulumi.Input[str],
        assets_origin_domain_name: pulumi.Input[str],
        documents_origin_domain_name: pulumi.Input[str],
    ):
        self.tenant_id = tenant_id
        self.alias = alias
        self.certificate_arn = certificate_arn
        self.api_origin_domain_name = api_origin_domain_name
        self.assets_origin_domain_name = assets_origin_domain_name
        self.documents_origin_domain_name = documents_origin_domain_name


class Router(pulumi.ComponentResource):
    def __init__(self, args: RouterArgs, opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__(
            t="pd:resource:Router", name="Router", props=vars(args), opts=opts
        )

        custom_origin_config = aws.cloudfront.DistributionOriginCustomOriginConfigArgs(
            http_port=80,
            https_port=443,
            origin_protocol_policy="https-only",
            origin_read_timeout=30,
            origin_ssl_protocols=["TLSv1.2"],
        )

        s3_origin_access_control_id = resource["Aws"]["cloudfront"][
            "s3OriginAccessControl"
        ]["id"]

        api_cache_policy_id = resource["Aws"]["cloudfront"]["apiCachePolicy"]["id"]

        all_viewer_policy = aws.cloudfront.get_origin_request_policy_output(
            name="Managed-AllViewer"
        )

        caching_optimized_policy = aws.cloudfront.get_cache_policy_output(
            name="Managed-CachingOptimized"
        )

        rewrite_uri_function_association = (
            aws.cloudfront.DistributionOrderedCacheBehaviorFunctionAssociationArgs(
                event_type="viewer-request",
                function_arn=resource["Aws"]["cloudfront"]["rewriteUriFunction"]["arn"],
            )
        )

        self.__distribution = aws.cloudfront.Distribution(
            resource_name="Distribution",
            args=aws.cloudfront.DistributionArgs(
                enabled=True,
                comment=f"{args.tenant_id} router",
                origins=[
                    aws.cloudfront.DistributionOriginArgs(
                        origin_id="/api/*",
                        custom_origin_config=custom_origin_config,
                        domain_name=args.api_origin_domain_name,
                    ),
                    aws.cloudfront.DistributionOriginArgs(
                        origin_id="/assets/*",
                        origin_access_control_id=s3_origin_access_control_id,
                        domain_name=args.assets_origin_domain_name,
                    ),
                    aws.cloudfront.DistributionOriginArgs(
                        origin_id="/documents/*",
                        origin_access_control_id=s3_origin_access_control_id,
                        domain_name=args.documents_origin_domain_name,
                    ),
                    aws.cloudfront.DistributionOriginArgs(
                        origin_id="/*",
                        domain_name=f"does-not-exist.{resource["AppData"]["domainName"]["value"]}",
                        custom_origin_config=custom_origin_config,
                    ),
                ],
                default_cache_behavior=aws.cloudfront.DistributionDefaultCacheBehaviorArgs(
                    target_origin_id="/*",
                    viewer_protocol_policy="redirect-to-https",
                    allowed_methods=[
                        "GET",
                        "HEAD",
                        "OPTIONS",
                        "PUT",
                        "POST",
                        "PATCH",
                        "DELETE",
                    ],
                    cached_methods=["GET", "HEAD"],
                    default_ttl=0,
                    compress=True,
                    cache_policy_id=api_cache_policy_id,
                    origin_request_policy_id=all_viewer_policy.id,
                    trusted_key_groups=[
                        resource["Aws"]["cloudfront"]["keyGroup"]["id"]
                    ],
                ),
                ordered_cache_behaviors=[
                    aws.cloudfront.DistributionOrderedCacheBehaviorArgs(
                        target_origin_id="/api/*",
                        path_pattern="/api/.well-known/*",
                        viewer_protocol_policy="redirect-to-https",
                        allowed_methods=["GET", "HEAD", "OPTIONS"],
                        cached_methods=["GET", "HEAD"],
                        compress=True,
                        cache_policy_id=api_cache_policy_id,
                        origin_request_policy_id=all_viewer_policy.id,
                        trusted_key_groups=[
                            resource["Aws"]["cloudfront"]["keyGroup"]["id"]
                        ],
                        function_associations=[rewrite_uri_function_association],
                    ),
                    aws.cloudfront.DistributionOrderedCacheBehaviorArgs(
                        target_origin_id="/api/*",
                        path_pattern="/api/health",
                        viewer_protocol_policy="redirect-to-https",
                        allowed_methods=["GET", "HEAD", "OPTIONS"],
                        cached_methods=["GET", "HEAD"],
                        compress=True,
                        cache_policy_id=api_cache_policy_id,
                        origin_request_policy_id=all_viewer_policy.id,
                        function_associations=[rewrite_uri_function_association],
                    ),
                    aws.cloudfront.DistributionOrderedCacheBehaviorArgs(
                        target_origin_id="/api/*",
                        path_pattern="/api/parameters/*",
                        viewer_protocol_policy="redirect-to-https",
                        allowed_methods=["GET", "HEAD", "OPTIONS"],
                        cached_methods=["GET", "HEAD"],
                        compress=True,
                        cache_policy_id=api_cache_policy_id,
                        origin_request_policy_id=all_viewer_policy.id,
                        trusted_key_groups=[
                            resource["Aws"]["cloudfront"]["keyGroup"]["id"]
                        ],
                        function_associations=[rewrite_uri_function_association],
                    ),
                    aws.cloudfront.DistributionOrderedCacheBehaviorArgs(
                        target_origin_id="/api/*",
                        path_pattern="/api/*",
                        viewer_protocol_policy="redirect-to-https",
                        allowed_methods=[
                            "GET",
                            "HEAD",
                            "OPTIONS",
                            "PUT",
                            "POST",
                            "PATCH",
                            "DELETE",
                        ],
                        cached_methods=["GET", "HEAD"],
                        compress=True,
                        cache_policy_id=api_cache_policy_id,
                        origin_request_policy_id=all_viewer_policy.id,
                        trusted_key_groups=[
                            resource["Aws"]["cloudfront"]["keyGroup"]["id"]
                        ],
                        function_associations=[rewrite_uri_function_association],
                    ),
                    aws.cloudfront.DistributionOrderedCacheBehaviorArgs(
                        target_origin_id="/assets/*",
                        path_pattern="/assets/*",
                        viewer_protocol_policy="redirect-to-https",
                        allowed_methods=["GET", "HEAD", "OPTIONS"],
                        cached_methods=["GET", "HEAD"],
                        compress=True,
                        cache_policy_id=caching_optimized_policy.id,
                        trusted_key_groups=[
                            resource["Aws"]["cloudfront"]["keyGroup"]["id"]
                        ],
                        function_associations=[rewrite_uri_function_association],
                    ),
                    aws.cloudfront.DistributionOrderedCacheBehaviorArgs(
                        target_origin_id="/documents/*",
                        path_pattern="/documents/*",
                        viewer_protocol_policy="redirect-to-https",
                        allowed_methods=["GET", "HEAD", "OPTIONS"],
                        cached_methods=["GET", "HEAD"],
                        compress=True,
                        cache_policy_id=caching_optimized_policy.id,
                        trusted_key_groups=[
                            resource["Aws"]["cloudfront"]["keyGroup"]["id"]
                        ],
                        function_associations=[rewrite_uri_function_association],
                    ),
                ],
                restrictions=aws.cloudfront.DistributionRestrictionsArgs(
                    geo_restriction=aws.cloudfront.DistributionRestrictionsGeoRestrictionArgs(
                        restriction_type="none"
                    )
                ),
                aliases=[args.alias],
                viewer_certificate=aws.cloudfront.DistributionViewerCertificateArgs(
                    acm_certificate_arn=args.certificate_arn,
                    ssl_support_method="sni-only",
                    minimum_protocol_version="TLSv1.2_2021",
                ),
                price_class="PriceClass_100",
                wait_for_deployment=False,
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__cname = cloudflare.Record(
            resource_name="Cname",
            args=cloudflare.RecordArgs(
                zone_id=cloudflare.get_zone_output(
                    name=resource["AppData"]["domainName"]["value"]
                ).id,
                name=args.alias,
                type="CNAME",
                content=self.__distribution.domain_name,
                ttl=60,
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                delete_before_replace=True,
            ),
        )

        self.register_outputs(
            {
                "distribution": self.__distribution.id,
                "cname": self.__cname.id,
            }
        )

    @property
    def distribution(self):
        return self.__distribution

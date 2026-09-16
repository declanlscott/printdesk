from dataclasses import dataclass

import pulumi
import pulumi_cloudflare as cloudflare
from utils import naming

from sst import Resource


@dataclass
class AssetsArgs:
    tenant_id: pulumi.Input[str]


class Assets(pulumi.ComponentResource):
    def __init__(self, args: AssetsArgs, opts: pulumi.ResourceOptions | None = None):
        super().__init__(
            t="pd:cf:Assets",
            name="Assets",
            props=vars(args),
            opts=opts,
        )

        bucket_name: pulumi.Output[str] = pulumi.Output.from_input(
            args.tenant_id
        ).apply(
            lambda tenant_id: naming.template(
                name_template=Resource.AssetsBucketTemplate.name,
                tenant_id=tenant_id,
            )
        )

        self._bucket = cloudflare.R2Bucket(
            resource_name="AssetsBucket",
            args=cloudflare.R2BucketArgs(
                account_id=Resource.Cloudflare.account.id,
                name=bucket_name,
                jurisdiction="default",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self._bucket_invalidation_notification = cloudflare.R2BucketEventNotification(
            resource_name="AssetsBucketInvalidationNotification",
            args=cloudflare.R2BucketEventNotificationArgs(
                account_id=Resource.Cloudflare.account.id,
                bucket_id=self._bucket.id,
                queue_id=Resource.AssetsInvalidationQueue.id,
                rules=[
                    cloudflare.R2BucketEventNotificationRuleArgs(
                        actions=["PutObject"],
                        description="Invalidate image in worker cache",
                        prefix="images/",
                    )
                ],
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

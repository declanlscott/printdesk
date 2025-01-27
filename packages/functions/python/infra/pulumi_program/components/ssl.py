import pulumi
import pulumi_aws as aws
import pulumi_cloudflare as cloudflare
from typing import Sequence, Optional

from utilities import resource, tags, aws
from utilities.aws import get_pulumi_credentials


class SslArgs:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id


class Ssl(pulumi.ComponentResource):
    def __init__(self, args: SslArgs, opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__(t="pw:resource:Ssl", name="Ssl", props=vars(args), opts=opts)

        def create_records(
            domain_name: pulumi.Input[str],
            options: Sequence[aws.acm.outputs.CertificateValidationOption],
        ) -> list[cloudflare.record.Record]:
            records: list[cloudflare.record.Record] = []

            zone_id = cloudflare.get_zone_output(
                name=resource["AppData"]["domainName"]["value"]
            ).id

            records.append(
                cloudflare.Record(
                    resource_name="CaaRecord",
                    args=cloudflare.RecordArgs(
                        zone_id=zone_id,
                        type="CAA",
                        name=domain_name,
                        data=cloudflare.RecordDataArgs(
                            flags="0",
                            tag="issue",
                            value="amazonaws.com",
                        ),
                        ttl=60,
                    ),
                    opts=pulumi.ResourceOptions(
                        parent=self, delete_before_replace=True
                    ),
                )
            )

            for index, option in enumerate(options):
                records.append(
                    cloudflare.Record(
                        resource_name=f"CertificateValidationRecord{index}",
                        args=cloudflare.RecordArgs(
                            zone_id=zone_id,
                            type=option.resource_record_type,
                            name=option.resource_record_name,
                            content=option.resource_record_value,
                            ttl=60,
                        ),
                        opts=pulumi.ResourceOptions(
                            parent=self, delete_before_replace=True
                        ),
                    )
                )

            return records

        us_east_1_credentials = get_pulumi_credentials("InfraFunctionSslComponent")

        us_east_1_provider = aws.Provider(
            resource_name="UsEast1Provider",
            args=aws.ProviderArgs(
                access_key=us_east_1_credentials["AccessKeyId"],
                secret_key=us_east_1_credentials["SecretAccessKey"],
                token=us_east_1_credentials["SessionToken"],
                region="us-east-1",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__certificate = aws.acm.Certificate(
            resource_name="Certificate",
            args=aws.acm.CertificateArgs(
                domain_name=f"{args.tenant_id}.backend.{resource["AppData"]["domainName"]["fullyQualified"]}",
                validation_method="DNS",
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self, provider=us_east_1_provider),
        )

        self.__records: pulumi.Output[list[cloudflare.record.Record]] = (
            self.__certificate.domain_validation_options.apply(
                lambda options: create_records(self.__certificate.domain_name, options)
            )
        )

        self.register_outputs(
            {
                "certificate": self.__certificate.id,
                "records": self.__records.apply(
                    lambda records: [record.id for record in records]
                ),
            }
        )

    @property
    def domain_name(self):
        return self.__certificate.domain_name

    @property
    def certificate_arn(self):
        return self.__certificate.arn

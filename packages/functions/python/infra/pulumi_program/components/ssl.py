import pulumi
import pulumi_aws as aws
import pulumi_cloudflare as cloudflare
from typing import Sequence

from utilities import aws_region, resource, tags


class SslArgs:
    def __init__(self, tenant_id: pulumi.Input[str]):
        self.tenant_id = tenant_id


class Ssl(pulumi.ComponentResource):
    def __init__(self, args: SslArgs, opts: pulumi.ResourceOptions = None):
        def create_records(
            options: Sequence[aws.acm.outputs.CertificateValidationOption],
        ) -> list[cloudflare.record.Record]:
            records: list[cloudflare.record.Record] = []

            for index, option in enumerate(options):
                records.append(
                    cloudflare.Record(
                        resource_name=f"CertificateValidationRecord{index}",
                        args=cloudflare.RecordArgs(
                            zone_id=cloudflare.get_zone_output(
                                name=resource["AppData"]["domainName"]["value"]
                            ).id,
                            type=option.resource_record_type,
                            name=option.resource_record_name,
                            value=option.resource_record_value,
                        ),
                        opts=pulumi.ResourceOptions(parent=self),
                    )
                )

            return records

        super().__init__(t="pw:resource:Ssl", name="Ssl", props=vars(args), opts=opts)

        us_east_1_provider = aws.Provider(
            resource_name="UsEast1Provider",
            args=aws.ProviderArgs(region=aws_region),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__certificate = aws.acm.Certificate(
            resource_name="Certificate",
            args=aws.acm.CertificateArgs(
                domain_name=pulumi.Output.format(
                    "{0}.backend.{1}",
                    args.tenant_id,
                    resource["AppData"]["domainName"]["fullyQualified"],
                ),
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self, provider=us_east_1_provider),
        )

        self.__records: list[cloudflare.record.Record] = (
            self.__certificate.domain_validation_options.apply(create_records)
        )

        self.register_outputs(
            {
                "certificate": self.__certificate.id,
                "records": [record.id for record in self.__records],
            }
        )

    @property
    def domain_name(self):
        return self.__certificate.domain_name

    @property
    def certificate_arn(self):
        return self.__certificate.arn

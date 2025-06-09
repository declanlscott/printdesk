from typing import Optional, Sequence

import pulumi
import pulumi_aws as aws
import pulumi_cloudflare as cloudflare

from sst import Resource
from utils import build_name


class SslArgs:
    def __init__(self, tenant_id: str, domain_name_template: str):
        self.tenant_id = tenant_id
        self.domain_name_template = domain_name_template


class Ssl(pulumi.ComponentResource):
    def __init__(
        self, name: str, args: SslArgs, opts: Optional[pulumi.ResourceOptions] = None
    ):
        super().__init__(
            t="pd:resource:Ssl",
            name=f"{name}Ssl",
            props=vars(args),
            opts=opts
        )

        self.__us_east_1_provider = aws.Provider(
            resource_name=f"{name}UsEast1Provider",
            props=aws.ProviderArgs(
                region="us-east-1"
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__certificate = aws.acm.Certificate(
            resource_name=f"{name}Certificate",
            props=aws.acm.CertificateArgs(
                domain_name=build_name(args.domain_name_template, args.tenant_id),
                validation_method="DNS",
            ),
            opts=pulumi.ResourceOptions(parent=self, provider=self.__us_east_1_provider)
        )

        self.__certificate_validation_records = []
        def create_validation_records(
            options: Sequence[aws.acm.outputs.CertificateValidationOption],
        ):
            for index, option in enumerate(options):
                self.__certificate_validation_records.append(
                    cloudflare.Record(
                        resource_name=f"{name}CertificateValidationRecord{index}",
                        args=cloudflare.RecordArgs(
                            zone_id=Resource.Zone.id,
                            type=option.resource_record_type,
                            name=option.resource_record_name,
                            content=option.resource_record_value,
                            ttl=60,
                        ),
                        opts=pulumi.ResourceOptions(parent=self),
                    )
                )
        self.__certificate.domain_validation_options.apply(create_validation_records)

        self.__certificate_validation = aws.acm.CertificateValidation(
            resource_name=f"{name}CertificateValidation",
            props=aws.acm.CertificateValidationArgs(
                certificate_arn=self.__certificate.arn,
                validation_record_fqdns=[
                    record.hostname for record in self.__certificate_validation_records
                ]
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.register_outputs({
            "us_east_1_provider": self.__us_east_1_provider.id,
            "certificate": self.__certificate.id,
            "certificate_validation_records": [
                record.id for record in self.__certificate_validation_records
            ],
            "certificate_validation": self.__certificate_validation.id,
        })

    @property
    def certificate(self):
        return self.__certificate

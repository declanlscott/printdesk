import pulumi
import pulumi_aws as aws
import pulumi_cloudflare as cloudflare
from sst import Resource

from src.utilities import tags, reverse_dns

from typing import Sequence, Optional


class SslArgs:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id


class Ssl(pulumi.ComponentResource):
    def __init__(self, args: SslArgs, opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__(t="pd:resource:Ssl", name="Ssl", props=vars(args), opts=opts)

        domain_name = f"{args.tenant_id}.backend.{Resource.Domains.web}"

        us_east_1_provider = aws.Provider(
            resource_name="UsEast1Provider",
            args=aws.ProviderArgs(
                assume_role=aws.ProviderAssumeRoleArgs(
                    role_arn=Resource.PulumiRole.arn,
                    session_name="InfraFunctionSslComponent",
                    external_id=Resource.PulumiRoleExternalId.value,
                ),
                region="us-east-1",
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        certificate_args = aws.acm.CertificateArgs(
            domain_name=domain_name,
            validation_method="DNS",
            tags=tags(args.tenant_id),
        )

        self.__us_east_1_certificate = aws.acm.Certificate(
            resource_name="UsEast1Certificate",
            args=certificate_args,
            opts=pulumi.ResourceOptions(
                parent=self,
                provider=us_east_1_provider,
            ),
        )

        self.__regional_certificate = (
            aws.acm.Certificate(
                resource_name="RegionalCertificate",
                args=certificate_args,
                opts=pulumi.ResourceOptions(parent=self),
            )
            if Resource.Aws.region != "us-east-1"
            else self.__us_east_1_certificate
        )

        zone_id = cloudflare.get_zone_output(
            name=Resource.Domains.root,
        ).id

        self.__caa_record = cloudflare.Record(
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
                allow_overwrite=True,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__validation_records: list[cloudflare.record.Record] = []

        def create_validation_records(
            options: Sequence[aws.acm.outputs.CertificateValidationOption],
        ):
            for index, option in enumerate(options):
                self.__validation_records.append(
                    cloudflare.Record(
                        resource_name=f"CertificateValidationRecord{index}",
                        args=cloudflare.RecordArgs(
                            zone_id=zone_id,
                            type=option.resource_record_type,
                            name=option.resource_record_name,
                            content=option.resource_record_value,
                            ttl=60,
                            allow_overwrite=True,
                        ),
                        opts=pulumi.ResourceOptions(
                            parent=self,
                            depends_on=[self.__caa_record],
                        ),
                    )
                )

        self.__regional_certificate.domain_validation_options.apply(
            create_validation_records
        )

        self.__regional_certificate_validation = aws.acm.CertificateValidation(
            "RegionalCertificateValidation",
            args=aws.acm.CertificateValidationArgs(
                certificate_arn=self.__regional_certificate.arn,
                validation_record_fqdns=[
                    record.hostname for record in self.__validation_records
                ],
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__api_domain_name = aws.apigateway.DomainName(
            "ApiDomainName",
            args=aws.apigateway.DomainNameArgs(
                domain_name=domain_name,
                endpoint_configuration=aws.apigateway.DomainNameEndpointConfigurationArgs(
                    types="REGIONAL",
                ),
                regional_certificate_arn=self.__regional_certificate.arn,
                tags=tags(args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                delete_before_replace=True,
                depends_on=[self.__regional_certificate_validation],
            ),
        )

        self.register_outputs(
            {
                "us_east_1_certificate": self.__us_east_1_certificate.id,
                "caa_record": self.__caa_record.id,
                "validation_records": [
                    record.id for record in self.__validation_records
                ],
                "regional_certificate": self.__regional_certificate.id,
                "regional_certificate_validation": self.__regional_certificate_validation.id,
                "api_domain_name": self.__api_domain_name.id,
            }
        )

    @property
    def us_east_1_certificate(self):
        return self.__us_east_1_certificate

    @property
    def regional_certificate(self):
        return self.__regional_certificate

    @property
    def api_domain_name(self):
        return self.__api_domain_name

    @property
    def reverse_dns(self) -> pulumi.Output[str]:
        return self.regional_certificate.domain_name.apply(reverse_dns)

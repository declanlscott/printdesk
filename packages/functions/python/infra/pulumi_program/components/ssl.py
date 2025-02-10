import asyncio

import pulumi
import pulumi_aws as aws
import pulumi_cloudflare as cloudflare

from utilities import resource, tags, region, reverse_dns
from utilities.aws import get_pulumi_credentials

from typing import Sequence, Optional


class SslArgs:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id


class Ssl(pulumi.ComponentResource):
    def __init__(self, args: SslArgs, opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__(t="pw:resource:Ssl", name="Ssl", props=vars(args), opts=opts)

        domain_name = f"{args.tenant_id}.backend.{resource["AppData"]["domainName"]["fullyQualified"]}"

        def create_records(
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
                        parent=self,
                        delete_before_replace=True,
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
                            parent=self,
                            delete_before_replace=True,
                        ),
                    )
                )

            return records

        async def create_api_domain_name(certificate_arn: str):
            duration = 5
            attempts = 10

            for attempt in range(attempts):
                result = await aws.acm.get_certificate(domain=domain_name)

                if result.status == "ISSUED":
                    return aws.apigateway.DomainName(
                        resource_name="ApiDomainName",
                        args=aws.apigateway.DomainNameArgs(
                            domain_name=domain_name,
                            endpoint_configuration=aws.apigateway.DomainNameEndpointConfigurationArgs(
                                types="REGIONAL",
                            ),
                            regional_certificate_arn=certificate_arn,
                            tags=tags(args.tenant_id),
                        ),
                        opts=pulumi.ResourceOptions(
                            parent=self,
                            delete_before_replace=True,
                        ),
                    )

                await asyncio.sleep(duration)

            raise Exception(
                f"Exhausted attempts waiting for issued certificate: {certificate_arn}"
            )

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

        self.__records: pulumi.Output[list[cloudflare.record.Record]] = (
            self.__us_east_1_certificate.domain_validation_options.apply(create_records)
        )

        self.__regional_certificate = (
            aws.acm.Certificate(
                resource_name="RegionalCertificate",
                args=certificate_args,
                opts=pulumi.ResourceOptions(parent=self),
            )
            if region != "us-east-1"
            else self.__us_east_1_certificate
        )

        self.__api_domain_name: pulumi.Output[aws.apigateway.DomainName] = (
            self.__regional_certificate.arn.apply(create_api_domain_name)
        )

        self.register_outputs(
            {
                "us_east_1_certificate": self.__us_east_1_certificate.id,
                "records": self.__records.apply(
                    lambda records: [record.id for record in records]
                ),
                "regional_certificate": self.__regional_certificate.id,
                "api_domain_name": self.__api_domain_name.apply(
                    lambda api_domain_name: api_domain_name.id
                ),
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

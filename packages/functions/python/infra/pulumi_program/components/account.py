import pulumi
import pulumi_aws as aws
import pulumi_random as random

from utilities import resource, stage, aws_region


class AccountArgs:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id


class Account(pulumi.ComponentResource):
    def __init__(self, name, args: AccountArgs, opts=None):
        super().__init__("pw:resource:Account", name, vars(args), opts)

        email_segments = f"{resource["Aws"]["organization"]["email"]}".split("@")
        email_tag = random.RandomString(
            "EmailTag",
            length=8,
            special=False,
            opts=pulumi.ResourceOptions(parent=self),
        )
        email = pulumi.Output.format(
            "{0}+{1}@{2}", email_segments[0], email_tag.result, email_segments[1]
        )

        self.__account = aws.organizations.Account(
            "Account",
            name=f"pw-{args.tenant_id}",
            email=email,
            parent_id=resource["Aws"]["organization"]["tenantsOrganizationalUnit"][
                "id"
            ],
            role_name=resource["Aws"]["tenant"]["roles"]["accountAccess"]["name"],
            iam_user_access_to_billing="ALLOW",
            close_on_deletion=True,
            opts=pulumi.ResourceOptions(
                parent=self, retain_on_delete=stage == "production"
            ),
        )

        self.__assume_role_arn = pulumi.Output.format(
            "arn:aws:iam::{0}:role/{1}", self.__account.id, self.__account.role_name
        )

        self.__provider = aws.provider.Provider(
            "Provider",
            region=aws_region,
            assume_role=aws.provider.ProviderAssumeRoleArgs(
                role_arn=self.__assume_role_arn,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__budget = aws.budgets.Budget(
            "Budget",
            budget_type="COST",
            limit_amount="1",
            limit_unit="USD",
            time_unit="MONTHLY",
            notifications=[
                {
                    "comparison_operator": "GREATER_THAN",
                    "threshold": 100,
                    "threshold_type": "PERCENTAGE",
                    "notification_type": "FORECASTED",
                    "subscriber_email_addresses": [email],
                }
            ],
            opts=pulumi.ResourceOptions(parent=self, providers=[self.__provider]),
        )

        self.register_outputs(
            {
                "account": self.__account.id,
                "provider": self.__provider.id,
                "budget": self.__budget.id,
            }
        )

    @property
    def id(self):
        return self.__account.id

    @property
    def assume_role_arn(self):
        return self.__assume_role_arn

    @property
    def provider(self):
        return self.__provider

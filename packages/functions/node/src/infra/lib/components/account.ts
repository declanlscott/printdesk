import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

export interface AccountArgs {
  tenantId: pulumi.Input<string>;
}

export class Account extends pulumi.ComponentResource {
  private static _instance: Account;

  private _account: aws.organizations.Account;
  private _assumeRoleArn: pulumi.Output<string>;
  private _provider: aws.Provider;
  private _budget: aws.budgets.Budget;

  static getInstance(
    args: AccountArgs,
    opts: pulumi.ComponentResourceOptions = {},
  ): Account {
    if (!this._instance) this._instance = new Account(args, opts);

    return this._instance;
  }

  private constructor(...[args, opts]: Parameters<typeof Account.getInstance>) {
    const { AppData, Aws } = useResource();

    super(`${AppData.name}:tenant:aws:Account`, "Account", args, opts);

    const name = pulumi.interpolate`${AppData.name}-${AppData.stage}-tenant-${args.tenantId}`;

    const emailSegments = Aws.organization.email.split("@");
    const email = pulumi.interpolate`${emailSegments[0]}+${name}@${emailSegments[1]}`;

    this._account = new aws.organizations.Account(
      "Account",
      {
        name,
        email,
        parentId: Aws.organization.tenantsOrganizationalUnit.id,
        roleName: Aws.tenant.roles.accountAccess.name,
        iamUserAccessToBilling: "ALLOW",
      },
      { parent: this },
    );

    this._assumeRoleArn = pulumi.interpolate`arn:aws:iam::${this._account.id}:role/${this._account.roleName}`;

    this._provider = new aws.Provider(
      "Provider",
      {
        region: Aws.region as aws.Region,
        assumeRole: { roleArn: this._assumeRoleArn },
      },
      { parent: this },
    );

    this._budget = new aws.budgets.Budget(
      "Budget",
      {
        budgetType: "COST",
        limitAmount: "1",
        limitUnit: "USD",
        timeUnit: "MONTHLY",
        notifications: [
          {
            comparisonOperator: "GREATER_THAN",
            threshold: 100,
            thresholdType: "PERCENTAGE",
            notificationType: "FORECASTED",
            subscriberEmailAddresses: [email],
          },
        ],
      },
      { parent: this },
    );

    this.registerOutputs({
      account: this._account.id,
      provider: this._provider.id,
      budget: this._budget.id,
    });
  }

  get id() {
    return this._account.id;
  }

  get assumeRoleArn() {
    return this._assumeRoleArn;
  }

  get provider() {
    return this._provider;
  }
}

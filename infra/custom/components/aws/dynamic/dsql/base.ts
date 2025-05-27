export class DsqlBase {
  protected static _getSdk = async () => import("@aws-sdk/client-dsql");

  protected static _getClient = async () =>
    DsqlBase._getSdk().then((sdk) => new sdk.DSQLClient());
}

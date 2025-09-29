export class AppsyncBase {
  protected static _getSdk = async () => import("@aws-sdk/client-appsync");

  protected static _getClient = async () =>
    AppsyncBase._getSdk().then((sdk) => new sdk.AppSyncClient());
}

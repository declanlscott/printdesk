import { Constants } from "@printdesk/core/utils/constants";

export const buildTemplate = <
  TIdentifier extends string,
  TPlaceholder extends string = typeof Constants.TENANT_ID_PLACEHOLDER,
>(
  identifier: TIdentifier,
  placeholder: TPlaceholder = Constants.TENANT_ID_PLACEHOLDER as TPlaceholder,
) => `pd-${$app.stage}-${placeholder}-${identifier}` as const;

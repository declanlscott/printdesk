import { pgEnum } from "drizzle-orm/pg-core";

import { oauth2ProviderTypes } from "../auth/shared";
import { billingAccountTypes } from "../billing-accounts/shared";
import { invoiceStatuses } from "../invoices/shared";
import { productStatuses } from "../products/shared";
import { roomStatuses, workflowStatusTypes } from "../rooms/shared";
import { licenseStatuses, tenantStatuses } from "../tenants/shared";
import { userRoles, userTypes } from "../users/shared";

export const licenseStatus = pgEnum("license_status", licenseStatuses);

export const tenantStatus = pgEnum("tenant_status", tenantStatuses);

export const roomStatus = pgEnum("room_status", roomStatuses);
export const workflowStatusType = pgEnum(
  "workflow_status_type",
  workflowStatusTypes,
);

export const userType = pgEnum("user_type", userTypes);
export const userRole = pgEnum("user_role", userRoles);

export const oauth2ProviderType = pgEnum(
  "oauth2_provider_type",
  oauth2ProviderTypes,
);

export const productStatus = pgEnum("product_status", productStatuses);

export const billingAccountType = pgEnum(
  "billing_account_type",
  billingAccountTypes,
);
export const invoiceStatus = pgEnum("invoice_status", invoiceStatuses);

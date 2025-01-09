import { oauth2ProviderTypes } from "../auth/shared";
import { billingAccountTypes } from "../billing-accounts/shared";
import { customEnum } from "../drizzle/columns";
import { invoiceStatuses } from "../invoices/shared";
import { productStatuses } from "../products/shared";
import { roomStatuses, workflowStatusTypes } from "../rooms/shared";
import { licenseStatuses, tenantStatuses } from "../tenants/shared";
import { userRoles, userTypes } from "../users/shared";

export const licenseStatus = (name: string) =>
  customEnum(name, licenseStatuses);

export const tenantStatus = (name: string) => customEnum(name, tenantStatuses);

export const roomStatus = (name: string) => customEnum(name, roomStatuses);
export const workflowStatusType = (name: string) =>
  customEnum(name, workflowStatusTypes);

export const userType = (name: string) => customEnum(name, userTypes);
export const userRole = (name: string) => customEnum(name, userRoles);

export const oauth2ProviderType = (name: string) =>
  customEnum(name, oauth2ProviderTypes);

export const productStatus = (name: string) =>
  customEnum(name, productStatuses);

export const billingAccountType = (name: string) =>
  customEnum(name, billingAccountTypes);
export const invoiceStatus = (name: string) =>
  customEnum(name, invoiceStatuses);

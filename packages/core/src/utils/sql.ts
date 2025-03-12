import { oauth2ProviderKinds } from "../auth/shared";
import { billingAccountOrigins } from "../billing-accounts/shared";
import { customEnum } from "../drizzle/columns";
import { invoiceStatuses } from "../invoices/shared";
import { productStatuses } from "../products/shared";
import { roomStatuses, workflowStatusTypes } from "../rooms/shared";
import { licenseStatuses, tenantStatuses } from "../tenants/shared";
import { userOrigins, userRoles } from "../users/shared";

export const licenseStatus = (name: string) =>
  customEnum(name, licenseStatuses);

export const tenantStatus = (name: string) => customEnum(name, tenantStatuses);

export const roomStatus = (name: string) => customEnum(name, roomStatuses);
export const workflowStatusType = (name: string) =>
  customEnum(name, workflowStatusTypes);

export const userOrigin = (name: string) => customEnum(name, userOrigins);
export const userRole = (name: string) => customEnum(name, userRoles);

export const oauth2ProviderKind = (name: string) =>
  customEnum(name, oauth2ProviderKinds);

export const productStatus = (name: string) =>
  customEnum(name, productStatuses);

export const billingAccountOrigin = (name: string) =>
  customEnum(name, billingAccountOrigins);
export const invoiceStatus = (name: string) =>
  customEnum(name, invoiceStatuses);

export const productsTableName = "products";

export const productStatuses = ["draft", "published"] as const;
export type ProductStatus = (typeof productStatuses)[number];

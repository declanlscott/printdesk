import * as v from "valibot";

import { Constants } from "../utils/constants";
import {
  costSchema,
  isUniqueByKey,
  nanoIdSchema,
  tenantTableSchema,
} from "../utils/shared";

export const optionSchema = v.object({
  name: v.pipe(v.string(), v.trim()),
  image: v.string(),
  description: v.optional(v.string()),
  cost: costSchema,
});

export const fieldSchema = v.object({
  name: v.pipe(v.string(), v.trim()),
  required: v.boolean(),
  options: v.pipe(
    v.array(optionSchema),
    v.check(
      (input) => isUniqueByKey("name", input),
      "Field option names must be unique",
    ),
  ),
});

export const productAttributesV1Schema = v.object({
  copies: v.object({
    visible: v.fallback(v.boolean(), true),
  }),
  printColor: v.object({
    visible: v.fallback(v.boolean(), true),
  }),
  singleOrDoubleSided: v.object({
    visible: v.fallback(v.boolean(), true),
  }),
  due: v.object({
    visible: v.fallback(v.boolean(), true),
    leadTimeDays: v.fallback(v.pipe(v.number(), v.integer()), 0),
    workingDays: v.picklist(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
  }),
  paperStock: v.optional(
    v.object({
      options: v.pipe(
        v.array(optionSchema),
        v.check(
          (input) => isUniqueByKey("name", input),
          "Paper stock option names must be unique",
        ),
      ),
    }),
  ),
  custom: v.optional(
    v.object({
      name: v.pipe(v.string(), v.trim()),
      fields: v.pipe(
        v.array(fieldSchema),
        v.check(
          (input) => isUniqueByKey("name", input),
          "Custom field names must be unique",
        ),
      ),
    }),
  ),
  customOperatorOnly: v.optional(
    v.object({
      name: v.pipe(v.string(), v.trim()),
      fields: v.pipe(
        v.array(fieldSchema),
        v.check(
          (input) => isUniqueByKey("name", input),
          "Custom operator only field names must be unique",
        ),
      ),
    }),
  ),
  collating: v.optional(
    v.object({
      options: v.pipe(
        v.array(optionSchema),
        v.check(
          (input) => isUniqueByKey("name", input),
          "Collating option names must be unique",
        ),
      ),
    }),
  ),
  frontCover: v.optional(
    v.object({
      options: v.pipe(
        v.array(
          v.object({
            ...optionSchema.entries,
            printable: v.boolean(),
          }),
        ),
        v.check(
          (input) => isUniqueByKey("name", input),
          "Front cover option names must be unique",
        ),
      ),
    }),
  ),
  backCover: v.optional(
    v.object({
      options: v.pipe(
        v.array(optionSchema),
        v.check(
          (input) => isUniqueByKey("name", input),
          "Back cover option names must be unique",
        ),
      ),
    }),
  ),
  cutting: v.optional(
    v.object({
      options: v.pipe(
        v.array(optionSchema),
        v.check(
          (input) => isUniqueByKey("name", input),
          "Cutting option names must be unique",
        ),
      ),
    }),
  ),
  binding: v.optional(
    v.object({
      options: v.pipe(
        v.array(
          v.object({
            ...optionSchema.entries,
            subAttributes: v.pipe(
              v.array(
                v.object({
                  name: v.pipe(v.string(), v.trim()),
                  description: v.optional(v.string()),
                  options: v.pipe(
                    v.array(optionSchema),
                    v.check(
                      (input) => isUniqueByKey("name", input),
                      "Binding sub-attribute option names must be unique",
                    ),
                  ),
                }),
              ),
              v.check(
                (input) => isUniqueByKey("name", input),
                "Binding sub-attribute names must be unique",
              ),
            ),
          }),
        ),
        v.check(
          (input) => isUniqueByKey("name", input),
          "Binding option names must be unique",
        ),
      ),
    }),
  ),
  holePunching: v.optional(
    v.pipe(
      v.array(optionSchema),
      v.check(
        (input) => isUniqueByKey("name", input),
        "Hole punching option names must be unique",
      ),
    ),
  ),
  folding: v.optional(
    v.pipe(
      v.array(optionSchema),
      v.check(
        (input) => isUniqueByKey("name", input),
        "Folding option names must be unique",
      ),
    ),
  ),
  laminating: v.optional(
    v.pipe(
      v.array(optionSchema),
      v.check(
        (input) => isUniqueByKey("name", input),
        "Laminating option names must be unique",
      ),
    ),
  ),
  packaging: v.optional(
    v.object({
      name: v.pipe(v.string(), v.trim()),
      image: v.string(),
      cost: costSchema,
      showItemsPerSet: v.boolean(),
    }),
  ),
  material: v.optional(
    v.object({
      name: v.pipe(v.string(), v.trim()),
      color: v.object({
        name: v.pipe(v.string(), v.trim()),
        value: v.optional(v.pipe(v.string(), v.hexColor())),
      }),
      cost: costSchema,
    }),
  ),
  proofRequired: v.optional(
    v.object({
      options: v.pipe(
        v.array(
          v.object({
            name: v.pipe(v.string(), v.trim()),
            description: v.optional(v.string()),
          }),
        ),
        v.check(
          (input) => isUniqueByKey("name", input),
          "Proof required option names must be unique",
        ),
      ),
    }),
  ),
});
export type ProductAttributesV1 = v.InferOutput<
  typeof productAttributesV1Schema
>;

export const productsTableName = "products";

export const productStatuses = ["draft", "published"] as const;
export type ProductStatus = (typeof productStatuses)[number];

export const productConfigurationV1Schema = v.object({
  version: v.literal(1),
  image: v.string(),
  productVisibility: v.picklist(productStatuses),
  orderAttachments: v.optional(
    v.object({
      fileUploadEnabled: v.boolean(),
      physicalCopyEnabled: v.boolean(),
    }),
  ),
  attributes: productAttributesV1Schema,
});
export type ProductConfigurationV1 = v.InferOutput<
  typeof productConfigurationV1Schema
>;

export const productConfigurationSchema = v.variant("version", [
  productConfigurationV1Schema,
]);
export type ProductConfiguration = v.InferOutput<
  typeof productConfigurationSchema
>;

export const productSchema = v.object({
  ...tenantTableSchema.entries,
  name: v.pipe(v.string(), v.maxLength(Constants.VARCHAR_LENGTH)),
  status: v.picklist(productStatuses),
  roomId: nanoIdSchema,
  config: productConfigurationSchema,
});

export const createProductMutationArgsSchema = v.object({
  ...v.omit(productSchema, ["deletedAt"]).entries,
  deletedAt: v.null(),
});
export type CreateProductMutationArgs = v.InferOutput<
  typeof createProductMutationArgsSchema
>;

export const updateProductMutationArgsSchema = v.object({
  id: nanoIdSchema,
  updatedAt: v.date(),
  ...v.partial(
    v.omit(productSchema, [
      "id",
      "tenantId",
      "updatedAt",
      "createdAt",
      "deletedAt",
    ]),
  ).entries,
});
export type UpdateProductMutationArgs = v.InferOutput<
  typeof updateProductMutationArgsSchema
>;

export const deleteProductMutationArgsSchema = v.object({
  id: nanoIdSchema,
  deletedAt: v.date(),
});
export type DeleteProductMutationArgs = v.InferOutput<
  typeof deleteProductMutationArgsSchema
>;

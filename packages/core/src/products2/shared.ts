import { Either, Schema, Struct } from "effect";

import { SyncTable, TenantTable, View } from "../database2/shared";
import { SyncMutation } from "../sync2/shared";
import { Constants } from "../utils/constants";
import { Cost, HexColor, NanoId } from "../utils2/shared";

import type {
  ActiveProductsView,
  ActivePublishedProductsView,
  ProductsTable,
} from "./sql";

export const productStatuses = ["draft", "published"] as const;
export type ProductStatus = (typeof productStatuses)[number];

export const Option = Schema.Struct({
  name: Schema.Trim,
  image: Schema.String,
  description: Schema.optional(Schema.String),
  cost: Cost,
});
export const Field = Schema.Struct({
  name: Schema.Trim,
  required: Schema.Boolean,
  options: Schema.Array(Option).pipe(
    Schema.filter(
      (opts) =>
        Array.from(new Set(opts)).length === opts.length ||
        "Field option names must be unique",
    ),
  ),
});
const FallbackBoolean = (fallback = true) =>
  Schema.Boolean.pipe(
    Schema.annotations({
      decodingFallback: () => Either.right(fallback),
    }),
  );
export const ProductAttributesV1 = Schema.Struct({
  copies: Schema.Struct({
    visible: FallbackBoolean(),
  }),
  printColor: Schema.Struct({
    visible: FallbackBoolean(),
  }),
  singleOrDoubleSided: Schema.Struct({
    visible: FallbackBoolean(),
  }),
  due: Schema.Struct({
    visible: FallbackBoolean(),
    leadTimeDays: Schema.Int.pipe(
      Schema.annotations({
        decodingFallback: () => Either.right(0),
      }),
    ),
    workingDays: Schema.Literal(
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ),
    paperStock: Schema.optional(
      Schema.Struct({
        options: Schema.Array(Option).pipe(
          Schema.filter(
            (opts) =>
              Array.from(new Set(opts.map((o) => o.name))).length ===
                opts.length || "Paper stock option names must be unique",
          ),
        ),
      }),
    ),
    custom: Schema.optional(
      Schema.Struct({
        name: Schema.String,
        fields: Schema.Array(Field).pipe(
          Schema.filter(
            (fields) =>
              Array.from(new Set(fields.map((f) => f.name))).length ===
                fields.length || "Custom field names must be unique",
          ),
        ),
      }),
    ),
    customOperatorOnly: Schema.optional(
      Schema.Struct({
        name: Schema.String,
        fields: Schema.Array(Field).pipe(
          Schema.filter(
            (fields) =>
              Array.from(new Set(fields.map((f) => f.name))).length ===
                fields.length || "Custom operator field names must be unique",
          ),
        ),
      }),
    ),
    backCover: Schema.optional(
      Schema.Struct({
        options: Schema.Array(Option).pipe(
          Schema.filter(
            (opts) =>
              Array.from(new Set(opts.map((o) => o.name))).length ===
                opts.length || "Back cover option names must be unique",
          ),
        ),
      }),
    ),
    cutting: Schema.optional(
      Schema.Struct({
        options: Schema.Array(Option).pipe(
          Schema.filter(
            (opts) =>
              Array.from(new Set(opts.map((o) => o.name))).length ===
                opts.length || "Cutting option names must be unique",
          ),
        ),
      }),
    ),
    binding: Schema.optional(
      Schema.Struct({
        options: Schema.Array(
          Schema.Struct({
            ...Option.fields,
            subAttributes: Schema.Array(
              Schema.Struct({
                name: Schema.Trim,
                description: Schema.optional(Schema.String),
                options: Schema.Array(Option).pipe(
                  Schema.filter(
                    (opts) =>
                      Array.from(new Set(opts.map((o) => o.name))).length ===
                        opts.length ||
                      "Binding sub-attribute option names must be unique",
                  ),
                ),
              }),
            ).pipe(
              Schema.filter(
                (attrs) =>
                  Array.from(new Set(attrs.map((a) => a.name))).length ===
                    attrs.length ||
                  "Binding sub-attribute names must be unique",
              ),
            ),
          }),
        ).pipe(
          Schema.filter(
            (opts) =>
              Array.from(new Set(opts.map((o) => o.name))).length ===
                opts.length || "Binding option names must be unique",
          ),
        ),
      }),
    ),
    holePunching: Schema.optional(
      Schema.Array(Option).pipe(
        Schema.filter(
          (opts) =>
            Array.from(new Set(opts.map((o) => o.name))).length ===
              opts.length || "Hole punching option names must be unique",
        ),
      ),
    ),
    folding: Schema.optional(
      Schema.Array(Option).pipe(
        Schema.filter(
          (opts) =>
            Array.from(new Set(opts.map((o) => o.name))).length ===
              opts.length || "Folding option names must be unique",
        ),
      ),
    ),
    laminating: Schema.optional(
      Schema.Array(Option).pipe(
        Schema.filter(
          (opts) =>
            Array.from(new Set(opts.map((o) => o.name))).length ===
              opts.length || "Laminating option names must be unique",
        ),
      ),
    ),
    packaging: Schema.optional(
      Schema.Struct({
        name: Schema.Trim,
        image: Schema.String,
        cost: Cost,
        showItemsPerSet: Schema.Boolean,
      }),
    ),
    material: Schema.optional(
      Schema.Struct({
        name: Schema.Trim,
        color: Schema.Struct({
          name: Schema.Trim,
          value: Schema.optional(HexColor),
        }),
        cost: Cost,
      }),
    ),
    proofRequired: Schema.optional(
      Schema.Struct({
        options: Schema.Array(
          Schema.Struct({
            name: Schema.Trim,
            description: Schema.optional(Schema.String),
          }),
        ).pipe(
          Schema.filter(
            (opts) =>
              Array.from(new Set(opts.map((o) => o.name))).length ===
                opts.length || "Proof required option names must be unique",
          ),
        ),
      }),
    ),
  }),
});
export const ProductConfigurationV1 = Schema.Struct({
  version: Schema.Literal(1),
  image: Schema.String,
  productVisibility: Schema.optional(
    Schema.Struct({
      fileUploadEnabled: Schema.Boolean,
      physicalCopyEnabled: Schema.Boolean,
    }),
  ),
  attributes: ProductAttributesV1,
});
export const ProductConfiguration = Schema.Union(ProductConfigurationV1);

export const productsTableName = "products";
export const products = SyncTable<ProductsTable>()(
  productsTableName,
  Schema.Struct({
    ...TenantTable.fields,
    name: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
    status: Schema.Literal(...productStatuses),
    roomId: NanoId,
    config: ProductConfiguration,
  }),
  ["create", "read", "update", "delete"],
);

export const activeProductsViewName = `active_${productsTableName}`;
export const activeProducts = View<ActiveProductsView>()(
  activeProductsViewName,
  products.Schema,
);

export const activePublishedProductsViewName = `active_published_${productsTableName}`;
export const activePublishedProducts = View<ActivePublishedProductsView>()(
  activePublishedProductsViewName,
  activeProducts.Schema,
);

export const createProduct = SyncMutation(
  "createProduct",
  products.Schema.omit("deletedAt", "tenantId"),
);

export const updateProduct = SyncMutation(
  "updateProduct",
  Schema.extend(
    products.Schema.pick("id", "updatedAt"),
    products.Schema.omit(...Struct.keys(TenantTable.fields), "roomId").pipe(
      Schema.partial,
    ),
  ),
);

export const deleteProduct = SyncMutation(
  "deleteProduct",
  Schema.Struct({
    id: NanoId,
    deletedAt: Schema.DateTimeUtc,
  }),
);

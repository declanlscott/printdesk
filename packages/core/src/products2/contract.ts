import { Either, Schema, Struct } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { DatabaseContract } from "../database2/contract";
import { Constants } from "../utils/constants";
import { Cost, HexColor, NanoId } from "../utils2";

import type {
  ActiveProductsView,
  ActivePublishedProductsView,
  ProductsTable,
} from "./sql";

export namespace ProductsContract {
  export const statuses = ["draft", "published"] as const;
  export type Status = (typeof statuses)[number];

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
  export const AttributesV1 = Schema.Struct({
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
  export const ConfigurationV1 = Schema.Struct({
    version: Schema.Literal(1),
    image: Schema.String,
    productVisibility: Schema.optional(
      Schema.Struct({
        fileUploadEnabled: Schema.Boolean,
        physicalCopyEnabled: Schema.Boolean,
      }),
    ),
    attributes: AttributesV1,
  });
  export const Configuration = Schema.Union(ConfigurationV1);

  export const tableName = "products";
  export const table = DatabaseContract.SyncTable<ProductsTable>()(
    tableName,
    Schema.Struct({
      ...DatabaseContract.TenantTable.fields,
      name: Schema.Trim.pipe(Schema.maxLength(Constants.VARCHAR_LENGTH)),
      status: Schema.Literal(...statuses),
      roomId: NanoId,
      config: Configuration,
    }),
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = DatabaseContract.View<ActiveProductsView>()(
    activeViewName,
    table.Schema,
  );

  export const activePublishedViewName = `active_published_${tableName}`;
  export const activePublishedView =
    DatabaseContract.View<ActivePublishedProductsView>()(
      activePublishedViewName,
      activeView.Schema,
    );

  export const create = new DataAccessContract.Function({
    name: "createProduct",
    Args: table.Schema.omit("deletedAt", "tenantId"),
    Returns: table.Schema,
  });

  export const update = new DataAccessContract.Function({
    name: "updateProduct",
    Args: Schema.extend(
      table.Schema.pick("id", "updatedAt"),
      table.Schema.omit(
        ...Struct.keys(DatabaseContract.TenantTable.fields),
        "roomId",
      ).pipe(Schema.partial),
    ),
    Returns: table.Schema,
  });

  export const delete_ = new DataAccessContract.Function({
    name: "deleteProduct",
    Args: Schema.Struct({
      id: NanoId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: table.Schema,
  });
}

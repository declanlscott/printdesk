import { Either, Schema, Struct } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { TableContract } from "../database2/contract";
import { Cost, HexColor } from "../utils2";

import type { ProductsSchema } from "./schema";

export namespace ProductsContract {
  export const statuses = ["draft", "published"] as const;
  export type Status = (typeof statuses)[number];

  export class Option extends Schema.Class<Option>("Option")({
    name: Schema.Trim,
    image: Schema.String,
    description: Schema.optional(Schema.String),
    cost: Cost,
  }) {}
  export class Field extends Schema.Class<Field>("Field")({
    name: Schema.Trim,
    required: Schema.Boolean,
    options: Schema.Array(Option).pipe(
      Schema.filter(
        (opts) =>
          Array.from(new Set(opts)).length === opts.length ||
          "Field option names must be unique",
      ),
    ),
  }) {}
  const FallbackBoolean = (fallback = true) =>
    Schema.Boolean.pipe(
      Schema.annotations({
        decodingFallback: () => Either.right(fallback),
      }),
    );
  export class AttributesV1 extends Schema.TaggedClass<AttributesV1>(
    "AttributesV1",
  )("AttributesV1", {
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
  }) {}
  export class ConfigurationV1 extends Schema.TaggedClass<ConfigurationV1>(
    "ConfigurationV1",
  )("ConfigurationV1", {
    image: Schema.String,
    productVisibility: Schema.optional(
      Schema.Struct({
        fileUploadEnabled: Schema.Boolean,
        physicalCopyEnabled: Schema.Boolean,
      }),
    ),
    attributes: AttributesV1,
  }) {}
  export const Configuration = Schema.Union(ConfigurationV1);

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...TableContract.Tenant.fields,
    name: TableContract.VarChar,
    status: Schema.optionalWith(Schema.Literal(...statuses), {
      default: () => "draft",
    }),
    roomId: TableContract.EntityId,
    config: Configuration,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "products";
  export const table = TableContract.Sync<ProductsSchema.Table>()(
    tableName,
    DataTransferObject,
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = TableContract.View<ProductsSchema.ActiveView>()(
    activeViewName,
    DataTransferObject,
  );

  export const activePublishedViewName = `active_published_${tableName}`;
  export const activePublishedView =
    TableContract.View<ProductsSchema.ActivePublishedView>()(
      activePublishedViewName,
      DataTransferObject,
    );

  export const create = new DataAccessContract.Function({
    name: "createProduct",
    Args: DataTransferStruct.omit("deletedAt", "tenantId"),
    Returns: DataTransferObject,
  });

  export const edit = new DataAccessContract.Function({
    name: "editProduct",
    Args: Schema.extend(
      DataTransferStruct.pick("id", "updatedAt"),
      DataTransferStruct.omit(
        ...Struct.keys(TableContract.Tenant.fields),
        "status",
        "roomId",
      ).pipe(Schema.partial),
    ),
    Returns: DataTransferObject,
  });

  export const publish = new DataAccessContract.Function({
    name: "publishProduct",
    Args: DataTransferStruct.pick("id", "updatedAt"),
    Returns: DataTransferObject,
  });

  export const draft = new DataAccessContract.Function({
    name: "draftProduct",
    Args: DataTransferStruct.pick("id", "updatedAt"),
    Returns: DataTransferObject,
  });

  export const delete_ = new DataAccessContract.Function({
    name: "deleteProduct",
    Args: Schema.Struct({
      id: TableContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });
}

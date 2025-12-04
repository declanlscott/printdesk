import * as Either from "effect/Either";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns2/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables2/contract";
import { Cost, HexColor } from "../utils2";

import type { ProductsSchema } from "./schema";

export namespace ProductsContract {
  export const statuses = ["draft", "published"] as const;
  export type Status = (typeof statuses)[number];

  export class Option extends Schema.Class<Option>("Option")({
    name: Schema.Trim,
    image: Schema.String,
    description: Schema.Trim.pipe(Schema.optional),
    cost: Cost,
  }) {}
  export class Field extends Schema.Class<Field>("Field")({
    name: Schema.Trim,
    required: Schema.Boolean,
    options: Option.pipe(Schema.Array),
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
      leadTimeDays: Schema.NonNegativeInt.pipe(
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
      paperStock: Schema.Struct({
        options: Option.pipe(Schema.Array),
      }).pipe(Schema.optional),
      custom: Schema.Struct({
        name: Schema.String,
        fields: Field.pipe(Schema.Array),
      }).pipe(Schema.optional),
      customOperatorOnly: Schema.Struct({
        name: Schema.String,
        fields: Field.pipe(Schema.Array),
      }).pipe(Schema.optional),
      backCover: Schema.Struct({
        options: Option.pipe(Schema.Array),
      }).pipe(Schema.optional),
      cutting: Schema.Struct({
        options: Option.pipe(Schema.Array),
      }).pipe(Schema.optional),
      binding: Schema.Struct({
        options: Schema.Struct({
          ...Option.fields,
          subAttributes: Schema.Struct({
            name: Schema.Trim,
            description: Schema.Trim.pipe(Schema.optional),
            options: Option.pipe(Schema.Array),
          }).pipe(Schema.Array),
        }).pipe(Schema.Array),
      }).pipe(Schema.optional),
      holePunching: Option.pipe(Schema.Array, Schema.optional),
      folding: Option.pipe(Schema.Array, Schema.optional),
      laminating: Option.pipe(Schema.Array, Schema.optional),
      packaging: Schema.Struct({
        name: Schema.Trim,
        image: Schema.String,
        cost: Cost,
        showItemsPerSet: Schema.Boolean,
      }).pipe(Schema.optional),
      material: Schema.Struct({
        name: Schema.Trim,
        color: Schema.Struct({
          name: Schema.Trim,
          value: HexColor.pipe(Schema.optional),
        }),
        cost: Cost,
      }).pipe(Schema.optional),
      proofRequired: Schema.Struct({
        options: Schema.Struct({
          name: Schema.Trim,
          description: Schema.optional(Schema.String),
        }).pipe(Schema.Array),
      }).pipe(Schema.optional),
    }),
  }) {}
  export class ConfigurationV1 extends Schema.TaggedClass<ConfigurationV1>(
    "ConfigurationV1",
  )("ConfigurationV1", {
    image: Schema.String,
    status: Schema.Literal(...statuses).pipe(
      Schema.optionalWith({ default: () => "draft" }),
    ),
    orderAttachments: Schema.Struct({
      fileUploadEnabled: Schema.Boolean,
      physicalCopyEnabled: Schema.Boolean,
    }).pipe(Schema.optional),
    attributes: AttributesV1,
  }) {}
  export const Configuration = Schema.Union(ConfigurationV1);

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    name: ColumnsContract.VarChar,
    status: Schema.Literal(...statuses).pipe(
      Schema.optionalWith({ default: () => "draft" }),
    ),
    roomId: ColumnsContract.EntityId,
    config: Configuration,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "products";
  export const table = new (TablesContract.makeClass<ProductsSchema.Table>())(
    tableName,
    DataTransferObject,
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    new (TablesContract.makeViewClass<ProductsSchema.ActiveView>())(
      activeViewName,
      DataTransferObject,
    );

  export const activePublishedViewName = `active_published_${tableName}`;
  export const activePublishedView =
    new (TablesContract.makeViewClass<ProductsSchema.ActivePublishedView>())(
      activePublishedViewName,
      DataTransferObject,
    );

  export const canEdit = new ProceduresContract.Procedure({
    name: "canEditProduct",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteProduct",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canRestore = new ProceduresContract.Procedure({
    name: "canRestoreProduct",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const create = new ProceduresContract.Procedure({
    name: "createProduct",
    Args: DataTransferStruct.omit("deletedAt", "tenantId"),
    Returns: DataTransferObject,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editProduct",
    Args: Schema.extend(
      DataTransferStruct.pick("id", "updatedAt"),
      DataTransferStruct.omit(
        ...Struct.keys(ColumnsContract.Tenant.fields),
        "status",
        "roomId",
      ).pipe(Schema.partial),
    ),
    Returns: DataTransferObject,
  });

  export const publish = new ProceduresContract.Procedure({
    name: "publishProduct",
    Args: DataTransferStruct.pick("id", "updatedAt"),
    Returns: DataTransferObject,
  });

  export const draft = new ProceduresContract.Procedure({
    name: "draftProduct",
    Args: DataTransferStruct.pick("id", "updatedAt"),
    Returns: DataTransferObject,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteProduct",
    Args: Schema.Struct({
      id: ColumnsContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreProduct",
    Args: DataTransferStruct.pick("id"),
    Returns: DataTransferObject,
  });
}

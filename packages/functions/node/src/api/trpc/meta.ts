import type { AssumeRoleCommandInput } from "@aws-sdk/client-sts";
import type { Action, Resource } from "@printdesk/core/access-control/shared";
import type { Actor } from "@printdesk/core/actors/shared";

export type Meta =
  | { kind: "actor"; actor: Actor["kind"] }
  | { kind: "access-control"; resource: Resource; action: Action }
  | { kind: "aws-assume-role"; getInput?: () => AssumeRoleCommandInput };

export const isOfKind = <TKind extends Meta["kind"]>(
  meta: Meta | undefined,
  kind: TKind,
): meta is Extract<Meta, { kind: TKind }> =>
  typeof meta !== "undefined" && meta.kind === kind;

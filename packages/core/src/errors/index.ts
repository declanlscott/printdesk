import type { VersionNotSupportedResponse } from "@rocicorp/replicache";

export namespace ServerErrors {
  export class BadRequest extends globalThis.Error {
    public readonly name = "BadRequest";

    constructor(...args: Parameters<ErrorConstructor>) {
      super(...args);
    }
  }

  export class MutationConflict extends globalThis.Error {
    public readonly name = "MutationConflict";

    constructor(...args: Parameters<ErrorConstructor>) {
      super(...args);
    }
  }

  export class InternalServerError extends globalThis.Error {
    public readonly name = "InternalServerError";

    constructor(...args: Parameters<ErrorConstructor>) {
      super(...args);
    }
  }

  export class ServiceUnavailable extends globalThis.Error {
    public readonly name = "ServiceUnavailable";

    constructor(...args: Parameters<ErrorConstructor>) {
      super(...args);
    }
  }

  export class InvalidActor extends globalThis.Error {
    public readonly name = "InvalidActor";

    constructor(expected: string, got: string, opts?: ErrorOptions) {
      super(`Expected actor kind "${expected}", got "${got}".`, opts);
    }
  }

  export class MissingContext extends globalThis.Error {
    public readonly name = "MissingContext";
    public readonly contextName: string;

    constructor(contextName: string, opts?: ErrorOptions) {
      super(`"${contextName}" context not found`, opts);
      this.contextName = contextName;
    }
  }

  export class ReplicacheClientStateNotFound extends globalThis.Error {
    public readonly name = "ReplicacheClientStateNotFound";

    constructor(
      ...[
        message = "Client state not found",
        ...args
      ]: Parameters<ErrorConstructor>
    ) {
      super(message, ...args);
    }
  }

  export class ReplicacheVersionNotSupported extends globalThis.Error {
    public readonly name = "ReplicacheVersionNotSupported";

    constructor(
      public versionType: VersionNotSupportedResponse["versionType"],
      ...[
        message = "Version not supported",
        ...args
      ]: Parameters<ErrorConstructor>
    ) {
      super(message, ...args);
    }
  }

  export class DatabaseMaximumTransactionRetriesExceeded extends globalThis.Error {
    public readonly name = "DatabaseMaximumTransactionRetriesExceeded";

    constructor(
      ...[
        message = "Failed to execute transaction after maximum number of retries, giving up.",
        ...args
      ]: Parameters<ErrorConstructor>
    ) {
      super(message, ...args);
    }
  }

  export class XmlRpcFault extends globalThis.Error {
    public readonly name = "XmlRpcFault";

    constructor(
      public code: number,
      ...args: Parameters<ErrorConstructor>
    ) {
      super(...args);
    }
  }
}

/**
 * NOTE: This module provides error classes and must remain framework-agnostic.
 * For example it should not depend on sst for linked resources. Other modules in the
 * core package may depend on sst, but this module should not.
 */

export namespace ApplicationError {
  export type ErrorName =
    | "Unauthenticated"
    | "EntityNotFound"
    | "AccessDenied"
    | "MissingContext"
    | "MissingContextProvider";

  export class Error extends globalThis.Error {
    declare public readonly name: ErrorName;

    constructor(message: string) {
      super(message);
    }
  }

  export class Unauthenticated extends ApplicationError.Error {
    public readonly name = "Unauthenticated";

    constructor(message = "Unauthenticated") {
      super(message);
    }
  }

  export class EntityNotFound extends ApplicationError.Error {
    public readonly name = "EntityNotFound";

    constructor(entity?: { name: string; id: string }) {
      super(
        entity
          ? `Entity "${entity.name}" not found with id "${entity.id}".`
          : "Entity not found.",
      );
    }
  }

  export class AccessDenied extends ApplicationError.Error {
    public readonly name = "AccessDenied";

    constructor(resource?: { name: string; id?: string }) {
      super(
        resource
          ? `Access denied to resource "${resource.name}"${
              resource.id ? ` with id "${resource.id}"` : ""
            }.`
          : "Access denied.",
      );
    }
  }

  export class MissingContext extends ApplicationError.Error {
    public readonly name = "MissingContext";
    public readonly contextName: string;

    constructor(contextName: string) {
      super(`"${contextName}" context not found`);
      this.contextName = contextName;
    }
  }

  export class MissingContextProvider extends ApplicationError.Error {
    public readonly name = "MissingContextProvider";

    constructor(contextName?: string) {
      super(
        contextName
          ? `"use${contextName}" must be used within a "${contextName}Provider."`
          : "This hook must be used within a corresponding context provider.",
      );
    }
  }
}

export namespace HttpError {
  export type ErrorName =
    | "BadRequest"
    | "Unauthorized"
    | "Forbidden"
    | "NotFound"
    | "MethodNotAllowed"
    | "RequestTimeout"
    | "Conflict"
    | "TooManyRequests"
    | "InternalServerError"
    | "NotImplemented"
    | "BadGateway"
    | "ServiceUnavailable";

  export class Error extends globalThis.Error {
    declare public readonly name: ErrorName;
    public readonly statusCode: number;

    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  }

  export class BadRequest extends HttpError.Error {
    public readonly name = "BadRequest";
    public readonly statusCode = 400;

    constructor(message = "Bad request") {
      super(message, 400);
    }
  }

  export class Unauthorized extends HttpError.Error {
    public readonly name = "Unauthorized";
    public readonly statusCode = 401;

    constructor(message = "Unauthorized") {
      super(message, 401);
    }
  }

  export class Forbidden extends HttpError.Error {
    public readonly name = "Forbidden";
    public readonly statusCode = 403;

    constructor(message = "Forbidden") {
      super(message, 403);
    }
  }

  export class NotFound extends HttpError.Error {
    public readonly name = "NotFound";
    public readonly statusCode = 404;

    constructor(message = "Not found") {
      super(message, 404);
    }
  }

  export class MethodNotAllowed extends HttpError.Error {
    public readonly name = "MethodNotAllowed";
    public readonly statusCode = 405;

    constructor(message = "Method not allowed") {
      super(message, 405);
    }
  }

  export class RequestTimeout extends HttpError.Error {
    public readonly name = "RequestTimeout";
    public readonly statusCode = 408;

    constructor(message = "Request timeout") {
      super(message, 408);
    }
  }

  export class Conflict extends HttpError.Error {
    public readonly name = "Conflict";
    public readonly statusCode = 409;

    constructor(message = "Conflict") {
      super(message, 409);
    }
  }

  export class TooManyRequests extends HttpError.Error {
    public readonly name = "TooManyRequests";
    public readonly statusCode = 429;

    constructor(message = "Too many requests") {
      super(message, 429);
    }
  }

  export class InternalServerError extends HttpError.Error {
    public readonly name = "InternalServerError";
    public readonly statusCode = 500;

    constructor(message = "Internal server error") {
      super(message, 500);
      this.name = "InternalServerError";
    }
  }

  export class NotImplemented extends HttpError.Error {
    public readonly name = "NotImplemented";
    public readonly statusCode = 501;

    constructor(message = "Not implemented") {
      super(message, 501);
    }
  }

  export class BadGateway extends HttpError.Error {
    public readonly name = "BadGateway";
    public readonly statusCode = 502;
    public readonly upstream: {
      error: HttpError.Error;
      text: string;
    };

    constructor({
      message = "Bad gateway",
      upstream,
    }: {
      message?: string;
      upstream: {
        error: HttpError.Error;
        text: string;
      };
    }) {
      super(message, 502);
      this.upstream = upstream;
    }
  }

  export class ServiceUnavailable extends HttpError.Error {
    public readonly name = "ServiceUnavailable";
    public readonly statusCode = 503;

    constructor(message = "Service unavailable") {
      super(message, 503);
    }
  }
}

export namespace MiscellaneousError {
  export class NonExhaustiveValue extends globalThis.Error {
    constructor(value: never) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      super(`Non-exhaustive value: ${value}`);
    }
  }
}

export namespace ReplicacheError {
  export type UnrecoverableErrorName =
    | "BadRequest"
    | "Unauthorized"
    | "MutationConflict";

  export type RecoverableErrorName = "ClientStateNotFound";

  export type ErrorName = UnrecoverableErrorName | RecoverableErrorName;

  export abstract class Error extends globalThis.Error {
    declare public readonly name: ErrorName;

    constructor(message: string) {
      super(message);
    }
  }

  export abstract class UnrecoverableError extends ReplicacheError.Error {
    declare public readonly name: UnrecoverableErrorName;

    constructor(message: string) {
      super(message);
    }
  }

  export abstract class RecoverableError extends ReplicacheError.Error {
    declare public readonly name: RecoverableErrorName;

    constructor(message: string) {
      super(message);
    }
  }

  export class BadRequest extends UnrecoverableError {
    public readonly name = "BadRequest";

    constructor(message = "Bad request") {
      super(message);
    }
  }

  export class Unauthorized extends UnrecoverableError {
    public readonly name = "Unauthorized";

    constructor(message = "Unauthorized") {
      super(message);
    }
  }

  export class MutationConflict extends UnrecoverableError {
    public readonly name = "MutationConflict";

    constructor(message = "Mutation conflict") {
      super(message);
    }
  }

  export class ClientStateNotFound extends ReplicacheError.Error {
    public readonly name = "ClientStateNotFound";

    constructor(message = "Client state not found") {
      super(message);
    }
  }
}

export namespace DatabaseError {
  export class MaximumTransactionRetriesExceeded extends globalThis.Error {
    public readonly name = "MaxRetriesExceeded";

    constructor(message?: string) {
      super(
        message ??
          "Failed to execute transaction after maximum number of retries, giving up.",
      );
    }
  }
}

export namespace XmlRpcError {
  export type ErrorName = "Fault";

  export class Error extends globalThis.Error {
    declare public readonly name: ErrorName;

    constructor(message: string) {
      super(message);
    }
  }

  export class Fault extends XmlRpcError.Error {
    public readonly name = "Fault";
    public readonly code: number;

    constructor(message: string, code: number) {
      super(message);
      this.code = code;
    }
  }
}

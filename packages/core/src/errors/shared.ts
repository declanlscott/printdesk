export namespace SharedErrors {
  export class Unauthenticated extends globalThis.Error {
    public readonly name = "Unauthenticated";

    constructor(opts?: ErrorOptions) {
      super("Unauthenticated.", opts);
    }
  }

  export class AccessDenied extends globalThis.Error {
    public readonly name = "AccessDenied";

    constructor(resource?: { name: string; id?: string }, opts?: ErrorOptions) {
      super(
        resource
          ? `Access denied to resource "${resource.name}"${
              resource.id ? ` matching identifier "${resource.id}"` : ""
            }.`
          : "Access denied.",
        opts,
      );
    }
  }

  export class NotFound extends globalThis.Error {
    public readonly name = "NotFound";

    constructor(entity?: { name: string; id: string }, opts?: ErrorOptions) {
      super(
        entity
          ? `No entity of type "${entity.name}" matching identifier "${entity.id}" was found.`
          : "Entity not found.",
        opts,
      );
    }
  }

  export class NonExhaustiveValue extends globalThis.Error {
    constructor(value: never, opts?: ErrorOptions) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      super(`Non-exhaustive value: ${value}`, opts);
    }
  }
}

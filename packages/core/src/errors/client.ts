export namespace ClientErrors {
  export class MissingContextProvider extends globalThis.Error {
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

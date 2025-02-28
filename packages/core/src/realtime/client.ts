import * as v from "valibot";

import { eventSchema, messageSchema } from "./shared";

import type { Event, Message } from "./shared";

export namespace Realtime {
  export const handleMessage =
    <TCallback extends (message: Message) => void>(callback: TCallback) =>
    (event: MessageEvent) => {
      if (typeof event.data !== "string") return;

      const result = v.safeParse(messageSchema, JSON.parse(event.data));
      if (!result.success) return;
      const message = result.output;

      return callback(message);
    };

  export const handleEvent =
    <TCallback extends (event: Event) => void>(callback: TCallback) =>
    (data: unknown) => {
      if (typeof data !== "string") return;

      const result = v.safeParse(eventSchema, JSON.parse(data));
      if (!result.success) return;
      const event = result.output;

      return callback(event);
    };
}

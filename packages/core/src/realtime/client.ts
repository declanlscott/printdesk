import * as v from "valibot";

import { messageSchema } from "./shared";

import type { Message } from "./shared";

export const handleMessage =
  <TCallback extends (message: Message) => void>(callback: TCallback) =>
  (event: MessageEvent) => {
    if (typeof event.data !== "string") return;

    const result = v.safeParse(messageSchema, JSON.parse(event.data));
    if (!result.success) return;
    const message = result.output;

    return callback(message);
  };

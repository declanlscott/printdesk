import { Array } from "effect";

import { models } from "./models";

export const views = Array.filter(
  models,
  (model) =>
    model._tag === "@printdesk/core/database/View" ||
    model._tag === "@printdesk/core/database/VirtualView",
);
export type View = (typeof views)[number];
export type ViewName = View["name"];
export type ViewByName<TName extends ViewName> = Extract<View, { name: TName }>;

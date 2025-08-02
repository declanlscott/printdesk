import * as models from "./models";

export const views = Object.values(models).filter(
  (data) => data._tag === "@printdesk/core/database/View",
);
export type View = (typeof views)[number];
export type ViewName = View["name"];
export type ViewByName<TName extends ViewName> = Extract<View, { name: TName }>;

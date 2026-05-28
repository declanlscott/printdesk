import * as Layer from "effect/Layer";

import * as Mutations from "./mutations/layer";
import * as Policies from "./policies/layer";
import * as ReadRepository from "./read-repository/layer";
import * as WriteRepository from "./write-repository/layer";

export const roomsLayer = Mutations.layer.pipe(
  Layer.provideMerge(Policies.layer),
  Layer.provideMerge(WriteRepository.layer),
  Layer.provideMerge(ReadRepository.layer),
);

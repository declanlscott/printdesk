import * as R from "remeda";

import { Realtime } from "../realtime";

import type { StartsWith } from "../utils/types";

export async function poke<TChannel extends string>(
  ...channels: Array<StartsWith<"/", TChannel>>
) {
  const uniqueChannels = R.unique(channels);
  if (R.isEmpty(uniqueChannels)) return;

  const { http: hostname } = await Realtime.getDns();

  const results = await Promise.allSettled(
    uniqueChannels.map((channel) =>
      Realtime.publish(
        `/replicache${channel}`,
        [{ kind: "replicache_poke" }],
        hostname,
      ),
    ),
  );

  for (const result of results)
    if (result.status === "rejected") console.error(result.reason);
}

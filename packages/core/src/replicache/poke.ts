import * as R from "remeda";

import { Api } from "../backend/api";
import { publish } from "../realtime/publisher";
import { Constants } from "../utils/constants";

import type { StartsWith } from "../utils/types";

export async function poke<TChannel extends string>(
  channels: Array<StartsWith<"/", TChannel>>,
) {
  const uniqueChannels = R.unique(channels);
  if (R.isEmpty(uniqueChannels)) return;

  const { http: httpDomainName } = await Api.getRealtimeDns();

  const results = await Promise.allSettled(
    uniqueChannels.map((channel) =>
      publish(httpDomainName, `/replicache${channel}`, [
        Constants.REPLICACHE_POKE,
      ]),
    ),
  );

  for (const result of results)
    if (result.status === "rejected") console.error(result.reason);
}

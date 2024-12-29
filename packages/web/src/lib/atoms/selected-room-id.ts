import { atomWithStorage } from "jotai/utils";

import type { Key } from "react-aria-components";

export const selectedRoomIdAtom = atomWithStorage<Key | null>(
  "selectedRoomId",
  null,
  undefined,
  { getOnInit: true },
);

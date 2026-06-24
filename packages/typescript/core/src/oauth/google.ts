import { Constants } from "../utils/constants";

import type { Provider } from "@openauthjs/openauth/provider/provider";

export const GoogleProvider = () =>
  ({
    type: Constants.GOOGLE,
    init(routes) {
      routes.get("/authorize", (c) => c.newResponse("Not implemented", { status: 501 }));
      routes.get("/callback", (c) => c.newResponse("Not implemented", { status: 501 }));
    },
  }) satisfies Provider;

import * as Context from "effect/Context";

import type { ServiceShape } from "./layer";

export class App extends Context.Service<App, ServiceShape>()("@printdesk/core/app/App") {}

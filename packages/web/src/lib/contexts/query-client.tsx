import {
  QueryClientProvider as _QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";

import type { PropsWithChildren } from "react";

const queryClient = new QueryClient();

export const QueryClientProvider = (props: PropsWithChildren) => (
  <_QueryClientProvider client={queryClient}>
    {props.children}
  </_QueryClientProvider>
);

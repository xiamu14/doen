import type router from "./router";

import type { RouterClient } from "@orpc/server";

import { createORPCClient } from "@orpc/client";

import { RPCLink } from "@orpc/client/fetch";

const rpcLink = new RPCLink({
  url: "http://localhost:3000/rpc",
});

export const orpcClient: RouterClient<typeof router> =
  createORPCClient(rpcLink);

import type router from "./router";

import type { RouterClient } from "@orpc/server";

import { createORPCClient } from "@orpc/client";

import { RPCLink } from "@orpc/client/fetch";

const rpcLink = new RPCLink({
  url:
    typeof window === "undefined"
      ? "http://127.0.0.1:3000/rpc"
      : `${window.location.origin}/rpc`,
});

export const orpcClient: RouterClient<typeof router> =
  createORPCClient(rpcLink);

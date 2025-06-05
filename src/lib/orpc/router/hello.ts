import { os } from "@orpc/server";
import { z } from "zod";

const hello = os
  .input(
    z.object({
      name: z.string(),
    })
  )
  .handler(({ input }) => {
    return `hello ${input.name}`;
  });

export const router = {
  hello: hello,
};

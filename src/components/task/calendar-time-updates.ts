import { createPubSub } from "@/lib/pubsub";

export const calendarTimeUpdates = createPubSub<Date>();

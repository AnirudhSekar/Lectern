import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { processLecture } from "@/lib/inngest/functions/processLecture";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processLecture],
});
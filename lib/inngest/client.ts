import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "lectern",
  isDev: process.env.NODE_ENV !== "production",
});
import { inngest } from "@/lib/inngest/client";
import { transcribeLecture } from "@/lib/ai/transcribe";
import { summarizeLecture } from "@/lib/ai/summarize";
import { createAdminClient } from "@/lib/supabase/admin";

export const processLecture = inngest.createFunction(
  { id: "process-lecture", triggers: { event: "lecture/created" } },
  async ({ event, step }) => {
    const { lectureId } = event.data;
    const supabase = createAdminClient();

    try {
      await step.run("mark-transcribing", async () => {
        await supabase.from("lectures").update({ status: "transcribing" }).eq("id", lectureId);
      });

      await step.run("transcribe", async () => {
        return transcribeLecture(lectureId);
      });

      await step.run("mark-summarizing", async () => {
        await supabase.from("lectures").update({ status: "summarizing" }).eq("id", lectureId);
      });

      await step.run("summarize", async () => {
        return summarizeLecture(lectureId);
      });

      await step.run("mark-done", async () => {
        await supabase
          .from("lectures")
          .update({ status: "done", completed_at: new Date().toISOString() })
          .eq("id", lectureId);
      });

      return { lectureId, status: "done" };
    } catch (err) {
      await step.run("mark-failed", async () => {
        await supabase.from("lectures").update({ status: "failed" }).eq("id", lectureId);
      });
      throw err;
    }
  }
);
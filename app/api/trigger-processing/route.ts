import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(request: Request) {
  const { lectureId } = await request.json();

  await inngest.send({
    name: "lecture/created",
    data: { lectureId },
  });

  return NextResponse.json({ ok: true });
}
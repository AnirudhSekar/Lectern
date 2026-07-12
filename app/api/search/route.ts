import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { embedSearchQuery } from "@/lib/ai/embed";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { query } = await request.json();

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    const queryEmbedding = await embedSearchQuery(query);

    const { data, error } = await supabase.rpc("match_transcript_chunks", {
  query_embedding: queryEmbedding,
  match_count: 10,
});

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ results: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 }
    );
  }
}
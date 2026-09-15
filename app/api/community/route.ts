import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server credentials are missing");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET() {
  try {
    const supabase = db();

    const { data, error } = await supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      posts: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Community feed failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const content = String(body.content || "").trim();
    const symbol = body.symbol
      ? String(body.symbol)
      : null;
    const verdict = body.verdict
      ? String(body.verdict)
      : null;
    const confidence =
      body.confidence == null
        ? null
        : Number(body.confidence);

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          error: "Post content is required",
        },
        { status: 400 }
      );
    }

    const supabase = db();

    const { data, error } = await supabase
      .from("community_posts")
      .insert({
        content: content.slice(0, 2000),
        symbol,
        verdict,
        confidence,
        author_name: "NEXORA User",
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      post: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create post",
      },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "A valid request body is required." },
        { status: 400 }
      );
    }

    const { organisationId } = body as {
      organisationId?: string;
    };

    if (
      typeof organisationId !== "string" ||
      !UUID_REGEX.test(organisationId)
    ) {
      return NextResponse.json(
        { error: "A valid organisation ID is required." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organisation_members")
      .select("id")
      .eq("organisation_id", organisationId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) {
      console.error("Membership verification error:", membershipError);

      return NextResponse.json(
        { error: "Unable to verify organisation membership." },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: "Active organisation membership required." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase.rpc(
      "talvorah_chat_unread_counts",
      {
        p_organisation_id: organisationId,
      }
    );

    if (error) {
      console.error("Unread count RPC error:", error);

      return NextResponse.json(
        { error: "Unable to retrieve unread message counts." },
        { status: 500 }
      );
    }

    const unreadCounts: Record<string, number> = {};

    for (const row of data ?? []) {
      unreadCounts[row.conversation_id] = Number(row.unread_count ?? 0);
    }

    const totalUnread = Object.values(unreadCounts).reduce(
      (total, count) => total + count,
      0
    );

    return NextResponse.json({
      success: true,
      unreadCounts,
      totalUnread,
    });
  } catch (error) {
    console.error("Chat unread-count error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

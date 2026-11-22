
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

    const { organisationId, conversationId } = body as {
      organisationId?: string;
      conversationId?: string;
    };

    if (
      typeof organisationId !== "string" ||
      !UUID_REGEX.test(organisationId) ||
      typeof conversationId !== "string" ||
      !UUID_REGEX.test(conversationId)
    ) {
      return NextResponse.json(
        { error: "Valid organisation and conversation IDs are required." },
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

    const { data: participant, error: participantError } = await supabase
      .from("chat_participants")
      .select("id")
      .eq("organisation_id", organisationId)
      .eq("conversation_id", conversationId)
      .eq("member_id", membership.id)
      .maybeSingle();

    if (participantError) {
      console.error("Participant verification error:", participantError);

      return NextResponse.json(
        { error: "Unable to verify conversation access." },
        { status: 500 }
      );
    }

    if (!participant) {
      return NextResponse.json(
        { error: "You are not a participant in this conversation." },
        { status: 403 }
      );
    }

    const readAt = new Date().toISOString();

    const { data: updatedParticipant, error: updateError } = await supabase
      .from("chat_participants")
      .update({ last_read_at: readAt })
      .eq("id", participant.id)
      .eq("organisation_id", organisationId)
      .eq("conversation_id", conversationId)
      .eq("member_id", membership.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("Read status update error:", updateError);

      return NextResponse.json(
        { error: "Unable to update conversation read status." },
        { status: 500 }
      );
    }

    if (!updatedParticipant) {
      return NextResponse.json(
        { error: "Conversation read status was not updated." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      last_read_at: readAt,
    });
  } catch (error) {
    console.error("Chat read tracking error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

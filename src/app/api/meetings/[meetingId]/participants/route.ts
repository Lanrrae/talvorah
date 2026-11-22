
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

type RouteContext = {
  params: Promise<{ meetingId: string }>;
};

async function getMeetingAccess(
  meetingId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Authentication required.", status: 401 };
  }

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("id, organisation_id, host_member_id, visibility")
    .eq("id", meetingId)
    .maybeSingle();

  if (meetingError || !meeting) {
    return { error: "Meeting not found or access denied.", status: 404 };
  }

  const { data: requester, error: requesterError } = await supabase
    .from("organisation_members")
    .select("id, role")
    .eq("organisation_id", meeting.organisation_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (requesterError || !requester) {
    return {
      error: "You are not an active member of this organisation.",
      status: 403,
    };
  }

  const isHost = requester.id === meeting.host_member_id;
  const isAdmin = requester.role === "organisation_admin";

  if (!isHost && !isAdmin) {
    const { data: participant } = await supabase
      .from("meeting_participants")
      .select("id")
      .eq("meeting_id", meetingId)
      .eq("organisation_id", meeting.organisation_id)
      .eq("member_id", requester.id)
      .maybeSingle();

    if (!participant) {
      return {
        error: "You do not have access to this meeting.",
        status: 403,
      };
    }
  }

  return {
    meeting,
    requester,
    isHost,
    isAdmin,
  };
}

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { meetingId } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const access = await getMeetingAccess(meetingId, supabase);

    if ("error" in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const { data: participants, error } = await supabase
      .from("meeting_participants")
      .select(
        "id, member_id, participant_role, invitation_status, invited_at, responded_at"
      )
      .eq("meeting_id", meetingId)
      .eq("organisation_id", access.meeting.organisation_id)
      .order("invited_at", { ascending: true });

    if (error) {
      console.error("Meeting participants error:", error);

      return NextResponse.json(
        { error: "Unable to retrieve meeting participants." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      participants: participants ?? [],
    });
  } catch (error) {
    console.error("Get participants error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { meetingId } = await params;
    const body = await request.json();
    const memberIds = body?.memberIds;

    if (
      !Array.isArray(memberIds) ||
      memberIds.length === 0 ||
      memberIds.length > 100 ||
      memberIds.some(
        (id: unknown) => typeof id !== "string" || !id.trim()
      )
    ) {
      return NextResponse.json(
        { error: "Provide between 1 and 100 valid member IDs." },
        { status: 400 }
      );
    }

    const uniqueMemberIds = [...new Set(memberIds)];

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const access = await getMeetingAccess(meetingId, supabase);

    if ("error" in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    if (!access.isHost && !access.isAdmin) {
      return NextResponse.json(
        {
          error:
            "Only the meeting host or organisation admin can invite participants.",
        },
        { status: 403 }
      );
    }

    const { meeting, requester } = access;

    const { data: validMembers, error: membersError } = await supabase
      .from("organisation_members")
      .select("id")
      .eq("organisation_id", meeting.organisation_id)
      .eq("status", "active")
      .in("id", uniqueMemberIds);

    if (membersError) {
      console.error("Participant validation error:", membersError);

      return NextResponse.json(
        { error: "Unable to verify the selected participants." },
        { status: 500 }
      );
    }

    if (!validMembers || validMembers.length !== uniqueMemberIds.length) {
      return NextResponse.json(
        {
          error:
            "One or more selected people are not active members of this organisation.",
        },
        { status: 400 }
      );
    }

    const invitations = uniqueMemberIds
      .filter((memberId) => memberId !== meeting.host_member_id)
      .map((memberId) => ({
        organisation_id: meeting.organisation_id,
        meeting_id: meeting.id,
        member_id: memberId,
        participant_role: "attendee",
        invitation_status: "invited",
        invited_by_member_id: requester.id,
        invited_at: new Date().toISOString(),
      }));

    if (invitations.length === 0) {
      return NextResponse.json(
        {
          error:
            "The meeting host is already registered as a participant.",
        },
        { status: 400 }
      );
    }

    const { error: invitationError } = await supabase
      .from("meeting_participants")
      .upsert(invitations, {
        onConflict: "organisation_id,meeting_id,member_id",
        ignoreDuplicates: true,
      });

    if (invitationError) {
      console.error("Participant invitation error:", invitationError);

      return NextResponse.json(
        { error: "Unable to save the meeting invitations." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        invitedCount: invitations.length,
        message: "Meeting invitations have been saved.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Participant invitation error:", error);

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while inviting participants.",
      },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const meetingId = body?.meetingId;

    if (typeof meetingId !== "string" || !meetingId.trim()) {
      return NextResponse.json(
        { error: "A valid meeting ID is required." },
        { status: 400 }
      );
    }

    const livekitUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !apiKey || !apiSecret) {
      console.error("LiveKit environment variables are missing.");

      return NextResponse.json(
        { error: "Video conferencing is not configured." },
        { status: 500 }
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

    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("id, organisation_id, host_member_id")
      .eq("id", meetingId)
      .maybeSingle();

    if (meetingError || !meeting) {
      return NextResponse.json(
        { error: "Meeting not found or access denied." },
        { status: 404 }
      );
    }

    const { data: member, error: memberError } = await supabase
      .from("organisation_members")
      .select("id, role")
      .eq("organisation_id", meeting.organisation_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "You are not an active member of this organisation." },
        { status: 403 }
      );
    }

    const isHost = member.id === meeting.host_member_id;
    const isAdmin = member.role === "organisation_admin";

    if (!isHost && !isAdmin) {
      const { data: participant, error: participantError } =
        await supabase
          .from("meeting_participants")
          .select("id, invitation_status")
          .eq("meeting_id", meeting.id)
          .eq("organisation_id", meeting.organisation_id)
          .eq("member_id", member.id)
          .maybeSingle();

      if (participantError || !participant) {
        return NextResponse.json(
          { error: "You are not invited to this meeting." },
          { status: 403 }
        );
      }

      if (
        participant.invitation_status &&
        !["accepted", "invited"].includes(participant.invitation_status)
      ) {
        return NextResponse.json(
          { error: "You do not currently have permission to join this meeting." },
          { status: 403 }
        );
      }
    }

    const accessToken = new AccessToken(apiKey, apiSecret, {
      identity: member.id,
      name: user.email ?? member.id,
      ttl: "2h",
    });

    accessToken.addGrant({
      roomJoin: true,
      room: meeting.id,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await accessToken.toJwt();

    return NextResponse.json({
      success: true,
      token,
      serverUrl: livekitUrl,
      roomName: meeting.id,
    });
  } catch (error) {
    console.error("LiveKit token generation error:", error);

    return NextResponse.json(
      { error: "Unable to generate a meeting access token." },
      { status: 500 }
    );
  }
}

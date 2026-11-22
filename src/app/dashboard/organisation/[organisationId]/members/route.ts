
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "../../../../../utils/supabase/server";

type RouteContext = {
  params: Promise<{ organisationId: string }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { organisationId } = await params;
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

    const { data: requester, error: requesterError } = await supabase
      .from("organisation_members")
      .select("id")
      .eq("organisation_id", organisationId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (requesterError || !requester) {
      return NextResponse.json(
        { error: "You are not an active member of this organisation." },
        { status: 403 }
      );
    }

    const { data: members, error: membersError } = await supabase
      .from("organisation_members")
      .select("id, user_id, role, status")
      .eq("organisation_id", organisationId)
      .eq("status", "active");

    if (membersError) {
      console.error("Member directory error:", membersError);
      return NextResponse.json(
        { error: "Unable to retrieve organisation members." },
        { status: 500 }
      );
    }

    const userIds = [...new Set((members ?? []).map((member) => member.user_id))];

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, job_title, avatar_url")
      .in("id", userIds);

    if (profilesError) {
      console.error("Profile lookup error:", profilesError);
      return NextResponse.json(
        { error: "Unable to retrieve employee profiles." },
        { status: 500 }
      );
    }

    const profileMap = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile])
    );

    return NextResponse.json({
      members: (members ?? []).map((member) => ({
        id: member.id,
        userId: member.user_id,
        role: member.role,
        status: member.status,
        profile: profileMap.get(member.user_id) ?? null,
      })),
    });
  } catch (error) {
    console.error("Member directory error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

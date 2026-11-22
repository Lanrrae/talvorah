import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const allowedRoles = ["department_head", "manager", "employee"];

export async function POST(request: Request) {
  try {
    // Verify the logged-in requester.
   const cookieStore = await cookies();
const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to invite employees." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const { email, organisationId, role } = body;

    if (
      !email ||
      typeof email !== "string" ||
      !organisationId ||
      typeof organisationId !== "string" ||
      !role
    ) {
      return NextResponse.json(
        { error: "Email, organisation and role are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "This role cannot be assigned through an invitation." },
        { status: 400 }
      );
    }

    // Confirm the requester is an active organisation administrator.
    const { data: membership, error: membershipError } = await supabase
      .from("organisation_members")
      .select("role")
      .eq("organisation_id", organisationId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (
      membershipError ||
      !membership ||
      membership.role !== "organisation_admin"
    ) {
      return NextResponse.json(
        { error: "Only organisation administrators can invite employees." },
        { status: 403 }
      );
    }

    // Create a server-only Supabase admin client.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase server configuration is missing.");
    }

    const admin = createAdminClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Send the invitation email.
    const { data: invitation, error: invitationError } =
      await admin.auth.admin.inviteUserByEmail(normalizedEmail);

    if (invitationError || !invitation.user) {
      return NextResponse.json(
        {
          error:
            invitationError?.message ||
            "Unable to send the invitation.",
        },
        { status: 400 }
      );
    }

    // Record the invited employee's organisation membership.
    const { error: insertError } = await admin
      .from("organisation_members")
      .insert({
        organisation_id: organisationId,
        user_id: invitation.user.id,
        role,
        status: "invited",
      });

    if (insertError) {
      console.error("Membership creation error:", insertError);

      return NextResponse.json(
        {
          error:
            "The invitation was sent, but membership creation failed. Please contact an administrator.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${normalizedEmail}.`,
    });
  } catch (error) {
    console.error("Invitation API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while sending the invitation." },
      { status: 500 }
    );
  }
}

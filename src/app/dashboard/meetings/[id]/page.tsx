"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Meeting = {
  id: string;
  organisation_id: string;
  room_id: string;
  host_member_id: string;
  title: string;
  description: string | null;
  meeting_type: "scheduled" | "instant";
  visibility: "invited" | "organisation" | "department";
  department_id: string | null;
  meeting_code: string;
  livekit_room_name: string;
  status: "scheduled" | "live" | "completed" | "cancelled";
  scheduled_start: string | null;
  scheduled_end: string | null;
  started_at: string | null;
  ended_at: string | null;
  allow_screen_sharing: boolean;
  allow_recording: boolean;
  waiting_room_enabled: boolean;
  created_at: string;
};

type Participant = {
  id: string;
  organisation_id: string;
  meeting_id: string;
  member_id: string;
  participant_role: "host" | "co_host" | "attendee";
  invitation_status: "invited" | "accepted" | "declined";
  invited_by_member_id: string | null;
  invited_at: string;
  responded_at: string | null;
  full_name: string;
  designation: string | null;
};

type Room = {
  id: string;
  name: string;
  room_type: string;
};

export default function MeetingRoomPage() {
  const params = useParams();
  const supabase = useMemo(() => createClient(), []);
  const meetingId = params.id as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState("");
  const [currentDepartmentId, setCurrentDepartmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  const loadMeeting = useCallback(async () => {
    if (!meetingId) return;

    setLoading(true);
    setError("");

    const { data: meetingData, error: meetingError } = await supabase
      .from("meetings")
      .select(
        "id, organisation_id, room_id, host_member_id, title, description, meeting_type, visibility, department_id, meeting_code, livekit_room_name, status, scheduled_start, scheduled_end, started_at, ended_at, allow_screen_sharing, allow_recording, waiting_room_enabled, created_at"
      )
      .eq("id", meetingId)
      .single();

    if (meetingError || !meetingData) {
      setError(meetingError?.message || "Meeting not found.");
      setLoading(false);
      return;
    }

    const currentMeeting = meetingData as Meeting;
    setMeeting(currentMeeting);

    const [
      roomResult,
      participantResult,
      authResult,
      membershipResult,
    ] = await Promise.all([
      supabase
        .from("meeting_rooms")
        .select("id, name, room_type")
        .eq("id", currentMeeting.room_id)
        .single(),

      supabase
        .from("meeting_participants")
        .select(
          "id, organisation_id, meeting_id, member_id, participant_role, invitation_status, invited_by_member_id, invited_at, responded_at"
        )
        .eq("meeting_id", meetingId),

      supabase.auth.getUser(),

      supabase
        .from("organisation_members")
        .select("id, user_id, designation, department_id")
        .eq("organisation_id", currentMeeting.organisation_id)
        .eq("status", "active"),
    ]);

    if (roomResult.data) {
      setRoom(roomResult.data as Room);
    }

    if (membershipResult.error) {
      setError(membershipResult.error.message);
      setLoading(false);
      return;
    }

    const memberships = membershipResult.data ?? [];
    const authUserId = authResult.data.user?.id;

    const currentMembership = memberships.find(
      (member) => member.user_id === authUserId
    );

    setCurrentMemberId(currentMembership?.id ?? "");
    setCurrentDepartmentId(currentMembership?.department_id ?? null);

    const participantRows = participantResult.data ?? [];
    const memberIds = [
      ...new Set(participantRows.map((item) => item.member_id)),
    ];

    const memberDetails = memberships.filter((member) =>
      memberIds.includes(member.id)
    );

    const userIds = [
      ...new Set(memberDetails.map((member) => member.user_id)),
    ];

    let profiles = new Map<
      string,
      { full_name: string | null; job_title: string | null }
    >();

    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, job_title")
        .in("id", userIds);

      profiles = new Map(
        (profileData ?? []).map((profile) => [
          profile.id,
          {
            full_name: profile.full_name,
            job_title: profile.job_title,
          },
        ])
      );
    }

    const formattedParticipants: Participant[] = participantRows.map(
      (participant) => {
        const member = memberDetails.find(
          (item) => item.id === participant.member_id
        );

        const profile = member
          ? profiles.get(member.user_id)
          : undefined;

        return {
          ...participant,
          full_name:
            profile?.full_name?.trim() ||
            `Employee ${participant.member_id.slice(0, 6)}`,
          designation:
            member?.designation || profile?.job_title || null,
        };
      }
    );

    setParticipants(formattedParticipants);
    setLoading(false);
  }, [meetingId, supabase]);

  useEffect(() => {
    loadMeeting();
  }, [loadMeeting]);

  useEffect(() => {
    if (!meetingId) return;

    const channel = supabase
      .channel(`meeting-room-${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meeting_participants",
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => loadMeeting()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "meetings",
          filter: `id=eq.${meetingId}`,
        },
        () => loadMeeting()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, supabase, loadMeeting]);

  const isHost =
    !!meeting && currentMemberId === meeting.host_member_id;

  const myParticipant = participants.find(
    (participant) => participant.member_id === currentMemberId
  );

  const acceptedParticipants = participants.filter(
    (participant) => participant.invitation_status === "accepted"
  );

  const invitedParticipants = participants.filter(
    (participant) => participant.invitation_status === "invited"
  );

  const declinedParticipants = participants.filter(
    (participant) => participant.invitation_status === "declined"
  );

  const isDepartmentMember =
    !!meeting?.department_id &&
    currentDepartmentId === meeting.department_id;

  const canAccess =
    meeting?.visibility === "organisation" ||
    (meeting?.visibility === "department" && isDepartmentMember) ||
    !!myParticipant ||
    isHost;

  async function respondToInvitation(
    response: "accepted" | "declined"
  ) {
    if (!meeting || !currentMemberId || !myParticipant) return;

    setWorking(true);
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("meeting_participants")
      .update({
        invitation_status: response,
        responded_at: new Date().toISOString(),
      })
      .eq("id", myParticipant.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(
        response === "accepted"
          ? "You accepted the meeting invitation."
          : "You declined the meeting invitation."
      );
      await loadMeeting();
    }

    setWorking(false);
  }

  async function joinMeeting() {
    if (!meeting || !currentMemberId) return;

    const canSelfJoin =
      meeting.visibility === "organisation" ||
      (meeting.visibility === "department" && isDepartmentMember);

    if (!canSelfJoin || meeting.status !== "live" || myParticipant) return;

    setWorking(true);
    setError("");
    setSuccess("");

    const { error: insertError } = await supabase
      .from("meeting_participants")
      .insert({
        organisation_id: meeting.organisation_id,
        meeting_id: meeting.id,
        member_id: currentMemberId,
        participant_role: "attendee",
        invitation_status: "accepted",
        invited_by_member_id: meeting.host_member_id,
        responded_at: new Date().toISOString(),
      });

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess("You have joined the meeting.");
      await loadMeeting();
    }

    setWorking(false);
  }

  async function startMeeting() {
    if (!meeting || !isHost) return;

    setWorking(true);
    setError("");

    const { error: updateError } = await supabase
      .from("meetings")
      .update({
        status: "live",
        started_at: new Date().toISOString(),
      })
      .eq("id", meeting.id)
      .eq("host_member_id", currentMemberId)
      .eq("status", "scheduled");

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess("Meeting started.");
      await loadMeeting();
    }

    setWorking(false);
  }

  async function endMeeting() {
    if (!meeting || !isHost) return;

    const confirmed = window.confirm(
      "Are you sure you want to end this meeting for everyone?"
    );

    if (!confirmed) return;

    setWorking(true);
    setError("");

    const { error: updateError } = await supabase
      .from("meetings")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
      })
      .eq("id", meeting.id)
      .eq("host_member_id", currentMemberId)
      .eq("status", "live");

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess("Meeting ended.");
      await loadMeeting();
    }

    setWorking(false);
  }

  async function cancelMeeting() {
    if (!meeting || !isHost) return;

    const confirmed = window.confirm(
      "Cancel this scheduled meeting?"
    );

    if (!confirmed) return;

    setWorking(true);
    setError("");

    const { error: updateError } = await supabase
      .from("meetings")
      .update({ status: "cancelled" })
      .eq("id", meeting.id)
      .eq("host_member_id", currentMemberId)
      .eq("status", "scheduled");

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess("Meeting cancelled.");
      await loadMeeting();
    }

    setWorking(false);
  }

  async function copyMeetingCode() {
    if (!meeting) return;

    try {
      await navigator.clipboard.writeText(meeting.meeting_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the meeting code.");
    }
  }

  async function copyInvitationLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the invitation link.");
    }
  }

  function statusClass(status: Meeting["status"]) {
    switch (status) {
      case "live":
        return "bg-emerald-100 text-emerald-700";
      case "scheduled":
        return "bg-blue-100 text-blue-700";
      case "completed":
        return "bg-slate-100 text-slate-600";
      case "cancelled":
        return "bg-red-100 text-red-700";
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading meeting room...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Meeting unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {error || "This meeting could not be found."}
          </p>
          <Link
            href="/dashboard/meetings"
            className="mt-5 inline-block rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
          >
            Back to meetings
          </Link>
        </div>
      </div>
    );
  }

  if (!currentMemberId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Organisation membership required
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Your account does not currently have an active employee
            membership in this organisation. You need an organisation
            membership to join this meeting.
          </p>
          <Link
            href="/dashboard/meetings"
            className="mt-5 inline-block rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
          >
            Back to meetings
          </Link>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="text-3xl">🔒</div>
          <h1 className="mt-3 text-xl font-bold text-slate-900">
            Invitation required
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {meeting.visibility === "department"
              ? "This meeting is restricted to members of its assigned department."
              : "This meeting is restricted to invited participants."}
          </p>
          <Link
            href="/dashboard/meetings"
            className="mt-5 inline-block rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
          >
            Back to meetings
          </Link>
        </div>
      </div>
    );
  }

  const invitationPending =
    myParticipant?.invitation_status === "invited";

  const invitationDeclined =
    myParticipant?.invitation_status === "declined";

  const hasJoined =
    myParticipant?.invitation_status === "accepted";

  const canEnter =
    hasJoined ||
    ((meeting.visibility === "organisation" ||
      (meeting.visibility === "department" && isDepartmentMember)) &&
      !myParticipant);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard/meetings"
            className="text-sm font-medium text-slate-500 hover:text-emerald-700"
          >
            ← Back to meetings
          </Link>

          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${statusClass(
              meeting.status
            )}`}
          >
            {meeting.status}
          </span>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <main className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-[#102b32] px-6 py-10 text-white sm:px-9">
                <p className="text-sm font-medium text-emerald-300">
                  TALVORAH MEETING ROOM
                </p>

                <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  {meeting.title}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  {meeting.description ||
                    "Welcome to your Talvorah meeting."}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white">
                    {meeting.meeting_type === "instant"
                      ? "Instant meeting"
                      : "Scheduled meeting"}
                  </span>

                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white">
                    {meeting.visibility === "organisation"
                      ? "Organisation-wide"
                      : meeting.visibility === "department"
                        ? "Department-only"
                        : "Invited participants"}
                  </span>

                  {room && (
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white">
                      {room.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Meeting date
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {meeting.scheduled_start
                      ? new Date(meeting.scheduled_start).toLocaleDateString(
                          [],
                          { dateStyle: "full" }
                        )
                      : "Not scheduled"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Start time
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {meeting.scheduled_start
                      ? new Date(meeting.scheduled_start).toLocaleTimeString(
                          [],
                          { hour: "2-digit", minute: "2-digit" }
                        )
                      : "Not scheduled"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Host
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {participants.find(
                      (participant) =>
                        participant.member_id === meeting.host_member_id
                    )?.full_name || "Meeting host"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Participants
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {acceptedParticipants.length} accepted
                  </p>
                </div>
              </div>
            </section>

            {invitationPending && (
              <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
                <h2 className="font-semibold text-blue-900">
                  You have been invited
                </h2>
                <p className="mt-2 text-sm text-blue-800">
                  Please respond to this meeting invitation.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    disabled={working}
                    onClick={() => respondToInvitation("accepted")}
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Accept invitation
                  </button>

                  <button
                    disabled={working}
                    onClick={() => respondToInvitation("declined")}
                    className="rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </section>
            )}

            {invitationDeclined && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="font-semibold text-amber-900">
                  You declined this invitation
                </h2>
                <p className="mt-2 text-sm text-amber-800">
                  Contact the meeting host if you need to change your response.
                </p>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Meeting access
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {meeting.status === "live"
                  ? "This meeting is currently live."
                  : meeting.status === "scheduled"
                    ? "This meeting has not started yet."
                    : meeting.status === "completed"
                      ? "This meeting has ended."
                      : "This meeting has been cancelled."}
              </p>

              {meeting.status === "scheduled" && isHost && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={startMeeting}
                    disabled={working}
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {working ? "Please wait..." : "Start meeting"}
                  </button>

                  <button
                    onClick={cancelMeeting}
                    disabled={working}
                    className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Cancel meeting
                  </button>
                </div>
              )}

              {meeting.status === "live" && canEnter && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-semibold text-emerald-800">
                    {hasJoined
                      ? "You are registered as a participant."
                      : meeting.visibility === "department"
                        ? "You can join this department meeting."
                        : "You can join this organisation-wide meeting."}
                  </p>

                  <p className="mt-1 text-sm text-emerald-700">
                    The meeting's live audio/video connection will be
                    activated when the LiveKit room integration is connected.
                  </p>

                  {!hasJoined && (
                    <button
                      onClick={joinMeeting}
                      disabled={working}
                      className="mt-4 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {working ? "Joining..." : "Join meeting"}
                    </button>
                  )}
                </div>
              )}

              {meeting.status === "live" && isHost && (
                <button
                  onClick={endMeeting}
                  disabled={working}
                  className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  End meeting for everyone
                </button>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Meeting invitation
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Share the meeting code or invitation link.
                  </p>
                </div>

                <button
                  onClick={copyInvitationLink}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Copy invitation link
                </button>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
                <div>
                  <p className="text-xs text-slate-500">Meeting code</p>
                  <p className="mt-1 font-mono text-xl font-bold tracking-widest text-slate-900">
                    {meeting.meeting_code}
                  </p>
                </div>

                <button
                  onClick={copyMeetingCode}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
                >
                  {copied ? "Copied!" : "Copy code"}
                </button>
              </div>
            </section>
          </main>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900">Participants</h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {acceptedParticipants.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {participants.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No participants have been added yet.
                  </p>
                ) : (
                  participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 font-semibold text-emerald-700">
                        {participant.full_name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {participant.full_name}
                          {participant.member_id === currentMemberId &&
                            " (You)"}
                        </p>
                        <p className="text-xs capitalize text-slate-500">
                          {participant.participant_role.replace("_", " ")}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                          participant.invitation_status === "accepted"
                            ? "bg-emerald-50 text-emerald-700"
                            : participant.invitation_status === "declined"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {participant.invitation_status}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {invitedParticipants.length}
                  </p>
                  <p className="text-xs text-slate-500">Awaiting response</p>
                </div>

                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {declinedParticipants.length}
                  </p>
                  <p className="text-xs text-slate-500">Declined</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-slate-900">
                Meeting settings
              </h2>

              <div className="mt-4 space-y-4">
                {[
                  {
                    label: "Screen sharing",
                    enabled: meeting.allow_screen_sharing,
                  },
                  {
                    label: "Recording",
                    enabled: meeting.allow_recording,
                  },
                  {
                    label: "Waiting room",
                    enabled: meeting.waiting_room_enabled,
                  },
                ].map((setting) => (
                  <div
                    key={setting.label}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm text-slate-600">
                      {setting.label}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        setting.enabled
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {setting.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <button
              onClick={loadMeeting}
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Refresh meeting
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

type Meeting = {
  id: string;
  room_id: string;
  department_id: string | null;
  host_member_id: string;
  title: string;
  description: string | null;
  meeting_type: "scheduled" | "instant";
  visibility: "invited" | "organisation" | "department";
  status: "scheduled" | "live" | "completed" | "cancelled";
  meeting_code: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

type Room = {
  id: string;
  name: string;
  description: string | null;
  room_type: "organisation" | "department" | "project";
  department_id: string | null;
  project_id: string | null;
  is_active: boolean;
};

type Member = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  department_id: string | null;
  designation: string | null;
  full_name: string;
  job_title: string | null;
};

type Filter = "all" | "live" | "scheduled" | "completed" | "cancelled";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

function makeCode(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(length);

  crypto.getRandomValues(values);

  return Array.from(values, (value) => chars[value % chars.length]).join("");
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";

  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClasses(status: Meeting["status"]) {
  switch (status) {
    case "live":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "scheduled":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "completed":
      return "border-slate-200 bg-slate-100 text-slate-600";
    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700";
  }
}

export default function MeetingsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [organisationId, setOrganisationId] = useState("");
  const [currentMemberId, setCurrentMemberId] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingType, setMeetingType] =
    useState<"scheduled" | "instant">("scheduled");
  const [visibility, setVisibility] =
    useState<"invited" | "organisation" | "department">("invited");
  const [roomId, setRoomId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [allowScreenSharing, setAllowScreenSharing] = useState(true);
  const [allowRecording, setAllowRecording] = useState(false);
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(true);

  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomType, setNewRoomType] =
    useState<"organisation" | "department">("organisation");
  const [newRoomDepartment, setNewRoomDepartment] = useState("");
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);

  const loadMeetings = useCallback(async () => {
    if (!organisationId) {
      setMeetings([]);
      setRooms([]);
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const [
      meetingResult,
      roomResult,
      memberResult,
      departmentResult,
      authResult,
    ] = await Promise.all([
      supabase
        .from("meetings")
        .select(
          "id, room_id, department_id, host_member_id, title, description, meeting_type, visibility, status, meeting_code, scheduled_start, scheduled_end, started_at, ended_at, created_at"
        )
        .eq("organisation_id", organisationId)
        .order("created_at", { ascending: false }),

      supabase
        .from("meeting_rooms")
        .select(
          "id, name, description, room_type, department_id, project_id, is_active"
        )
        .eq("organisation_id", organisationId)
        .eq("is_active", true)
        .order("name"),

      supabase
        .from("organisation_members")
        .select(
          "id, user_id, role, status, department_id, designation"
        )
        .eq("organisation_id", organisationId)
        .eq("status", "active"),

      supabase
        .from("departments")
        .select("id, name")
        .eq("organisation_id", organisationId)
        .order("name"),

      supabase.auth.getUser(),
    ]);

    if (meetingResult.error) {
      setError(meetingResult.error.message);
      setMeetings([]);
    } else {
      setMeetings((meetingResult.data ?? []) as Meeting[]);
    }

    if (roomResult.error) {
      setError((previous) =>
        previous || `Could not load meeting rooms: ${roomResult.error.message}`
      );
    } else {
      setRooms((roomResult.data ?? []) as Room[]);
    }

    if (departmentResult.error) {
      setError((previous) =>
        previous ||
        `Could not load departments: ${departmentResult.error.message}`
      );
    } else {
      setDepartments(departmentResult.data ?? []);
    }

    if (memberResult.error) {
      setError((previous) =>
        previous ||
        `Could not load employees: ${memberResult.error.message}`
      );
      setMembers([]);
    } else {
      const activeMembers = memberResult.data ?? [];
      const userIds = [
        ...new Set(activeMembers.map((member) => member.user_id)),
      ];

      let profileMap = new Map<
        string,
        { full_name: string | null; job_title: string | null }
      >();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, job_title")
          .in("id", userIds);

        profileMap = new Map(
          (profiles ?? []).map((profile) => [
            profile.id,
            {
              full_name: profile.full_name,
              job_title: profile.job_title,
            },
          ])
        );
      }

      const formattedMembers: Member[] = activeMembers.map((member) => {
        const profile = profileMap.get(member.user_id);

        return {
          ...member,
          full_name:
            profile?.full_name?.trim() ||
            `Employee ${member.id.slice(0, 6)}`,
          job_title: profile?.job_title ?? null,
        };
      });

      setMembers(formattedMembers);

      const currentUserId = authResult.data.user?.id;

      const currentMember = formattedMembers.find(
        (member) => member.user_id === currentUserId
      );

      setCurrentMemberId(currentMember?.id ?? "");
    }

    setLoading(false);
  }, [organisationId, supabase]);

  useEffect(() => {
    const readOrganisation = () => {
      const selected = localStorage.getItem("talvorah_organisation_id");
      setOrganisationId(selected ?? "");
    };

    readOrganisation();

    window.addEventListener(
      "talvorah:organisation-changed",
      readOrganisation
    );

    window.addEventListener("storage", readOrganisation);

    return () => {
      window.removeEventListener(
        "talvorah:organisation-changed",
        readOrganisation
      );
      window.removeEventListener("storage", readOrganisation);
    };
  }, []);

  useEffect(() => {
    if (organisationId) {
      loadMeetings();
    } else {
      setLoading(false);
    }
  }, [organisationId, loadMeetings]);

  const counts = {
    all: meetings.length,
    live: meetings.filter((meeting) => meeting.status === "live").length,
    scheduled: meetings.filter((meeting) => meeting.status === "scheduled")
      .length,
    completed: meetings.filter((meeting) => meeting.status === "completed")
      .length,
    cancelled: meetings.filter((meeting) => meeting.status === "cancelled")
      .length,
  };

  const filteredMeetings = meetings.filter((meeting) => {
    const term = search.toLowerCase();

    const matchesSearch =
      meeting.title.toLowerCase().includes(term) ||
      (meeting.description ?? "").toLowerCase().includes(term) ||
      meeting.meeting_code.toLowerCase().includes(term);

    const matchesFilter =
      filter === "all" || meeting.status === filter;

    return matchesSearch && matchesFilter;
  });

  function resetForm() {
    setTitle("");
    setDescription("");
    setMeetingType("scheduled");
    setVisibility("invited");
    setRoomId("");
    setSelectedDepartmentId("");
    setScheduledStart("");
    setScheduledEnd("");
    setSelectedMembers([]);
    setAllowScreenSharing(true);
    setAllowRecording(false);
    setWaitingRoomEnabled(true);
  }

  function toggleMember(memberId: string) {
    setSelectedMembers((previous) =>
      previous.includes(memberId)
        ? previous.filter((id) => id !== memberId)
        : [...previous, memberId]
    );
  }

  async function createMeeting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!organisationId) {
      setError("Select an organisation first.");
      return;
    }

    if (!currentMemberId) {
      setError(
        "Your account does not have an active employee membership in this organisation. A host membership is required to create a meeting."
      );
      return;
    }

    if (!title.trim()) {
      setError("Enter a meeting title.");
      return;
    }

    if (!roomId) {
      setError("Select a meeting room.");
      return;
    }

    if (visibility === "department" && !selectedDepartmentId) {
      setError("Select the department whose members can access this meeting.");
      return;
    }

    if (
      visibility === "department" &&
      !departments.some((department) => department.id === selectedDepartmentId)
    ) {
      setError("The selected department is not available in this organisation.");
      return;
    }

    if (meetingType === "scheduled" && !scheduledStart) {
      setError("Choose a date and time for the meeting.");
      return;
    }

    if (
      meetingType === "scheduled" &&
      scheduledEnd &&
      new Date(scheduledEnd) <= new Date(scheduledStart)
    ) {
      setError("The meeting end time must be later than its start time.");
      return;
    }

    setCreating(true);

    const meetingCode = makeCode(8);
    const livekitRoomName = `talvorah-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const isInstant = meetingType === "instant";

    const payload = {
      organisation_id: organisationId,
      room_id: roomId,
      host_member_id: currentMemberId,
      title: title.trim(),
      description: description.trim() || null,
      meeting_type: meetingType,
      visibility,
      department_id: visibility === "department" ? selectedDepartmentId : null,
      meeting_code: meetingCode,
      livekit_room_name: livekitRoomName,
      status: isInstant ? "live" : "scheduled",
      scheduled_start: isInstant ? now : new Date(scheduledStart).toISOString(),
      scheduled_end:
        !isInstant && scheduledEnd
          ? new Date(scheduledEnd).toISOString()
          : null,
      started_at: isInstant ? now : null,
      ended_at: null,
      allow_screen_sharing: allowScreenSharing,
      allow_recording: allowRecording,
      waiting_room_enabled: waitingRoomEnabled,
    };

    const { data: meeting, error: insertError } = await supabase
      .from("meetings")
      .insert(payload)
      .select("id")
      .single();

    if (insertError || !meeting) {
      setError(insertError?.message || "The meeting could not be created.");
      setCreating(false);
      return;
    }

    const { error: auditError } = await supabase.rpc("write_audit_log", {
      p_organisation_id: organisationId,
      p_category: "meeting",
      p_action: isInstant ? "meeting_started" : "meeting_scheduled",
      p_title: isInstant
        ? `Instant meeting started: ${title.trim()}`
        : `Meeting scheduled: ${title.trim()}`,
      p_description: description.trim() || null,
      p_entity_type: "meeting",
      p_entity_id: meeting.id,
      p_actor_member_id: currentMemberId,
      p_acting_as: "organisation_member",
      p_before_data: null,
      p_after_data: {
        title: title.trim(),
        meeting_type: meetingType,
        visibility,
        department_id: payload.department_id,
        status: isInstant ? "live" : "scheduled",
        room_id: roomId,
        scheduled_start: payload.scheduled_start,
        scheduled_end: payload.scheduled_end,
        allow_screen_sharing: allowScreenSharing,
        allow_recording: allowRecording,
        waiting_room_enabled: waitingRoomEnabled,
        invited_member_ids: selectedMembers,
      },
      p_metadata: {
        meeting_code: meetingCode,
        invited_participant_count: selectedMembers.length,
      },
    });

    if (auditError) {
      console.error("Meeting audit log failed:", auditError.message);
    }

    const participantIds = [
      ...new Set([
        currentMemberId,
        ...(visibility === "invited" ? selectedMembers : []),
      ]),
    ];

    const participantRows = participantIds.map((memberId) => ({
      organisation_id: organisationId,
      meeting_id: meeting.id,
      member_id: memberId,
      participant_role:
        memberId === currentMemberId ? "host" : "attendee",
      invitation_status:
        memberId === currentMemberId || visibility === "organisation"
          ? "accepted"
          : "invited",
      invited_by_member_id: currentMemberId,
      responded_at:
        memberId === currentMemberId || visibility === "organisation"
          ? now
          : null,
    }));

    const { error: participantError } = await supabase
      .from("meeting_participants")
      .insert(participantRows);

    if (participantError) {
      setError(
        `The meeting was created, but its participant records could not be saved: ${participantError.message}`
      );
      setCreating(false);
      await loadMeetings();
      return;
    }

    setSuccess(
      isInstant
        ? "Your instant meeting has been created."
        : "Your meeting has been scheduled."
    );

    resetForm();
    setShowCreate(false);
    setCreating(false);

    await loadMeetings();
  }

  async function createRoom() {
    setError("");
    setSuccess("");

    if (!currentMemberId) {
      setError(
        "An active organisation membership is required to create a room."
      );
      return;
    }

    if (!newRoomName.trim()) {
      setError("Enter a room name.");
      return;
    }

    if (newRoomType === "department" && !newRoomDepartment) {
      setError("Select the department for this room.");
      return;
    }

    const roomPayload = {
      organisation_id: organisationId,
      name: newRoomName.trim(),
      description: newRoomDescription.trim() || null,
      room_type: newRoomType,
      department_id:
        newRoomType === "department" ? newRoomDepartment : null,
      project_id: null,
      created_by_member_id: currentMemberId,
      is_active: true,
    };

    const { data, error: roomError } = await supabase
      .from("meeting_rooms")
      .insert(roomPayload)
      .select(
        "id, name, description, room_type, department_id, project_id, is_active"
      )
      .single();

    if (roomError || !data) {
      setError(roomError?.message || "Could not create the meeting room.");
      return;
    }

    const { error: auditError } = await supabase.rpc("write_audit_log", {
      p_organisation_id: organisationId,
      p_category: "meeting",
      p_action: "meeting_room_created",
      p_title: `Meeting room created: ${data.name}`,
      p_description: data.description,
      p_entity_type: "meeting_room",
      p_entity_id: data.id,
      p_actor_member_id: currentMemberId,
      p_acting_as: "organisation_member",
      p_before_data: null,
      p_after_data: {
        name: data.name,
        description: data.description,
        room_type: data.room_type,
        department_id: data.department_id,
        project_id: data.project_id,
        is_active: data.is_active,
      },
      p_metadata: {},
    });

    if (auditError) {
      console.error("Meeting room audit log failed:", auditError.message);
    }

    setRooms((previous) => [...previous, data as Room]);
    setRoomId(data.id);
    setNewRoomName("");
    setNewRoomDescription("");
    setNewRoomDepartment("");
    setNewRoomType("organisation");
    setShowRoomForm(false);
    setSuccess("Meeting room created.");
  }

  const stats = [
    { label: "Total meetings", value: counts.all, icon: "▦" },
    { label: "Live now", value: counts.live, icon: "●" },
    { label: "Scheduled", value: counts.scheduled, icon: "◷" },
    { label: "Completed", value: counts.completed, icon: "✓" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-emerald-700">
              Talvorah Workspace
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Meetings
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Schedule meetings, invite colleagues and manage your sessions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setError("");
                setSuccess("");
                setShowCreate(true);
              }}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              + Create meeting
            </button>

            <button
              onClick={loadMeetings}
              disabled={loading || !organisationId}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>
        </div>

        <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{item.label}</p>
                <span className="text-lg text-emerald-600">{item.icon}</span>
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {item.value}
              </p>
            </div>
          ))}
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

        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All meetings"],
                ["live", "Live"],
                ["scheduled", "Scheduled"],
                ["completed", "Completed"],
                ["cancelled", "Cancelled"],
              ] as [Filter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  filter === value
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
                <span className="ml-2 opacity-75">
                  {counts[value]}
                </span>
              </button>
            ))}
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search meetings..."
            className={`${inputClass} lg:max-w-xs`}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold text-slate-900">
                Meeting activity
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Meetings belonging to your selected organisation
              </p>
            </div>
            <span className="text-xs text-slate-400">
              {filteredMeetings.length} result(s)
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading meetings...
            </div>
          ) : !organisationId ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Select an organisation to view its meetings.
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700">
                ◷
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                No meetings found
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                {meetings.length === 0
                  ? "Your organisation does not have any meetings yet. Create one to get started."
                  : "No meetings match your search or selected filter."}
              </p>
              {meetings.length === 0 && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Create your first meeting
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredMeetings.map((meeting) => {
                const room = rooms.find(
                  (item) => item.id === meeting.room_id
                );

                return (
                  <div
                    key={meeting.id}
                    className="flex flex-col justify-between gap-4 px-5 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-700">
                        ◷
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-900">
                            {meeting.title}
                          </h3>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize ${statusClasses(
                              meeting.status
                            )}`}
                          >
                            {meeting.status}
                          </span>
                        </div>

                        <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                          {meeting.description || "No description provided"}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>
                            {meeting.meeting_type === "instant"
                              ? "Instant meeting"
                              : "Scheduled meeting"}
                          </span>
                          <span>
                            {formatDate(
                              meeting.scheduled_start ?? meeting.created_at
                            )}
                          </span>
                          <span>
                            {room?.name || "Meeting room"}
                          </span>
                          <span>
                            {meeting.visibility === "organisation"
                              ? "Organisation-wide"
                              : meeting.visibility === "department"
                                ? `Department-only · ${departments.find((department) => department.id === meeting.department_id)?.name || "Selected department"}`
                                : "Invited participants"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {meeting.status === "live" && (
                        <Link
                          href={`/dashboard/meetings/${meeting.id}`}
                          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Join meeting
                        </Link>
                      )}

                      {meeting.status === "scheduled" && (
                        <Link
                          href={`/dashboard/meetings/${meeting.id}`}
                          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          View meeting
                        </Link>
                      )}

                      {meeting.status === "completed" && (
                        <span className="text-xs text-slate-400">
                          Meeting ended
                        </span>
                      )}

                      {meeting.status === "cancelled" && (
                        <span className="text-xs text-red-600">
                          Cancelled
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 sm:items-center">
            <div className="my-6 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Create a meeting
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Set up an instant or scheduled meeting.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={createMeeting} className="space-y-5 p-6">
                <div>
                  <label className={labelClass}>Meeting title *</label>
                  <input
                    required
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. ICT Department Weekly Meeting"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="What is this meeting about?"
                    rows={3}
                    className={inputClass}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Meeting type</label>
                    <select
                      value={meetingType}
                      onChange={(event) =>
                        setMeetingType(
                          event.target.value as "scheduled" | "instant"
                        )
                      }
                      className={inputClass}
                    >
                      <option value="scheduled">Schedule for later</option>
                      <option value="instant">Start instantly</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Who can join?</label>
                    <select
                      value={visibility}
                      onChange={(event) => {
                        const nextVisibility = event.target.value as
                          | "invited"
                          | "organisation"
                          | "department";
                        setVisibility(nextVisibility);
                        if (nextVisibility !== "invited") setSelectedMembers([]);
                        if (nextVisibility !== "department") setSelectedDepartmentId("");
                      }}
                      className={inputClass}
                    >
                      <option value="invited">Invited participants only</option>
                      <option value="organisation">
                        Everyone in organisation
                      </option>
                      <option value="department">
                        Members of a department
                      </option>
                    </select>
                  </div>
                </div>

                {visibility === "department" && (
                  <div>
                    <label className={labelClass}>Department *</label>
                    <select
                      required
                      value={selectedDepartmentId}
                      onChange={(event) => setSelectedDepartmentId(event.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select department</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Every active member of this department will be able to see the meeting. They do not need an individual invitation.
                    </p>
                    {departments.length === 0 && (
                      <p className="mt-2 text-xs text-amber-700">
                        No departments are available in this organisation.
                      </p>
                    )}
                  </div>
                )}

                {meetingType === "scheduled" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Start date and time *</label>
                      <input
                        required
                        type="datetime-local"
                        value={scheduledStart}
                        onChange={(event) =>
                          setScheduledStart(event.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>End date and time</label>
                      <input
                        type="datetime-local"
                        min={scheduledStart || undefined}
                        value={scheduledEnd}
                        onChange={(event) =>
                          setScheduledEnd(event.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-slate-700">
                      Meeting room *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowRoomForm((value) => !value)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      {showRoomForm ? "Close room form" : "+ Create room"}
                    </button>
                  </div>

                  <select
                    required
                    value={roomId}
                    onChange={(event) => setRoomId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select a meeting room</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name} ({room.room_type})
                      </option>
                    ))}
                  </select>

                  {rooms.length === 0 && (
                    <p className="mt-2 text-xs text-amber-700">
                      No active meeting rooms exist yet. Create one before
                      scheduling a meeting.
                    </p>
                  )}

                  {showRoomForm && (
                    <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="text-sm font-semibold text-slate-800">
                        New meeting room
                      </h3>

                      <input
                        required
                        value={newRoomName}
                        onChange={(event) =>
                          setNewRoomName(event.target.value)
                        }
                        placeholder="Room name"
                        className={inputClass}
                      />

                      <textarea
                        value={newRoomDescription}
                        onChange={(event) =>
                          setNewRoomDescription(event.target.value)
                        }
                        placeholder="Room description (optional)"
                        rows={2}
                        className={inputClass}
                      />

                      <select
                        value={newRoomType}
                        onChange={(event) =>
                          setNewRoomType(
                            event.target.value as
                              | "organisation"
                              | "department"
                          )
                        }
                        className={inputClass}
                      >
                        <option value="organisation">
                          Organisation room
                        </option>
                        <option value="department">Department room</option>
                      </select>

                      {newRoomType === "department" && (
                        <select
                          required
                          value={newRoomDepartment}
                          onChange={(event) =>
                            setNewRoomDepartment(event.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="">Select department</option>
                          {departments.map((department) => (
                            <option
                              key={department.id}
                              value={department.id}
                            >
                              {department.name}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        type="button"
                        onClick={createRoom}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        Save meeting room
                      </button>
                    </div>
                  )}
                </div>

                {visibility === "invited" && (
                  <div>
                    <label className={labelClass}>
                      Invite participants
                    </label>
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-3">
                      {members.filter(
                        (member) => member.id !== currentMemberId
                      ).length === 0 ? (
                        <p className="p-2 text-sm text-slate-500">
                          No other active employees found.
                        </p>
                      ) : (
                        members
                          .filter(
                            (member) => member.id !== currentMemberId
                          )
                          .map((member) => (
                            <label
                              key={member.id}
                              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                checked={selectedMembers.includes(member.id)}
                                onChange={() => toggleMember(member.id)}
                                className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-medium text-slate-800">
                                  {member.full_name}
                                </span>
                                <span className="block text-xs text-slate-500">
                                  {member.designation ||
                                    member.job_title ||
                                    member.role}
                                </span>
                              </span>
                            </label>
                          ))
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">
                      You will automatically be added as the host.
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-slate-800">
                    Meeting settings
                  </h3>

                  <div className="space-y-3">
                    <label className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-700">
                        Allow screen sharing
                      </span>
                      <input
                        type="checkbox"
                        checked={allowScreenSharing}
                        onChange={(event) =>
                          setAllowScreenSharing(event.target.checked)
                        }
                        className="h-4 w-4 accent-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-700">
                        Allow recording
                      </span>
                      <input
                        type="checkbox"
                        checked={allowRecording}
                        onChange={(event) =>
                          setAllowRecording(event.target.checked)
                        }
                        className="h-4 w-4 accent-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-700">
                        Enable waiting room
                      </span>
                      <input
                        type="checkbox"
                        checked={waitingRoomEnabled}
                        onChange={(event) =>
                          setWaitingRoomEnabled(event.target.checked)
                        }
                        className="h-4 w-4 accent-emerald-600"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreate(false);
                      resetForm();
                    }}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !currentMemberId || rooms.length === 0}
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creating
                      ? "Creating..."
                      : meetingType === "instant"
                        ? "Create instant meeting"
                        : "Schedule meeting"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
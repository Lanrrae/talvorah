
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

type Meeting = {
  id: string;
  title: string;
  description: string | null;
  meeting_type: "scheduled" | "instant";
  visibility: "invited" | "organisation";
  status: "scheduled" | "live" | "completed" | "cancelled";
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  meeting_code: string | null;
  created_at: string;
};

type Filter = "all" | "live" | "scheduled" | "completed";

export default function MeetingsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [organisationId, setOrganisationId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMeetings = useCallback(async () => {
    if (!organisationId) return;

    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("meetings")
      .select(
        "id, title, description, meeting_type, visibility, status, scheduled_at, started_at, ended_at, meeting_code, created_at"
      )
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setMeetings([]);
    } else {
      setMeetings((data ?? []) as Meeting[]);
    }

    setLoading(false);
  }, [organisationId, supabase]);

  useEffect(() => {
    const savedOrganisation = localStorage.getItem(
      "talvorah_organisation_id"
    );

    if (savedOrganisation) {
      setOrganisationId(savedOrganisation);
    } else {
      setLoading(false);
      setError("Select an organisation to view its meetings.");
    }

    const handleOrganisationChange = () => {
      const selected = localStorage.getItem("talvorah_organisation_id");
      setOrganisationId(selected ?? "");
    };

    window.addEventListener(
      "talvorah-organisation-changed",
      handleOrganisationChange
    );

    window.addEventListener("storage", handleOrganisationChange);

    return () => {
      window.removeEventListener(
        "talvorah-organisation-changed",
        handleOrganisationChange
      );
      window.removeEventListener("storage", handleOrganisationChange);
    };
  }, []);

  useEffect(() => {
    if (organisationId) loadMeetings();
  }, [organisationId, loadMeetings]);

  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch =
      meeting.title.toLowerCase().includes(search.toLowerCase()) ||
      (meeting.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (meeting.meeting_code ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "live" && meeting.status === "live") ||
      (filter === "scheduled" && meeting.status === "scheduled") ||
      (filter === "completed" && meeting.status === "completed");

    return matchesSearch && matchesFilter;
  });

  const counts = {
    all: meetings.length,
    live: meetings.filter((meeting) => meeting.status === "live").length,
    scheduled: meetings.filter((meeting) => meeting.status === "scheduled").length,
    completed: meetings.filter((meeting) => meeting.status === "completed").length,
  };

  function formatDate(value: string | null) {
    if (!value) return "Not scheduled";

    return new Date(value).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function statusStyle(status: Meeting["status"]) {
    switch (status) {
      case "live":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "scheduled":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "completed":
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
      default:
        return "bg-red-500/10 text-red-400 border-red-500/20";
    }
  }

  return (
    <div className="min-h-screen bg-[#09090f] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm text-purple-400">Talvorah Workspace</p>
            <h1 className="text-3xl font-semibold tracking-tight">Meetings</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Host meetings, collaborate with your team and manage sessions.
            </p>
          </div>

          <button
            onClick={loadMeetings}
            disabled={loading || !organisationId}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium transition hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total meetings", value: counts.all },
            { label: "Live now", value: counts.live },
            { label: "Scheduled", value: counts.scheduled },
            { label: "Completed", value: counts.completed },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/[0.08] bg-[#11111a] p-5"
            >
              <p className="text-sm text-zinc-400">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All meetings"],
                ["live", "Live"],
                ["scheduled", "Scheduled"],
                ["completed", "Completed"],
              ] as [Filter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  filter === value
                    ? "bg-purple-600 text-white"
                    : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.08]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search meetings..."
            className="w-full rounded-xl border border-white/10 bg-[#11111a] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple-500 lg:max-w-xs"
          />
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#11111a]">
          <div className="border-b border-white/[0.08] px-5 py-4">
            <h2 className="font-semibold">Meeting activity</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Meetings belonging to your selected organisation
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-zinc-400">
              Loading meetings...
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-2xl">
                ◷
              </div>
              <h3 className="text-lg font-semibold">No meetings found</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
                {meetings.length === 0
                  ? "Your organisation does not have any meetings yet."
                  : "No meetings match your search or selected filter."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {filteredMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex flex-col justify-between gap-4 px-5 py-5 transition hover:bg-white/[0.025] sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-lg text-purple-300">
                      ◷
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-medium">{meeting.title}</h3>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-medium capitalize ${statusStyle(
                            meeting.status
                          )}`}
                        >
                          {meeting.status}
                        </span>
                      </div>

                      <p className="mt-1 line-clamp-1 text-sm text-zinc-400">
                        {meeting.description || "No description provided"}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span>
                          {meeting.meeting_type === "instant"
                            ? "Instant meeting"
                            : "Scheduled meeting"}
                        </span>
                        <span>
                          {formatDate(
                            meeting.scheduled_at ?? meeting.created_at
                          )}
                        </span>
                        <span className="capitalize">
                          {meeting.visibility === "organisation"
                            ? "Organisation-wide"
                            : "Invited participants"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {meeting.status === "live" && (
                      <Link
                        href={`/dashboard/meetings/${meeting.id}`}
                        className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium transition hover:bg-purple-500"
                      >
                        Join meeting
                      </Link>
                    )}

                    {meeting.status === "scheduled" && (
                      <Link
                        href={`/dashboard/meetings/${meeting.id}`}
                        className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium transition hover:bg-white/10"
                      >
                        View meeting
                      </Link>
                    )}

                    {meeting.status === "completed" && (
                      <span className="text-xs text-zinc-500">
                        Meeting ended
                      </span>
                    )}

                    {meeting.status === "cancelled" && (
                      <span className="text-xs text-red-400">Cancelled</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

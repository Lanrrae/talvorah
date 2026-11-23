"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type AuditLog = {
  id: string;
  organisation_id: string | null;
  actor_user_id: string | null;
  actor_member_id: string | null;
  acting_as: string | null;
  category: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  title: string;
  description: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type Organisation = {
  id: string;
  name: string;
};

const categories = [
  "all",
  "employee",
  "department",
  "task",
  "project",
  "meeting",
  "memo",
  "circular",
  "document",
  "system",
];

const categoryStyles: Record<string, string> = {
  employee: "bg-blue-50 text-blue-700",
  department: "bg-violet-50 text-violet-700",
  task: "bg-amber-50 text-amber-700",
  project: "bg-indigo-50 text-indigo-700",
  meeting: "bg-cyan-50 text-cyan-700",
  memo: "bg-emerald-50 text-emerald-700",
  circular: "bg-purple-50 text-purple-700",
  document: "bg-sky-50 text-sky-700",
  system: "bg-gray-100 text-gray-700",
};

export default function AuditLogsPage() {
  const supabase = createClient();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [selectedOrganisation, setSelectedOrganisation] = useState("current");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const getCurrentOrganisation = () => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("talvorah_organisation_id") || "";
  };

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) throw userError;

      if (!userData.user) {
        setLogs([]);
        setError("Please sign in to view audit history.");
        return;
      }

      const { data: adminData, error: adminError } = await supabase.rpc(
        "is_platform_super_admin"
      );

      if (adminError) throw adminError;

      const platformAdmin = adminData === true;
      setIsSuperAdmin(platformAdmin);

      const organisationId = getCurrentOrganisation();

      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (platformAdmin) {
        if (
          selectedOrganisation !== "all" &&
          selectedOrganisation !== "current"
        ) {
          query = query.eq("organisation_id", selectedOrganisation);
        } else if (
          selectedOrganisation === "current" &&
          organisationId
        ) {
          query = query.eq("organisation_id", organisationId);
        }
      } else {
        if (!organisationId) {
          setLogs([]);
          setError("Select an organisation to view its audit history.");
          return;
        }

        query = query.eq("organisation_id", organisationId);
      }

      const { data, error: logsError } = await query;

      if (logsError) throw logsError;

      setLogs((data || []) as AuditLog[]);

      if (platformAdmin) {
        const { data: orgData, error: orgError } = await supabase
          .from("organisations")
          .select("id, name")
          .order("name");

        if (orgError) throw orgError;
        setOrganisations((orgData || []) as Organisation[]);
      }
    } catch (err) {
      console.error("Audit log error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load audit history."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedOrganisation]);

  // Read the current time after the component mounts.
  // This prevents Next.js prerendering from evaluating new Date().
  useEffect(() => {
    setCurrentTime(new Date());
  }, []);

  useEffect(() => {
    loadLogs();

    const handleOrganisationChange = () => {
      setSelectedOrganisation("current");
      loadLogs();
    };

    window.addEventListener(
      "talvorah:organisation-changed",
      handleOrganisationChange
    );

    return () => {
      window.removeEventListener(
        "talvorah:organisation-changed",
        handleOrganisationChange
      );
    };
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    if (dateFilter !== "all" && !currentTime) return [];

    const now = currentTime;

    return logs.filter((log) => {
      const matchesCategory =
        category === "all" || log.category === category;

      const searchText = [
        log.title,
        log.description,
        log.action,
        log.category,
        log.entity_type,
        log.actor_user_id,
        log.actor_member_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      const logDate = new Date(log.created_at);
      let matchesDate = true;

      if (dateFilter === "today" && now) {
        matchesDate = logDate.toDateString() === now.toDateString();
      } else if (dateFilter === "7days" && now) {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 7);
        matchesDate = logDate >= cutoff;
      } else if (dateFilter === "30days" && now) {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 30);
        matchesDate = logDate >= cutoff;
      }

      return matchesCategory && matchesSearch && matchesDate;
    });
  }, [logs, category, search, dateFilter, currentTime]);

  const organisationName = (id: string | null) => {
    if (!id) return "Platform-wide";
    return organisations.find((org) => org.id === id)?.name || "Organisation";
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleString([], {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const countToday = currentTime
    ? logs.filter(
        (log) =>
          new Date(log.created_at).toDateString() ===
          currentTime.toDateString()
      ).length
    : 0;

  const countCategories = new Set(logs.map((log) => log.category)).size;

  return (
    <div className="min-h-screen bg-[#f7f9fc] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <span>Administration</span>
              <span>/</span>
              <span>Audit Logs</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#17243b]">
              Audit Logs & Activity History
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Review recorded actions and activity across Talvorah.
            </p>
          </div>

          <button
            onClick={loadLogs}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <span>↻</span>
            Refresh logs
          </button>
        </div>

        {isSuperAdmin && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-emerald-900">
                  Platform Super Admin access
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  You can review audit records across organisations.
                </p>
              </div>

              <select
                value={selectedOrganisation}
                onChange={(e) => setSelectedOrganisation(e.target.value)}
                className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
              >
                <option value="current">Current organisation</option>
                <option value="all">All organisations</option>

                {organisations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Recorded activities</p>
            <p className="mt-2 text-3xl font-bold text-[#17243b]">
              {logs.length}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Latest 500 records
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Activities today</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {countToday}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Recorded since midnight
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Activity categories</p>
            <p className="mt-2 text-3xl font-bold text-[#17243b]">
              {countCategories}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Categories represented in the records
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_190px_170px]">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                ⌕
              </span>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search activities, actions or users..."
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-emerald-500"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item === "all"
                    ? "All categories"
                    : item.charAt(0).toUpperCase() + item.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-emerald-500"
            >
              <option value="all">Any time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-[#17243b]">
                Activity timeline
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                {filteredLogs.length} matching records
              </p>
            </div>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              Read only
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-gray-500">
              Loading audit history...
            </div>
          ) : error ? (
            <div className="p-10 text-center">
              <p className="font-medium text-red-600">
                Unable to load audit logs
              </p>

              <p className="mt-2 text-sm text-gray-500">{error}</p>

              <button
                onClick={loadLogs}
                className="mt-4 rounded-lg bg-[#087f5b] px-4 py-2 text-sm font-semibold text-white"
              >
                Try again
              </button>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-500">
                ◷
              </div>

              <h3 className="mt-3 font-semibold text-gray-800">
                No activity records found
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Recorded activities will appear here when modules begin
                sending audit events.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredLogs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="flex w-full flex-col gap-3 px-5 py-4 text-left transition hover:bg-gray-50 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex min-w-0 gap-3">
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f5ef] text-sm text-[#087f5b]">
                      ●
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-800">
                          {log.title}
                        </p>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            categoryStyles[log.category] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {log.category}
                        </span>
                      </div>

                      {log.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                          {log.description}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                        <span>
                          Action: {log.action.replaceAll("_", " ")}
                        </span>

                        <span>
                          Actor: {log.actor_user_id || "Not recorded"}
                        </span>

                        {isSuperAdmin && (
                          <span>
                            {organisationName(log.organisation_id)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-xs text-gray-400 sm:text-right">
                    {formatDate(log.created_at)}
                    <p className="mt-1 text-emerald-700">View details →</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-100 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Audit record details
                </p>

                <h2 className="mt-2 text-xl font-bold text-[#17243b]">
                  {selectedLog.title}
                </h2>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg px-3 py-1 text-xl text-gray-400 hover:bg-gray-100"
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-400">Category</p>
                  <p className="mt-1 font-medium capitalize text-gray-800">
                    {selectedLog.category}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Action</p>
                  <p className="mt-1 font-medium capitalize text-gray-800">
                    {selectedLog.action.replaceAll("_", " ")}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Date and time</p>
                  <p className="mt-1 font-medium text-gray-800">
                    {formatDate(selectedLog.created_at)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Acting capacity</p>
                  <p className="mt-1 font-medium text-gray-800">
                    {selectedLog.acting_as || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Actor user ID</p>
                  <p className="mt-1 break-all text-sm text-gray-700">
                    {selectedLog.actor_user_id || "Not recorded"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Organisation</p>
                  <p className="mt-1 text-sm text-gray-700">
                    {organisationName(selectedLog.organisation_id)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Entity type</p>
                  <p className="mt-1 text-sm capitalize text-gray-700">
                    {selectedLog.entity_type || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Entity ID</p>
                  <p className="mt-1 break-all text-sm text-gray-700">
                    {selectedLog.entity_id || "Not specified"}
                  </p>
                </div>
              </div>

              {selectedLog.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-500">
                    Description
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-700">
                    {selectedLog.description}
                  </p>
                </div>
              )}

              {selectedLog.before_data && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-500">
                    Previous data
                  </p>

                  <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700">
                    {JSON.stringify(selectedLog.before_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after_data && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-500">
                    Updated data
                  </p>

                  <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700">
                    {JSON.stringify(selectedLog.after_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.metadata &&
                Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-gray-500">
                      Additional information
                    </p>

                    <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
            </div>

            <div className="border-t border-gray-100 p-5 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg bg-[#087f5b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#066b4c]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
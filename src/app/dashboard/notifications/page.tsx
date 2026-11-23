"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type NotificationCategory =
  | "task"
  | "project"
  | "meeting"
  | "message"
  | "memo"
  | "circular"
  | "document"
  | "employee"
  | "system";

type NotificationItem = {
  id: string;
  recipient_user_id: string;
  organisation_id: string | null;
  actor_user_id: string | null;
  category: NotificationCategory;
  title: string;
  body: string | null;
  action_url: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

type Filter = "all" | "unread" | "read";

const CATEGORY_META: Record<
  NotificationCategory,
  { label: string; icon: string; color: string }
> = {
  task: {
    label: "Tasks",
    icon: "✓",
    color: "bg-blue-50 text-blue-700",
  },
  project: {
    label: "Projects",
    icon: "▦",
    color: "bg-violet-50 text-violet-700",
  },
  meeting: {
    label: "Meetings",
    icon: "◷",
    color: "bg-indigo-50 text-indigo-700",
  },
  message: {
    label: "Messages",
    icon: "✉",
    color: "bg-sky-50 text-sky-700",
  },
  memo: {
    label: "Memos",
    icon: "▤",
    color: "bg-amber-50 text-amber-700",
  },
  circular: {
    label: "Circulars",
    icon: "▧",
    color: "bg-emerald-50 text-emerald-700",
  },
  document: {
    label: "Documents",
    icon: "▣",
    color: "bg-cyan-50 text-cyan-700",
  },
  employee: {
    label: "Employees",
    icon: "♙",
    color: "bg-pink-50 text-pink-700",
  },
  system: {
    label: "System",
    icon: "⚙",
    color: "bg-slate-100 text-slate-700",
  },
};

function relativeTime(value: string) {
  const date = new Date(value);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 172800) return "Yesterday";

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function groupLabel(value: string) {
  const date = new Date(value);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const itemDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  if (itemDate.getTime() === today.getTime()) return "Today";
  if (itemDate.getTime() === yesterday.getTime()) return "Yesterday";

  return date.toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function NotificationsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState("");
  const [organisationId, setOrganisationId] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadNotifications = useCallback(
    async (uid?: string, orgId?: string) => {
      const currentUserId = uid || userId;
      const currentOrganisationId =
        orgId !== undefined ? orgId : organisationId;

      if (!currentUserId) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      let query = supabase
        .from("notifications")
        .select(
          "id, recipient_user_id, organisation_id, actor_user_id, category, title, body, action_url, entity_type, entity_id, is_read, read_at, created_at"
        )
        .eq("recipient_user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (currentOrganisationId) {
        query = query.or(
          `organisation_id.eq.${currentOrganisationId},organisation_id.is.null`
        );
      } else {
        query = query.is("organisation_id", null);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        setError(queryError.message);
        setNotifications([]);
      } else {
        setNotifications((data ?? []) as NotificationItem[]);
      }

      setLoading(false);
    },
    [organisationId, supabase, userId]
  );

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    const initialise = async () => {
      const { data, error: authError } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !data.user) {
        setError("Please sign in to view your notifications.");
        setLoading(false);
        return;
      }

      const uid = data.user.id;
      const orgId =
        localStorage.getItem("talvorah_organisation_id") ?? "";

      setUserId(uid);
      setOrganisationId(orgId);
      await loadNotifications(uid, orgId);

      if (!active) return;

      channel = supabase
        .channel(`talvorah-notifications-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_user_id=eq.${uid}`,
          },
          () => {
            loadNotifications(uid, orgId);
          }
        )
        .subscribe();
    };

    const handleOrganisationChange = () => {
      const orgId =
        localStorage.getItem("talvorah_organisation_id") ?? "";
      setOrganisationId(orgId);
      loadNotifications(userId, orgId);
    };

    initialise();

    window.addEventListener(
      "talvorah:organisation-changed",
      handleOrganisationChange
    );
    window.addEventListener("storage", handleOrganisationChange);

    return () => {
      active = false;
      window.removeEventListener(
        "talvorah:organisation-changed",
        handleOrganisationChange
      );
      window.removeEventListener("storage", handleOrganisationChange);

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadNotifications, supabase, userId]);

  const unreadCount = notifications.filter((item) => !item.is_read).length;
  const readCount = notifications.length - unreadCount;

  const filteredNotifications = useMemo(() => {
    const term = search.trim().toLowerCase();

    return notifications.filter((item) => {
      const matchesStatus =
        filter === "all" ||
        (filter === "unread" && !item.is_read) ||
        (filter === "read" && item.is_read);

      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      const matchesSearch =
        !term ||
        item.title.toLowerCase().includes(term) ||
        (item.body ?? "").toLowerCase().includes(term);

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [notifications, filter, categoryFilter, search]);

  const groupedNotifications = useMemo(() => {
    const groups = new Map<string, NotificationItem[]>();

    filteredNotifications.forEach((item) => {
      const label = groupLabel(item.created_at);
      const existing = groups.get(label) ?? [];
      existing.push(item);
      groups.set(label, existing);
    });

    return Array.from(groups.entries());
  }, [filteredNotifications]);

  async function markAsRead(item: NotificationItem) {
    if (item.is_read || busyId) return;

    setBusyId(item.id);
    setError("");

    const { error: updateError } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("recipient_user_id", userId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === item.id
            ? {
                ...notification,
                is_read: true,
                read_at: new Date().toISOString(),
              }
            : notification
        )
      );
    }

    setBusyId("");
  }

  async function markAllAsRead() {
    if (!userId || unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    setError("");

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: now,
      })
      .eq("recipient_user_id", userId)
      .eq("is_read", false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at ?? now,
        }))
      );
    }

    setMarkingAll(false);
  }

  async function openNotification(item: NotificationItem) {
    if (!item.is_read) {
      await markAsRead(item);
    }

    if (item.action_url) {
      window.location.href = item.action_url;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-emerald-700">
              Talvorah Workspace
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Notifications
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Stay informed about activity across your workspace.
            </p>
          </div>

          <button
            onClick={markAllAsRead}
            disabled={unreadCount === 0 || markingAll}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {markingAll ? "Updating..." : "Mark all as read"}
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total notifications</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {notifications.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Unread</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {unreadCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Read</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {readCount}
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["unread", "Unread"],
                  ["read", "Read"],
                ] as [Filter, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
                    filter === value
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              >
                <option value="all">All categories</option>
                {Object.entries(CATEGORY_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search notifications..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 sm:w-64"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-14 text-center text-sm text-slate-500">
              Loading notifications...
            </div>
          ) : groupedNotifications.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700">
                ♧
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                You&apos;re all caught up
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                No notifications match the selected filters.
              </p>
            </div>
          ) : (
            <div>
              {groupedNotifications.map(([group, items]) => (
                <section key={group}>
                  <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {group}
                    </h2>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {items.map((item) => {
                      const meta =
                        CATEGORY_META[item.category] ??
                        CATEGORY_META.system;

                      return (
                        <div
                          key={item.id}
                          className={`flex gap-4 px-5 py-5 transition hover:bg-slate-50 ${
                            !item.is_read ? "bg-emerald-50/30" : "bg-white"
                          }`}
                        >
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${meta.color}`}
                          >
                            {meta.icon}
                          </div>

                          <button
                            onClick={() => openNotification(item)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {item.title}
                              </span>

                              {!item.is_read && (
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              )}
                            </div>

                            {item.body && (
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                {item.body}
                              </p>
                            )}

                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                              <span>{meta.label}</span>
                              <span>•</span>
                              <span>{relativeTime(item.created_at)}</span>
                              {item.action_url && (
                                <>
                                  <span>•</span>
                                  <span className="font-medium text-emerald-700">
                                    View details →
                                  </span>
                                </>
                              )}
                            </div>
                          </button>

                          {!item.is_read && (
                            <button
                              onClick={() => markAsRead(item)}
                              disabled={busyId === item.id}
                              className="shrink-0 self-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-50"
                            >
                              {busyId === item.id ? "..." : "Mark read"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
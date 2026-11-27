
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

type Department = {
  id: string;
  name: string;
};

type Member = {
  id: string;
  status: string;
  department_id: string | null;
};

type Project = {
  id: string;
  name: string;
  status: string;
  created_at?: string;
};

type Task = {
  id: string;
  title: string;
  status: string;
  priority?: string;
  due_date?: string | null;
  created_at?: string;
};

type Activity = {
  id: string;
  title: string | null;
  description: string | null;
  category: string;
  action: string;
  created_at: string;
};

function formatDate(value?: string | null) {
  if (!value) return "No due date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(value: string) {
  const seconds = Math.floor(
    (Date.now() - new Date(value).getTime()) / 1000
  );

  if (Number.isNaN(seconds)) return "";
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return formatDate(value);
}

function statusStyle(status: string) {
  const value = status.toLowerCase();

  if (["completed", "approved", "closed"].includes(value)) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (["active", "in_progress", "in progress"].includes(value)) {
    return "bg-blue-50 text-blue-700";
  }

  if (["on_hold", "pending", "not_started"].includes(value)) {
    return "bg-amber-50 text-amber-700";
  }

  if (["cancelled", "rejected", "overdue"].includes(value)) {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}

function priorityStyle(priority?: string) {
  switch ((priority || "").toLowerCase()) {
    case "high":
    case "urgent":
      return "bg-red-50 text-red-600";
    case "medium":
      return "bg-amber-50 text-amber-700";
    case "low":
      return "bg-blue-50 text-blue-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel = "View all",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-bold tracking-tight text-[var(--ws-text)]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-xs text-[var(--ws-muted)]">{subtitle}</p>
        )}
      </div>

      {href && (
        <Link
          href={href}
          className="shrink-0 text-xs font-semibold text-[var(--ws-accent)] transition hover:opacity-75"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

function DashboardCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-2xl border p-5 shadow-sm ${className}`}
      style={{
        background: "var(--ws-surface)",
        borderColor: "var(--ws-border)",
      }}
    >
      {children}
    </section>
  );
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);

  const [organisationName, setOrganisationName] = useState(
    "Your Organisation"
  );
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const organisationId = localStorage.getItem(
        "talvorah_organisation_id"
      );

      if (!organisationId) {
        throw new Error("Select an organisation to view its dashboard.");
      }

      const [
        organisationResult,
        departmentResult,
        memberResult,
        projectResult,
        taskResult,
        activityResult,
      ] = await Promise.all([
        supabase
          .from("organisations")
          .select("id, name")
          .eq("id", organisationId)
          .maybeSingle(),

        supabase
          .from("departments")
          .select("id, name")
          .eq("organisation_id", organisationId),

        supabase
          .from("organisation_members")
          .select("id, status, department_id")
          .eq("organisation_id", organisationId),

        supabase
          .from("projects")
          .select("id, name, status, created_at")
          .eq("organisation_id", organisationId)
          .order("created_at", { ascending: false })
          .limit(8),

        supabase
          .from("tasks")
          .select("id, title, status, priority, due_date, created_at")
          .eq("organisation_id", organisationId)
          .order("created_at", { ascending: false })
          .limit(100),

        supabase
          .from("audit_logs")
          .select("id, title, description, category, action, created_at")
          .eq("organisation_id", organisationId)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      if (organisationResult.error) throw organisationResult.error;
      if (departmentResult.error) throw departmentResult.error;
      if (memberResult.error) throw memberResult.error;
      if (projectResult.error) throw projectResult.error;
      if (taskResult.error) throw taskResult.error;

      setOrganisationName(
        organisationResult.data?.name || "Organisation"
      );
      setDepartments(departmentResult.data || []);
      setMembers(memberResult.data || []);
      setProjects(projectResult.data || []);
      setTasks(taskResult.data || []);
      setActivities(
        activityResult.error ? [] : activityResult.data || []
      );
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadDashboard();

    const handleOrganisationChange = () => {
      void loadDashboard();
    };

    window.addEventListener(
      "talvorah:organisation-changed",
      handleOrganisationChange
    );
    window.addEventListener("focus", handleOrganisationChange);

    return () => {
      window.removeEventListener(
        "talvorah:organisation-changed",
        handleOrganisationChange
      );
      window.removeEventListener("focus", handleOrganisationChange);
    };
  }, [loadDashboard]);

  const activeMembers = members.filter(
    (member) => member.status === "active"
  );

  const activeProjects = projects.filter(
    (project) => project.status === "active"
  );

  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  );

  const pendingTasks = tasks.filter(
    (task) =>
      !["completed", "cancelled", "archived"].includes(
        task.status.toLowerCase()
      )
  );

  const overdueTasks = pendingTasks.filter(
    (task) =>
      task.due_date &&
      new Date(`${task.due_date}T23:59:59`).getTime() < Date.now()
  );

  const taskCompletion = tasks.length
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  const departmentCounts = departments
    .map((department) => ({
      ...department,
      count: activeMembers.filter(
        (member) => member.department_id === department.id
      ).length,
    }))
    .sort((a, b) => b.count - a.count);

  const recentTasks = [...pendingTasks]
    .sort((a, b) => {
      if (a.due_date && b.due_date) {
        return (
          new Date(a.due_date).getTime() -
          new Date(b.due_date).getTime()
        );
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;

      return (
        new Date(b.created_at || "").getTime() -
        new Date(a.created_at || "").getTime()
      );
    })
    .slice(0, 5);

  const stats = [
    {
      label: "Employees",
      value: activeMembers.length,
      detail: "Active organisation members",
      icon: "♙",
      href: "/dashboard/employees",
      tone: "green",
    },
    {
      label: "Departments",
      value: departments.length,
      detail: "Organisation departments",
      icon: "▦",
      href: "/dashboard/departments",
      tone: "blue",
    },
    {
      label: "Active Projects",
      value: activeProjects.length,
      detail: "Currently active projects",
      icon: "▱",
      href: "/dashboard/projects",
      tone: "purple",
    },
    {
      label: "Task Completion",
      value: `${taskCompletion}%`,
      detail: `${completedTasks.length} completed tasks`,
      icon: "✓",
      href: "/dashboard/tasks",
      tone: "amber",
    },
  ];

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const quickActions = [
    {
      label: "New Task",
      description: "Create and assign work",
      href: "/dashboard/tasks",
      icon: "+",
    },
    {
      label: "New Project",
      description: "Open project management",
      href: "/dashboard/projects",
      icon: "▱",
    },
    {
      label: "Employees",
      description: "Manage organisation members",
      href: "/dashboard/employees",
      icon: "♙",
    },
    {
      label: "Schedule Meeting",
      description: "Open meeting workspace",
      href: "/dashboard/meetings",
      icon: "▦",
    },
  ];

  const tones: Record<
    string,
    { card: string; icon: string; text: string }
  > = {
    green: {
      card: "border-emerald-200/70 bg-emerald-50/70",
      icon: "bg-emerald-100 text-emerald-700",
      text: "text-emerald-700",
    },
    blue: {
      card: "border-blue-200/70 bg-blue-50/70",
      icon: "bg-blue-100 text-blue-700",
      text: "text-blue-700",
    },
    purple: {
      card: "border-purple-200/70 bg-purple-50/70",
      icon: "bg-purple-100 text-purple-700",
      text: "text-purple-700",
    },
    amber: {
      card: "border-amber-200/70 bg-amber-50/70",
      icon: "bg-amber-100 text-amber-700",
      text: "text-amber-700",
    },
  };

  return (
    <div className="space-y-5">
      {/* Dashboard heading */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="border-l-[5px] border-[var(--ws-accent)] pl-4">
          <p className="text-[10px] font-bold tracking-[0.18em] text-[var(--ws-accent)]">
            ORGANISATION WORKSPACE
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--ws-text)] md:text-[27px]">
            Workspace Overview
          </h1>
          <p className="mt-1 text-sm text-[var(--ws-muted)]">
            Welcome to {organisationName}. Here&apos;s your organisation at a glance.
          </p>
        </div>

        <div
          className="flex items-center gap-2 rounded-xl border px-4 py-3 shadow-sm"
          style={{
            background: "var(--ws-surface)",
            borderColor: "var(--ws-border)",
          }}
        >
          <span className="text-lg text-[var(--ws-muted)]">▦</span>
          <span className="text-xs font-semibold text-[var(--ws-text)]">
            {today}
          </span>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div
          className="rounded-2xl border p-12 text-center text-sm"
          style={{
            background: "var(--ws-surface)",
            borderColor: "var(--ws-border)",
            color: "var(--ws-muted)",
          }}
        >
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
          Loading your organisation workspace...
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {stats.map((stat) => {
              const tone = tones[stat.tone];

              return (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className={`group rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md ${tone.card}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-600">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                        {stat.value}
                      </p>
                      <p className={`mt-2 text-[11px] font-semibold ${tone.text}`}>
                        {stat.detail}
                      </p>
                    </div>

                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${tone.icon}`}
                    >
                      {stat.icon}
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>

          {/* Main dashboard grid */}
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            {/* Tasks */}
            <DashboardCard className="xl:col-span-4">
              <SectionHeading
                title="Task Overview"
                subtitle="Your organisation's current workload"
                href="/dashboard/tasks"
              />

              <div className="mt-5 space-y-2">
                {recentTasks.length ? (
                  recentTasks.map((task) => (
                    <Link
                      key={task.id}
                      href="/dashboard/tasks"
                      className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-black/[0.035]"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-300 text-[10px] text-slate-400">
                        {task.status === "completed" ? "✓" : ""}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[var(--ws-text)]">
                          {task.title}
                        </p>
                        <p className="mt-1 text-[10px] text-[var(--ws-muted)]">
                          Due: {formatDate(task.due_date)}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${priorityStyle(task.priority)}`}
                      >
                        {task.priority || "Normal"}
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-slate-600">
                      No pending tasks
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Tasks will appear here when they are available.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--ws-border)] pt-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] text-slate-500">Pending tasks</p>
                  <p className="mt-1 text-xl font-extrabold text-slate-900">
                    {pendingTasks.length}
                  </p>
                </div>
                <div className="rounded-xl bg-red-50 p-3">
                  <p className="text-[10px] text-red-600">Overdue tasks</p>
                  <p className="mt-1 text-xl font-extrabold text-red-700">
                    {overdueTasks.length}
                  </p>
                </div>
              </div>
            </DashboardCard>

            {/* Project progress */}
            <DashboardCard className="xl:col-span-4">
              <SectionHeading
                title="Project Overview"
                subtitle="Project activity and task completion"
                href="/dashboard/projects"
              />

              <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
                <div
                  className="relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(var(--ws-accent) ${taskCompletion * 3.6}deg, #e2e8f0 0deg)`,
                  }}
                >
                  <div
                    className="flex h-[116px] w-[116px] flex-col items-center justify-center rounded-full"
                    style={{ background: "var(--ws-surface)" }}
                  >
                    <span className="text-3xl font-extrabold tracking-tight text-[var(--ws-text)]">
                      {taskCompletion}%
                    </span>
                    <span className="mt-1 text-[10px] font-medium text-[var(--ws-muted)]">
                      Task completion
                    </span>
                  </div>
                </div>

                <div className="w-full max-w-[180px] space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-[var(--ws-text)]">
                        {activeProjects.length}
                      </p>
                      <p className="text-[10px] text-[var(--ws-muted)]">
                        Active projects
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-blue-500" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-[var(--ws-text)]">
                        {pendingTasks.length}
                      </p>
                      <p className="text-[10px] text-[var(--ws-muted)]">
                        Pending tasks
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-slate-400" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-[var(--ws-text)]">
                        {completedTasks.length}
                      </p>
                      <p className="text-[10px] text-[var(--ws-muted)]">
                        Completed tasks
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-[var(--ws-border)] pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--ws-muted)]">Tasks completed</span>
                  <span className="font-bold text-[var(--ws-text)]">
                    {completedTasks.length} / {tasks.length}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${taskCompletion}%`,
                      background: "var(--ws-accent)",
                    }}
                  />
                </div>
              </div>
            </DashboardCard>

            {/* Departments */}
            <DashboardCard className="xl:col-span-4">
              <SectionHeading
                title="Departments"
                subtitle="Active employee distribution"
                href="/dashboard/departments"
                linkLabel="Manage"
              />

              <div className="mt-5 space-y-4">
                {departmentCounts.length ? (
                  departmentCounts.slice(0, 5).map((department) => {
                    const percentage = activeMembers.length
                      ? Math.round(
                          (department.count / activeMembers.length) * 100
                        )
                      : 0;

                    return (
                      <div key={department.id}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-xs font-semibold text-[var(--ws-text)]">
                            {department.name}
                          </p>
                          <span className="shrink-0 text-xs font-bold text-[var(--ws-text)]">
                            {department.count}
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              background: "var(--ws-accent)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-slate-600">
                      No departments yet
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Create departments to see the distribution.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-xl p-4" style={{ background: "var(--ws-accent-soft)" }}>
                <p className="text-[10px] text-[var(--ws-accent)]">
                  Total active employees
                </p>
                <p className="mt-1 text-xl font-extrabold text-[var(--ws-text)]">
                  {activeMembers.length}
                </p>
              </div>
            </DashboardCard>
          </section>

          {/* Lower dashboard grid */}
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            {/* Recent activity */}
            <DashboardCard className="xl:col-span-4">
              <SectionHeading
                title="Recent Activity"
                subtitle="Latest recorded organisation actions"
                href="/dashboard/audit-logs"
              />

              <div className="mt-5 space-y-4">
                {activities.length ? (
                  activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700">
                        {activity.category === "employee"
                          ? "♙"
                          : activity.category === "project"
                            ? "▱"
                            : activity.category === "task"
                              ? "✓"
                              : "•"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[var(--ws-text)]">
                          {activity.title ||
                            activity.action.replaceAll("_", " ")}
                        </p>

                        {activity.description && (
                          <p className="mt-1 line-clamp-2 text-[11px] text-[var(--ws-muted)]">
                            {activity.description}
                          </p>
                        )}

                        <p className="mt-1 text-[10px] text-[var(--ws-muted)]">
                          {timeAgo(activity.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-slate-600">
                      No recent activity
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Recorded actions will appear here.
                    </p>
                  </div>
                )}
              </div>
            </DashboardCard>

            {/* Recent projects */}
            <DashboardCard className="xl:col-span-4">
              <SectionHeading
                title="Recent Projects"
                subtitle="Latest projects in your organisation"
                href="/dashboard/projects"
              />

              <div className="mt-5 divide-y divide-[var(--ws-border)]">
                {projects.length ? (
                  projects.slice(0, 5).map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-700">
                          ▱
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[var(--ws-text)]">
                            {project.name}
                          </p>
                          <p className="mt-1 text-[10px] text-[var(--ws-muted)]">
                            {project.created_at
                              ? `Created ${formatDate(project.created_at)}`
                              : "Project"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${statusStyle(project.status)}`}
                      >
                        {project.status.replaceAll("_", " ")}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-slate-600">
                      No projects found
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Projects created in this organisation will appear here.
                    </p>
                  </div>
                )}
              </div>
            </DashboardCard>

            {/* Quick actions */}
            <DashboardCard className="xl:col-span-4">
              <SectionHeading
                title="Quick Actions"
                subtitle="Jump straight into your daily work"
              />

              <div className="mt-5 grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex min-h-[112px] flex-col justify-between rounded-xl border border-[var(--ws-border)] p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
                    style={{ background: "var(--ws-accent-soft)" }}
                  >
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-2xl font-semibold shadow-sm"
                      style={{ color: "var(--ws-accent)" }}
                    >
                      {action.icon}
                    </span>

                    <span>
                      <span className="block text-xs font-bold text-[var(--ws-text)]">
                        {action.label}
                      </span>
                      <span className="mt-1 block text-[10px] leading-4 text-[var(--ws-muted)]">
                        {action.description}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/messages"
                  className="rounded-lg border border-[var(--ws-border)] px-3 py-2.5 text-center text-[11px] font-semibold text-[var(--ws-text)] transition hover:bg-black/[0.035]"
                >
                  Open Chat →
                </Link>
                <Link
                  href="/dashboard/documents"
                  className="rounded-lg border border-[var(--ws-border)] px-3 py-2.5 text-center text-[11px] font-semibold text-[var(--ws-text)] transition hover:bg-black/[0.035]"
                >
                  Open Drive →
                </Link>
              </div>
            </DashboardCard>
          </section>

          {/* Workspace shortcuts */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              {
                label: "Meetings",
                detail: "Meet and collaborate",
                href: "/dashboard/meetings",
                icon: "▣",
              },
              {
                label: "Calendar",
                detail: "View your schedule",
                href: "/dashboard/calendar",
                icon: "▦",
              },
              {
                label: "Circulars",
                detail: "Organisation notices",
                href: "/dashboard/circulars",
                icon: "▤",
              },
              {
                label: "Reports",
                detail: "Organisation reports",
                href: "/dashboard/reports",
                icon: "▥",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl border p-4 transition hover:shadow-sm"
                style={{
                  background: "var(--ws-surface)",
                  borderColor: "var(--ws-border)",
                }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-700">
                  {item.icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-[var(--ws-text)]">
                    {item.label}
                  </span>
                  <span className="mt-1 block truncate text-[10px] text-[var(--ws-muted)]">
                    {item.detail}
                  </span>
                </span>
              </Link>
            ))}
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ws-border)] py-4 text-[10px] text-[var(--ws-muted)]">
            <span>Talvorah Workspace</span>
            <span>{organisationName}</span>
          </footer>
        </>
      )}
    </div>
  );
}

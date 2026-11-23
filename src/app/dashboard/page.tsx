
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import OrganisationSwitcher from "@/components/OrganisationSwitcher";
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

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);

  const [organisationName, setOrganisationName] = useState("Your Organisation");
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
      const organisationId =
        localStorage.getItem("talvorah_organisation_id");

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

      setOrganisationName(organisationResult.data?.name || "Organisation");
      setDepartments(departmentResult.data || []);
      setMembers(memberResult.data || []);
      setProjects(projectResult.data || []);
      setTasks(taskResult.data || []);
      setActivities(activityResult.error ? [] : activityResult.data || []);
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to load dashboard."
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

  const taskCompletion = tasks.length
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  const pendingTasks = tasks.filter(
    (task) => !["completed", "cancelled", "archived"].includes(task.status)
  );

  const overdueTasks = pendingTasks.filter(
    (task) =>
      task.due_date &&
      new Date(`${task.due_date}T23:59:59`).getTime() < Date.now()
  );

  const departmentCounts = departments.map((department) => ({
    ...department,
    count: activeMembers.filter(
      (member) => member.department_id === department.id
    ).length,
  }));

  const stats = [
    {
      label: "Employees",
      value: activeMembers.length,
      detail: "Active organisation members",
      icon: "👥",
      href: "/dashboard/employees",
    },
    {
      label: "Departments",
      value: departments.length,
      detail: "Organisation departments",
      icon: "🏢",
      href: "/dashboard/departments",
    },
    {
      label: "Active Projects",
      value: activeProjects.length,
      detail: "Currently active projects",
      icon: "📁",
      href: "/dashboard/projects",
    },
    {
      label: "Task Completion",
      value: `${taskCompletion}%`,
      detail: `${completedTasks.length} completed tasks`,
      icon: "✓",
      href: "/dashboard/tasks",
    },
  ];

  function timeAgo(value: string) {
    const seconds = Math.floor(
      (Date.now() - new Date(value).getTime()) / 1000
    );

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return new Date(value).toLocaleDateString();
  }

  function statusStyle(status: string) {
    const value = status.toLowerCase();

    if (value === "completed" || value === "approved") {
      return "bg-emerald-50 text-emerald-700";
    }

    if (value === "active" || value === "in_progress") {
      return "bg-blue-50 text-blue-700";
    }

    if (value === "on_hold" || value === "pending") {
      return "bg-amber-50 text-amber-700";
    }

    return "bg-slate-100 text-slate-600";
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <header className="border-b border-slate-200 bg-[#0b1830] px-5 py-5 text-white md:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-xl font-bold">
              Talvorah<span className="text-emerald-400">.</span>
            </Link>
            <p className="mt-1 text-xs text-slate-400">
              Organisation workspace
            </p>
          </div>
          <OrganisationSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-7 px-5 py-8 md:px-8">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wider text-emerald-600">
              WORKSPACE OVERVIEW
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Welcome to {organisationName}. Here's your organisation at a glance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/tasks"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
            >
              View Tasks
            </Link>
            <Link
              href="/dashboard/meetings"
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Meetings →
            </Link>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
            Loading your organisation dashboard...
          </div>
        ) : (
          <>
            <section className="overflow-hidden rounded-2xl bg-[#102442] p-7 text-white shadow-sm md:p-9">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-emerald-400">
                    ORGANISATION WORKSPACE
                  </p>
                  <h2 className="mt-3 text-2xl font-bold md:text-3xl">
                    {organisationName}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                    Manage people, departments, projects, tasks and communication
                    from one central workspace.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4">
                  <p className="text-xs text-slate-400">Workspace status</p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Connected
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg">
                      {stat.icon}
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-bold">{stat.value}</p>
                  <p className="mt-2 text-xs text-slate-400">{stat.detail}</p>
                </Link>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">Recent Projects</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Latest projects in your organisation.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/projects"
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    All projects →
                  </Link>
                </div>

                <div className="mt-5 divide-y divide-slate-100">
                  {projects.length ? (
                    projects.slice(0, 5).map((project) => (
                      <div
                        key={project.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-4"
                      >
                        <div>
                          <p className="text-sm font-semibold">{project.name}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {project.created_at
                              ? `Created ${new Date(project.created_at).toLocaleDateString()}`
                              : "Project"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle(project.status)}`}
                        >
                          {project.status.replaceAll("_", " ")}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="py-8 text-center text-sm text-slate-500">
                      No projects found.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold">Task Overview</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Current task workload.
                </p>

                <div className="mt-7">
                  <div className="flex items-end justify-between">
                    <span className="text-4xl font-bold">{taskCompletion}%</span>
                    <span className="text-xs text-slate-400">Completed</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${taskCompletion}%` }}
                    />
                  </div>
                </div>

                <div className="mt-7 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total tasks loaded</span>
                    <strong>{tasks.length}</strong>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Pending / in progress</span>
                    <strong>{pendingTasks.length}</strong>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Overdue</span>
                    <strong className="text-red-600">{overdueTasks.length}</strong>
                  </div>
                </div>

                <Link
                  href="/dashboard/tasks"
                  className="mt-7 block rounded-xl bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Open task management →
                </Link>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">Departments</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Active employee distribution.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/departments"
                    className="text-sm font-semibold text-emerald-700"
                  >
                    Manage →
                  </Link>
                </div>

                <div className="mt-5 space-y-4">
                  {departmentCounts.length ? (
                    departmentCounts.slice(0, 6).map((department) => (
                      <div
                        key={department.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"
                      >
                        <span className="text-sm font-medium">
                          {department.name}
                        </span>
                        <span className="rounded-lg bg-white px-3 py-1 text-sm font-semibold">
                          {department.count}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="py-6 text-center text-sm text-slate-500">
                      No departments have been created.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">Recent Activity</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Latest recorded organisation actions.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/audit-logs"
                    className="text-sm font-semibold text-emerald-700"
                  >
                    Audit logs →
                  </Link>
                </div>

                <div className="mt-5 space-y-4">
                  {activities.length ? (
                    activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3">
                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm text-emerald-700">
                          {activity.category === "employee"
                            ? "👤"
                            : activity.category === "project"
                              ? "📁"
                              : activity.category === "task"
                                ? "✓"
                                : "•"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">
                            {activity.title || activity.action.replaceAll("_", " ")}
                          </p>
                          {activity.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                              {activity.description}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-slate-400">
                            {timeAgo(activity.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-6 text-center text-sm text-slate-500">
                      No activity has been recorded yet.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">Quick Actions</h2>
              <p className="mt-1 text-sm text-slate-500">
                Jump straight into your daily work.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Employees", "/dashboard/employees", "👥"],
                  ["Departments", "/dashboard/departments", "🏢"],
                  ["Projects", "/dashboard/projects", "📁"],
                  ["Tasks", "/dashboard/tasks", "✓"],
                  ["Messages", "/dashboard/messages", "✉"],
                  ["Meetings", "/dashboard/meetings", "🎥"],
                  ["Documents", "/dashboard/documents", "📄"],
                  ["Reports", "/dashboard/reports", "📊"],
                ].map(([label, href, icon]) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold transition hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <span className="text-lg">{icon}</span>
                    {label}
                    <span className="ml-auto text-emerald-600">→</span>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

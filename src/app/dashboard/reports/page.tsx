
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Period = "7" | "30" | "90" | "all";

type Department = {
  id: string;
  name: string;
};

type Member = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  department_id: string | null;
  designation: string | null;
};

type Task = {
  id: string;
  organisation_id: string;
  project_id: string | null;
  department_id: string | null;
  title: string;
  assigned_to_member_id: string | null;
  created_by_member_id: string | null;
  priority: string | null;
  status: string;
  due_date: string | null;
  created_at: string;
};

type Project = {
  id: string;
  department_id: string | null;
  name: string;
  manager_member_id: string | null;
  budget: number | null;
  start_date: string | null;
  due_date: string | null;
  progress: number | null;
  status: string;
  created_at: string;
};

type Meeting = {
  id: string;
  host_member_id: string | null;
  department_id: string | null;
  title: string;
  meeting_type: string | null;
  status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  created_at: string;
};

const supabase = createClient();

const PERIODS: { value: Period; label: string }[] = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

function isCompleted(status: string) {
  return ["completed", "complete", "done"].includes(
    (status || "").toLowerCase()
  );
}

function isCancelled(status: string) {
  return ["cancelled", "canceled"].includes(
    (status || "").toLowerCase()
  );
}

function isOverdue(task: Task) {
  if (!task.due_date || isCompleted(task.status) || isCancelled(task.status)) {
    return false;
  }

  const due = new Date(task.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return due.getTime() < today.getTime();
}

function getPeriodStart(period: Period, referenceDate: Date | null) {
  if (period === "all" || !referenceDate) return null;

  const date = new Date(referenceDate);
  date.setDate(date.getDate() - Number(period));
  date.setHours(0, 0, 0, 0);

  return date;
}

function inPeriod(value: string | null, start: Date | null) {
  if (!start) return true;
  if (!value) return false;

  return new Date(value).getTime() >= start.getTime();
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function StatCard({
  title,
  value,
  description,
  icon,
  accent,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold text-[#142d4e]">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${accent}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({
  value,
  color = "bg-emerald-500",
}: {
  value: number;
  color?: string;
}) {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

export default function ReportsPage() {
  const [referenceDate, setReferenceDate] = useState<Date | null>(null);
  const [organisationId, setOrganisationId] = useState("");
  const [period, setPeriod] = useState<Period>("30");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please sign in to view reports.");

      const selectedOrg = window.localStorage.getItem(
        "talvorah_organisation_id"
      );

      if (!selectedOrg) {
        setOrganisationId("");
        setDepartments([]);
        setMembers([]);
        setTasks([]);
        setProjects([]);
        setMeetings([]);
        throw new Error("Select an organisation to view its reports.");
      }

      setOrganisationId(selectedOrg);

      const [
        departmentResult,
        memberResult,
        taskResult,
        projectResult,
        meetingResult,
      ] = await Promise.all([
        supabase
          .from("departments")
          .select("id,name")
          .eq("organisation_id", selectedOrg)
          .order("name"),

        supabase
          .from("organisation_members")
          .select("id,user_id,role,status,department_id,designation")
          .eq("organisation_id", selectedOrg),

        supabase
          .from("tasks")
          .select(
            "id,organisation_id,project_id,department_id,title,assigned_to_member_id,created_by_member_id,priority,status,due_date,created_at"
          )
          .eq("organisation_id", selectedOrg),

        supabase
          .from("projects")
          .select(
            "id,department_id,name,manager_member_id,budget,start_date,due_date,progress,status,created_at"
          )
          .eq("organisation_id", selectedOrg),

        supabase
          .from("meetings")
          .select(
            "id,host_member_id,department_id,title,meeting_type,status,scheduled_start,scheduled_end,created_at"
          )
          .eq("organisation_id", selectedOrg),
      ]);

      if (departmentResult.error) throw departmentResult.error;
      if (memberResult.error) throw memberResult.error;
      if (taskResult.error) throw taskResult.error;
      if (projectResult.error) throw projectResult.error;
      if (meetingResult.error) throw meetingResult.error;

      setDepartments((departmentResult.data || []) as Department[]);
      setMembers((memberResult.data || []) as Member[]);
      setTasks((taskResult.data || []) as Task[]);
      setProjects((projectResult.data || []) as Project[]);
      setMeetings((meetingResult.data || []) as Meeting[]);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Reports loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load organisation reports."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setReferenceDate(new Date());
  }, []);

  useEffect(() => {
    loadReports();

    const handleOrganisationChange = () => {
      setDepartmentFilter("all");
      loadReports();
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
  }, [loadReports]);

  const periodStart = useMemo(
    () => getPeriodStart(period, referenceDate),
    [period, referenceDate]
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          inPeriod(task.created_at, periodStart) &&
          (departmentFilter === "all" ||
            task.department_id === departmentFilter)
      ),
    [tasks, periodStart, departmentFilter]
  );

  const filteredProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          inPeriod(project.created_at, periodStart) &&
          (departmentFilter === "all" ||
            project.department_id === departmentFilter)
      ),
    [projects, periodStart, departmentFilter]
  );

  const filteredMeetings = useMemo(
    () =>
      meetings.filter((meeting) => {
        const meetingDepartment =
          meeting.department_id ||
          members.find((member) => member.id === meeting.host_member_id)
            ?.department_id;

        return (
          inPeriod(meeting.scheduled_start || meeting.created_at, periodStart) &&
          (departmentFilter === "all" ||
            meetingDepartment === departmentFilter)
        );
      }),
    [meetings, members, periodStart, departmentFilter]
  );

  const activeMembers = useMemo(
    () =>
      members.filter(
        (member) =>
          (member.status || "").toLowerCase() === "active" &&
          (departmentFilter === "all" ||
            member.department_id === departmentFilter)
      ),
    [members, departmentFilter]
  );

  const completedTasks = filteredTasks.filter((task) =>
    isCompleted(task.status)
  );

  const overdueTasks = filteredTasks.filter(isOverdue);

  const openTasks = filteredTasks.filter(
    (task) => !isCompleted(task.status) && !isCancelled(task.status)
  );

  const completionRate = filteredTasks.length
    ? Math.round((completedTasks.length / filteredTasks.length) * 100)
    : 0;

  const averageProgress = filteredProjects.length
    ? Math.round(
        filteredProjects.reduce(
          (total, project) => total + Number(project.progress || 0),
          0
        ) / filteredProjects.length
      )
    : 0;

  const activeProjects = filteredProjects.filter((project) =>
    ["active", "in_progress", "planned", "on_hold", "on hold"].includes(
      (project.status || "").toLowerCase()
    )
  );

  const totalBudget = filteredProjects.reduce(
    (total, project) => total + Number(project.budget || 0),
    0
  );

  const completedMeetings = filteredMeetings.filter((meeting) =>
    isCompleted(meeting.status)
  );

  const scheduledMeetings = filteredMeetings.filter((meeting) =>
    ["scheduled", "live", "in_progress", "in progress"].includes(
      (meeting.status || "").toLowerCase()
    )
  );

  const projectStatusCounts = useMemo(() => {
    const statuses = [
      { label: "Active", color: "bg-emerald-500", values: ["active", "in_progress", "in progress"] },
      { label: "Planned", color: "bg-blue-500", values: ["planned"] },
      { label: "On hold", color: "bg-amber-500", values: ["on_hold", "on hold"] },
      { label: "Completed", color: "bg-purple-500", values: ["completed", "complete", "done"] },
      { label: "Cancelled", color: "bg-red-500", values: ["cancelled", "canceled"] },
    ];

    return statuses.map((item) => ({
      label: item.label,
      color: item.color,
      count: filteredProjects.filter((project) =>
        item.values.includes((project.status || "").toLowerCase())
      ).length,
    }));
  }, [filteredProjects]);

  const departmentStats = useMemo(
    () =>
      departments.map((department) => {
        const departmentMembers = activeMembers.filter(
          (member) => member.department_id === department.id
        );

        const departmentTasks = filteredTasks.filter(
          (task) => task.department_id === department.id
        );

        const departmentProjects = filteredProjects.filter(
          (project) => project.department_id === department.id
        );

        const departmentMeetings = filteredMeetings.filter((meeting) => {
          const hostDepartment = members.find(
            (member) => member.id === meeting.host_member_id
          )?.department_id;

          return (
            meeting.department_id === department.id ||
            (!meeting.department_id && hostDepartment === department.id)
          );
        });

        const completed = departmentTasks.filter((task) =>
          isCompleted(task.status)
        ).length;

        const overdue = departmentTasks.filter(isOverdue).length;

        return {
          id: department.id,
          name: department.name,
          employees: departmentMembers.length,
          tasks: departmentTasks.length,
          completed,
          overdue,
          projects: departmentProjects.length,
          meetings: departmentMeetings.length,
          completionRate: departmentTasks.length
            ? Math.round((completed / departmentTasks.length) * 100)
            : 0,
        };
      }),
    [
      departments,
      activeMembers,
      filteredTasks,
      filteredProjects,
      filteredMeetings,
      members,
    ]
  );

  const visibleDepartmentStats = departmentStats.filter(
    (item) =>
      departmentFilter === "all" || item.id === departmentFilter
  );

  const visibleEmployeeStats = useMemo(
    () =>
      activeMembers.map((member) => {
        const assignedTasks = filteredTasks.filter(
          (task) => task.assigned_to_member_id === member.id
        );

        const completed = assignedTasks.filter((task) =>
          isCompleted(task.status)
        ).length;

        const overdue = assignedTasks.filter(isOverdue).length;

        const departmentName =
          departments.find((department) => department.id === member.department_id)
            ?.name || "Unassigned";

        return {
          id: member.user_id || member.id,
          designation: member.designation || "Not specified",
          department: departmentName,
          assigned: assignedTasks.length,
          completed,
          overdue,
          completionRate: assignedTasks.length
            ? Math.round((completed / assignedTasks.length) * 100)
            : 0,
        };
      }),
    [activeMembers, filteredTasks, departments]
  );

  function exportDepartmentReport() {
    const rows = [
      [
        "Department",
        "Employees",
        "Tasks",
        "Completed",
        "Overdue",
        "Projects",
        "Meetings",
        "Completion Rate",
      ],
      ...visibleDepartmentStats.map((item) => [
        item.name,
        item.employees,
        item.tasks,
        item.completed,
        item.overdue,
        item.projects,
        item.meetings,
        `${item.completionRate}%`,
      ]),
    ];

    downloadCsv("talvorah-department-report.csv", rows);
  }

  function exportEmployeeReport() {
    const rows = [
      [
        "Employee ID",
        "Designation",
        "Department",
        "Assigned Tasks",
        "Completed",
        "Overdue",
        "Completion Rate",
      ],
      ...visibleEmployeeStats.map((item) => [
        item.id,
        item.designation,
        item.department,
        item.assigned,
        item.completed,
        item.overdue,
        `${item.completionRate}%`,
      ]),
    ];

    downloadCsv("talvorah-employee-report.csv", rows);
  }

  function exportProjectReport() {
    const rows = [
      ["Project", "Status", "Progress", "Budget", "Start", "Due"],
      ...filteredProjects.map((project) => [
        project.name,
        project.status,
        `${project.progress || 0}%`,
        String(project.budget || 0),
        project.start_date || "",
        project.due_date || "",
      ]),
    ];

    downloadCsv("talvorah-project-report.csv", rows);
  }

  function exportMeetingReport() {
    const rows = [
      ["Meeting", "Type", "Status", "Scheduled Start", "Scheduled End"],
      ...filteredMeetings.map((meeting) => [
        meeting.title,
        meeting.meeting_type || "",
        meeting.status,
        meeting.scheduled_start || "",
        meeting.scheduled_end || "",
      ]),
    ];

    downloadCsv("talvorah-meeting-report.csv", rows);
  }

  function exportAllReport() {
    const rows: (string | number)[][] = [
      ["TALVORAH ORGANISATION REPORT"],
      ["Generated", new Date().toLocaleString()],
      ["Reporting period", period === "all" ? "All time" : `Last ${period} days`],
      ["Organisation ID", organisationId],
      [],
      ["ORGANISATION SUMMARY"],
      ["Active employees", activeMembers.length],
      ["Tasks in period", filteredTasks.length],
      ["Completed tasks", completedTasks.length],
      ["Open tasks", openTasks.length],
      ["Overdue tasks", overdueTasks.length],
      ["Task completion rate", `${completionRate}%`],
      ["Projects in period", filteredProjects.length],
      ["Average project progress", `${averageProgress}%`],
      ["Total project budget", totalBudget],
      ["Meetings in period", filteredMeetings.length],
      [],
      ["DEPARTMENT PERFORMANCE"],
      [
        "Department",
        "Employees",
        "Tasks",
        "Completed",
        "Overdue",
        "Projects",
        "Meetings",
        "Completion rate",
      ],
      ...visibleDepartmentStats.map((item) => [
        item.name,
        item.employees,
        item.tasks,
        item.completed,
        item.overdue,
        item.projects,
        item.meetings,
        `${item.completionRate}%`,
      ]),
      [],
      ["EMPLOYEE PERFORMANCE"],
      [
        "Employee ID",
        "Designation",
        "Department",
        "Assigned",
        "Completed",
        "Overdue",
        "Completion rate",
      ],
      ...visibleEmployeeStats.map((item) => [
        item.id,
        item.designation,
        item.department,
        item.assigned,
        item.completed,
        item.overdue,
        `${item.completionRate}%`,
      ]),
      [],
      ["PROJECT PERFORMANCE"],
      ["Project", "Status", "Progress", "Budget", "Start", "Due"],
      ...filteredProjects.map((project) => [
        project.name,
        project.status,
        `${project.progress || 0}%`,
        String(project.budget || 0),
        project.start_date || "",
        project.due_date || "",
      ]),
      [],
      ["MEETING ACTIVITY"],
      ["Meeting", "Type", "Status", "Scheduled Start", "Scheduled End"],
      ...filteredMeetings.map((meeting) => [
        meeting.title,
        meeting.meeting_type || "",
        meeting.status,
        meeting.scheduled_start || "",
        meeting.scheduled_end || "",
      ]),
    ];

    downloadCsv("talvorah-organisation-report.csv", rows);
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              WORKSPACE / ANALYTICS
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[#142d4e] sm:text-3xl">
              Reports & Analytics
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Monitor organisation performance, departmental activity and work progress.
            </p>
            {lastUpdated && (
              <p className="mt-2 text-xs text-slate-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadReports}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              ↻ Refresh
            </button>
            <button
              onClick={exportAllReport}
              disabled={loading || !organisationId}
              className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              ↓ Export Full Report
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="text-lg"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#142d4e]">Report filters</p>
            <p className="mt-1 text-xs text-slate-400">
              Select the reporting period and department.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as Period)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-emerald-500"
            >
              {PERIODS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="all">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-24">
            <div className="mb-4 h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
            <p className="text-sm text-slate-500">
              Preparing organisation reports...
            </p>
          </div>
        ) : !error ? (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Active Employees"
                value={formatNumber(activeMembers.length)}
                description="Active organisation members"
                icon="👥"
                accent="bg-blue-50"
              />
              <StatCard
                title="Tasks Completed"
                value={formatNumber(completedTasks.length)}
                description={`${completionRate}% of tasks in the selected period`}
                icon="✓"
                accent="bg-emerald-50"
              />
              <StatCard
                title="Overdue Tasks"
                value={formatNumber(overdueTasks.length)}
                description="Uncompleted tasks past their due date"
                icon="⏱"
                accent="bg-red-50"
              />
              <StatCard
                title="Projects"
                value={formatNumber(filteredProjects.length)}
                description={`${activeProjects.length} active, planned or on hold`}
                icon="▦"
                accent="bg-purple-50"
              />
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-[#142d4e]">Task Performance</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Task status within the selected reporting period
                    </p>
                  </div>
                  <span className="text-xl">📋</span>
                </div>

                <div className="mb-6 flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-bold text-[#142d4e]">
                      {completionRate}%
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Completion rate</p>
                  </div>
                  <p className="text-sm text-slate-500">
                    {completedTasks.length} of {filteredTasks.length} tasks
                  </p>
                </div>

                <ProgressBar value={completionRate} />

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-emerald-50 p-3">
                    <p className="text-xl font-bold text-emerald-700">
                      {completedTasks.length}
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">Completed</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-xl font-bold text-blue-700">
                      {openTasks.length}
                    </p>
                    <p className="mt-1 text-xs text-blue-700">Open</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3">
                    <p className="text-xl font-bold text-red-700">
                      {overdueTasks.length}
                    </p>
                    <p className="mt-1 text-xs text-red-700">Overdue</p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-[#142d4e]">Project Overview</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Project status and overall progress
                    </p>
                  </div>
                  <span className="text-xl">📊</span>
                </div>

                <div className="mb-5 flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-bold text-[#142d4e]">
                      {averageProgress}%
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Average project progress
                    </p>
                  </div>
                  <p className="text-sm text-slate-500">
                    {filteredProjects.length} projects
                  </p>
                </div>

                <ProgressBar value={averageProgress} color="bg-purple-500" />

                <div className="mt-6 space-y-3">
                  {projectStatusCounts.map((item) => {
                    const percentage = filteredProjects.length
                      ? (item.count / filteredProjects.length) * 100
                      : 0;

                    return (
                      <div key={item.label}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-slate-600">{item.label}</span>
                          <span className="font-semibold text-[#142d4e]">
                            {item.count}
                          </span>
                        </div>
                        <ProgressBar value={percentage} color={item.color} />
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-bold text-[#142d4e]">Department Performance</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Compare workforce, tasks, projects and meeting activity by department.
                  </p>
                </div>
                <button
                  onClick={exportDepartmentReport}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ↓ Export Departments
                </button>
              </div>

              {visibleDepartmentStats.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">
                  No department records found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[750px] text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-400">
                        <th className="pb-3 font-medium">Department</th>
                        <th className="pb-3 font-medium">Employees</th>
                        <th className="pb-3 font-medium">Tasks</th>
                        <th className="pb-3 font-medium">Completed</th>
                        <th className="pb-3 font-medium">Overdue</th>
                        <th className="pb-3 font-medium">Projects</th>
                        <th className="pb-3 font-medium">Meetings</th>
                        <th className="pb-3 font-medium">Completion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDepartmentStats.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-50 last:border-0"
                        >
                          <td className="py-4 pr-4 text-sm font-semibold text-[#142d4e]">
                            {item.name}
                          </td>
                          <td className="py-4 text-sm text-slate-600">{item.employees}</td>
                          <td className="py-4 text-sm text-slate-600">{item.tasks}</td>
                          <td className="py-4 text-sm font-semibold text-emerald-700">
                            {item.completed}
                          </td>
                          <td className="py-4 text-sm font-semibold text-red-600">
                            {item.overdue}
                          </td>
                          <td className="py-4 text-sm text-slate-600">{item.projects}</td>
                          <td className="py-4 text-sm text-slate-600">{item.meetings}</td>
                          <td className="min-w-[130px] py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <ProgressBar value={item.completionRate} />
                              </div>
                              <span className="text-xs font-semibold text-slate-600">
                                {item.completionRate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-bold text-[#142d4e]">
                    Employee Task Performance
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Assigned tasks, completed work and overdue tasks.
                  </p>
                </div>
                <button
                  onClick={exportEmployeeReport}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ↓ Export Employee Report
                </button>
              </div>

              {visibleEmployeeStats.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">
                  No employee records found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-400">
                        <th className="pb-3 font-medium">Employee ID</th>
                        <th className="pb-3 font-medium">Designation</th>
                        <th className="pb-3 font-medium">Department</th>
                        <th className="pb-3 font-medium">Assigned</th>
                        <th className="pb-3 font-medium">Completed</th>
                        <th className="pb-3 font-medium">Overdue</th>
                        <th className="pb-3 font-medium">Completion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleEmployeeStats.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-50 last:border-0"
                        >
                          <td className="py-4 pr-3 font-mono text-xs text-slate-500">
                            {item.id.slice(0, 8)}…
                          </td>
                          <td className="py-4 text-sm text-slate-700">{item.designation}</td>
                          <td className="py-4 text-sm text-slate-600">{item.department}</td>
                          <td className="py-4 text-sm text-slate-600">{item.assigned}</td>
                          <td className="py-4 text-sm font-semibold text-emerald-700">
                            {item.completed}
                          </td>
                          <td className="py-4 text-sm font-semibold text-red-600">
                            {item.overdue}
                          </td>
                          <td className="min-w-[130px] py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <ProgressBar value={item.completionRate} />
                              </div>
                              <span className="text-xs font-semibold text-slate-600">
                                {item.completionRate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mt-4 text-xs text-slate-400">
                Employee identifiers are shown instead of personal names because
                the supplied database schema does not include employee profile names.
              </p>
            </section>

            <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-[#142d4e]">Project Register</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Project progress, budgets and deadlines
                    </p>
                  </div>
                  <button
                    onClick={exportProjectReport}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    Export CSV
                  </button>
                </div>

                {filteredProjects.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    No projects found for this period.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {filteredProjects.map((project) => (
                      <div key={project.id}>
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#142d4e]">
                              {project.name}
                            </p>
                            <p className="mt-1 text-xs capitalize text-slate-400">
                              {project.status.replace(/_/g, " ")}
                              {" · "}
                              Due {formatDate(project.due_date)}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-bold text-purple-700">
                            {project.progress || 0}%
                          </span>
                        </div>
                        <ProgressBar
                          value={project.progress || 0}
                          color="bg-purple-500"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-400">
                    Combined recorded project budget
                  </p>
                  <p className="mt-1 text-xl font-bold text-[#142d4e]">
                    {formatCurrency(totalBudget)}
                  </p>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-[#142d4e]">Meeting Activity</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Meetings scheduled within the selected period
                    </p>
                  </div>
                  <button
                    onClick={exportMeetingReport}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    Export CSV
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-3xl font-bold text-blue-700">
                      {filteredMeetings.length}
                    </p>
                    <p className="mt-1 text-xs text-blue-700">Total meetings</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="text-3xl font-bold text-emerald-700">
                      {completedMeetings.length}
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">Completed</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-4">
                    <p className="text-3xl font-bold text-amber-700">
                      {scheduledMeetings.length}
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      Scheduled or live
                    </p>
                  </div>
                  <div className="rounded-xl bg-purple-50 p-4">
                    <p className="text-3xl font-bold text-purple-700">
                      {
                        filteredMeetings.filter(
                          (meeting) => meeting.meeting_type === "instant"
                        ).length
                      }
                    </p>
                    <p className="mt-1 text-xs text-purple-700">Instant meetings</p>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Recent meetings
                  </p>

                  {filteredMeetings.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      No meeting records found.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {filteredMeetings
                        .slice()
                        .sort((a, b) =>
                          (b.scheduled_start || "").localeCompare(
                            a.scheduled_start || ""
                          )
                        )
                        .slice(0, 5)
                        .map((meeting) => (
                          <div
                            key={meeting.id}
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[#142d4e]">
                                {meeting.title}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {formatDate(meeting.scheduled_start)}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] capitalize text-slate-600">
                              {meeting.status}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold text-[#142d4e]">Reporting Notes</h2>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
                <li>
                  • Task and project reporting periods are based on their
                  creation dates.
                </li>
                <li>
                  • Meeting reporting periods are based on scheduled start
                  dates, falling back to creation dates when no schedule exists.
                </li>
                <li>
                  • Overdue tasks are uncompleted tasks whose due dates have
                  passed.
                </li>
                <li>
                  • Employee performance uses assigned task records and
                  organisation membership IDs.
                </li>
                <li>
                  • These reports reflect the records currently accessible
                  under your Supabase permissions.
                </li>
              </ul>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}


"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import OrganisationSwitcher from "@/components/OrganisationSwitcher";
import { createClient } from "@/utils/supabase/client";

type Task = {
  id: string;
  organisation_id: string;
  project_id: string | null;
  department_id: string;
  title: string;
  description: string | null;
  assigned_to_member_id: string;
  created_by_member_id: string;
  priority: string;
  status: string;
  due_date: string | null;
  visibility: "public" | "private";
  created_at?: string;
};

type Department = {
  id: string;
  name: string;
  head_member_id: string | null;
};

type Member = {
  id: string;
  department_id: string | null;
  role: string;
  status: string;
};

const STATUSES = ["Pending", "In Progress", "Completed"];
const PRIORITIES = ["Low", "Medium", "High"];

export default function TasksPage() {
  const supabase = useMemo(() => createClient(), []);

  const [organisationId, setOrganisationId] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [myMemberId, setMyMemberId] = useState("");
  const [myDepartmentId, setMyDepartmentId] = useState("");
  const [myRole, setMyRole] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  const isOrganisationAdmin =
    myRole === "organisation_admin" || myRole === "super_admin";

  const isDepartmentHead = (id: string) =>
    departments.some(
      (department) =>
        department.id === id && department.head_member_id === myMemberId
    );

  const canCreateInDepartment = (id: string) =>
    isOrganisationAdmin || isDepartmentHead(id);

  const canCreate = isOrganisationAdmin || isDepartmentHead(myDepartmentId);

  const loadData = useCallback(async () => {
    const activeOrganisation =
      localStorage.getItem("talvorah_organisation_id") || "";

    if (!activeOrganisation) {
      setOrganisationId("");
      setTasks([]);
      setDepartments([]);
      setMembers([]);
      setMyMemberId("");
      setMyDepartmentId("");
      setMyRole("");
      setError("Select an organisation to view its tasks.");
      setLoading(false);
      return;
    }

    setOrganisationId(activeOrganisation);
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please sign in again.");

      const { data: membershipData, error: membershipError } =
        await supabase
          .from("organisation_members")
          .select("id, department_id, role, status")
          .eq("organisation_id", activeOrganisation)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

      if (membershipError) throw membershipError;

      if (!membershipData) {
        throw new Error("You do not have active access to this organisation.");
      }

      setMyMemberId(membershipData.id);
      setMyDepartmentId(membershipData.department_id || "");
      setMyRole(membershipData.role || "");

      const [
        { data: taskData, error: taskError },
        { data: departmentData, error: departmentError },
        { data: memberData, error: memberError },
      ] = await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .eq("organisation_id", activeOrganisation)
          .order("created_at", { ascending: false }),

        supabase
          .from("departments")
          .select("id, name, head_member_id")
          .eq("organisation_id", activeOrganisation)
          .order("name"),

        supabase
          .from("organisation_members")
          .select("id, department_id, role, status")
          .eq("organisation_id", activeOrganisation)
          .eq("status", "active"),
      ]);

      if (taskError) throw taskError;
      if (departmentError) throw departmentError;
      if (memberError) throw memberError;

      setTasks((taskData || []) as Task[]);
      setDepartments((departmentData || []) as Department[]);
      setMembers((memberData || []) as Member[]);

      setDepartmentId(membershipData.department_id || "");
    } catch (err) {
      console.error("Tasks loading error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to load tasks."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();

    const handleOrganisationChanged = () => {
      setTasks([]);
      setMembers([]);
      setDepartments([]);
      setMyMemberId("");
      setMyDepartmentId("");
      setMyRole("");
      setShowCreate(false);
      loadData();
    };

    window.addEventListener(
      "talvorah:organisation-changed",
      handleOrganisationChanged
    );

    return () => {
      window.removeEventListener(
        "talvorah:organisation-changed",
        handleOrganisationChanged
      );
    };
  }, [loadData]);

  const departmentName = (id: string) =>
    departments.find((department) => department.id === id)?.name ||
    "Department";

  const memberLabel = (member: Member) =>
    `${departmentName(member.department_id || "")} — ${member.id.slice(0, 8)}`;

  const filteredTasks = tasks.filter((task) => {
    const matchesFilter = filter === "All" || task.status === filter;

    const matchesSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      (task.description || "").toLowerCase().includes(search.toLowerCase()) ||
      departmentName(task.department_id)
        .toLowerCase()
        .includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  async function writeTaskAudit({
    action,
    title: auditTitle,
    description: auditDescription,
    task,
    beforeData,
    afterData,
  }: {
    action: string;
    title: string;
    description: string;
    task: Task;
    beforeData?: Record<string, unknown> | null;
    afterData?: Record<string, unknown> | null;
  }) {
    const { error: auditError } = await supabase.rpc("write_audit_log", {
      p_organisation_id: organisationId,
      p_category: "task",
      p_action: action,
      p_title: auditTitle,
      p_description: auditDescription,
      p_entity_type: "task",
      p_entity_id: task.id,
      p_actor_member_id: myMemberId,
      p_acting_as: myRole.replaceAll("_", " "),
      p_before_data: beforeData || null,
      p_after_data: afterData || null,
      p_metadata: {
        source: "tasks",
        department_id: task.department_id,
        assigned_to_member_id: task.assigned_to_member_id,
      },
    });

    if (auditError) {
      console.error("Task audit logging failed:", auditError);
      return false;
    }

    return true;
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!title.trim() || !departmentId || !assignedTo || !myMemberId) {
      setError("Complete the task title, department and assignee.");
      return;
    }

    if (!canCreateInDepartment(departmentId)) {
      setError("Only an organisation administrator or the relevant Department Head can assign tasks to this department.");
      return;
    }

    const selectedMember = members.find((member) => member.id === assignedTo);

    if (!selectedMember || selectedMember.department_id !== departmentId) {
      setError("The selected employee must belong to the task department.");
      return;
    }

    setSaving(true);

    try {
      const { data, error: insertError } = await supabase
        .from("tasks")
        .insert({
          organisation_id: organisationId,
          department_id: departmentId,
          title: title.trim(),
          description: description.trim() || null,
          assigned_to_member_id: assignedTo,
          created_by_member_id: myMemberId,
          priority,
          status: "Pending",
          due_date: dueDate || null,
          visibility,
        })
        .select("*")
        .single();

      if (insertError) throw insertError;

      const createdTask = data as Task;

      setTasks((current) => [createdTask, ...current]);

      const auditSaved = await writeTaskAudit({
        action: "task_created",
        title: "Task created",
        description: `The task "${createdTask.title}" was assigned to an employee in ${departmentName(createdTask.department_id)}.`,
        task: createdTask,
        afterData: {
          title: createdTask.title,
          description: createdTask.description,
          department_id: createdTask.department_id,
          assigned_to_member_id: createdTask.assigned_to_member_id,
          priority: createdTask.priority,
          status: createdTask.status,
          due_date: createdTask.due_date,
          visibility: createdTask.visibility,
        },
      });

      setShowCreate(false);
      setTitle("");
      setDescription("");
      setAssignedTo("");
      setPriority("Medium");
      setDueDate("");
      setVisibility("public");

      setNotice(
        auditSaved
          ? "Task created successfully."
          : "Task created, but its audit record could not be saved."
      );
    } catch (err) {
      console.error("Task creation error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create task. Check your permissions."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(task: Task, newStatus: string) {
    if (task.status === newStatus || saving) return;

    if (!canUpdateTask(task)) {
      setError("You are not authorised to update this task.");
      return;
    }

    setError("");
    setNotice("");
    setSaving(true);

    const previousStatus = task.status;

    try {
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", task.id)
        .eq("organisation_id", organisationId);

      if (updateError) throw updateError;

      const auditSaved = await writeTaskAudit({
        action: "task_status_changed",
        title: "Task status changed",
        description: `The status of "${task.title}" changed from ${previousStatus} to ${newStatus}.`,
        task,
        beforeData: { status: previousStatus },
        afterData: { status: newStatus },
      });

      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, status: newStatus } : item
        )
      );

      setNotice(
        auditSaved
          ? "Task status updated."
          : "Task status updated, but its audit record could not be saved."
      );
    } catch (err) {
      console.error("Task status update error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to update task."
      );
    } finally {
      setSaving(false);
    }
  }

  function canUpdateTask(task: Task) {
    return (
      task.assigned_to_member_id === myMemberId ||
      isOrganisationAdmin ||
      isDepartmentHead(task.department_id)
    );
  }

  function statusStyle(status: string) {
    if (status === "Completed") return "bg-green-100 text-green-700";
    if (status === "In Progress") return "bg-blue-100 text-blue-700";
    return "bg-amber-100 text-amber-700";
  }

  function priorityStyle(value: string) {
    if (value === "High") return "text-red-600";
    if (value === "Medium") return "text-amber-600";
    return "text-slate-500";
  }

  const totalTasks = tasks.length;
  const inProgress = tasks.filter(
    (task) => task.status === "In Progress"
  ).length;
  const pending = tasks.filter((task) => task.status === "Pending").length;
  const completed = tasks.filter(
    (task) => task.status === "Completed"
  ).length;

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-800 md:flex">
      <aside className="w-full border-b border-slate-200 bg-[#102039] p-5 text-white md:min-h-screen md:w-[260px] md:border-b-0 md:border-r md:border-slate-700">
        <h1 className="mb-8 text-2xl font-bold tracking-tight">
          Talvorah<span className="text-green-400">.</span>
        </h1>

        <OrganisationSwitcher />

        <p className="mb-4 mt-9 text-[10px] font-bold tracking-[2px] text-slate-400">
          WORKSPACE
        </p>

        <nav className="space-y-1">
          {[
            ["Overview", "/dashboard"],
            ["My Tasks", "/dashboard/tasks"],
            ["Projects", "/dashboard/projects"],
            ["Messages", "/dashboard/messages"],
            ["Calendar", "/dashboard/calendar"],
            ["Team Members", "/dashboard/team"],
            ["Documents", "/dashboard/documents"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className={`block rounded-xl px-4 py-3 text-sm transition ${
                label === "My Tasks"
                  ? "bg-green-600 font-semibold text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-9">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm text-slate-500">
              Workspace / Tasks
            </p>
            <h2 className="text-3xl font-bold text-slate-900">Tasks</h2>
            <p className="mt-2 text-sm text-slate-500">
              Manage assignments and track departmental work.
            </p>
          </div>

          {canCreate && (
            <button
              onClick={() => {
                setError("");
                setNotice("");
                setDepartmentId(myDepartmentId || "");
                setAssignedTo("");
                setShowCreate(true);
              }}
              className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
            >
              + Create Task
            </button>
          )}
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {notice}
          </div>
        )}

        <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Total Tasks", totalTasks],
            ["In Progress", inProgress],
            ["Pending", pending],
            ["Completed", completed],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {loading ? "—" : value}
              </p>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Task List</h3>
              <p className="mt-1 text-xs text-slate-500">
                Tasks shown here are limited by your organisation and database access permissions.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-green-500 lg:max-w-xs"
            />
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {["All", ...STATUSES].map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  filter === item
                    ? "bg-green-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">
              Loading tasks...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-medium text-slate-700">No tasks found</p>
              <p className="mt-1 text-sm text-slate-500">
                Tasks assigned to you or visible to your department will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-4 pr-4 font-semibold">Task</th>
                    <th className="pb-4 pr-4 font-semibold">Department</th>
                    <th className="pb-4 pr-4 font-semibold">Visibility</th>
                    <th className="pb-4 pr-4 font-semibold">Priority</th>
                    <th className="pb-4 pr-4 font-semibold">Due Date</th>
                    <th className="pb-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-5 pr-4">
                        <p className="font-semibold text-slate-800">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="mt-1 max-w-xs text-xs text-slate-500">
                            {task.description}
                          </p>
                        )}
                      </td>

                      <td className="py-5 pr-4 text-slate-600">
                        {departmentName(task.department_id)}
                      </td>

                      <td className="py-5 pr-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs capitalize text-slate-600">
                          {task.visibility || "public"}
                        </span>
                      </td>

                      <td
                        className={`py-5 pr-4 font-semibold ${priorityStyle(task.priority)}`}
                      >
                        {task.priority}
                      </td>

                      <td className="py-5 pr-4 text-slate-500">
                        {task.due_date
                          ? new Date(
                              `${task.due_date}T00:00:00`
                            ).toLocaleDateString()
                          : "Not set"}
                      </td>

                      <td className="py-5">
                        {canUpdateTask(task) ? (
                          <select
                            value={task.status}
                            disabled={saving}
                            onChange={(event) =>
                              updateStatus(task, event.target.value)
                            }
                            className={`rounded-lg border-0 px-3 py-2 text-xs font-semibold outline-none ${statusStyle(task.status)}`}
                          >
                            {STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`rounded-lg px-3 py-2 text-xs font-semibold ${statusStyle(task.status)}`}
                          >
                            {task.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Create a task
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Assign work to an employee in the selected department.
                </p>
              </div>

              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg px-3 py-1 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={createTask} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Task title
                </label>
                <input
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Enter task title"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the work to be completed..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Department
                  </label>
                  <select
                    required
                    value={departmentId}
                    onChange={(event) => {
                      setDepartmentId(event.target.value);
                      setAssignedTo("");
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500"
                  >
                    <option value="">Select department</option>
                    {departments
                      .filter((department) =>
                        isOrganisationAdmin
                          ? true
                          : department.id === myDepartmentId &&
                            isDepartmentHead(department.id)
                      )
                      .map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Assign to
                  </label>
                  <select
                    required
                    value={assignedTo}
                    onChange={(event) => setAssignedTo(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500"
                  >
                    <option value="">Select employee</option>
                    {members
                      .filter(
                        (member) => member.department_id === departmentId
                      )
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {memberLabel(member)}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500"
                  >
                    {PRIORITIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Due date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Task visibility
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label
                    className={`cursor-pointer rounded-xl border p-4 ${
                      visibility === "public"
                        ? "border-green-500 bg-green-50"
                        : "border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={visibility === "public"}
                      onChange={() => setVisibility("public")}
                      className="mr-2 accent-green-600"
                    />
                    <span className="font-semibold text-slate-800">
                      Public
                    </span>
                    <p className="mt-1 pl-6 text-xs text-slate-500">
                      Visible to members of the task department.
                    </p>
                  </label>

                  <label
                    className={`cursor-pointer rounded-xl border p-4 ${
                      visibility === "private"
                        ? "border-green-500 bg-green-50"
                        : "border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value="private"
                      checked={visibility === "private"}
                      onChange={() => setVisibility("private")}
                      className="mr-2 accent-green-600"
                    />
                    <span className="font-semibold text-slate-800">
                      Private
                    </span>
                    <p className="mt-1 pl-6 text-xs text-slate-500">
                      Visible to the assignee and authorised supervisors.
                    </p>
                  </label>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

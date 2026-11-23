
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
  user_id: string;
  role: string;
};

type Project = {
  id: string;
  organisation_id: string;
  department_id: string | null;
  name: string;
  description: string | null;
  manager_member_id: string | null;
  budget: number | null;
  start_date: string | null;
  due_date: string | null;
  progress: number;
  status: string;
  created_at: string;
};

const STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const EMPTY_FORM = {
  name: "",
  description: "",
  department_id: "",
  manager_member_id: "",
  budget: "",
  start_date: "",
  due_date: "",
};

export default function ProjectsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [organisationId, setOrganisationId] = useState("");
  const [actorMemberId, setActorMemberId] = useState<string | null>(null);
  const [role, setRole] = useState("");
  const [isPlatformSuperAdmin, setIsPlatformSuperAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const canManage =
    role === "organisation_admin" ||
    role === "super_admin" ||
    isPlatformSuperAdmin;

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please sign in again.");

      const selectedOrg =
        localStorage.getItem("talvorah_organisation_id") || "";

      if (!selectedOrg) {
        setOrganisationId("");
        setProjects([]);
        setDepartments([]);
        setMembers([]);
        setActorMemberId(null);
        setError("Select an organisation to view its projects.");
        return;
      }

      setOrganisationId(selectedOrg);

      const [membershipResult, superAdminResult] = await Promise.all([
        supabase
          .from("organisation_members")
          .select("id, role")
          .eq("organisation_id", selectedOrg)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle(),

        supabase.rpc("is_platform_super_admin"),
      ]);

      if (membershipResult.error) throw membershipResult.error;
      if (superAdminResult.error) throw superAdminResult.error;

      const platformAdmin = superAdminResult.data === true;
      const membership = membershipResult.data;

      if (!membership && !platformAdmin) {
        throw new Error("You do not have access to this organisation.");
      }

      setIsPlatformSuperAdmin(platformAdmin);
      setActorMemberId(membership?.id || null);
      setRole(membership?.role || "");

      const [projectResult, departmentResult, memberResult] =
        await Promise.all([
          supabase
            .from("projects")
            .select(
              "id, organisation_id, department_id, name, description, manager_member_id, budget, start_date, due_date, progress, status, created_at"
            )
            .eq("organisation_id", selectedOrg)
            .order("created_at", { ascending: false }),

          supabase
            .from("departments")
            .select("id, name")
            .eq("organisation_id", selectedOrg)
            .order("name"),

          supabase
            .from("organisation_members")
            .select("id, user_id, role")
            .eq("organisation_id", selectedOrg)
            .eq("status", "active"),
        ]);

      if (projectResult.error) throw projectResult.error;
      if (departmentResult.error) throw departmentResult.error;
      if (memberResult.error) throw memberResult.error;

      setProjects((projectResult.data || []) as Project[]);
      setDepartments(departmentResult.data || []);
      setMembers(memberResult.data || []);
    } catch (err) {
      console.error("Projects loading error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to load projects."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadProjects();

    const handleOrganisationChange = () => {
      setError("");
      setSuccess("");
      setShowForm(false);
      loadProjects();
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
  }, [loadProjects]);

  async function writeAuditLog({
    action,
    title,
    description,
    projectId,
    beforeData,
    afterData,
  }: {
    action: string;
    title: string;
    description: string;
    projectId: string;
    beforeData?: Record<string, unknown> | null;
    afterData?: Record<string, unknown> | null;
  }) {
    const { error: auditError } = await supabase.rpc("write_audit_log", {
      p_organisation_id: organisationId,
      p_category: "project",
      p_action: action,
      p_title: title,
      p_description: description,
      p_entity_type: "project",
      p_entity_id: projectId,
      p_actor_member_id: actorMemberId,
      p_acting_as: isPlatformSuperAdmin
        ? "Platform Super Admin"
        : role.replaceAll("_", " "),
      p_before_data: beforeData || null,
      p_after_data: afterData || null,
      p_metadata: {
        source: "projects",
        organisation_id: organisationId,
      },
    });

    if (auditError) {
      console.error("Project audit logging failed:", auditError);
      return false;
    }

    return true;
  }

  function openCreateForm() {
    setEditingProject(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(project: Project) {
    setEditingProject(project);
    setForm({
      name: project.name,
      description: project.description || "",
      department_id: project.department_id || "",
      manager_member_id: project.manager_member_id || "",
      budget: project.budget?.toString() || "",
      start_date: project.start_date || "",
      due_date: project.due_date || "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  async function saveProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManage) {
      setError("You do not have permission to manage projects.");
      return;
    }

    if (!form.name.trim()) {
      setError("Enter a project name.");
      return;
    }

    if (
      form.start_date &&
      form.due_date &&
      form.due_date < form.start_date
    ) {
      setError("The completion date cannot be earlier than the start date.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const projectData = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        department_id: form.department_id || null,
        manager_member_id: form.manager_member_id || null,
        budget: form.budget.trim() ? Number(form.budget) : null,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
      };

      if (projectData.budget !== null && projectData.budget < 0) {
        throw new Error("Project budget cannot be negative.");
      }

      if (editingProject) {
        const beforeData = {
          name: editingProject.name,
          description: editingProject.description,
          department_id: editingProject.department_id,
          manager_member_id: editingProject.manager_member_id,
          budget: editingProject.budget,
          start_date: editingProject.start_date,
          due_date: editingProject.due_date,
        };

        const { error: updateError } = await supabase
          .from("projects")
          .update(projectData)
          .eq("id", editingProject.id)
          .eq("organisation_id", organisationId);

        if (updateError) throw updateError;

        const auditSaved = await writeAuditLog({
          action: "project_updated",
          title: "Project details updated",
          description: `The project "${projectData.name}" was updated.`,
          projectId: editingProject.id,
          beforeData,
          afterData: projectData,
        });

        setSuccess(
          auditSaved
            ? "Project updated successfully."
            : "Project updated, but its audit record could not be saved."
        );
      } else {
        const { data: createdProject, error: createError } = await supabase
          .from("projects")
          .insert({
            organisation_id: organisationId,
            ...projectData,
            progress: 0,
            status: "planned",
          })
          .select("id")
          .single();

        if (createError) throw createError;

        const auditSaved = await writeAuditLog({
          action: "project_created",
          title: "Project created",
          description: `The project "${projectData.name}" was created.`,
          projectId: createdProject.id,
          afterData: {
            ...projectData,
            progress: 0,
            status: "planned",
          },
        });

        setSuccess(
          auditSaved
            ? "Project created successfully."
            : "Project created, but its audit record could not be saved."
        );
      }

      setShowForm(false);
      setEditingProject(null);
      setForm(EMPTY_FORM);
      await loadProjects();
    } catch (err) {
      console.error("Project save error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to save project."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateProjectStatus(project: Project, status: string) {
    if (!canManage) return;
    if (project.status === status) return;

    const beforeData = {
      status: project.status,
      progress: project.progress,
    };

    const newProgress =
      status === "completed" ? 100 : project.progress;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          status,
          progress: newProgress,
        })
        .eq("id", project.id)
        .eq("organisation_id", organisationId);

      if (updateError) throw updateError;

      const auditSaved = await writeAuditLog({
        action: "project_status_changed",
        title: "Project status changed",
        description: `The status of "${project.name}" changed from ${project.status} to ${status}.`,
        projectId: project.id,
        beforeData,
        afterData: {
          status,
          progress: newProgress,
        },
      });

      setSuccess(
        auditSaved
          ? "Project status updated."
          : "Project updated, but its audit record could not be saved."
      );

      await loadProjects();
    } catch (err) {
      console.error("Project status update error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to update project."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateProgress(project: Project, progress: number) {
    if (!canManage || progress === project.progress) return;

    const beforeData = { progress: project.progress };

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          progress,
          status: progress === 100 ? "completed" : project.status,
        })
        .eq("id", project.id)
        .eq("organisation_id", organisationId);

      if (updateError) throw updateError;

      const auditSaved = await writeAuditLog({
        action: "project_progress_updated",
        title: "Project progress updated",
        description: `Progress on "${project.name}" changed from ${project.progress}% to ${progress}%.`,
        projectId: project.id,
        beforeData,
        afterData: {
          progress,
          status: progress === 100 ? "completed" : project.status,
        },
      });

      setSuccess(
        auditSaved
          ? "Project progress updated."
          : "Progress updated, but its audit record could not be saved."
      );

      await loadProjects();
    } catch (err) {
      console.error("Project progress update error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to update progress."
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredProjects = projects.filter((project) => {
    const departmentName =
      departments.find((department) => department.id === project.department_id)
        ?.name || "";

    const matchesSearch =
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      departmentName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getDepartmentName = (id: string | null) =>
    departments.find((department) => department.id === id)?.name ||
    "Unassigned department";

  const getManagerName = (id: string | null) => {
    const member = members.find((item) => item.id === id);
    return member
      ? `${member.role.replaceAll("_", " ")} · ${member.user_id.slice(0, 8)}`
      : "Not assigned";
  };

  const countStatus = (status: string) =>
    projects.filter((project) => project.status === status).length;

  const formatMoney = (value: number | null) =>
    value === null
      ? "Not specified"
      : new Intl.NumberFormat("en-NG", {
          style: "currency",
          currency: "NGN",
          maximumFractionDigits: 0,
        }).format(value);

  const statusStyle = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-400";
      case "active":
        return "bg-blue-500/10 text-blue-400";
      case "on_hold":
        return "bg-amber-500/10 text-amber-400";
      case "cancelled":
        return "bg-red-500/10 text-red-400";
      default:
        return "bg-slate-500/10 text-slate-300";
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <div className="mx-auto max-w-[1500px] p-5 md:p-8 lg:p-10">
        <header className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <p className="mb-2 text-sm text-slate-400">
              Workspace / Projects
            </p>
            <h1 className="text-3xl font-bold md:text-4xl">
              Project Management
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Plan, coordinate and monitor projects across your organisation.
            </p>
          </div>

          <div className="w-full lg:max-w-xs">
            <OrganisationSwitcher />
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {success}
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Total Projects", projects.length],
            ["Planned", countStatus("planned")],
            ["Active", countStatus("active")],
            ["On Hold", countStatus("on_hold")],
            ["Completed", countStatus("completed")],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-white/10 bg-[#151f30] p-5"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-4 text-3xl font-bold tabular-nums">
                {loading ? "—" : value}
              </p>
            </div>
          ))}
        </section>

        <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-semibold">All Projects</h2>
            <p className="mt-1 text-sm text-slate-400">
              Projects registered in the selected organisation.
            </p>
          </div>

          {canManage && (
            <button
              onClick={openCreateForm}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold hover:bg-emerald-500"
            >
              + Create Project
            </button>
          )}
        </section>

        {showForm && (
          <form
            onSubmit={saveProject}
            className="mb-8 rounded-2xl border border-white/10 bg-[#151f30] p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {editingProject ? "Edit Project" : "Create New Project"}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Provide the project details and assignments.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-xl text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Project Name *
                </label>
                <input
                  required
                  maxLength={150}
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Enter project name"
                  className="w-full rounded-xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Department
                </label>
                <select
                  value={form.department_id}
                  onChange={(e) =>
                    setForm({ ...form, department_id: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Project Manager
                </label>
                <select
                  value={form.manager_member_id}
                  onChange={(e) =>
                    setForm({ ...form, manager_member_id: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="">Select project manager</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.role.replaceAll("_", " ")} ·{" "}
                      {member.user_id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Project Budget (₦)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.budget}
                  onChange={(e) =>
                    setForm({ ...form, budget: e.target.value })
                  }
                  placeholder="e.g. 5000000"
                  className="w-full rounded-xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Start Date
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) =>
                    setForm({ ...form, start_date: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Target Completion Date
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm({ ...form, due_date: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-slate-300">
                  Project Description
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Describe the project, objectives and expected outcomes..."
                  className="w-full rounded-xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingProject
                    ? "Save Changes"
                    : "Create Project"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <section className="mb-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects or departments..."
            className="w-full rounded-xl border border-white/10 bg-[#151f30] px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#151f30] px-4 py-3 text-sm outline-none focus:border-emerald-500 sm:w-52"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <button
            onClick={loadProjects}
            disabled={loading}
            className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            Refresh
          </button>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-[#151f30] p-12 text-center text-slate-400">
            Loading projects...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#151f30] p-12 text-center">
            <h3 className="font-semibold">No projects found</h3>
            <p className="mt-2 text-sm text-slate-400">
              {projects.length === 0
                ? "Create a project to begin tracking organisational work."
                : "Try changing your search or status filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <article
                key={project.id}
                className="rounded-2xl border border-white/10 bg-[#151f30] p-5 md:p-6"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        {project.name}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle(project.status)}`}
                      >
                        {project.status.replaceAll("_", " ")}
                      </span>
                    </div>

                    <p className="text-sm text-slate-400">
                      {getDepartmentName(project.department_id)}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      {project.description || "No project description provided."}
                    </p>
                  </div>

                  {canManage && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openEditForm(project)}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
                      >
                        Edit
                      </button>

                      <select
                        value={project.status}
                        disabled={saving}
                        onChange={(e) =>
                          updateProjectStatus(project, e.target.value)
                        }
                        className="rounded-lg border border-white/10 bg-[#0b1220] px-3 py-2 text-xs text-slate-300 outline-none"
                      >
                        {STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">Project Manager</p>
                    <p className="mt-2 text-sm text-slate-200">
                      {getManagerName(project.manager_member_id)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Budget</p>
                    <p className="mt-2 text-sm text-slate-200">
                      {formatMoney(project.budget)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Start Date</p>
                    <p className="mt-2 text-sm text-slate-200">
                      {project.start_date || "Not specified"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Target Completion</p>
                    <p className="mt-2 text-sm text-slate-200">
                      {project.due_date || "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm text-slate-400">Project Progress</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {project.progress}%
                    </p>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, project.progress))}%`,
                      }}
                    />
                  </div>

                  {canManage && (
                    <div className="mt-4 flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={project.progress}
                        disabled={saving}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setProjects((current) =>
                            current.map((item) =>
                              item.id === project.id
                                ? { ...item, progress: value }
                                : item
                            )
                          );
                        }}
                        onMouseUp={(e) => {
                          const value = Number(
                            (e.target as HTMLInputElement).value
                          );
                          updateProgress(project, value);
                        }}
                        onTouchEnd={(e) => {
                          const value = Number(
                            (e.target as HTMLInputElement).value
                          );
                          updateProgress(project, value);
                        }}
                        className="w-full accent-emerald-500"
                      />
                      <span className="whitespace-nowrap text-xs text-slate-500">
                        Adjust progress
                      </span>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import OrganisationSwitcher from "@/components/OrganisationSwitcher";

type Department = {
  id: string;
  organisation_id: string;
  name: string;
  description: string | null;
  head_member_id: string | null;
  created_at: string;
};

type DepartmentStats = {
  employees: number;
  projects: number;
  tasks: number;
};

type FormState = {
  name: string;
  description: string;
};

const EMPTY_FORM: FormState = { name: "", description: "" };

export default function DepartmentsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<Record<string, DepartmentStats>>({});
  const [organisationId, setOrganisationId] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [role, setRole] = useState("");
  const [actorMemberId, setActorMemberId] = useState<string | null>(null);
  const [isPlatformSuperAdmin, setIsPlatformSuperAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] =
    useState<Department | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const canManage =
    role === "organisation_admin" || isPlatformSuperAdmin;

  const writeAuditLog = async (details: {
    action: string;
    title: string;
    description: string;
    departmentId: string;
    beforeData?: Record<string, unknown> | null;
    afterData?: Record<string, unknown> | null;
  }) => {
    const { error: auditError } = await supabase.rpc("write_audit_log", {
      p_organisation_id: organisationId,
      p_category: "department",
      p_action: details.action,
      p_title: details.title,
      p_description: details.description,
      p_entity_type: "department",
      p_entity_id: details.departmentId,
      p_actor_member_id: actorMemberId,
      p_acting_as: isPlatformSuperAdmin
        ? "Platform Super Admin"
        : role.replaceAll("_", " "),
      p_before_data: details.beforeData || null,
      p_after_data: details.afterData || null,
      p_metadata: {
        source: "departments",
        organisation_id: organisationId,
      },
    });

    if (auditError) {
      console.error("Department audit logging failed:", auditError);
      return false;
    }

    return true;
  };

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please sign in again.");

      const selectedOrg = localStorage.getItem("talvorah_organisation_id");

      if (!selectedOrg) {
        setDepartments([]);
        setStats({});
        setOrganisationId("");
        setActorMemberId(null);
        setError("Select an organisation to view its departments.");
        return;
      }

      setOrganisationId(selectedOrg);

      const [
        organisationResult,
        membershipResult,
        platformAdminResult,
        departmentResult,
      ] = await Promise.all([
        supabase
          .from("organisations")
          .select("id, name")
          .eq("id", selectedOrg)
          .maybeSingle(),

        supabase
          .from("organisation_members")
          .select("id, role")
          .eq("organisation_id", selectedOrg)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle(),

        supabase.rpc("is_platform_super_admin"),

        supabase
          .from("departments")
          .select(
            "id, organisation_id, name, description, head_member_id, created_at"
          )
          .eq("organisation_id", selectedOrg)
          .order("name", { ascending: true }),
      ]);

      if (organisationResult.error) throw organisationResult.error;
      if (membershipResult.error) throw membershipResult.error;
      if (platformAdminResult.error) throw platformAdminResult.error;
      if (departmentResult.error) throw departmentResult.error;

      const isSuperAdmin = platformAdminResult.data === true;
      const memberRole = membershipResult.data?.role || "";

      if (!membershipResult.data && !isSuperAdmin) {
        throw new Error("You do not have access to this organisation.");
      }

      setOrganisationName(organisationResult.data?.name || "Organisation");
      setRole(memberRole);
      setActorMemberId(membershipResult.data?.id || null);
      setIsPlatformSuperAdmin(isSuperAdmin);

      const departmentRows = (departmentResult.data || []) as Department[];
      setDepartments(departmentRows);

      const departmentIds = departmentRows.map((department) => department.id);

      if (departmentIds.length === 0) {
        setStats({});
        return;
      }

      const [employeeResult, projectResult, taskResult] =
        await Promise.all([
          supabase
            .from("organisation_members")
            .select("department_id")
            .eq("organisation_id", selectedOrg)
            .eq("status", "active")
            .in("department_id", departmentIds),

          supabase
            .from("projects")
            .select("department_id")
            .eq("organisation_id", selectedOrg)
            .in("department_id", departmentIds),

          supabase
            .from("tasks")
            .select("department_id")
            .eq("organisation_id", selectedOrg)
            .in("department_id", departmentIds)
            .not("status", "in", '("completed","cancelled","archived")'),
        ]);

      if (employeeResult.error) throw employeeResult.error;
      if (projectResult.error) throw projectResult.error;
      if (taskResult.error) throw taskResult.error;

      const nextStats: Record<string, DepartmentStats> = {};

      departmentIds.forEach((id) => {
        nextStats[id] = {
          employees: 0,
          projects: 0,
          tasks: 0,
        };
      });

      employeeResult.data?.forEach((row) => {
        if (row.department_id && nextStats[row.department_id]) {
          nextStats[row.department_id].employees += 1;
        }
      });

      projectResult.data?.forEach((row) => {
        if (row.department_id && nextStats[row.department_id]) {
          nextStats[row.department_id].projects += 1;
        }
      });

      taskResult.data?.forEach((row) => {
        if (row.department_id && nextStats[row.department_id]) {
          nextStats[row.department_id].tasks += 1;
        }
      });

      setStats(nextStats);
    } catch (err) {
      console.error("Department loading error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load departments."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadDepartments();

    const handleOrganisationChange = () => {
      setSuccess("");
      setError("");
      loadDepartments();
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
  }, [loadDepartments]);

  function openCreateForm() {
    setEditingDepartment(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(department: Department) {
    setEditingDepartment(department);
    setForm({
      name: department.name,
      description: department.description || "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  async function saveDepartment(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!organisationId || !canManage) return;

    if (!form.name.trim()) {
      setError("Enter a department name.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingDepartment) {
        const previousData = {
          name: editingDepartment.name,
          description: editingDepartment.description,
        };

        const updatedData = {
          name: form.name.trim(),
          description: form.description.trim() || null,
        };

        const { error: updateError } = await supabase.rpc(
          "rename_organisation_department",
          {
            p_department_id: editingDepartment.id,
            p_name: updatedData.name,
            p_description: updatedData.description,
          }
        );

        if (updateError) throw updateError;

        const auditSaved = await writeAuditLog({
          action: "department_updated",
          title: "Department updated",
          description: `The department "${previousData.name}" was updated to "${updatedData.name}".`,
          departmentId: editingDepartment.id,
          beforeData: previousData,
          afterData: updatedData,
        });

        setSuccess(
          auditSaved
            ? "Department updated successfully."
            : "Department updated, but its audit record could not be saved."
        );
      } else {
        const { data: createdDepartmentId, error: createError } =
          await supabase.rpc("create_organisation_department", {
            p_organisation_id: organisationId,
            p_name: form.name.trim(),
            p_description: form.description.trim() || null,
          });

        if (createError) throw createError;

        const departmentId =
          typeof createdDepartmentId === "string"
            ? createdDepartmentId
            : null;

        if (!departmentId) {
          throw new Error(
            "Department was created, but the database did not return its ID. Please refresh before trying again."
          );
        }

        const auditSaved = await writeAuditLog({
          action: "department_created",
          title: "Department created",
          description: `The department "${form.name.trim()}" was created.`,
          departmentId,
          afterData: {
            name: form.name.trim(),
            description: form.description.trim() || null,
          },
        });

        setSuccess(
          auditSaved
            ? "Department created successfully."
            : "Department created, but its audit record could not be saved."
        );
      }

      setShowForm(false);
      setEditingDepartment(null);
      setForm(EMPTY_FORM);

      await loadDepartments();
    } catch (err) {
      console.error("Department save error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save department."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteDepartment(department: Department) {
    if (!canManage) return;

    const confirmed = window.confirm(
      `Delete "${department.name}"?\n\nThis can only happen when all employees, projects and active tasks have been reassigned or removed.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const { error: deleteError } = await supabase.rpc(
        "delete_organisation_department",
        {
          p_department_id: department.id,
        }
      );

      if (deleteError) throw deleteError;

      const auditSaved = await writeAuditLog({
        action: "department_deleted",
        title: "Department deleted",
        description: `The department "${department.name}" was deleted.`,
        departmentId: department.id,
        beforeData: {
          name: department.name,
          description: department.description,
          head_member_id: department.head_member_id,
        },
      });

      setSuccess(
        auditSaved
          ? "Department deleted successfully."
          : "Department deleted, but its audit record could not be saved."
      );

      await loadDepartments();
    } catch (err) {
      console.error("Department deletion error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete department."
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredDepartments = departments.filter((department) => {
    const term = search.toLowerCase();

    return (
      department.name.toLowerCase().includes(term) ||
      (department.description || "").toLowerCase().includes(term)
    );
  });

  const totalEmployees = Object.values(stats).reduce(
    (sum, item) => sum + item.employees,
    0
  );

  const totalProjects = Object.values(stats).reduce(
    (sum, item) => sum + item.projects,
    0
  );

  const totalTasks = Object.values(stats).reduce(
    (sum, item) => sum + item.tasks,
    0
  );

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <div className="mx-auto max-w-[1500px] p-5 md:p-8 lg:p-10">
        <header className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="mb-2 text-sm text-slate-400">
              Workspace / Organisation / Departments
            </p>

            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Department Management
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Manage departments, teams and organisational structure.
            </p>
          </div>

          <div className="w-full lg:max-w-xs">
            <OrganisationSwitcher />
          </div>
        </header>

        <div className="mb-7 flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-[#151f30] p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Current organisation
            </p>
            <h2 className="mt-2 text-lg font-semibold">
              {organisationName || "Loading organisation..."}
            </h2>
            <p className="mt-1 text-xs capitalize text-slate-400">
              Access: {role.replaceAll("_", " ") || "Checking access"}
              {isPlatformSuperAdmin ? " · Platform Super Admin" : ""}
            </p>
          </div>

          {canManage && (
            <button
              onClick={openCreateForm}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              + Create Department
            </button>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
          >
            {success}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={saveDepartment}
            className="mb-8 rounded-2xl border border-emerald-500/20 bg-[#151f30] p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">
                  {editingDepartment ? "Edit Department" : "Create Department"}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Enter the department information below.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg px-3 py-2 text-slate-400 hover:bg-white/5 hover:text-white"
                aria-label="Close form"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Department name *
                </label>
                <input
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Information Technology"
                  className="w-full rounded-xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Description
                </label>
                <input
                  maxLength={500}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe the department's responsibilities"
                  className="w-full rounded-xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingDepartment
                    ? "Save Changes"
                    : "Create Department"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingDepartment(null);
                  setForm(EMPTY_FORM);
                }}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Departments",
              value: departments.length,
              icon: "▦",
            },
            {
              label: "Employees Assigned",
              value: totalEmployees,
              icon: "♙",
            },
            {
              label: "Projects",
              value: totalProjects,
              icon: "▣",
            },
            {
              label: "Active Tasks",
              value: totalTasks,
              icon: "✓",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-[#151f30] p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{item.label}</p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-lg text-emerald-400">
                  {item.icon}
                </span>
              </div>
              <p className="mt-5 text-3xl font-bold tabular-nums">
                {loading ? "—" : item.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {organisationName || "Selected organisation"}
              </p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#151f30]">
          <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-5 md:flex-row md:items-center">
            <div>
              <h3 className="text-lg font-semibold">All Departments</h3>
              <p className="mt-1 text-sm text-slate-400">
                Departments registered under this organisation.
              </p>
            </div>

            <div className="flex gap-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search departments..."
                className="w-full rounded-xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm outline-none focus:border-emerald-500 md:w-72"
              />

              <button
                onClick={loadDepartments}
                disabled={loading}
                className="rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
                title="Refresh departments"
              >
                ↻
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">
              Loading departments...
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mb-3 text-3xl text-slate-500">▦</div>
              <h4 className="font-semibold">
                {search ? "No matching departments" : "No departments yet"}
              </h4>
              <p className="mt-2 text-sm text-slate-400">
                {search
                  ? "Try another search term."
                  : canManage
                    ? "Create your first department to organise employees and work."
                    : "Your organisation has not created any departments yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4 font-medium">Department</th>
                    <th className="px-4 py-4 font-medium">Department Head</th>
                    <th className="px-4 py-4 font-medium">Employees</th>
                    <th className="px-4 py-4 font-medium">Projects</th>
                    <th className="px-4 py-4 font-medium">Active Tasks</th>
                    {canManage && (
                      <th className="px-6 py-4 text-right font-medium">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filteredDepartments.map((department) => {
                    const departmentStats = stats[department.id] || {
                      employees: 0,
                      projects: 0,
                      tasks: 0,
                    };

                    return (
                      <tr
                        key={department.id}
                        className="border-b border-white/5 transition last:border-0 hover:bg-white/[0.025]"
                      >
                        <td className="px-6 py-5">
                          <p className="font-semibold text-white">
                            {department.name}
                          </p>
                          <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                            {department.description || "No description"}
                          </p>
                        </td>

                        <td className="px-4 py-5">
                          {department.head_member_id ? (
                            <span className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                              Assigned
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              Not assigned
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-5 tabular-nums">
                          {departmentStats.employees}
                        </td>

                        <td className="px-4 py-5 tabular-nums">
                          {departmentStats.projects}
                        </td>

                        <td className="px-4 py-5 tabular-nums">
                          {departmentStats.tasks}
                        </td>

                        {canManage && (
                          <td className="px-6 py-5">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openEditForm(department)}
                                disabled={saving}
                                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() => deleteDepartment(department)}
                                disabled={saving}
                                className="rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-white/10 px-6 py-4 text-xs text-slate-500">
            Showing {filteredDepartments.length} of {departments.length} departments
          </div>
        </section>

        <footer className="mt-6 text-xs text-slate-500">
          Department changes are protected by server-side database permissions.
        </footer>
      </div>
    </div>
  );
}

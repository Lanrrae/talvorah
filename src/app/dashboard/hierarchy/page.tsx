
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import OrganisationSwitcher from "@/components/OrganisationSwitcher";

const DESIGNATIONS = [
  "Officer 2",
  "Officer 1",
  "Assistant Manager",
  "Manager",
  "Senior Manager",
  "Principal Manager",
  "General Manager",
  "Executive Director",
  "MD/CEO",
];

type Employee = {
  id: string;
  user_id: string;
  full_name: string;
  designation: string | null;
  department_id: string | null;
  status: string;
};

type Department = {
  id: string;
  name: string;
  head_member_id: string | null;
};

export default function HierarchyPage() {
  const supabase = createClient();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organisationId, setOrganisationId] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [designationEmployee, setDesignationEmployee] =
    useState<Employee | null>(null);
  const [newDesignation, setNewDesignation] = useState("");
  const [designationReason, setDesignationReason] = useState("");

  const [headDepartment, setHeadDepartment] =
    useState<Department | null>(null);
  const [headMemberId, setHeadMemberId] = useState("");
  const [headReason, setHeadReason] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in to continue.");
      }

      const { data: admin, error: adminError } = await supabase
        .from("platform_admins")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminError) throw adminError;

      const platformAccess = admin?.role === "super_admin";
      setIsSuperAdmin(platformAccess);

      if (!platformAccess) {
        throw new Error(
          "Access restricted. Only Platform Super Admins can manage employee hierarchy."
        );
      }

      let selectedOrganisation =
        localStorage.getItem("talvorah_organisation_id") || "";

      if (!selectedOrganisation) {
        const { data: organisations, error: orgError } =
          await supabase
            .from("organisations")
            .select("id")
            .order("created_at", { ascending: true })
            .limit(1);

        if (orgError) throw orgError;

        selectedOrganisation = organisations?.[0]?.id || "";
      }

      if (!selectedOrganisation) {
        throw new Error("No organisation is available.");
      }

      setOrganisationId(selectedOrganisation);

      const { data: members, error: memberError } = await supabase
        .from("organisation_members")
        .select(
          "id, user_id, designation, department_id, status"
        )
        .eq("organisation_id", selectedOrganisation)
        .eq("status", "active");

      if (memberError) throw memberError;

      const userIds = (members || []).map((member) => member.user_id);

      let profiles: {
        id: string;
        full_name: string | null;
      }[] = [];

      if (userIds.length > 0) {
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (profileError) throw profileError;
        profiles = data || [];
      }

      const employeeList: Employee[] = (members || []).map((member) => ({
        ...member,
        full_name:
          profiles.find((profile) => profile.id === member.user_id)
            ?.full_name || "Unnamed employee",
      }));

      const { data: departmentData, error: departmentError } =
        await supabase
          .from("departments")
          .select("id, name, head_member_id")
          .eq("organisation_id", selectedOrganisation)
          .order("name");

      if (departmentError) throw departmentError;

      setEmployees(employeeList);
      setDepartments(departmentData || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load employee hierarchy."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();

    const refresh = () => loadData();

    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("talvorah:organisation-changed", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(
        "talvorah:organisation-changed",
        refresh
      );
    };
  }, [loadData]);

  async function saveDesignation(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!designationEmployee || !newDesignation) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "set_employee_designation",
        {
          p_member_id: designationEmployee.id,
          p_designation: newDesignation,
          p_reason: designationReason.trim() || null,
        }
      );

      if (rpcError) throw rpcError;

      setSuccess(
        `${designationEmployee.full_name}'s designation was updated.`
      );
      setDesignationEmployee(null);
      setNewDesignation("");
      setDesignationReason("");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update designation."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveDepartmentHead(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!headDepartment) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "appoint_department_head",
        {
          p_department_id: headDepartment.id,
          p_member_id: headMemberId || null,
          p_reason: headReason.trim() || null,
        }
      );

      if (rpcError) throw rpcError;

      setSuccess(
        headMemberId
          ? "Department Head appointment updated."
          : "Department Head appointment removed."
      );

      setHeadDepartment(null);
      setHeadMemberId("");
      setHeadReason("");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update Department Head appointment."
      );
    } finally {
      setSaving(false);
    }
  }

  const md = employees.find(
    (employee) => employee.designation === "MD/CEO"
  );

  const executives = employees.filter(
    (employee) => employee.designation === "Executive Director"
  );

  const unassignedDesignation = employees.filter(
    (employee) => !employee.designation
  );

  function departmentEmployee(departmentId: string) {
    return employees.find(
      (employee) => employee.department_id === departmentId
    );
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-white">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-white/10 bg-[#0d0d15] p-6 lg:block">
        <Link href="/dashboard" className="mb-10 block">
          <h1 className="text-2xl font-bold">
            Talvorah<span className="text-green-500">.</span>
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Organisation Workspace
          </p>
        </Link>

        <div className="mb-8">
          <OrganisationSwitcher />
        </div>

        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Workspace
        </p>

        <nav className="space-y-2">
          {[
            ["Overview", "/dashboard"],
            ["Organisation", "/dashboard/organisation"],
            ["Departments", "/dashboard/departments"],
            ["Employees", "/dashboard/employees"],
            ["Hierarchy", "/dashboard/hierarchy"],
            ["Projects", "/dashboard/projects"],
            ["Tasks", "/dashboard/tasks"],
            ["Meetings", "/dashboard/meetings"],
            ["Messages", "/dashboard/messages"],
            ["Documents", "/dashboard/documents"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={`block rounded-xl px-4 py-3 text-sm ${
                href === "/dashboard/hierarchy"
                  ? "bg-green-600/15 text-green-400"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="lg:ml-64">
        <header className="border-b border-white/10 px-6 py-7 lg:px-10">
          <p className="text-sm text-gray-500">
            Workspace / Employee Hierarchy
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            Employee Hierarchy
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Manage official designations and Department Head appointments.
          </p>
        </header>

        <section className="space-y-8 p-6 lg:p-10">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-300">
              {success}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-[#11111a] p-10 text-center text-gray-400">
              Loading employee hierarchy...
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  label="Active Employees"
                  value={employees.length}
                />
                <SummaryCard
                  label="MD/CEO"
                  value={md ? 1 : 0}
                />
                <SummaryCard
                  label="Executive Directors"
                  value={executives.length}
                />
                <SummaryCard
                  label="Unassigned Designations"
                  value={unassignedDesignation.length}
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#11111a] p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold">
                    Executive Leadership
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Organisation leadership appointments.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <LeadershipCard
                    title="Managing Director / CEO"
                    employee={md}
                  />

                  <div className="rounded-xl border border-white/10 bg-[#171722] p-5">
                    <p className="text-xs uppercase tracking-wider text-gray-500">
                      Executive Directors
                    </p>

                    {executives.length === 0 ? (
                      <p className="mt-4 text-sm text-gray-500">
                        No Executive Directors appointed.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {executives.map((employee) => (
                          <div
                            key={employee.id}
                            className="rounded-lg bg-white/5 p-3"
                          >
                            <p className="font-medium">
                              {employee.full_name}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Executive Director
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#11111a] p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold">
                    Official Designations
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Assign or change an employee&apos;s official organisational
                    designation.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="border-b border-white/10 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="pb-4">Employee</th>
                        <th className="pb-4">Designation</th>
                        <th className="pb-4">Department</th>
                        <th className="pb-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((employee) => {
                        const department = departments.find(
                          (item) =>
                            item.id === employee.department_id
                        );

                        return (
                          <tr
                            key={employee.id}
                            className="border-b border-white/5"
                          >
                            <td className="py-4 font-medium">
                              {employee.full_name}
                            </td>
                            <td className="py-4 text-gray-300">
                              {employee.designation || (
                                <span className="text-yellow-400">
                                  Not assigned
                                </span>
                              )}
                            </td>
                            <td className="py-4 text-gray-400">
                              {department?.name || "Not assigned"}
                            </td>
                            <td className="py-4 text-right">
                              <button
                                onClick={() => {
                                  setDesignationEmployee(employee);
                                  setNewDesignation(
                                    employee.designation || ""
                                  );
                                  setDesignationReason("");
                                }}
                                className="rounded-lg border border-green-500/30 px-3 py-2 text-xs text-green-400 hover:bg-green-500/10"
                              >
                                Change Designation
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {employees.length === 0 && (
                    <p className="py-8 text-center text-sm text-gray-500">
                      No active employees found.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#11111a] p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold">
                    Department Heads
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Appoint or remove the Head of each department.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {departments.map((department) => {
                    const head = employees.find(
                      (employee) =>
                        employee.id === department.head_member_id
                    );

                    return (
                      <div
                        key={department.id}
                        className="rounded-xl border border-white/10 bg-[#171722] p-5"
                      >
                        <p className="font-semibold">
                          {department.name}
                        </p>
                        <p className="mt-2 text-sm text-gray-400">
                          {head
                            ? `Head: ${head.full_name}`
                            : "No Department Head appointed"}
                        </p>

                        <button
                          onClick={() => {
                            setHeadDepartment(department);
                            setHeadMemberId(
                              department.head_member_id || ""
                            );
                            setHeadReason("");
                          }}
                          className="mt-4 rounded-lg border border-green-500/30 px-4 py-2 text-xs text-green-400 hover:bg-green-500/10"
                        >
                          Manage Appointment
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 text-sm leading-6 text-blue-200">
                <strong>Authority and security:</strong> Official designations
                and Department Head appointments can only be changed by a
                Platform Super Admin. Organisation Admins cannot grant these
                appointments. Department Heads must belong to the department
                they lead. Existing tasks and projects are not transferred
                when an employee changes department.
              </div>
            </>
          )}
        </section>
      </main>

      {designationEmployee && (
        <Modal
          title="Change Official Designation"
          close={() => setDesignationEmployee(null)}
        >
          <form onSubmit={saveDesignation} className="space-y-5">
            <p className="text-sm text-gray-400">
              Employee: {designationEmployee.full_name}
            </p>

            <FieldLabel label="Official Designation">
              <select
                required
                value={newDesignation}
                onChange={(e) => setNewDesignation(e.target.value)}
                className={inputClass}
              >
                <option value="">Select designation</option>
                {DESIGNATIONS.map((designation) => (
                  <option key={designation} value={designation}>
                    {designation}
                  </option>
                ))}
              </select>
            </FieldLabel>

            <FieldLabel label="Reason for change">
              <textarea
                rows={3}
                value={designationReason}
                onChange={(e) => setDesignationReason(e.target.value)}
                placeholder="Reason for this designation change..."
                className={inputClass}
              />
            </FieldLabel>

            <button disabled={saving} className={primaryButton}>
              {saving ? "Saving..." : "Save Designation"}
            </button>
          </form>
        </Modal>
      )}

      {headDepartment && (
        <Modal
          title="Manage Department Head"
          close={() => setHeadDepartment(null)}
        >
          <form onSubmit={saveDepartmentHead} className="space-y-5">
            <p className="text-sm text-gray-400">
              Department: {headDepartment.name}
            </p>

            <FieldLabel label="Select Department Head">
              <select
                value={headMemberId}
                onChange={(e) => setHeadMemberId(e.target.value)}
                className={inputClass}
              >
                <option value="">Remove current appointment</option>
                {employees
                  .filter(
                    (employee) =>
                      employee.department_id === headDepartment.id &&
                      employee.designation !== "MD/CEO"
                  )
                  .map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name} —{" "}
                      {employee.designation || "No designation"}
                    </option>
                  ))}
              </select>
            </FieldLabel>

            <FieldLabel label="Reason for appointment/change">
              <textarea
                rows={3}
                value={headReason}
                onChange={(e) => setHeadReason(e.target.value)}
                placeholder="Reason for this appointment..."
                className={inputClass}
              />
            </FieldLabel>

            <button disabled={saving} className={primaryButton}>
              {saving ? "Saving..." : "Save Appointment"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0c0c14] px-4 py-3 text-sm text-white outline-none focus:border-green-500";

const primaryButton =
  "w-full rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50";

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#11111a] p-6">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}

function LeadershipCard({
  title,
  employee,
}: {
  title: string;
  employee?: Employee;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#171722] p-5">
      <p className="text-xs uppercase tracking-wider text-gray-500">
        {title}
      </p>
      <p className="mt-4 text-lg font-semibold">
        {employee?.full_name || "Not appointed"}
      </p>
      <p className="mt-1 text-sm text-gray-500">
        {employee ? title : "Appointment required"}
      </p>
    </div>
  );
}

function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#151521] p-7 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold">{title}</h3>
          <button
            onClick={close}
            className="text-xl text-gray-400 hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-gray-300">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

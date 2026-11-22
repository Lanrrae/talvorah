"use client";

import OrganisationSwitcher from "@/components/OrganisationSwitcher";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

type Employee = {
  user_id: string;
  role: string;
  status: string;
  created_at: string;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [organisationId, setOrganisationId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const supabase = createClient();

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError("Please log in to view your organisation's employees.");
        setLoading(false);
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from("organisation_members")
        .select("organisation_id, role")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (membershipError || !membership) {
        setError(
          "No active organisation membership was found for your account."
        );
        setLoading(false);
        return;
      }

      setOrganisationId(membership.organisation_id);

      const { data, error: employeesError } = await supabase
        .from("organisation_members")
        .select("user_id, role, status, created_at")
        .eq("organisation_id", membership.organisation_id)
        .order("created_at", { ascending: false });

      if (employeesError) {
        throw employeesError;
      }

      setEmployees(data || []);
    } catch (err) {
      console.error(err);
      setError("Unable to load employees. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function inviteEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          organisationId,
          role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Invitation failed.");
      }

      setMessage(result.message || "Invitation sent successfully.");
      setEmail("");
      setRole("employee");
      setShowInvite(false);

      await loadEmployees();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSending(false);
    }
  }

  const filteredEmployees = employees.filter((employee) =>
    `${employee.user_id} ${employee.role} ${employee.status}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const activeCount = employees.filter(
    (employee) => employee.status === "active"
  ).length;

  const invitedCount = employees.filter(
    (employee) => employee.status === "invited"
  ).length;

  return (
    <div className="min-h-screen bg-[#09090f] text-white">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-white/10 bg-[#0d0d15] p-6 lg:block">
        <Link href="/dashboard" className="mb-12 block">
          <h1 className="text-2xl font-bold tracking-tight">
            Talvorah<span className="text-purple-500">.</span>
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Organisation Workspace
          </p>
        </Link>
<div className="mb-6 mt-4">
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
            ["Projects", "/dashboard/projects"],
            ["Tasks", "/dashboard/tasks"],
            ["Messages", "/dashboard/messages"],
            ["Meetings", "/dashboard/meetings"],
            ["Documents", "/dashboard/documents"],
            ["Settings", "/dashboard/settings"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={`block rounded-xl px-4 py-3 text-sm transition ${
                href === "/dashboard/employees"
                  ? "bg-purple-600/20 text-purple-300"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="lg:ml-64">
        <header className="flex flex-col justify-between gap-4 border-b border-white/10 px-6 py-6 sm:flex-row sm:items-center lg:px-10">
          <div>
            <p className="text-sm text-gray-500">Workspace / Employees</p>
            <h2 className="mt-2 text-2xl font-bold">Employees</h2>
            <p className="mt-1 text-sm text-gray-400">
              Manage your organisation's workforce and invitations.
            </p>
          </div>

          <button
            onClick={() => {
              setError("");
              setMessage("");
              setShowInvite(true);
            }}
            className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold transition hover:bg-purple-500"
          >
            + Invite Employee
          </button>
        </header>

        <section className="p-6 lg:p-10">
          {message && (
            <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-300">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Members" value={employees.length} />
            <StatCard label="Active Members" value={activeCount} />
            <StatCard label="Pending Invitations" value={invitedCount} />
          </div>

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Employee Directory</h3>
              <p className="mt-1 text-sm text-gray-500">
                Organisation members and their access roles.
              </p>
            </div>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full rounded-xl border border-white/10 bg-[#12121c] px-4 py-3 text-sm outline-none focus:border-purple-500 sm:max-w-xs"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#11111a]">
            <div className="grid grid-cols-12 gap-3 border-b border-white/10 px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <div className="col-span-5 sm:col-span-4">Member ID</div>
              <div className="col-span-3">Role</div>
              <div className="col-span-4 sm:col-span-5">Status</div>
            </div>

            {loading ? (
              <div className="p-10 text-center text-sm text-gray-400">
                Loading organisation members...
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mb-3 text-3xl">👥</div>
                <h4 className="font-semibold">No members found</h4>
                <p className="mt-2 text-sm text-gray-500">
                  Invite employees to start building your organisation's
                  workforce.
                </p>
              </div>
            ) : (
              filteredEmployees.map((employee) => (
                <div
                  key={employee.user_id}
                  className="grid grid-cols-12 items-center gap-3 border-b border-white/5 px-5 py-5 last:border-0"
                >
                  <div className="col-span-5 sm:col-span-4">
                    <p className="break-all text-sm font-medium">
                      {employee.user_id.slice(0, 8)}...
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Joined record:{" "}
                      {new Date(employee.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="col-span-3 text-sm capitalize text-gray-300">
                    {employee.role.replaceAll("_", " ")}
                  </div>

                  <div className="col-span-4 sm:col-span-5">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        employee.status === "active"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {employee.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#151521] p-7 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Invite an Employee</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Send an invitation to join your organisation.
                </p>
              </div>

              <button
                onClick={() => setShowInvite(false)}
                className="text-xl text-gray-400 hover:text-white"
                aria-label="Close invitation form"
              >
                ×
              </button>
            </div>

            <form onSubmit={inviteEmployee} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Employee Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@company.com"
                  className="w-full rounded-xl border border-white/10 bg-[#0c0c14] px-4 py-3 text-sm outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Assign Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0c0c14] px-4 py-3 text-sm outline-none focus:border-purple-500"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="department_head">Department Head</option>
                </select>
              </div>

              <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4 text-xs leading-6 text-purple-200">
                The employee will receive an invitation email. Their
                organisation access will be activated after they accept and
                complete the account setup.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-300 hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={sending || !organisationId}
                  className="flex-1 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
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

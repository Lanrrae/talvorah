
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import OrganisationSwitcher from "@/components/OrganisationSwitcher";
import { createClient } from "@/utils/supabase/client";

type Organisation = {
  id: string;
  name: string;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  created_at?: string | null;
};

type Department = {
  id: string;
  name: string;
};

type Member = {
  id: string;
  role: string;
  status: string;
  department_id?: string | null;
};

export default function OrganisationPage() {
  const supabase = useMemo(() => createClient(), []);

  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrganisation = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const organisationId =
        localStorage.getItem("talvorah_organisation_id");

      if (!organisationId) {
        throw new Error("Select an organisation to view its overview.");
      }

      const [
        organisationResult,
        departmentResult,
        memberResult,
      ] = await Promise.all([
        supabase
          .from("organisations")
          .select("*")
          .eq("id", organisationId)
          .single(),

        supabase
          .from("departments")
          .select("id, name")
          .eq("organisation_id", organisationId)
          .order("name"),

        supabase
          .from("organisation_members")
          .select("id, role, status, department_id")
          .eq("organisation_id", organisationId),
      ]);

      if (organisationResult.error) throw organisationResult.error;
      if (departmentResult.error) throw departmentResult.error;
      if (memberResult.error) throw memberResult.error;

      setOrganisation(organisationResult.data as Organisation);
      setDepartments(departmentResult.data || []);
      setMembers(memberResult.data || []);
    } catch (err) {
      console.error("Organisation overview error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load organisation information."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadOrganisation();

    const handleOrganisationChange = () => {
      void loadOrganisation();
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
  }, [loadOrganisation]);

  const activeMembers = members.filter(
    (member) => member.status === "active"
  );

  const adminCount = activeMembers.filter(
    (member) =>
      member.role === "organisation_admin" ||
      member.role === "super_admin"
  ).length;

  const departmentCoverage = departments.map((department) => ({
    ...department,
    employeeCount: activeMembers.filter(
      (member) => member.department_id === department.id
    ).length,
  }));

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <header className="bg-[#0b1830] px-5 py-5 text-white md:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <a href="/dashboard" className="text-xl font-bold">
              Talvorah<span className="text-emerald-400">.</span>
            </a>
            <p className="mt-1 text-xs text-slate-400">
              Organisation workspace
            </p>
          </div>
          <OrganisationSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-7 px-5 py-8 md:px-8">
        <div>
          <p className="text-sm font-semibold tracking-wider text-emerald-600">
            WORKSPACE
          </p>
          <h1 className="mt-2 text-3xl font-bold">Organisation Overview</h1>
          <p className="mt-2 text-sm text-slate-500">
            View your organisation's structure and membership at a glance.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Loading organisation...
          </div>
        ) : organisation ? (
          <>
            <section className="overflow-hidden rounded-2xl bg-[#102442] p-7 text-white shadow-sm md:p-9">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-emerald-400">
                    ORGANISATION PROFILE
                  </p>
                  <h2 className="mt-3 text-2xl font-bold md:text-3xl">
                    {organisation.name}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                    {organisation.description ||
                      "Your organisation's central workspace on Talvorah."}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs text-slate-400">Workspace status</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-400">
                    Active
                  </p>
                </div>
              </div>

              {organisation.created_at && (
                <p className="mt-7 text-xs text-slate-400">
                  Registered{" "}
                  {new Date(organisation.created_at).toLocaleDateString(
                    undefined,
                    { day: "numeric", month: "long", year: "numeric" }
                  )}
                </p>
              )}
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Total Employees",
                  value: activeMembers.length,
                  detail: "Active organisation members",
                },
                {
                  label: "Departments",
                  value: departments.length,
                  detail: "Registered departments",
                },
                {
                  label: "Administrators",
                  value: adminCount,
                  detail: "Active admin memberships",
                },
                {
                  label: "Unassigned Employees",
                  value: activeMembers.filter(
                    (member) => !member.department_id
                  ).length,
                  detail: "Members without a department",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-bold">{item.value}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {item.detail}
                  </p>
                </div>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">Department Structure</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Employee distribution across departments.
                    </p>
                  </div>
                  <a
                    href="/dashboard/departments"
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    View all →
                  </a>
                </div>

                <div className="mt-6 space-y-5">
                  {departmentCoverage.length ? (
                    departmentCoverage.map((department) => {
                      const percentage = activeMembers.length
                        ? Math.round(
                            (department.employeeCount /
                              activeMembers.length) *
                              100
                          )
                        : 0;

                      return (
                        <div key={department.id}>
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-sm font-medium">
                              {department.name}
                            </span>
                            <span className="text-sm text-slate-500">
                              {department.employeeCount} employees
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="py-6 text-center text-sm text-slate-500">
                      No departments have been created yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold">Organisation Information</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Contact information registered for this organisation.
                </p>

                <div className="mt-6 space-y-5">
                  {[
                    ["Organisation Name", organisation.name],
                    ["Email Address", organisation.email],
                    ["Phone Number", organisation.phone],
                    ["Website", organisation.website],
                    ["Address", organisation.address],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="border-b border-slate-100 pb-4 last:border-0"
                    >
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="mt-1 break-words text-sm font-medium">
                        {value || "Not provided"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">Quick Access</h2>
              <p className="mt-1 text-sm text-slate-500">
                Navigate to key organisation management areas.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Departments", "/dashboard/departments"],
                  ["Employees", "/dashboard/employees"],
                  ["Projects", "/dashboard/projects"],
                  ["Settings", "/dashboard/settings"],
                ].map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    className="rounded-xl border border-slate-200 p-4 text-sm font-semibold transition hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    {label}
                    <span className="float-right text-emerald-600">→</span>
                  </a>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

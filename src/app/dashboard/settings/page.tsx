
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Tab =
  | "organisation"
  | "departments"
  | "members"
  | "account"
  | "access"
  | "platform";

type Department = {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
};

type Member = {
  id: string;
  user_id: string;
  role: string;
  status?: string | null;
  department_id?: string | null;
  designation?: string | null;
};

type Organisation = {
  id: string;
  name?: string;
  [key: string]: unknown;
};

const tabs: { id: Tab; label: string; description: string }[] = [
  {
    id: "organisation",
    label: "Organisation",
    description: "Organisation profile and workspace information",
  },
  {
    id: "departments",
    label: "Departments",
    description: "View departments within this organisation",
  },
  {
    id: "members",
    label: "Members",
    description: "Employee and membership overview",
  },
  {
    id: "access",
    label: "Roles & Access",
    description: "Understand administrative permissions",
  },
  {
    id: "account",
    label: "My Account",
    description: "Your personal account information",
  },
  {
    id: "platform",
    label: "Platform Administration",
    description: "Platform-level administration controls",
  },
];

const designations = [
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

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState<Tab>("organisation");
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [isPlatformSuperAdmin, setIsPlatformSuperAdmin] = useState(false);
  const [currentRole, setCurrentRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please sign in to access settings.");

      setUserId(user.id);
      setUserEmail(user.email || "");

      const { data: platformAdmin, error: platformError } =
        await supabase.rpc("is_platform_super_admin");

      if (platformError) {
        console.warn("Platform administrator check:", platformError.message);
      }

      const platformAdminValue = platformAdmin === true;
      setIsPlatformSuperAdmin(platformAdminValue);

      const organisationId = window.localStorage.getItem(
        "talvorah_organisation_id"
      );

      if (!organisationId) {
        setOrganisation(null);
        setDepartments([]);
        setMembers([]);
        setCurrentRole(platformAdminValue ? "Platform Super Admin" : "");
        return;
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
          .maybeSingle(),

        supabase
          .from("departments")
          .select("id,name,description,created_at")
          .eq("organisation_id", organisationId)
          .order("name"),

        supabase
          .from("organisation_members")
          .select("id,user_id,role,status,department_id,designation")
          .eq("organisation_id", organisationId),
      ]);

      if (organisationResult.error) throw organisationResult.error;
      if (departmentResult.error) throw departmentResult.error;
      if (memberResult.error) throw memberResult.error;

      setOrganisation(
        (organisationResult.data as Organisation | null) || null
      );
      setDepartments((departmentResult.data || []) as Department[]);
      setMembers((memberResult.data || []) as Member[]);

      const ownMembership = (memberResult.data || []).find(
        (member: Member) => member.user_id === user.id
      );

      setCurrentRole(
        platformAdminValue
          ? "Platform Super Admin"
          : ownMembership?.role || "Organisation member"
      );
    } catch (err) {
      console.error("Settings loading error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load workspace settings."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadSettings();

    const handleOrganisationChange = () => {
      setActiveTab("organisation");
      loadSettings();
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
  }, [loadSettings]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return members;

    return members.filter((member) =>
      [
        member.user_id,
        member.role,
        member.designation || "",
        member.status || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [members, search]);

  const activeMembers = members.filter(
    (member) => !member.status || member.status === "active"
  );

  const departmentName = (id?: string | null) => {
    if (!id) return "Not assigned";

    return (
      departments.find((department) => department.id === id)?.name ||
      "Unknown department"
    );
  };

  const organisationName =
    typeof organisation?.name === "string"
      ? organisation.name
      : "Selected organisation";

  function renderOrganisation() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#142d4e]">
            Organisation profile
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            View information associated with the selected organisation.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-2xl text-emerald-700">
              <span>🏢</span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#142d4e]">
                {organisationName}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Organisation workspace
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Organisation name
              </p>
              <p className="mt-2 text-sm font-medium text-slate-700">
                {organisationName}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Organisation ID
              </p>
              <p className="mt-2 break-all font-mono text-xs text-slate-600">
                {organisation?.id || "Not available"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Departments
              </p>
              <p className="mt-2 text-sm font-medium text-slate-700">
                {departments.length}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Active members
              </p>
              <p className="mt-2 text-sm font-medium text-slate-700">
                {activeMembers.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <span className="text-lg">ℹ️</span>
            <div>
              <h3 className="text-sm font-semibold text-amber-900">
                Organisation profile editing
              </h3>
              <p className="mt-1 text-xs leading-5 text-amber-800">
                Profile editing will be enabled after the organisation
                profile fields and update permissions are confirmed. This
                page currently displays the stored organisation information
                without changing it.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderDepartments() {
    return (
      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-[#142d4e]">
              Department settings
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Departments currently registered in this organisation.
            </p>
          </div>

          <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            {departments.length} departments
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {departments.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mb-3 text-3xl">🏢</div>
              <p className="font-semibold text-[#142d4e]">
                No departments found
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Departments will appear here once created.
              </p>
            </div>
          ) : (
            departments.map((department) => {
              const count = members.filter(
                (member) =>
                  member.department_id === department.id &&
                  (!member.status || member.status === "active")
              ).length;

              return (
                <div
                  key={department.id}
                  className="flex items-center justify-between gap-4 border-b border-slate-100 p-4 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <span>▦</span>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#142d4e]">
                        {department.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {department.description || "No description"}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-700">
                      {count}
                    </p>
                    <p className="text-[10px] text-slate-400">Members</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="text-xs leading-5 text-slate-400">
          Department creation, renaming and deletion remain available through
          the Departments module. Deletion must respect existing employee,
          project and active-work assignments.
        </p>
      </div>
    );
  }

  function renderMembers() {
    return (
      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-[#142d4e]">
              Members and employees
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Membership overview for the selected organisation.
            </p>
          </div>

          <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
            {members.length} total records
          </div>
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by user ID, role or designation..."
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
        />

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[650px] text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                  Member
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                  Designation
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                  Department
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                  Role
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  className="border-t border-slate-100"
                >
                  <td className="px-4 py-4">
                    <p className="text-xs font-semibold text-[#142d4e]">
                      {member.user_id.slice(0, 8)}...
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Membership ID: {member.id.slice(0, 8)}...
                    </p>
                  </td>

                  <td className="px-4 py-4 text-xs text-slate-600">
                    {member.designation || "Not assigned"}
                  </td>

                  <td className="px-4 py-4 text-xs text-slate-600">
                    {departmentName(member.department_id)}
                  </td>

                  <td className="px-4 py-4">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold capitalize text-blue-700">
                      {member.role.replace(/_/g, " ")}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        !member.status || member.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {member.status || "Active"}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredMembers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-slate-400"
                  >
                    No matching members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs leading-5 text-slate-400">
          Employee onboarding, transfers and membership administration are
          handled through the Employees module.
        </p>
      </div>
    );
  }

  function renderAccess() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#142d4e]">
            Roles and access
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Talvorah keeps organisation roles separate from official
            employee designations and department appointments.
          </p>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-[#142d4e]">
                Organisation Admin
              </h3>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-700">
                Organisation role
              </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Manages organisation operations, employee onboarding,
              department assignments and transfers, and department
              administration.
            </p>

            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              <li>• Can delete ordinary employees.</li>
              <li>• Cannot delete an Admin or Super Admin.</li>
              <li>• Cannot assign official designations.</li>
              <li>• Cannot appoint or remove Department Heads.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-[#142d4e]">
                Organisation Super Admin
              </h3>
              <span className="rounded-full bg-purple-50 px-3 py-1 text-[10px] font-semibold text-purple-700">
                Organisation role
              </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Has the organisation administration capabilities of an Admin
              and can additionally delete an Admin.
            </p>

            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              <li>• Can onboard employees and manage transfers.</li>
              <li>• Can delete ordinary employees and Admins.</li>
              <li>• Cannot delete another Super Admin.</li>
              <li>• Cannot change official designations or HoD appointments.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-[#142d4e]">
                Platform Super Admin
              </h3>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-semibold text-emerald-800">
                Platform authority
              </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Has platform-wide authority across organisations, including
              the ability to assign official employee designations and
              appoint or remove Department Heads.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-[#142d4e]">
              Department Head
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              A department appointment rather than an organisation
              administrator role. A Department Head must belong to the
              department they lead. Appointment and removal are controlled
              by the Platform Super Admin.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-[#142d4e]">
            Official employee designations
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            These designations are separate from application roles.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {designations.map((designation, index) => (
              <div
                key={designation}
                className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-[10px] font-bold text-slate-500">
                  {index + 1}
                </span>
                <span className="text-sm text-slate-700">
                  {designation}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderAccount() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#142d4e]">
            My account
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Your signed-in Talvorah account information.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#142d4e] text-lg font-bold text-white">
              {(userEmail || "U").charAt(0).toUpperCase()}
            </div>

            <div>
              <h3 className="font-semibold text-[#142d4e]">
                Signed-in account
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Talvorah user profile
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Email address
              </p>
              <p className="mt-1 break-all text-sm text-slate-700">
                {userEmail || "Unavailable"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                User ID
              </p>
              <p className="mt-1 break-all font-mono text-xs text-slate-600">
                {userId || "Unavailable"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Current access
              </p>
              <p className="mt-1 text-sm capitalize text-slate-700">
                {currentRole.replace(/_/g, " ") || "Not available"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-[#142d4e]">
            Password and security
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Password changes, recovery and additional account security
            controls will be connected to the authentication settings.
          </p>
        </div>
      </div>
    );
  }

  function renderPlatform() {
    if (!isPlatformSuperAdmin) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-900">
            Restricted platform settings
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            Platform administration is available only to the Platform
            Super Admin. Organisation administrator roles do not grant
            access to these controls.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-[#142d4e]">
            Platform administration
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Platform-wide authority and organisation administration.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-xl">
              ✓
            </span>
            <div>
              <h3 className="font-semibold text-emerald-900">
                Platform Super Admin access confirmed
              </h3>
              <p className="mt-1 text-xs text-emerald-800">
                Your account has platform-level administrator access.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-[#142d4e]">
            Organisation overview
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Current selected organisation information.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-400">
                Selected organisation
              </p>
              <p className="mt-2 text-sm font-semibold text-[#142d4e]">
                {organisationName}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-400">
                Departments
              </p>
              <p className="mt-2 text-2xl font-bold text-[#142d4e]">
                {departments.length}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-400">
                Organisation memberships
              </p>
              <p className="mt-2 text-2xl font-bold text-[#142d4e]">
                {members.length}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-400">
                Your platform access
              </p>
              <p className="mt-2 text-sm font-semibold text-emerald-700">
                Active
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-[#142d4e]">
            Reserved platform controls
          </h3>

          <div className="mt-4 space-y-3">
            {[
              [
                "Organisation management",
                "Create, review and administer platform organisations.",
              ],
              [
                "Designation management",
                "Assign and change official employee designations.",
              ],
              [
                "Department Head appointments",
                "Appoint and remove Heads of Department.",
              ],
              [
                "Platform administration",
                "Manage platform-wide administration and oversight.",
              ],
              [
                "Audit and activity oversight",
                "Review important administrative actions across organisations.",
              ],
            ].map(([title, description]) => (
              <div
                key={title}
                className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-[#142d4e]">
                    {title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {description}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500">
                  Reserved
                </span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-400">
            These are reserved administration areas. The corresponding
            management workflows and backend permissions must be connected
            before actions are enabled.
          </p>
        </div>
      </div>
    );
  }

  function renderContent() {
    switch (activeTab) {
      case "organisation":
        return renderOrganisation();
      case "departments":
        return renderDepartments();
      case "members":
        return renderMembers();
      case "access":
        return renderAccess();
      case "account":
        return renderAccount();
      case "platform":
        return renderPlatform();
      default:
        return renderOrganisation();
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              WORKSPACE / CONFIGURATION
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[#142d4e] sm:text-3xl">
              Settings & Administration
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage your workspace information, access and administration.
            </p>
          </div>

          <button
            onClick={loadSettings}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            ↻ Refresh
          </button>
        </div>

        {error && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={() => setError("")}>×</button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white">
            <div className="mb-4 h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
            <p className="text-sm text-slate-500">
              Loading workspace settings...
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="h-fit rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Configuration
                </p>
                <p className="mt-1 truncate text-sm font-bold text-[#142d4e]">
                  {organisationName}
                </p>
              </div>

              <nav className="space-y-1">
                {tabs
                  .filter(
                    (tab) =>
                      tab.id !== "platform" || isPlatformSuperAdmin
                  )
                  .map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition ${
                        activeTab === tab.id
                          ? "bg-emerald-50 text-emerald-800"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 text-base ${
                          activeTab === tab.id
                            ? "text-emerald-700"
                            : "text-slate-400"
                        }`}
                      >
                        {tab.id === "organisation"
                          ? "▦"
                          : tab.id === "departments"
                            ? "▤"
                            : tab.id === "members"
                              ? "♙"
                              : tab.id === "access"
                                ? "⚿"
                                : tab.id === "account"
                                  ? "◎"
                                  : "⚙"}
                      </span>

                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          {tab.label}
                        </span>
                        <span className="mt-1 block text-[10px] leading-4 opacity-70">
                          {tab.description}
                        </span>
                      </span>
                    </button>
                  ))}
              </nav>
            </aside>

            <main className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              {renderContent()}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

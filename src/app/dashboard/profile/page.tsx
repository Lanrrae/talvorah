
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import OrganisationSwitcher from "@/components/OrganisationSwitcher";
import { createClient } from "@/utils/supabase/client";

type Profile = {
  id: string;
  full_name?: string | null;
  job_title?: string | null;
  avatar_url?: string | null;
  [key: string]: unknown;
};

type Membership = {
  id: string;
  organisation_id: string;
  role: string;
  status: string;
  department_id?: string | null;
  designation?: string | null;
};

type Department = {
  id: string;
  name: string;
};

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [department, setDepartment] = useState("");
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("You must sign in to view your profile.");

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const currentProfile = profileData as Profile | null;

      setProfile(currentProfile);
      setName(currentProfile?.full_name || "");
      setJobTitle(currentProfile?.job_title || "");

      const organisationId =
        localStorage.getItem("talvorah_organisation_id") || "";

      if (organisationId) {
        const { data: memberData, error: memberError } = await supabase
          .from("organisation_members")
          .select("id, organisation_id, role, status, department_id, designation")
          .eq("organisation_id", organisationId)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (memberError) throw memberError;

        setMembership(memberData as Membership | null);

        if (memberData?.department_id) {
          const { data: departmentData, error: departmentError } =
            await supabase
              .from("departments")
              .select("id, name")
              .eq("id", memberData.department_id)
              .maybeSingle();

          if (departmentError) throw departmentError;

          setDepartment((departmentData as Department | null)?.name || "");
        } else {
          setDepartment("");
        }
      } else {
        setMembership(null);
        setDepartment("");
      }
    } catch (err) {
      console.error("Profile loading error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadProfile();

    const handleOrganisationChange = () => {
      void loadProfile();
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
  }, [loadProfile]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId || saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updates = {
        id: userId,
        full_name: name.trim(),
        job_title: jobTitle.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert(updates, { onConflict: "id" });

      if (updateError) throw updateError;

      setProfile((current) => ({
        ...(current || { id: userId }),
        ...updates,
      }));

      setSuccess("Your profile has been updated successfully.");
    } catch (err) {
      console.error("Profile update error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to update your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  const displayName = name.trim() || email || "Talvorah User";

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <header className="border-b border-slate-200 bg-[#0b1830] px-5 py-5 text-white md:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <a href="/dashboard" className="text-xl font-bold tracking-wide">
              Talvorah<span className="text-emerald-400">.</span>
            </a>
            <p className="mt-1 text-xs text-slate-400">Account workspace</p>
          </div>
          <OrganisationSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-7 px-5 py-8 md:px-8">
        <div>
          <p className="text-sm font-semibold tracking-wider text-emerald-600">
            ACCOUNT MANAGEMENT
          </p>
          <h1 className="mt-2 text-3xl font-bold">My Profile</h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage your personal information and view your organisation details.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Loading your profile...
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100 text-2xl font-bold text-emerald-700">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    displayName
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="text-xl font-bold">{displayName}</h2>
                  <p className="mt-1 text-sm text-slate-500">{email}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {jobTitle || "Position not specified"}
                  </p>
                </div>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-lg font-bold">Personal Information</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Update your profile details.
                  </p>
                </div>

                <form onSubmit={saveProfile} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Full Name
                    </label>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      maxLength={120}
                      placeholder="Enter your full name"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Email Address
                    </label>
                    <input
                      value={email}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500"
                    />
                    <p className="mt-2 text-xs text-slate-400">
                      Your sign-in email is managed by your authentication account.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Job Title
                    </label>
                    <input
                      value={jobTitle}
                      onChange={(event) => setJobTitle(event.target.value)}
                      maxLength={120}
                      placeholder="Enter your job title"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "Saving changes..." : "Save Changes"}
                  </button>
                </form>
              </section>

              <section className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Organisation Details</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Your current membership information.
                  </p>

                  {membership ? (
                    <div className="mt-6 space-y-5">
                      <div>
                        <p className="text-xs text-slate-400">Department</p>
                        <p className="mt-1 text-sm font-semibold">
                          {department || "Not assigned"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">System Role</p>
                        <p className="mt-1 text-sm font-semibold capitalize">
                          {membership.role.replaceAll("_", " ")}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Official Designation
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {membership.designation || "Not assigned"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Membership Status</p>
                        <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {membership.status}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-6 text-sm text-slate-500">
                      No active membership was found in the selected organisation.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">Account Security</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Your account is authenticated through Talvorah's secure sign-in system.
                  </p>
                  <a
                    href="/forgot-password"
                    className="mt-5 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    Change or reset password →
                  </a>
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

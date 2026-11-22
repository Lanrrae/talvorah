
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    name: "",
    industry: "",
    email: "",
    phone: "",
    website: "",
    country: "Nigeria",
    address: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Please enter your organisation name.");
      return;
    }

    setLoading(true);

    try {
      const { data: { user }, error: authError } =
        await supabase.auth.getUser();

      if (authError || !user) {
        setError("Your session has expired. Please log in again.");
        setLoading(false);
        return;
      }

      const { data, error: createError } = await supabase.rpc(
        "create_organisation",
        {
          org_name: form.name,
          org_industry: form.industry || null,
          org_email: form.email || null,
          org_phone: form.phone || null,
          org_website: form.website || null,
          org_country: form.country || null,
          org_address: form.address || null,
          org_description: form.description || null,
        }
      );

      if (createError) {
        throw createError;
      }

      if (!data) {
        throw new Error("Organisation creation returned no ID.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";

      setError(message);
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-[#151522] px-4 py-3 text-sm text-white outline-none transition focus:border-purple-500 placeholder:text-gray-500";

  const labelClass =
    "mb-2 block text-sm font-medium text-gray-300";

  return (
    <main className="min-h-screen bg-[#09090f] px-5 py-12 text-white">
      <div className="mx-auto max-w-3xl">

        <div className="mb-10">
          <p className="mb-3 text-sm font-semibold tracking-widest text-purple-400">
            TALVORAH
          </p>

          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Set up your organisation
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400">
            Tell us a little about your organisation. You will become
            its first administrator and can invite your team afterwards.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-2xl border border-white/10 bg-[#10101a] p-6 shadow-xl md:p-8"
        >
          <section>
            <h2 className="mb-5 text-lg font-semibold">
              Organisation information
            </h2>

            <div className="grid gap-5 md:grid-cols-2">

              <div className="md:col-span-2">
                <label className={labelClass}>
                  Organisation name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g. Talvorah Technologies"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Industry</label>
                <select
                  value={form.industry}
                  onChange={(e) => updateField("industry", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select industry</option>
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Government">Government</option>
                  <option value="Retail">Retail</option>
                  <option value="Construction">Construction</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Country</label>
                <input
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  placeholder="Country"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Official email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="contact@company.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Phone number</label>
                <input
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+234..."
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Website</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  placeholder="https://www.company.com"
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Office address</label>
                <input
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Enter your organisation's address"
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>
                  About the organisation
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Briefly describe your organisation..."
                  className={inputClass}
                />
              </div>

            </div>
          </section>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-col justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
            <p className="text-xs text-gray-500">
              You can update these details later in Settings.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-purple-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating organisation..." : "Create organisation"}
            </button>
          </div>
        </form>

      </div>
    </main>
  );
}

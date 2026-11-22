
"use client";

import { useState } from "react";

export default function OrganisationPage() {
  const [organisation, setOrganisation] = useState({
    name: "Your Organisation",
    industry: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    country: "Nigeria",
    size: "1–50 employees",
    description: "",
  });

  const [saved, setSaved] = useState(false);

  const updateField = (field: string, value: string) => {
    setOrganisation((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const inputStyle =
    "mt-2 w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm text-white outline-none focus:border-purple-500";

  const labelStyle = "text-sm font-medium text-gray-300";

  return (
    <div className="min-h-screen bg-[#08080d] text-white md:flex">
      <aside className="w-full border-b border-white/10 bg-[#09090f] p-6 md:min-h-screen md:w-[270px] md:border-b-0 md:border-r">
        <h1 className="text-2xl font-bold">
          Talvorah<span className="text-purple-500">.</span>
        </h1>

        <div className="mt-9 rounded-xl border border-white/10 bg-[#13131c] p-4">
          <p className="text-xs text-gray-500">CURRENT ORGANISATION</p>
          <p className="mt-2 font-semibold">{organisation.name}</p>
          <p className="mt-1 text-xs text-gray-500">Organisation workspace</p>
        </div>

        <p className="mb-4 mt-9 text-xs tracking-[2px] text-gray-500">
          WORKSPACE
        </p>

        <nav className="space-y-1">
          {[
            ["Overview", "/dashboard"],
            ["Organisation", "/dashboard/organisation"],
            ["Departments", "/dashboard/departments"],
            ["Employees", "/dashboard/employees"],
            ["Projects", "/dashboard/projects"],
            ["Tasks", "/dashboard/tasks"],
            ["Messages", "/dashboard/messages"],
            ["Meetings & Calendar", "/dashboard/calendar"],
            ["Documents", "/dashboard/documents"],
            ["Settings", "/dashboard/settings"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className={`block rounded-xl px-4 py-3 text-sm transition ${
                label === "Organisation"
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-6 md:p-10">
        <div className="mb-9">
          <p className="mb-2 text-sm text-gray-400">
            Workspace / Organisation
          </p>
          <h2 className="text-3xl font-bold">Organisation Management</h2>
          <p className="mt-2 text-gray-400">
            Manage your organisation's identity and business information.
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-[#13131c] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400">ORGANISATION PROFILE</p>
              <h3 className="mt-2 text-xl font-semibold">
                {organisation.name || "Organisation Name"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {organisation.industry || "Industry not specified"}
              </p>
            </div>

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600/20 text-2xl font-bold text-purple-400">
              {organisation.name.substring(0, 1).toUpperCase() || "O"}
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(true);
          }}
          className="space-y-7"
        >
          <section className="rounded-2xl border border-white/10 bg-[#13131c] p-6 md:p-8">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <p className="mt-1 text-sm text-gray-500">
              General information about your organisation.
            </p>

            <div className="mt-7 grid gap-6 md:grid-cols-2">
              <label className={labelStyle}>
                Organisation Name
                <input
                  required
                  className={inputStyle}
                  value={organisation.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Enter organisation name"
                />
              </label>

              <label className={labelStyle}>
                Industry
                <select
                  className={inputStyle}
                  value={organisation.industry}
                  onChange={(e) => updateField("industry", e.target.value)}
                >
                  <option value="">Select industry</option>
                  <option>Technology</option>
                  <option>Finance</option>
                  <option>Healthcare</option>
                  <option>Education</option>
                  <option>Engineering</option>
                  <option>Manufacturing</option>
                  <option>Construction</option>
                  <option>Consulting</option>
                  <option>Government</option>
                  <option>Other</option>
                </select>
              </label>

              <label className={labelStyle}>
                Organisation Email
                <input
                  type="email"
                  className={inputStyle}
                  value={organisation.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="contact@organisation.com"
                />
              </label>

              <label className={labelStyle}>
                Phone Number
                <input
                  className={inputStyle}
                  value={organisation.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+234..."
                />
              </label>

              <label className={labelStyle}>
                Website
                <input
                  className={inputStyle}
                  value={organisation.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  placeholder="https://www.organisation.com"
                />
              </label>

              <label className={labelStyle}>
                Organisation Size
                <select
                  className={inputStyle}
                  value={organisation.size}
                  onChange={(e) => updateField("size", e.target.value)}
                >
                  <option>1–50 employees</option>
                  <option>51–200 employees</option>
                  <option>201–500 employees</option>
                  <option>501–1,000 employees</option>
                  <option>1,001–5,000 employees</option>
                  <option>5,000+ employees</option>
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#13131c] p-6 md:p-8">
            <h3 className="text-lg font-semibold">Location & Address</h3>
            <p className="mt-1 text-sm text-gray-500">
              Where your organisation operates.
            </p>

            <div className="mt-7 grid gap-6 md:grid-cols-2">
              <label className={labelStyle}>
                Country
                <select
                  className={inputStyle}
                  value={organisation.country}
                  onChange={(e) => updateField("country", e.target.value)}
                >
                  <option>Nigeria</option>
                  <option>Ghana</option>
                  <option>Kenya</option>
                  <option>South Africa</option>
                  <option>United Kingdom</option>
                  <option>United States</option>
                  <option>Other</option>
                </select>
              </label>

              <label className={labelStyle}>
                Office Address
                <input
                  className={inputStyle}
                  value={organisation.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Enter office address"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#13131c] p-6 md:p-8">
            <h3 className="text-lg font-semibold">About the Organisation</h3>
            <p className="mt-1 text-sm text-gray-500">
              A short description of your organisation and its activities.
            </p>

            <label className={`mt-6 block ${labelStyle}`}>
              Organisation Description
              <textarea
                rows={5}
                className={inputStyle}
                value={organisation.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Tell us about your organisation..."
              />
            </label>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-4">
            {saved && (
              <p className="text-sm text-green-400">
                Changes saved in this session.
              </p>
            )}

            <button
              type="submit"
              className="rounded-xl bg-purple-600 px-7 py-3 font-medium transition hover:bg-purple-700"
            >
              Save Organisation Details
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

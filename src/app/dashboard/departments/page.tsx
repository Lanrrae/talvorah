"use client";

import OrganisationSwitcher from "@/components/OrganisationSwitcher";


import { useState } from "react";

type Department = {
  id: number;
  name: string;
  head: string;
  employees: number;
  status: string;
  progress: number;
};

const initialDepartments: Department[] = [
  { id: 1, name: "Information Technology", head: "Not assigned", employees: 18, status: "Active", progress: 82 },
  { id: 2, name: "Finance & Accounts", head: "Not assigned", employees: 12, status: "Active", progress: 74 },
  { id: 3, name: "Human Resources", head: "Not assigned", employees: 10, status: "Active", progress: 91 },
  { id: 4, name: "Operations", head: "Not assigned", employees: 25, status: "Active", progress: 68 },
  { id: 5, name: "Marketing", head: "Not assigned", employees: 14, status: "Active", progress: 77 },
  { id: 6, name: "Administration", head: "Not assigned", employees: 9, status: "Active", progress: 85 },
];

const navigation = [
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
];

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState(initialDepartments);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHead, setNewHead] = useState("");

  const filtered = departments.filter((department) =>
    department.name.toLowerCase().includes(search.toLowerCase())
  );

  function addDepartment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!newName.trim()) return;

    setDepartments((current) => [
      ...current,
      {
        id: Date.now(),
        name: newName.trim(),
        head: newHead.trim() || "Not assigned",
        employees: 0,
        status: "Active",
        progress: 0,
      },
    ]);

    setNewName("");
    setNewHead("");
    setShowForm(false);
  }

  return (
    <div className="min-h-screen bg-[#08080d] text-white md:flex">
      <aside className="w-full border-b border-white/10 bg-[#09090f] p-6 md:min-h-screen md:w-[270px] md:border-b-0 md:border-r">
        <h1 className="text-2xl font-bold">
          Talvorah<span className="text-purple-500">.</span>
        </h1>

        <div className="mt-9 rounded-xl border border-white/10 bg-[#13131c] p-4">
          <p className="text-xs text-gray-500">CURRENT ORGANISATION</p>
          <p className="mt-2 font-semibold">Your Organisation</p>
          <p className="mt-1 text-xs text-gray-500">Organisation workspace</p>
        </div>

        <p className="mb-4 mt-9 text-xs tracking-[2px] text-gray-500">WORKSPACE</p>

        <nav className="space-y-1">
          {navigation.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className={`block rounded-xl px-4 py-3 text-sm transition ${
                label === "Departments"
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
        <header className="mb-9 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm text-gray-400">
              Workspace / Departments
            </p>
            <h2 className="text-3xl font-bold">Department Management</h2>
            <p className="mt-2 text-gray-400">
              Organise teams and oversee departmental performance.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-medium hover:bg-purple-700"
          >
            + Create Department
          </button>
        </header>

        {showForm && (
          <form
            onSubmit={addDepartment}
            className="mb-8 rounded-2xl border border-white/10 bg-[#13131c] p-6"
          >
            <h3 className="text-lg font-semibold">Create a Department</h3>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Department name"
                className="rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm outline-none focus:border-purple-500"
              />
              <input
                value={newHead}
                onChange={(e) => setNewHead(e.target.value)}
                placeholder="Department head (optional)"
                className="rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm outline-none focus:border-purple-500"
              />
            </div>

            <div className="mt-5 flex gap-3">
              <button type="submit" className="rounded-lg bg-purple-600 px-5 py-2 text-sm">
                Add Department
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg bg-white/10 px-5 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <section className="mb-8 grid gap-5 sm:grid-cols-3">
          {[
            ["Total Departments", departments.length],
            ["Active Departments", departments.filter((d) => d.status === "Active").length],
            ["Employees Assigned", departments.reduce((sum, d) => sum + d.employees, 0)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-[#13131c] p-6">
              <p className="text-sm text-gray-400">{label}</p>
              <p className="mt-4 text-3xl font-bold">{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#13131c] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">All Departments</h3>
              <p className="mt-1 text-sm text-gray-500">
                Departments registered under this organisation
              </p>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search departments..."
              className="w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm outline-none focus:border-purple-500 md:max-w-xs"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-500">
                  <th className="pb-4 font-medium">Department</th>
                  <th className="pb-4 font-medium">Department Head</th>
                  <th className="pb-4 font-medium">Employees</th>
                  <th className="pb-4 font-medium">Progress</th>
                  <th className="pb-4 font-medium">Status</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((department) => (
                  <tr key={department.id} className="border-b border-white/5 last:border-0">
                    <td className="py-5 pr-4 font-medium">{department.name}</td>
                    <td className="py-5 pr-4 text-gray-400">{department.head}</td>
                    <td className="py-5 pr-4">{department.employees}</td>
                    <td className="py-5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-purple-500"
                            style={{ width: `${department.progress}%` }}
                          />
                        </div>
                        <span className="text-gray-400">{department.progress}%</span>
                      </div>
                    </td>
                    <td className="py-5">
                      <span className="rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-400">
                        {department.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <p className="py-10 text-center text-gray-500">
                No departments found.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

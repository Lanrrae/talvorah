"use client";

import OrganisationSwitcher from "@/components/OrganisationSwitcher";


import { useState } from "react";

type Project = {
  id: number;
  name: string;
  department: string;
  manager: string;
  budget: string;
  startDate: string;
  dueDate: string;
  progress: number;
  status: string;
};

const initialProjects: Project[] = [
  { id: 1, name: "Digital Transformation", department: "Information Technology", manager: "Alex Morgan", budget: "₦12,000,000", startDate: "2026-10-01", dueDate: "2027-02-28", progress: 65, status: "In Progress" },
  { id: 2, name: "Employee Development Programme", department: "Human Resources", manager: "HR Manager", budget: "₦4,500,000", startDate: "2026-09-15", dueDate: "2026-12-20", progress: 80, status: "In Progress" },
  { id: 3, name: "Financial Systems Upgrade", department: "Finance & Accounts", manager: "Finance Manager", budget: "₦8,000,000", startDate: "2026-11-01", dueDate: "2027-03-15", progress: 25, status: "In Progress" },
  { id: 4, name: "Customer Experience Initiative", department: "Operations", manager: "Operations Manager", budget: "₦3,200,000", startDate: "2026-08-01", dueDate: "2026-11-30", progress: 100, status: "Completed" },
];

const departments = [
  "Information Technology",
  "Finance & Accounts",
  "Human Resources",
  "Operations",
  "Marketing",
  "Administration",
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

export default function ProjectsPage() {
  const [projects, setProjects] = useState(initialProjects);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    department: "",
    manager: "",
    budget: "",
    startDate: "",
    dueDate: "",
  });

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.department.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function addProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setProjects((current) => [
      ...current,
      {
        id: Date.now(),
        ...form,
        progress: 0,
        status: "Not Started",
      },
    ]);

    setForm({
      name: "",
      department: "",
      manager: "",
      budget: "",
      startDate: "",
      dueDate: "",
    });

    setShowForm(false);
  }

  function updateStatus(id: number, status: string) {
    setProjects((current) =>
      current.map((project) =>
        project.id === id
          ? { ...project, status, progress: status === "Completed" ? 100 : project.progress }
          : project
      )
    );
  }

  const statusStyle = (status: string) => {
    if (status === "Completed") return "bg-green-500/10 text-green-400";
    if (status === "In Progress") return "bg-purple-500/10 text-purple-400";
    return "bg-yellow-500/10 text-yellow-400";
  };

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
                label === "Projects"
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
            <p className="mb-2 text-sm text-gray-400">Workspace / Projects</p>
            <h2 className="text-3xl font-bold">Project Management</h2>
            <p className="mt-2 text-gray-400">
              Plan, coordinate and monitor projects across your organisation.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-medium hover:bg-purple-700"
          >
            + Create Project
          </button>
        </header>

        <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Total Projects", projects.length],
            ["In Progress", projects.filter((p) => p.status === "In Progress").length],
            ["Completed", projects.filter((p) => p.status === "Completed").length],
            ["Not Started", projects.filter((p) => p.status === "Not Started").length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-[#13131c] p-6">
              <p className="text-sm text-gray-400">{label}</p>
              <p className="mt-4 text-3xl font-bold">{value}</p>
            </div>
          ))}
        </section>

        {showForm && (
          <form
            onSubmit={addProject}
            className="mb-8 rounded-2xl border border-white/10 bg-[#13131c] p-6"
          >
            <h3 className="text-lg font-semibold">Create Organisation Project</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add a project and assign it to a department.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                required
                placeholder="Project name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm outline-none focus:border-purple-500"
              />

              <select
                required
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm text-gray-300 outline-none focus:border-purple-500"
              >
                <option value="">Assign department</option>
                {departments.map((department) => (
                  <option key={department}>{department}</option>
                ))}
              </select>

              <input
                required
                placeholder="Project manager"
                value={form.manager}
                onChange={(e) => setForm({ ...form, manager: e.target.value })}
                className="rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm outline-none focus:border-purple-500"
              />

              <input
                placeholder="Project budget (e.g. ₦5,000,000)"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className="rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm outline-none focus:border-purple-500"
              />

              <label className="text-sm text-gray-400">
                Start Date
                <input
                  required
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm text-white outline-none"
                />
              </label>

              <label className="text-sm text-gray-400">
                Target Completion Date
                <input
                  required
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm text-white outline-none"
                />
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button type="submit" className="rounded-lg bg-purple-600 px-5 py-2 text-sm">
                Create Project
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

        <section className="rounded-2xl border border-white/10 bg-[#13131c] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">All Projects</h3>
              <p className="mt-1 text-sm text-gray-500">
                Projects managed across the organisation
              </p>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm outline-none focus:border-purple-500 md:max-w-xs"
            />
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {["All", "In Progress", "Completed", "Not Started"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-4 py-2 text-sm ${
                  statusFilter === status
                    ? "bg-purple-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="rounded-xl border border-white/10 bg-[#09090f] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold">{project.name}</h4>
                    <p className="mt-2 text-sm text-gray-400">
                      {project.department}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Project Manager: {project.manager}
                    </p>
                  </div>

                  <select
                    value={project.status}
                    onChange={(e) => updateStatus(project.id, e.target.value)}
                    className={`rounded-lg px-3 py-2 text-xs outline-none ${statusStyle(project.status)} bg-[#13131c]`}
                  >
                    <option>Not Started</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                </div>

                <div className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-gray-500">Budget</p>
                    <p className="mt-1">{project.budget || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Start Date</p>
                    <p className="mt-1">{project.startDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Target Date</p>
                    <p className="mt-1">{project.dueDate}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="text-gray-400">Project Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-purple-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {filteredProjects.length === 0 && (
              <p className="py-10 text-center text-gray-500">No projects found.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

"use client";

import OrganisationSwitcher from "@/components/OrganisationSwitcher";


import { useState } from "react";

const initialTasks = [
  { id: 1, title: "Complete website redesign", project: "Website Development", priority: "High", due: "Nov 23, 2026", status: "In Progress" },
  { id: 2, title: "Review marketing strategy", project: "Marketing Campaign", priority: "Medium", due: "Nov 24, 2026", status: "Pending" },
  { id: 3, title: "Prepare project presentation", project: "Business Development", priority: "High", due: "Nov 25, 2026", status: "In Progress" },
  { id: 4, title: "Update team documentation", project: "Internal Operations", priority: "Low", due: "Nov 27, 2026", status: "Completed" },
  { id: 5, title: "Schedule client meeting", project: "Client Relations", priority: "Medium", due: "Nov 28, 2026", status: "Pending" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filteredTasks = tasks.filter((task) => {
    const matchesFilter = filter === "All" || task.status === filter;
    const matchesSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.project.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const updateStatus = (id: number, status: string) => {
    setTasks((current) =>
      current.map((task) => task.id === id ? { ...task, status } : task)
    );
  };

  const statusStyle = (status: string) => {
    if (status === "Completed") return "bg-green-500/10 text-green-400";
    if (status === "In Progress") return "bg-purple-500/10 text-purple-400";
    return "bg-yellow-500/10 text-yellow-400";
  };

  const priorityStyle = (priority: string) => {
    if (priority === "High") return "text-red-400";
    if (priority === "Medium") return "text-yellow-400";
    return "text-gray-400";
  };

  return (
    <div className="min-h-screen bg-[#08080d] text-white md:flex">
      <aside className="w-full border-b border-white/10 bg-[#09090f] p-6 md:min-h-screen md:w-[270px] md:border-b-0 md:border-r">
        <h1 className="text-2xl font-bold">
          Talvorah<span className="text-purple-500">.</span>
        </h1>

        <p className="mb-5 mt-12 text-xs tracking-[2px] text-gray-500">
          WORKSPACE
        </p>

        <nav className="space-y-2">
          {[
            ["Overview", "/dashboard"],
            ["My Tasks", "/dashboard/tasks"],
            ["Projects", "/dashboard/projects"],
            ["Messages", "/dashboard/messages"],
            ["Calendar", "/dashboard/calendar"],
            ["Team Members", "/dashboard/team"],
            ["Documents", "/dashboard/documents"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className={`block rounded-xl px-4 py-3 transition ${
                label === "My Tasks"
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
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm text-gray-400">Workspace / My Tasks</p>
            <h2 className="text-3xl font-bold">My Tasks</h2>
            <p className="mt-2 text-gray-400">
              Organise, track and manage your work.
            </p>
          </div>

          <button
            onClick={() => alert("Task creation will be connected later.")}
            className="rounded-xl bg-purple-600 px-5 py-3 font-medium transition hover:bg-purple-700"
          >
            + Create Task
          </button>
        </div>

        <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Total Tasks", tasks.length],
            ["In Progress", tasks.filter((t) => t.status === "In Progress").length],
            ["Pending", tasks.filter((t) => t.status === "Pending").length],
            ["Completed", tasks.filter((t) => t.status === "Completed").length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-[#13131c] p-6">
              <p className="text-sm text-gray-400">{label}</p>
              <p className="mt-4 text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#13131c] p-5 md:p-7">
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <h3 className="text-xl font-semibold">Task List</h3>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks or projects..."
              className="w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm outline-none focus:border-purple-500 lg:max-w-xs"
            />
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {["All", "In Progress", "Pending", "Completed"].map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-lg px-4 py-2 text-sm transition ${
                  filter === item
                    ? "bg-purple-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-500">
                  <th className="pb-4 font-medium">Task</th>
                  <th className="pb-4 font-medium">Project</th>
                  <th className="pb-4 font-medium">Priority</th>
                  <th className="pb-4 font-medium">Due Date</th>
                  <th className="pb-4 font-medium">Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="border-b border-white/5 last:border-0">
                    <td className="py-5 pr-4 font-medium">{task.title}</td>
                    <td className="py-5 pr-4 text-gray-400">{task.project}</td>
                    <td className={`py-5 pr-4 ${priorityStyle(task.priority)}`}>
                      {task.priority}
                    </td>
                    <td className="py-5 pr-4 text-gray-400">{task.due}</td>
                    <td className="py-5">
                      <select
                        value={task.status}
                        onChange={(e) => updateStatus(task.id, e.target.value)}
                        className={`rounded-lg border-0 px-3 py-2 text-xs outline-none ${statusStyle(task.status)} bg-[#09090f]`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredTasks.length === 0 && (
              <p className="py-10 text-center text-gray-500">
                No tasks found.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

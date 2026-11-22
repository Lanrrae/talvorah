import OrganisationSwitcher from "@/components/OrganisationSwitcher";

const stats = [
  { label: "Total Employees", value: "128", detail: "Across all departments" },
  { label: "Departments", value: "8", detail: "Active departments" },
  { label: "Active Projects", value: "24", detail: "Across the organisation" },
  { label: "Tasks Completed", value: "76%", detail: "Overall completion rate" },
];

const departments = [
  { name: "Information Technology", head: "Department Head", members: 18, progress: 82 },
  { name: "Finance & Accounts", head: "Department Head", members: 12, progress: 74 },
  { name: "Human Resources", head: "Department Head", members: 10, progress: 91 },
  { name: "Operations", head: "Department Head", members: 25, progress: 68 },
];

const activities = [
  { title: "New project created", detail: "Website Infrastructure Upgrade", time: "10 minutes ago" },
  { title: "Project milestone completed", detail: "Digital Transformation Programme", time: "45 minutes ago" },
  { title: "New employee added", detail: "An employee joined the organisation", time: "2 hours ago" },
  { title: "Department update", detail: "Finance submitted its monthly report", time: "Yesterday" },
];

const navigation = [
  { label: "Overview", href: "/dashboard" },
  { label: "Organisation", href: "/dashboard/organisation" },
  { label: "Departments", href: "/dashboard/departments" },
  { label: "Employees", href: "/dashboard/employees" },
  { label: "Projects", href: "/dashboard/projects" },
  { label: "Tasks", href: "/dashboard/tasks" },
  { label: "Messages", href: "/dashboard/messages" },
  { label: "Meetings & Calendar", href: "/dashboard/calendar" },
  { label: "Documents", href: "/dashboard/documents" },
  { label: "Settings", href: "/dashboard/settings" },
];

export default function DashboardPage() {
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
<div className="mt-4">
  <OrganisationSwitcher />
</div>

        <p className="mb-4 mt-9 text-xs tracking-[2px] text-gray-500">
          WORKSPACE
        </p>

        <nav className="space-y-1">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`block rounded-xl px-4 py-3 text-sm transition ${
                item.label === "Overview"
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="mt-10 border-t border-white/10 pt-5">
          <p className="text-sm font-medium">Organisation Admin</p>
          <p className="mt-1 text-xs text-gray-500">Workspace administrator</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-6 md:p-10">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="mb-2 text-sm text-gray-400">
              Organisation / Overview
            </p>
            <h2 className="text-3xl font-bold">Organisation Dashboard</h2>
            <p className="mt-2 text-gray-400">
              A complete overview of your organisation's activities and performance.
            </p>
          </div>

          <button className="rounded-xl border border-white/10 bg-[#181820] px-5 py-3 text-sm hover:bg-white/10">
            Organisation Settings
          </button>
        </header>

        <section className="mb-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-[#13131c] p-6"
            >
              <p className="text-sm text-gray-400">{stat.label}</p>
              <p className="mt-5 text-3xl font-bold">{stat.value}</p>
              <p className="mt-2 text-xs text-gray-500">{stat.detail}</p>
            </div>
          ))}
        </section>

        <section className="mb-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-[#13131c] p-6">
            <div className="mb-7 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Department Overview</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Performance across your departments
                </p>
              </div>
              <a
                href="/dashboard/departments"
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                View all
              </a>
            </div>

            <div className="space-y-7">
              {departments.map((department) => (
                <div key={department.name}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{department.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {department.members} employees
                      </p>
                    </div>
                    <span className="text-sm text-gray-300">
                      {department.progress}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-purple-500"
                      style={{ width: `${department.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#13131c] p-6">
            <h3 className="text-lg font-semibold">Organisation Activity</h3>
            <p className="mt-1 text-sm text-gray-500">
              Recent updates across the workspace
            </p>

            <div className="mt-7 space-y-6">
              {activities.map((activity, index) => (
                <div key={activity.title + index} className="flex gap-3">
                  <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-purple-500" />
                  <div>
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {activity.detail}
                    </p>
                    <p className="mt-2 text-xs text-gray-600">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#13131c] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Organisation Quick Access</h3>
              <p className="mt-1 text-sm text-gray-500">
                Manage the key areas of your organisation
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Manage Employees", "/dashboard/employees"],
              ["Manage Departments", "/dashboard/departments"],
              ["View Projects", "/dashboard/projects"],
              ["Manage Tasks", "/dashboard/tasks"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-xl border border-white/10 bg-[#09090f] p-4 text-sm text-gray-300 transition hover:border-purple-500 hover:text-white"
              >
                {label} <span className="float-right text-purple-400">→</span>
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

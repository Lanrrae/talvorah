
"use client";

import { useState } from "react";

const navItems = [
  ["Overview", "/dashboard"],
  ["Organisation", "/dashboard/organisation"],
  ["Departments", "/dashboard/departments"],
  ["Employees", "/dashboard/employees"],
  ["Projects", "/dashboard/projects"],
  ["Tasks", "/dashboard/tasks"],
  ["Messages", "/dashboard/messages"],
  ["Meetings & Calendar", "/dashboard/meetings"],
  ["Documents", "/dashboard/documents"],
  ["Settings", "/dashboard/settings"],
];

const initialRoles = [
  { role: "Super Admin", access: "Full platform access", users: 1 },
  { role: "Organisation Admin", access: "Manage entire organisation", users: 3 },
  { role: "Department Head", access: "Manage assigned department", users: 8 },
  { role: "Manager", access: "Manage assigned teams and projects", users: 14 },
  { role: "Employee", access: "Access assigned work and shared resources", users: 102 },
];

const initialLogs = [
  { action: "Organisation profile updated", user: "Admin", date: "21 Nov 2026", status: "Successful" },
  { action: "New employee added", user: "Admin", date: "20 Nov 2026", status: "Successful" },
  { action: "Project created", user: "Alex Morgan", date: "19 Nov 2026", status: "Successful" },
  { action: "Department settings changed", user: "Admin", date: "18 Nov 2026", status: "Successful" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("General");
  const [organisationName, setOrganisationName] = useState("Your Organisation");
  const [industry, setIndustry] = useState("Technology");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [language, setLanguage] = useState("English");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [taskNotifications, setTaskNotifications] = useState(true);
  const [meetingNotifications, setMeetingNotifications] = useState(true);
  const [announcementNotifications, setAnnouncementNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [notice, setNotice] = useState("");

  const [roles, setRoles] = useState(initialRoles);

  function saveSettings() {
    setNotice("Your changes have been saved in this demo session.");
  }

  function addRole() {
    if (!newRole.trim()) return;

    setRoles((current) => [
      ...current,
      {
        role: newRole.trim(),
        access: "Custom permissions to be configured",
        users: 0,
      },
    ]);

    setNewRole("");
    setShowRoleForm(false);
    setNotice("New role added to the demonstration list.");
  }

  const tabs = [
    "General",
    "Roles & Permissions",
    "Notifications",
    "Security",
    "Billing",
    "Audit Logs",
  ];

  return (
    <div className="min-h-screen bg-[#080b14] text-white flex">
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-white/10 bg-[#0b0f1a] flex-col p-5">
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-wide">
            Talvorah<span className="text-purple-400">.</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">Organisation Workspace</p>
        </div>

        <div className="mb-7 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs text-gray-500">CURRENT ORGANISATION</p>
          <p className="font-semibold mt-2">{organisationName}</p>
          <p className="text-xs text-purple-400 mt-1">Organisation Admin</p>
        </div>

        <p className="text-xs uppercase tracking-wider text-gray-500 mb-3">
          Workspace
        </p>

        <nav className="space-y-1">
          {navItems.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                label === "Settings"
                  ? "bg-purple-500/15 text-purple-300 border border-purple-500/20"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-5">
          <p className="text-sm font-medium">Workspace Account</p>
          <p className="text-xs text-gray-500 mt-1">admin@organisation.com</p>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-5 md:p-8">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <p className="text-sm text-purple-400 mb-2">
              WORKSPACE / ADMINISTRATION
            </p>
            <h2 className="text-3xl font-bold">Settings & Administration</h2>
            <p className="text-gray-400 text-sm mt-2">
              Configure your organisation, manage access and control your workspace.
            </p>
          </div>
          <button
            onClick={saveSettings}
            className="rounded-xl bg-purple-600 hover:bg-purple-500 px-5 py-3 text-sm font-semibold"
          >
            Save Changes
          </button>
        </div>

        {notice && (
          <div className="mb-5 rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-sm text-purple-200">
            {notice}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
          {[
            { label: "Organisation Users", value: "128", note: "Registered employees" },
            { label: "Access Roles", value: roles.length, note: "Configured role types" },
            { label: "Security Status", value: "Active", note: "Workspace protection" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-[#101522] p-5">
              <p className="text-sm text-gray-400">{item.label}</p>
              <p className="text-2xl font-bold mt-2">{item.value}</p>
              <p className="text-xs text-gray-500 mt-1">{item.note}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-5">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 rounded-lg px-4 py-3 text-sm transition ${
                activeTab === tab
                  ? "bg-purple-600 text-white"
                  : "bg-[#101522] border border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#101522] p-5 md:p-7">

          {activeTab === "General" && (
            <div>
              <h3 className="text-xl font-semibold">General Settings</h3>
              <p className="text-sm text-gray-500 mt-1 mb-7">
                Manage your organisation's basic workspace information.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-gray-400">Organisation name</label>
                  <input
                    value={organisationName}
                    onChange={(e) => setOrganisationName(e.target.value)}
                    className="w-full mt-2 rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 text-sm outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400">Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full mt-2 rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 text-sm outline-none"
                  >
                    <option>Technology</option>
                    <option>Engineering</option>
                    <option>Finance</option>
                    <option>Healthcare</option>
                    <option>Education</option>
                    <option>Manufacturing</option>
                    <option>Construction</option>
                    <option>Government</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Workspace language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full mt-2 rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 text-sm outline-none"
                  >
                    <option>English</option>
                    <option>French</option>
                    <option>Spanish</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Organisation timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full mt-2 rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 text-sm outline-none"
                  >
                    <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/Paris">Europe/Paris</option>
                    <option value="Asia/Dubai">Asia/Dubai</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <h4 className="font-semibold">Workspace information</h4>
                <p className="text-sm text-gray-500 mt-2">
                  Your organisation's profile, departments, employees and workspace configuration will be managed centrally through Talvorah.
                </p>
              </div>
            </div>
          )}

          {activeTab === "Roles & Permissions" && (
            <div>
              <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                <div>
                  <h3 className="text-xl font-semibold">Roles & Permissions</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Define what each user type can access.
                  </p>
                </div>
                <button
                  onClick={() => setShowRoleForm(true)}
                  className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold hover:bg-purple-500"
                >
                  + Add Role
                </button>
              </div>

              <div className="space-y-3">
                {roles.map((role) => (
                  <div key={role.role} className="rounded-xl border border-white/10 bg-[#080b14] p-4 flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <p className="font-semibold">{role.role}</p>
                      <p className="text-sm text-gray-500 mt-1">{role.access}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{role.users}</p>
                      <p className="text-xs text-gray-500">Users</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-sm text-amber-300 font-medium">Permission configuration</p>
                <p className="text-xs text-gray-400 mt-2">
                  These are demonstration role descriptions. Actual access restrictions must be enforced by the authentication system and database policies, not just by the interface.
                </p>
              </div>
            </div>
          )}

          {activeTab === "Notifications" && (
            <div>
              <h3 className="text-xl font-semibold">Notification Preferences</h3>
              <p className="text-sm text-gray-500 mt-1 mb-7">
                Choose which workspace updates you want to receive.
              </p>

              {[
                { label: "Email Notifications", description: "Receive workspace updates through email.", value: emailNotifications, set: setEmailNotifications },
                { label: "Task Notifications", description: "Get notified when tasks are assigned or updated.", value: taskNotifications, set: setTaskNotifications },
                { label: "Meeting Notifications", description: "Receive meeting invitations and schedule changes.", value: meetingNotifications, set: setMeetingNotifications },
                { label: "Announcements", description: "Receive important organisation-wide announcements.", value: announcementNotifications, set: setAnnouncementNotifications },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center gap-4 border-b border-white/10 py-5">
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                  </div>
                  <button
                    onClick={() => item.set(!item.value)}
                    className={`w-12 h-6 shrink-0 rounded-full transition relative ${item.value ? "bg-purple-600" : "bg-gray-700"}`}
                    aria-label={`Toggle ${item.label}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${item.value ? "left-7" : "left-1"}`} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === "Security" && (
            <div>
              <h3 className="text-xl font-semibold">Security Settings</h3>
              <p className="text-sm text-gray-500 mt-1 mb-7">
                Manage workspace security preferences.
              </p>

              <div className="rounded-xl border border-white/10 bg-[#080b14] p-5 mb-4">
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Require an additional verification step for account access.
                    </p>
                  </div>
                  <button
                    onClick={() => setTwoFactor(!twoFactor)}
                    className={`w-12 h-6 shrink-0 rounded-full transition relative ${twoFactor ? "bg-purple-600" : "bg-gray-700"}`}
                    aria-label="Toggle two-factor authentication"
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${twoFactor ? "left-7" : "left-1"}`} />
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#080b14] p-5 mb-4">
                <p className="font-medium">Password Management</p>
                <p className="text-xs text-gray-500 mt-2">
                  Password changes and recovery will be handled through the account authentication system.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#080b14] p-5">
                <p className="font-medium">Active Sessions</p>
                <p className="text-xs text-gray-500 mt-2">
                  Session monitoring and remote sign-out will be available when authentication management is connected.
                </p>
              </div>
            </div>
          )}

          {activeTab === "Billing" && (
            <div>
              <h3 className="text-xl font-semibold">Subscription & Billing</h3>
              <p className="text-sm text-gray-500 mt-1 mb-7">
                Manage your organisation's Talvorah subscription.
              </p>

              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6 mb-5">
                <p className="text-xs uppercase tracking-wider text-purple-300">Current Plan</p>
                <h4 className="text-3xl font-bold mt-3">Free / Setup</h4>
                <p className="text-sm text-gray-400 mt-2">
                  Development workspace. No paid subscription is currently configured.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 bg-[#080b14] p-5">
                  <p className="text-sm text-gray-400">Organisation users</p>
                  <p className="text-2xl font-bold mt-2">128</p>
                  <p className="text-xs text-gray-500 mt-1">Illustrative workspace figure</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#080b14] p-5">
                  <p className="text-sm text-gray-400">Billing status</p>
                  <p className="text-2xl font-bold mt-2">Not configured</p>
                  <p className="text-xs text-gray-500 mt-1">Payment integration pending</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Audit Logs" && (
            <div>
              <h3 className="text-xl font-semibold">Audit Logs</h3>
              <p className="text-sm text-gray-500 mt-1 mb-7">
                Review important activities within your organisation.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[600px]">
                  <thead className="text-xs uppercase text-gray-500 bg-white/[0.03]">
                    <tr>
                      <th className="px-4 py-4">Activity</th>
                      <th className="px-4 py-4">User</th>
                      <th className="px-4 py-4">Date</th>
                      <th className="px-4 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initialLogs.map((log, index) => (
                      <tr key={index} className="border-t border-white/5">
                        <td className="px-4 py-4">{log.action}</td>
                        <td className="px-4 py-4 text-gray-400">{log.user}</td>
                        <td className="px-4 py-4 text-gray-400">{log.date}</td>
                        <td className="px-4 py-4">
                          <span className="text-emerald-400 text-xs">{log.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-600 mt-5">
                These are sample entries. A real audit log will record verified actions from the database and application.
              </p>
            </div>
          )}
        </section>

        {showRoleForm && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101522] p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Create Custom Role</h3>
                <button onClick={() => setShowRoleForm(false)} className="text-gray-400 text-xl">×</button>
              </div>
              <label className="text-sm text-gray-400">Role name</label>
              <input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="e.g. Project Coordinator"
                className="w-full mt-2 rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 text-sm outline-none focus:border-purple-500"
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowRoleForm(false)}
                  className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={addRole}
                  className="flex-1 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold"
                >
                  Create Role
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

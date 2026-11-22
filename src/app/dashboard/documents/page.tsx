
"use client";

import { useState } from "react";

type DocumentItem = {
  id: number;
  name: string;
  category: string;
  department: string;
  owner: string;
  date: string;
  size: string;
  access: string;
};

const initialDocuments: DocumentItem[] = [
  { id: 1, name: "Employee Handbook.pdf", category: "Policies", department: "Human Resources", owner: "Admin", date: "2026-11-18", size: "2.4 MB", access: "Organisation" },
  { id: 2, name: "Information Security Policy.pdf", category: "Policies", department: "Information Technology", owner: "David Williams", date: "2026-11-17", size: "1.8 MB", access: "Organisation" },
  { id: 3, name: "Q4 Financial Report.xlsx", category: "Reports", department: "Finance", owner: "Emily Brown", date: "2026-11-16", size: "860 KB", access: "Restricted" },
  { id: 4, name: "Digital Transformation Proposal.docx", category: "Projects", department: "Project Team", owner: "Sarah Johnson", date: "2026-11-14", size: "1.2 MB", access: "Project Team" },
  { id: 5, name: "Procurement Guidelines.pdf", category: "Procedures", department: "Operations", owner: "Admin", date: "2026-11-12", size: "950 KB", access: "Organisation" },
  { id: 6, name: "Employment Contract Template.docx", category: "Templates", department: "Human Resources", owner: "Admin", date: "2026-11-10", size: "420 KB", access: "Restricted" },
];

const categories = ["All", "Policies", "Reports", "Projects", "Procedures", "Templates", "Contracts", "Other"];

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

export default function DocumentsPage() {
  const [documents, setDocuments] = useState(initialDocuments);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formCategory, setFormCategory] = useState("Policies");
  const [department, setDepartment] = useState("All Departments");
  const [access, setAccess] = useState("Organisation");
  const [notice, setNotice] = useState("");

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = `${doc.name} ${doc.department} ${doc.owner}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory = category === "All" || doc.category === category;

    return matchesSearch && matchesCategory;
  });

  function addDocument() {
    if (!selectedFile) {
      setNotice("Please select a document first.");
      return;
    }

    const newDocument: DocumentItem = {
      id: Date.now(),
      name: selectedFile.name,
      category: formCategory,
      department,
      owner: "You",
      date: new Date().toISOString().split("T")[0],
      size:
        selectedFile.size >= 1024 * 1024
          ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(selectedFile.size / 1024))} KB`,
      access,
    };

    setDocuments((current) => [newDocument, ...current]);
    setSelectedFile(null);
    setShowForm(false);
    setNotice("Document added to this demo library.");
  }

  function removeDocument(id: number) {
    setDocuments((current) => current.filter((doc) => doc.id !== id));
  }

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
          <p className="font-semibold mt-2">Your Organisation</p>
          <p className="text-xs text-purple-400 mt-1">Organisation Admin</p>
        </div>

        <p className="text-xs uppercase tracking-wider text-gray-500 mb-3">Workspace</p>

        <nav className="space-y-1">
          {navItems.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                label === "Documents"
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
            <p className="text-sm text-purple-400 mb-2">WORKSPACE / DOCUMENTS</p>
            <h2 className="text-3xl font-bold">Documents</h2>
            <p className="text-gray-400 text-sm mt-2">
              Manage and organise your organisation&apos;s shared files.
            </p>
          </div>

          <button
            onClick={() => {
              setNotice("");
              setShowForm(true);
            }}
            className="rounded-xl bg-purple-600 hover:bg-purple-500 px-5 py-3 text-sm font-semibold"
          >
            + Add Document
          </button>
        </div>

        {notice && (
          <div className="mb-5 rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-sm text-purple-200">
            {notice}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
          {[
            { label: "Total Documents", value: documents.length, note: "Files in the library" },
            { label: "Categories", value: new Set(documents.map((d) => d.category)).size, note: "Document classifications" },
            { label: "Departments", value: new Set(documents.map((d) => d.department)).size, note: "Departments represented" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-[#101522] p-5">
              <p className="text-sm text-gray-400">{item.label}</p>
              <p className="text-3xl font-bold mt-2">{item.value}</p>
              <p className="text-xs text-gray-500 mt-1">{item.note}</p>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#101522] p-5 mb-6">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
            <div>
              <h3 className="font-semibold text-lg">Document Library</h3>
              <p className="text-xs text-gray-500 mt-1">Browse organisation files by category.</p>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="w-full sm:w-64 rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 text-sm outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-lg px-4 py-2 text-xs transition ${
                  category === item
                    ? "bg-purple-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead className="bg-white/[0.03] text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-4">Document</th>
                  <th className="px-4 py-4">Category</th>
                  <th className="px-4 py-4">Department</th>
                  <th className="px-4 py-4">Owner</th>
                  <th className="px-4 py-4">Date Added</th>
                  <th className="px-4 py-4">Size</th>
                  <th className="px-4 py-4">Access</th>
                  <th className="px-4 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-10 rounded-lg bg-purple-500/10 text-purple-300 flex items-center justify-center text-xs font-bold">
                          {doc.name.split(".").pop()?.toUpperCase().slice(0, 4)}
                        </div>
                        <span className="font-medium">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-400">{doc.category}</td>
                    <td className="px-4 py-4 text-gray-400">{doc.department}</td>
                    <td className="px-4 py-4 text-gray-400">{doc.owner}</td>
                    <td className="px-4 py-4 text-gray-400">{doc.date}</td>
                    <td className="px-4 py-4 text-gray-400">{doc.size}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs ${
                        doc.access === "Restricted"
                          ? "bg-amber-500/10 text-amber-400"
                          : doc.access === "Project Team"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {doc.access}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => removeDocument(doc.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredDocuments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                      No documents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#101522] p-5">
          <h3 className="font-semibold text-lg mb-2">Document Management</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Keep organisational policies, reports, contracts, procedures and project files in one central location. Access labels are currently illustrative; actual document permissions will be enforced when the backend is connected.
          </p>
        </section>

        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#101522] p-6 my-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Add Document</h3>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-xl">×</button>
              </div>

              <label className="text-sm text-gray-400">Select file</label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full mt-2 mb-5 rounded-xl border border-white/10 bg-[#080b14] p-3 text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-purple-600 file:px-3 file:py-2 file:text-white"
              />

              {selectedFile && (
                <p className="text-xs text-purple-300 mb-4">{selectedFile.name}</p>
              )}

              <label className="text-sm text-gray-400">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full mt-2 mb-5 rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 text-sm"
              >
                {categories.filter((c) => c !== "All").map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <label className="text-sm text-gray-400">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full mt-2 mb-5 rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 text-sm"
              >
                <option>All Departments</option>
                <option>Management</option>
                <option>Information Technology</option>
                <option>Finance</option>
                <option>Human Resources</option>
                <option>Operations</option>
                <option>Marketing</option>
                <option>Project Team</option>
              </select>

              <label className="text-sm text-gray-400">Access level</label>
              <select
                value={access}
                onChange={(e) => setAccess(e.target.value)}
                className="w-full mt-2 mb-6 rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 text-sm"
              >
                <option>Organisation</option>
                <option>Department</option>
                <option>Project Team</option>
                <option>Restricted</option>
              </select>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={addDocument}
                  className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-3 text-sm font-semibold"
                >
                  Add to Library
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

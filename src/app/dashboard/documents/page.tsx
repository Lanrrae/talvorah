"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Folder = {
  id: string;
  organisation_id: string;
  parent_folder_id: string | null;
  name: string;
  description: string | null;
  owner_user_id: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
};

type DocumentItem = {
  id: string;
  organisation_id: string;
  folder_id: string | null;
  department_id: string | null;
  owner_user_id: string;
  uploaded_by_user_id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  file_type: string | null;
  mime_type: string | null;
  file_size: number | null;
  access_scope: "private" | "department" | "organisation";
  status: "active" | "archived" | "deleted";
  current_version: number;
  is_starred: boolean;
  created_at: string;
  updated_at: string;
};

type DocumentVersion = {
  id: string;
  document_id: string;
  version_number: number;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by_user_id: string;
  change_notes: string | null;
  created_at: string;
};

type Department = {
  id: string;
  name: string;
};

type ViewMode = "all" | "starred" | "recent" | "archived";

const BUCKET = "talvorah-documents";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fileIcon(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (["pdf"].includes(extension ?? "")) return "PDF";
  if (["doc", "docx"].includes(extension ?? "")) return "DOC";
  if (["xls", "xlsx", "csv"].includes(extension ?? "")) return "XLS";
  if (["ppt", "pptx"].includes(extension ?? "")) return "PPT";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension ?? ""))
    return "IMG";
  if (["zip", "rar", "7z"].includes(extension ?? "")) return "ZIP";

  return "FILE";
}

export default function DocumentsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState("");
  const [organisationId, setOrganisationId] = useState("");

  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [selectedFolderId, setSelectedFolderId] = useState("all");
  const [search, setSearch] = useState("");

  const [showUpload, setShowUpload] = useState(false);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentItem | null>(null);

  const [documentTitle, setDocumentTitle] = useState("");
  const [documentDescription, setDocumentDescription] = useState("");
  const [uploadFolderId, setUploadFolderId] = useState("");
  const [uploadDepartmentId, setUploadDepartmentId] = useState("");
  const [accessScope, setAccessScope] = useState<
    "private" | "department" | "organisation"
  >("private");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [folderParentId, setFolderParentId] = useState("");

  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const loadData = useCallback(
    async (uid?: string, orgId?: string) => {
      const currentUserId = uid ?? userId;
      const currentOrganisationId = orgId ?? organisationId;

      if (!currentUserId || !currentOrganisationId) {
        setFolders([]);
        setDocuments([]);
        setDepartments([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const [folderResult, documentResult, departmentResult] =
        await Promise.all([
          supabase
            .from("document_folders")
            .select(
              "id, organisation_id, parent_folder_id, name, description, owner_user_id, created_by_user_id, created_at, updated_at"
            )
            .eq("organisation_id", currentOrganisationId)
            .order("name"),

          supabase
            .from("documents")
            .select(
              "id, organisation_id, folder_id, department_id, owner_user_id, uploaded_by_user_id, title, description, file_name, file_path, file_type, mime_type, file_size, access_scope, status, current_version, is_starred, created_at, updated_at"
            )
            .eq("organisation_id", currentOrganisationId)
            .neq("status", "deleted")
            .order("updated_at", { ascending: false }),

          supabase
            .from("departments")
            .select("id, name")
            .eq("organisation_id", currentOrganisationId)
            .order("name"),
        ]);

      if (folderResult.error) {
        setError(folderResult.error.message);
      } else {
        setFolders((folderResult.data ?? []) as Folder[]);
      }

      if (documentResult.error) {
        setError((previous) => previous || documentResult.error.message);
      } else {
        setDocuments((documentResult.data ?? []) as DocumentItem[]);
      }

      if (departmentResult.error) {
        setError((previous) => previous || departmentResult.error.message);
      } else {
        setDepartments((departmentResult.data ?? []) as Department[]);
      }

      setLoading(false);
    },
    [organisationId, supabase, userId]
  );

  useEffect(() => {
    let active = true;

    const initialise = async () => {
      const { data, error: authError } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !data.user) {
        setError("Please sign in to access documents.");
        setLoading(false);
        return;
      }

      const uid = data.user.id;
      const orgId =
        localStorage.getItem("talvorah_organisation_id") ?? "";

      setUserId(uid);
      setOrganisationId(orgId);
      await loadData(uid, orgId);
    };

    const handleOrganisationChange = () => {
      const orgId =
        localStorage.getItem("talvorah_organisation_id") ?? "";
      setOrganisationId(orgId);
      setSelectedFolderId("all");
      loadData(userId, orgId);
    };

    initialise();

    window.addEventListener(
      "talvorah:organisation-changed",
      handleOrganisationChange
    );
    window.addEventListener("storage", handleOrganisationChange);

    return () => {
      active = false;
      window.removeEventListener(
        "talvorah:organisation-changed",
        handleOrganisationChange
      );
      window.removeEventListener("storage", handleOrganisationChange);
    };
  }, [loadData, supabase, userId]);

  const activeDocuments = documents.filter(
    (document) => document.status === "active"
  );

  const starredCount = activeDocuments.filter(
    (document) => document.is_starred
  ).length;

  const archivedCount = documents.filter(
    (document) => document.status === "archived"
  ).length;

  const filteredDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesSearch =
        !term ||
        document.title.toLowerCase().includes(term) ||
        document.file_name.toLowerCase().includes(term) ||
        (document.description ?? "").toLowerCase().includes(term);

      const matchesFolder =
        selectedFolderId === "all" ||
        (selectedFolderId === "unfiled" && !document.folder_id) ||
        document.folder_id === selectedFolderId;

      const matchesView =
        viewMode === "all"
          ? document.status === "active"
          : viewMode === "starred"
            ? document.status === "active" && document.is_starred
            : viewMode === "recent"
              ? document.status === "active"
              : document.status === "archived";

      return matchesSearch && matchesFolder && matchesView;
    });
  }, [documents, search, selectedFolderId, viewMode]);

  function resetUploadForm() {
    setDocumentTitle("");
    setDocumentDescription("");
    setUploadFolderId("");
    setUploadDepartmentId("");
    setAccessScope("private");
    setSelectedFile(null);
  }

  function resetFolderForm() {
    setFolderName("");
    setFolderDescription("");
    setFolderParentId("");
  }

  async function createFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!organisationId || !userId) {
      setError("Select an organisation and sign in first.");
      return;
    }

    if (!folderName.trim()) {
      setError("Enter a folder name.");
      return;
    }

    setSaving(true);

    const { error: insertError } = await supabase
      .from("document_folders")
      .insert({
        organisation_id: organisationId,
        parent_folder_id: folderParentId || null,
        name: folderName.trim(),
        description: folderDescription.trim() || null,
        owner_user_id: userId,
        created_by_user_id: userId,
      });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setSuccess("Folder created.");
    setSaving(false);
    setShowFolderForm(false);
    resetFolderForm();
    await loadData();
  }

  async function uploadDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!organisationId || !userId) {
      setError("Select an organisation and sign in first.");
      return;
    }

    if (!selectedFile) {
      setError("Choose a file to upload.");
      return;
    }

    if (!documentTitle.trim()) {
      setError("Enter a document title.");
      return;
    }

    setSaving(true);

    const documentId = crypto.randomUUID();
    const safeFileName = selectedFile.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );
    const filePath = `${documentId}/${safeFileName}`;

    // Create the document row first so storage policies can verify
    // that the signed-in user is permitted to upload to this document.
    const { error: insertError } = await supabase.from("documents").insert({
      id: documentId,
      organisation_id: organisationId,
      folder_id: uploadFolderId || null,
      department_id: uploadDepartmentId || null,
      owner_user_id: userId,
      uploaded_by_user_id: userId,
      title: documentTitle.trim(),
      description: documentDescription.trim() || null,
      file_name: selectedFile.name,
      file_path: filePath,
      file_type: selectedFile.name.split(".").pop()?.toLowerCase() ?? null,
      mime_type: selectedFile.type || null,
      file_size: selectedFile.size,
      access_scope: accessScope,
      status: "active",
      current_version: 1,
      is_starred: false,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, selectedFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: selectedFile.type || undefined,
      });

    if (uploadError) {
      await supabase
        .from("documents")
        .delete()
        .eq("id", documentId)
        .eq("owner_user_id", userId);

      setError(`File upload failed: ${uploadError.message}`);
      setSaving(false);
      return;
    }

    const { error: versionError } = await supabase
      .from("document_versions")
      .insert({
        document_id: documentId,
        version_number: 1,
        file_name: selectedFile.name,
        file_path: filePath,
        file_size: selectedFile.size,
        mime_type: selectedFile.type || null,
        uploaded_by_user_id: userId,
        change_notes: "Initial upload",
      });

    if (versionError) {
      // The original document and uploaded file remain available.
      // Report the version-history issue rather than deleting the file.
      setError(
        `Document uploaded, but version history could not be recorded: ${versionError.message}`
      );
      setSaving(false);
      await loadData();
      return;
    }

    setSuccess("Document uploaded successfully.");
    setSaving(false);
    setShowUpload(false);
    resetUploadForm();
    await loadData();
  }

  async function downloadDocument(document: DocumentItem) {
    setError("");

    const { data, error: signedUrlError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(document.file_path, 60);

    if (signedUrlError || !data?.signedUrl) {
      setError(signedUrlError?.message || "Could not create download link.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function toggleStar(document: DocumentItem) {
    setError("");

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        is_starred: !document.is_starred,
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDocuments((previous) =>
      previous.map((item) =>
        item.id === document.id
          ? { ...item, is_starred: !item.is_starred }
          : item
      )
    );

    if (selectedDocument?.id === document.id) {
      setSelectedDocument({
        ...document,
        is_starred: !document.is_starred,
      });
    }
  }

  async function archiveDocument(document: DocumentItem) {
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        status: "archived",
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Document archived.");
    setSelectedDocument(null);
    await loadData();
  }

  async function restoreDocument(document: DocumentItem) {
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Document restored.");
    setSelectedDocument(null);
    await loadData();
  }

  async function loadVersions(documentId: string) {
    setLoadingVersions(true);
    setVersions([]);

    const { data, error: queryError } = await supabase
      .from("document_versions")
      .select(
        "id, document_id, version_number, file_name, file_path, file_size, mime_type, uploaded_by_user_id, change_notes, created_at"
      )
      .eq("document_id", documentId)
      .order("version_number", { ascending: false });

    if (queryError) {
      setError(queryError.message);
    } else {
      setVersions((data ?? []) as DocumentVersion[]);
    }

    setLoadingVersions(false);
  }

  async function downloadVersion(version: DocumentVersion) {
    setError("");

    const { data, error: signedUrlError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(version.file_path, 60);

    if (signedUrlError || !data?.signedUrl) {
      setError(signedUrlError?.message || "Could not create download link.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function openDocumentDetails(document: DocumentItem) {
    setSelectedDocument(document);
    loadVersions(document.id);
  }

  function openUploadDialog() {
    resetUploadForm();
    setError("");
    setShowUpload(true);
  }

  function openFolderDialog() {
    resetFolderForm();
    setError("");
    setShowFolderForm(true);
  }

  const selectedFolderName =
    selectedFolderId === "all"
      ? "All documents"
      : selectedFolderId === "unfiled"
        ? "Unfiled documents"
        : folders.find((folder) => folder.id === selectedFolderId)?.name ??
          "Documents";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-emerald-700">
              Talvorah Workspace
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Documents
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Store, organise and access your workspace files.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={openFolderDialog}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              + New folder
            </button>

            <button
              onClick={openUploadDialog}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              ↑ Upload document
            </button>

            <button
              onClick={() => loadData()}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              ↻
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {!organisationId && !loading && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Select an organisation to access its documents.
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Active documents</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {activeDocuments.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Folders</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {folders.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Starred</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {starredCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Archived</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {archivedCount}
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Library
            </h2>

            <div className="space-y-1">
              {(
                [
                  ["all", "All documents", "▣"],
                  ["starred", "Starred", "★"],
                  ["recent", "Recent", "◷"],
                  ["archived", "Archived", "▤"],
                ] as [ViewMode, string, string][]
              ).map(([value, label, icon]) => (
                <button
                  key={value}
                  onClick={() => {
                    setViewMode(value);
                    setSelectedFolderId("all");
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    viewMode === value
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="w-5 text-center">{icon}</span>
                  <span className="flex-1">{label}</span>
                  {value === "starred" && (
                    <span className="text-xs text-slate-400">
                      {starredCount}
                    </span>
                  )}
                  {value === "archived" && (
                    <span className="text-xs text-slate-400">
                      {archivedCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="mb-3 mt-7 flex items-center justify-between px-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Folders
              </h3>
              <button
                onClick={openFolderDialog}
                className="rounded-md px-2 py-1 text-lg text-emerald-700 hover:bg-emerald-50"
                title="Create folder"
              >
                +
              </button>
            </div>

            <div className="space-y-1">
              <button
                onClick={() => {
                  setViewMode("all");
                  setSelectedFolderId("all");
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                  selectedFolderId === "all" && viewMode === "all"
                    ? "bg-emerald-50 font-semibold text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>▣</span>
                All documents
              </button>

              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => {
                    setViewMode("all");
                    setSelectedFolderId(folder.id);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                    selectedFolderId === folder.id
                      ? "bg-emerald-50 font-semibold text-emerald-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>📁</span>
                  <span className="truncate">{folder.name}</span>
                </button>
              ))}

              <button
                onClick={() => {
                  setViewMode("all");
                  setSelectedFolderId("unfiled");
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                  selectedFolderId === "unfiled"
                    ? "bg-emerald-50 font-semibold text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>📄</span>
                Unfiled
              </button>
            </div>
          </aside>

          <main className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  {selectedFolderName}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {filteredDocuments.length} document(s)
                </p>
              </div>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search documents..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 sm:max-w-xs"
              />
            </div>

            {loading ? (
              <div className="p-14 text-center text-sm text-slate-500">
                Loading documents...
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700">
                  ▣
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  No documents found
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Upload a document or choose another folder.
                </p>
                <button
                  onClick={openUploadDialog}
                  className="mt-5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Upload your first document
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center"
                  >
                    <button
                      onClick={() => openDocumentDetails(document)}
                      className="flex min-w-0 flex-1 items-center gap-4 text-left"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                        {fileIcon(document.file_name)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {document.title}
                          </p>
                          {document.is_starred && (
                            <span className="text-amber-500">★</span>
                          )}
                          {document.status === "archived" && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              Archived
                            </span>
                          )}
                        </div>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {document.file_name}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                          <span>{formatBytes(document.file_size)}</span>
                          <span>Version {document.current_version}</span>
                          <span>{formatDate(document.updated_at)}</span>
                          <span>
                            {folders.find(
                              (folder) => folder.id === document.folder_id
                            )?.name ?? "Unfiled"}
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => toggleStar(document)}
                        title={
                          document.is_starred
                            ? "Remove from starred"
                            : "Add to starred"
                        }
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-amber-500 hover:bg-amber-50"
                      >
                        {document.is_starred ? "★" : "☆"}
                      </button>

                      <button
                        onClick={() => downloadDocument(document)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Download
                      </button>

                      <button
                        onClick={() => openDocumentDetails(document)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>

        {showFolderForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Create folder
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Organise your workspace documents.
                  </p>
                </div>
                <button
                  onClick={() => setShowFolderForm(false)}
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={createFolder} className="space-y-5 p-6">
                <div>
                  <label className={labelClass}>Folder name *</label>
                  <input
                    required
                    value={folderName}
                    onChange={(event) => setFolderName(event.target.value)}
                    placeholder="e.g. Annual Reports"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    rows={3}
                    value={folderDescription}
                    onChange={(event) =>
                      setFolderDescription(event.target.value)
                    }
                    placeholder="What will this folder contain?"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Parent folder</label>
                  <select
                    value={folderParentId}
                    onChange={(event) =>
                      setFolderParentId(event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Main library</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() => setShowFolderForm(false)}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "Creating..." : "Create folder"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
            <div className="my-6 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Upload document
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Add a file to your organisation library.
                  </p>
                </div>
                <button
                  onClick={() => setShowUpload(false)}
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={uploadDocument} className="space-y-5 p-6">
                <div>
                  <label className={labelClass}>Document title *</label>
                  <input
                    required
                    value={documentTitle}
                    onChange={(event) =>
                      setDocumentTitle(event.target.value)
                    }
                    placeholder="Enter document title"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    rows={3}
                    value={documentDescription}
                    onChange={(event) =>
                      setDocumentDescription(event.target.value)
                    }
                    placeholder="Add a short description"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Choose file *</label>
                  <input
                    required
                    type="file"
                    onChange={(event) =>
                      setSelectedFile(event.target.files?.[0] ?? null)
                    }
                    className={inputClass}
                  />
                  {selectedFile && (
                    <p className="mt-2 text-xs text-slate-500">
                      {selectedFile.name} · {formatBytes(selectedFile.size)}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Folder</label>
                    <select
                      value={uploadFolderId}
                      onChange={(event) =>
                        setUploadFolderId(event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="">Unfiled</option>
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Department</label>
                    <select
                      value={uploadDepartmentId}
                      onChange={(event) =>
                        setUploadDepartmentId(event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="">No department</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Access scope</label>
                  <select
                    value={accessScope}
                    onChange={(event) =>
                      setAccessScope(
                        event.target.value as
                          | "private"
                          | "department"
                          | "organisation"
                      )
                    }
                    className={inputClass}
                  >
                    <option value="private">Private</option>
                    <option value="department">Department</option>
                    <option value="organisation">Organisation</option>
                  </select>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Access is still governed by the current database
                    permissions. Selecting a broader scope does not itself
                    grant other employees access.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowUpload(false)}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "Uploading..." : "Upload document"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {selectedDocument && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 sm:items-center">
            <div className="my-6 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Document details
                  </p>
                  <h2 className="mt-2 break-words text-xl font-bold text-slate-900">
                    {selectedDocument.title}
                  </h2>
                  <p className="mt-1 break-all text-sm text-slate-500">
                    {selectedDocument.file_name}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedDocument(null)}
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-400">File size</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {formatBytes(selectedDocument.file_size)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">File type</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {selectedDocument.mime_type ||
                        selectedDocument.file_type ||
                        "Unknown"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Folder</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {folders.find(
                        (folder) => folder.id === selectedDocument.folder_id
                      )?.name ?? "Unfiled"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Department</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {departments.find(
                        (department) =>
                          department.id === selectedDocument.department_id
                      )?.name ?? "Not assigned"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Access scope</p>
                    <p className="mt-1 text-sm font-medium capitalize text-slate-800">
                      {selectedDocument.access_scope}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Current version</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      Version {selectedDocument.current_version}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Uploaded</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {formatDate(selectedDocument.created_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Last updated</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {formatDate(selectedDocument.updated_at)}
                    </p>
                  </div>
                </div>

                {selectedDocument.description && (
                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="mb-2 text-sm font-semibold text-slate-900">
                      Description
                    </h3>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {selectedDocument.description}
                    </p>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Version history
                    </h3>
                    <span className="text-xs text-slate-400">
                      {versions.length} version(s)
                    </span>
                  </div>

                  {loadingVersions ? (
                    <p className="text-sm text-slate-500">
                      Loading version history...
                    </p>
                  ) : versions.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No version history is available.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {versions.map((version) => (
                        <div
                          key={version.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">
                              Version {version.version_number}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {version.file_name}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {formatDate(version.created_at)} ·{" "}
                              {formatBytes(version.file_size)}
                            </p>
                            {version.change_notes && (
                              <p className="mt-1 text-xs text-slate-500">
                                {version.change_notes}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => downloadVersion(version)}
                            className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => toggleStar(selectedDocument)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-50"
                  >
                    {selectedDocument.is_starred
                      ? "★ Unstar"
                      : "☆ Star"}
                  </button>

                  {selectedDocument.status === "active" ? (
                    <button
                      onClick={() => archiveDocument(selectedDocument)}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      onClick={() => restoreDocument(selectedDocument)}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      Restore
                    </button>
                  )}
                </div>

                <button
                  onClick={() => downloadDocument(selectedDocument)}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Download file
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
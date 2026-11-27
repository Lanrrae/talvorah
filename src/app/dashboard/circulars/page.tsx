
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Department = { id: string; name: string };

type Circular = {
  id: string;
  organisation_id: string;
  reference_number: string;
  title: string;
  body: string;
  circular_date: string;
  issuing_department_id: string | null;
  issuing_authority: string;
  created_by_member_id: string;
  is_published: boolean;
  is_archived: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type Attachment = {
  id: string;
  circular_id: string;
  file_name: string;
  file_path: string;
  uploaded_by_member_id: string | null;
  created_at: string;
};

const supabase = createClient();
const STORAGE_BUCKET = "circular-attachments";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(
    undefined,
    { day: "numeric", month: "short", year: "numeric" }
  );
}

function makeReferenceNumber() {
  return `CIR/${new Date().getFullYear()}/${Math.floor(
    100000 + Math.random() * 900000
  )}`;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function CircularsPage() {
  const [organisationId, setOrganisationId] = useState("");
  const [memberId, setMemberId] = useState("");

  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [canPublish, setCanPublish] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "published" | "drafts" | "archived"
  >("all");

  const [showEditor, setShowEditor] = useState(false);
  const [editingCircular, setEditingCircular] = useState<Circular | null>(
    null
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Do not call new Date() in the initial state.
  // The current date is assigned when the user opens the editor.
  const [form, setForm] = useState({
    title: "",
    body: "",
    circular_date: "",
    issuing_department_id: "",
    issuing_authority: "",
    is_published: false,
  });

  const loadCirculars = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please sign in to access circulars.");

      const selectedOrganisation = window.localStorage.getItem(
        "talvorah_organisation_id"
      );

      if (!selectedOrganisation) {
        setOrganisationId("");
        setMemberId("");
        setCirculars([]);
        setDepartments([]);
        setAttachments([]);
        setCanPublish(false);
        throw new Error(
          "No organisation is selected. Select an organisation and reopen Circulars."
        );
      }

      setOrganisationId(selectedOrganisation);

      const { data: membership, error: membershipError } = await supabase
        .from("organisation_members")
        .select("id, user_id, organisation_id, status")
        .eq("organisation_id", selectedOrganisation)
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipError) throw membershipError;

      if (!membership || membership.status !== "active") {
        throw new Error(
          "Your active organisation membership could not be verified."
        );
      }

      setMemberId(membership.id);

      const [circularResult, departmentResult, uploaderResult] =
        await Promise.all([
          supabase
            .from("circulars")
            .select("*")
            .eq("organisation_id", selectedOrganisation)
            .order("circular_date", { ascending: false })
            .order("created_at", { ascending: false }),

          supabase
            .from("departments")
            .select("id, name")
            .eq("organisation_id", selectedOrganisation)
            .order("name"),

          supabase
            .from("circular_uploaders")
            .select("id")
            .eq("organisation_id", selectedOrganisation)
            .eq("member_id", membership.id)
            .maybeSingle(),
        ]);

      if (circularResult.error) throw circularResult.error;
      if (departmentResult.error) throw departmentResult.error;
      if (uploaderResult.error) throw uploaderResult.error;

      const records = (circularResult.data || []) as Circular[];

      setCirculars(records);
      setDepartments((departmentResult.data || []) as Department[]);
      setCanPublish(Boolean(uploaderResult.data));

      if (records.length) {
        const { data, error: attachmentError } = await supabase
          .from("circular_attachments")
          .select("*")
          .in(
            "circular_id",
            records.map((record) => record.id)
          )
          .order("created_at", { ascending: false });

        if (attachmentError) throw attachmentError;
        setAttachments((data || []) as Attachment[]);
      } else {
        setAttachments([]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load organisation circulars."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCirculars();

    const handleOrganisationChange = () => {
      void loadCirculars();
    };

    window.addEventListener(
      "talvorah:organisation-changed",
      handleOrganisationChange
    );

    return () => {
      window.removeEventListener(
        "talvorah:organisation-changed",
        handleOrganisationChange
      );
    };
  }, [loadCirculars]);

  const visibleCirculars = useMemo(() => {
    const term = search.trim().toLowerCase();

    return circulars.filter((item) => {
      const matchesSearch =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.reference_number.toLowerCase().includes(term) ||
        item.body.toLowerCase().includes(term) ||
        item.issuing_authority.toLowerCase().includes(term);

      const matchesFilter =
        filter === "all" ||
        (filter === "published" && item.is_published && !item.is_archived) ||
        (filter === "drafts" && !item.is_published && !item.is_archived) ||
        (filter === "archived" && item.is_archived);

      return matchesSearch && matchesFilter;
    });
  }, [circulars, search, filter]);

  const publishedCount = circulars.filter(
    (item) => item.is_published && !item.is_archived
  ).length;

  const draftCount = circulars.filter(
    (item) => !item.is_published && !item.is_archived
  ).length;

  const archivedCount = circulars.filter((item) => item.is_archived).length;

  function departmentName(id: string | null) {
    if (!id) return "General";
    return (
      departments.find((department) => department.id === id)?.name ||
      "Department"
    );
  }

  function resetForm() {
    setForm({
      title: "",
      body: "",
      circular_date: new Date().toISOString().slice(0, 10),
      issuing_department_id: "",
      issuing_authority: "",
      is_published: false,
    });
    setSelectedFiles([]);
    setEditingCircular(null);
  }

  function openNewCircular() {
    resetForm();
    setShowEditor(true);
    setError("");
    setSuccess("");
  }

  function openEditCircular(circular: Circular) {
    if (!canPublish) return;

    setEditingCircular(circular);
    setForm({
      title: circular.title,
      body: circular.body,
      circular_date: circular.circular_date,
      issuing_department_id: circular.issuing_department_id || "",
      issuing_authority: circular.issuing_authority,
      is_published: circular.is_published,
    });

    setSelectedFiles([]);
    setShowEditor(true);
    setError("");
    setSuccess("");
  }

  async function uploadAttachments(circularId: string) {
    if (!selectedFiles.length) return;

    setUploading(true);

    try {
      for (const file of selectedFiles) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `${organisationId}/${circularId}/${Date.now()}-${safeName}`;

        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (storageError) throw storageError;

        const { error: attachmentError } = await supabase
          .from("circular_attachments")
          .insert({
            circular_id: circularId,
            file_name: file.name,
            file_path: filePath,
            uploaded_by_member_id: memberId,
          });

        if (attachmentError) {
          await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
          throw attachmentError;
        }
      }
    } finally {
      setUploading(false);
    }
  }

  async function saveCircular(publish?: boolean) {
    if (!canPublish) {
      setError("You are not authorised to publish or manage circulars.");
      return;
    }

    if (!organisationId || !memberId) {
      setError("Your organisation membership could not be verified.");
      return;
    }

    if (!form.title.trim() || !form.body.trim()) {
      setError("Enter a circular title and its content.");
      return;
    }

    if (!form.circular_date) {
      setError("Select the circular date.");
      return;
    }

    if (!form.issuing_authority.trim()) {
      setError("Enter the issuing authority.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const shouldPublish =
        typeof publish === "boolean" ? publish : form.is_published;

      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        circular_date: form.circular_date,
        issuing_department_id: form.issuing_department_id || null,
        issuing_authority: form.issuing_authority.trim(),
        is_published: shouldPublish,
        published_at: shouldPublish
          ? editingCircular?.published_at || new Date().toISOString()
          : null,
        updated_at: new Date().toISOString(),
      };

      let circularId = editingCircular?.id;

      if (editingCircular) {
        const { error: updateError } = await supabase
          .from("circulars")
          .update(payload)
          .eq("id", editingCircular.id)
          .eq("organisation_id", organisationId);

        if (updateError) throw updateError;
      } else {
        const { data: created, error: insertError } = await supabase
          .from("circulars")
          .insert({
            ...payload,
            organisation_id: organisationId,
            reference_number: makeReferenceNumber(),
            created_by_member_id: memberId,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        circularId = created.id;
      }

      if (circularId) await uploadAttachments(circularId);

      setSuccess(
        shouldPublish
          ? "Circular published successfully."
          : "Circular saved successfully."
      );

      setShowEditor(false);
      resetForm();
      await loadCirculars();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save this circular."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changePublication(
    circular: Circular,
    published: boolean
  ) {
    if (!canPublish) return;

    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("circulars")
      .update({
        is_published: published,
        published_at: published ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", circular.id)
      .eq("organisation_id", organisationId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(
      published ? "Circular published." : "Circular moved to drafts."
    );
    await loadCirculars();
  }

  async function archiveCircular(circular: Circular) {
    if (!canPublish) return;

    const confirmed = window.confirm(
      `Archive "${circular.title}"? It will no longer appear in the published circulars list.`
    );

    if (!confirmed) return;

    const { error: archiveError } = await supabase
      .from("circulars")
      .update({
        is_archived: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", circular.id)
      .eq("organisation_id", organisationId);

    if (archiveError) {
      setError(archiveError.message);
      return;
    }

    setSuccess("Circular archived.");
    await loadCirculars();
  }

  async function restoreCircular(circular: Circular) {
    if (!canPublish) return;

    const { error: restoreError } = await supabase
      .from("circulars")
      .update({
        is_archived: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", circular.id)
      .eq("organisation_id", organisationId);

    if (restoreError) {
      setError(restoreError.message);
      return;
    }

    setSuccess("Circular restored.");
    await loadCirculars();
  }

  async function openAttachment(attachment: Attachment) {
    setError("");

    const { data, error: signedUrlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(attachment.file_path, 300);

    if (signedUrlError || !data?.signedUrl) {
      setError(
        signedUrlError?.message ||
          "Unable to generate a secure attachment link."
      );
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function exportCircular(circular: Circular) {
    const content = [
      circular.title,
      `Reference: ${circular.reference_number}`,
      `Date: ${formatDate(circular.circular_date)}`,
      `Issuing authority: ${circular.issuing_authority}`,
      `Department: ${departmentName(circular.issuing_department_id)}`,
      "",
      circular.body,
    ].join("\n");

    downloadTextFile(
      `${circular.reference_number.replace(/\//g, "-")}.txt`,
      content
    );
  }

  function exportAllCirculars() {
    const header = [
      "Reference",
      "Title",
      "Date",
      "Department",
      "Issuing Authority",
      "Published",
      "Archived",
    ];

    const rows = visibleCirculars.map((item) => [
      item.reference_number,
      item.title,
      item.circular_date,
      departmentName(item.issuing_department_id),
      item.issuing_authority,
      item.is_published ? "Yes" : "No",
      item.is_archived ? "Yes" : "No",
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "talvorah-circulars.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              WORKSPACE / ORGANISATION
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[#142d4e] sm:text-3xl">
              Circulars
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Official announcements, directives and information from your organisation.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void loadCirculars()}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              ↻ Refresh
            </button>
            <button
              onClick={exportAllCirculars}
              disabled={!visibleCirculars.length}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              ↓ Export CSV
            </button>
            {canPublish && (
              <button
                onClick={openNewCircular}
                className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                + Create Circular
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={() => setError("")} className="font-bold">×</button>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <span>{success}</span>
            <button onClick={() => setSuccess("")} className="font-bold">×</button>
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total circulars", value: circulars.length, color: "text-[#142d4e]", note: "All organisation records" },
            { label: "Published", value: publishedCount, color: "text-emerald-700", note: "Visible to the organisation" },
            { label: "Drafts", value: draftCount, color: "text-amber-600", note: "Not yet published" },
            { label: "Archived", value: archivedCount, color: "text-slate-600", note: "Stored for reference" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="mt-1 text-xs text-slate-400">{stat.note}</p>
            </div>
          ))}
        </div>

        {!canPublish && !loading && (
          <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            You have viewing access to organisation circulars. Publishing and management are restricted to authorised members.
          </div>
        )}

        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {([
              ["all", "All circulars"],
              ["published", "Published"],
              ["drafts", "Drafts"],
              ["archived", "Archived"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  filter === value
                    ? "bg-[#142d4e] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, reference or content..."
            className={`${inputClass} md:max-w-sm`}
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-24">
            <div className="mb-4 h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
            <p className="text-sm text-slate-500">Loading circulars...</p>
          </div>
        ) : visibleCirculars.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              📄
            </div>
            <h2 className="text-lg font-bold text-[#142d4e]">No circulars found</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {search ? "Try another search term or change the selected filter." : "There are no circulars in this section yet."}
            </p>
            {canPublish && !search && filter !== "archived" && (
              <button
                onClick={openNewCircular}
                className="mt-5 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Create the first circular
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {visibleCirculars.map((circular) => {
              const circularAttachments = attachments.filter(
                (attachment) => attachment.circular_id === circular.id
              );

              return (
                <article key={circular.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-600">
                          {circular.reference_number}
                        </span>
                        {circular.is_archived ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Archived</span>
                        ) : circular.is_published ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Published</span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Draft</span>
                        )}
                      </div>

                      <h2 className="text-lg font-bold text-[#142d4e]">{circular.title}</h2>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span>Date: {formatDate(circular.circular_date)}</span>
                        <span>Department: {departmentName(circular.issuing_department_id)}</span>
                        <span>Issued by: {circular.issuing_authority}</span>
                      </div>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{circular.body}</p>

                      {circularAttachments.length > 0 && (
                        <div className="mt-5 border-t border-slate-100 pt-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Attachments ({circularAttachments.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {circularAttachments.map((attachment) => (
                              <button
                                key={attachment.id}
                                onClick={() => void openAttachment(attachment)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
                              >
                                📎 <span className="max-w-[220px] truncate">{attachment.file_name}</span>
                                <span className="text-emerald-700">Open ↗</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-start gap-2 lg:w-44 lg:justify-end">
                      <button
                        onClick={() => exportCircular(circular)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        ↓ Download text
                      </button>

                      {canPublish && !circular.is_archived && (
                        <>
                          <button onClick={() => openEditCircular(circular)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Edit</button>
                          <button
                            onClick={() => void changePublication(circular, !circular.is_published)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            {circular.is_published ? "Unpublish" : "Publish"}
                          </button>
                          <button
                            onClick={() => void archiveCircular(circular)}
                            className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            Archive
                          </button>
                        </>
                      )}

                      {canPublish && circular.is_archived && (
                        <button
                          onClick={() => void restoreCircular(circular)}
                          className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {showEditor && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6">
            <div className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
                <div>
                  <h2 className="text-lg font-bold text-[#142d4e]">
                    {editingCircular ? "Edit circular" : "Create circular"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">Complete the details below before publishing.</p>
                </div>
                <button
                  onClick={() => {
                    setShowEditor(false);
                    resetForm();
                  }}
                  className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-100"
                  aria-label="Close editor"
                >
                  ×
                </button>
              </div>

              <div className="space-y-5 p-5 sm:p-7">
                {editingCircular && (
                  <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                    Reference number: <strong className="font-mono text-[#142d4e]">{editingCircular.reference_number}</strong>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Circular title *</label>
                  <input
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    placeholder="Enter the circular title"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Circular date *</label>
                    <input
                      type="date"
                      value={form.circular_date}
                      onChange={(event) => setForm({ ...form, circular_date: event.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Issuing department</label>
                    <select
                      value={form.issuing_department_id}
                      onChange={(event) => setForm({ ...form, issuing_department_id: event.target.value })}
                      className={inputClass}
                    >
                      <option value="">General / Organisation-wide</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>{department.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Issuing authority *</label>
                  <input
                    value={form.issuing_authority}
                    onChange={(event) => setForm({ ...form, issuing_authority: event.target.value })}
                    placeholder="e.g. Office of the Managing Director"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Circular content *</label>
                  <textarea
                    rows={9}
                    value={form.body}
                    onChange={(event) => setForm({ ...form, body: event.target.value })}
                    placeholder="Write the full circular here..."
                    className={`${inputClass} resize-y`}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Attachments</label>
                  <input
                    type="file"
                    multiple
                    onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
                    className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">
                    Attach PDF, Word documents, images and other files permitted by your storage bucket.
                  </p>
                  {selectedFiles.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {selectedFiles.map((file, index) => (
                        <p key={`${file.name}-${index}`} className="text-xs text-slate-600">📎 {file.name}</p>
                      ))}
                    </div>
                  )}
                  {editingCircular && attachments.some((item) => item.circular_id === editingCircular.id) && (
                    <p className="mt-2 text-xs text-slate-500">Existing attachments will remain available.</p>
                  )}
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(event) => setForm({ ...form, is_published: event.target.checked })}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-700">Publish immediately</span>
                    <span className="mt-0.5 block text-xs text-slate-400">Published circulars become visible to organisation members.</span>
                  </span>
                </label>
              </div>

              <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:px-7">
                <button
                  onClick={() => {
                    setShowEditor(false);
                    resetForm();
                  }}
                  disabled={saving || uploading}
                  className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void saveCircular(false)}
                  disabled={saving || uploading}
                  className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  {saving || uploading ? "Saving..." : "Save as draft"}
                </button>
                <button
                  onClick={() => void saveCircular(true)}
                  disabled={saving || uploading}
                  className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving || uploading ? "Processing..." : editingCircular?.is_published ? "Save changes" : "Publish circular"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

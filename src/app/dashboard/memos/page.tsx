"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type MemoStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "returned";

type RecipientType = "through" | "action" | "information";

type Memo = {
  id: string;
  organisation_id: string;
  reference_number: string;
  subject: string;
  body: string;
  created_by_member_id: string;
  originating_department_id: string | null;
  status: MemoStatus;
  current_recipient_member_id: string | null;
  memo_date: string;
  created_at: string;
  updated_at: string;
};

type Recipient = {
  id: string;
  memo_id: string;
  recipient_member_id: string;
  recipient_type: RecipientType;
  sequence_order: number;
  status: string;
  comments: string | null;
  acted_at: string | null;
};

type Member = {
  id: string;
  user_id: string;
  role: string;
  full_name: string;
  designation: string | null;
  department_id: string | null;
};

type Department = {
  id: string;
  name: string;
};

type MemoEvent = {
  id: string;
  memo_id: string;
  actor_member_id: string | null;
  actor_user_id: string | null;
  action: string;
  comments: string | null;
  created_at: string;
};

type RouteRecipient = {
  memberId: string;
  recipientType: RecipientType;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

function generateReference() {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `MEMO/${year}/${random}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusStyle(status: MemoStatus) {
  const styles: Record<MemoStatus, string> = {
    draft: "bg-slate-100 text-slate-600 border-slate-200",
    submitted: "bg-blue-50 text-blue-700 border-blue-200",
    in_review: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    returned: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return styles[status] ?? styles.draft;
}

function displayStatus(status: string) {
  return status.replaceAll("_", " ");
}

export default function MemosPage() {
  const supabase = useMemo(() => createClient(), []);

  const [organisationId, setOrganisationId] = useState("");
  const [currentMemberId, setCurrentMemberId] = useState("");
  const [isPlatformSuperAdmin, setIsPlatformSuperAdmin] = useState(false);

  const [memos, setMemos] = useState<Memo[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [events, setEvents] = useState<MemoEvent[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<
    "all" | "inbox" | "outbox" | "drafts"
  >("all");

  const [showComposer, setShowComposer] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [originatingDepartmentId, setOriginatingDepartmentId] = useState("");
  const [routeRecipients, setRouteRecipients] = useState<RouteRecipient[]>([]);

  const [actionComments, setActionComments] = useState("");
  const [processingAction, setProcessingAction] = useState("");

  const [eventHistory, setEventHistory] = useState<MemoEvent[]>([]);

  const loadData = useCallback(async () => {
    if (!organisationId) {
      setMemos([]);
      setRecipients([]);
      setMembers([]);
      setDepartments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const [authResult, adminResult, memberResult, departmentResult, memoResult] =
      await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc("is_platform_super_admin"),
        supabase
          .from("organisation_members")
          .select("id, user_id, role, department_id")
          .eq("organisation_id", organisationId)
          .eq("status", "active"),
        supabase
          .from("departments")
          .select("id, name")
          .eq("organisation_id", organisationId)
          .order("name"),
        supabase
          .from("memos")
          .select(
            "id, organisation_id, reference_number, subject, body, created_by_member_id, originating_department_id, status, current_recipient_member_id, memo_date, created_at, updated_at"
          )
          .eq("organisation_id", organisationId)
          .order("created_at", { ascending: false }),
      ]);

    const userId = authResult.data.user?.id ?? "";
    const platformAdmin = adminResult.data === true;

    setIsPlatformSuperAdmin(platformAdmin);

    if (memberResult.error) {
      setError(memberResult.error.message);
      setLoading(false);
      return;
    }

    const rawMembers = memberResult.data ?? [];

    let profileMap = new Map<
      string,
      { full_name: string | null; designation: string | null }
    >();

    const userIds = [...new Set(rawMembers.map((member) => member.user_id))];

    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, designation")
        .in("id", userIds);

      profileMap = new Map(
        (profiles ?? []).map((profile) => [
          profile.id,
          {
            full_name: profile.full_name,
            designation: profile.designation,
          },
        ])
      );
    }

    const formattedMembers: Member[] = rawMembers.map((member) => ({
      id: member.id,
      user_id: member.user_id,
      role: member.role,
      department_id: member.department_id,
      full_name:
        profileMap.get(member.user_id)?.full_name?.trim() ||
        `Employee ${member.id.slice(0, 6)}`,
      designation: profileMap.get(member.user_id)?.designation ?? null,
    }));

    setMembers(formattedMembers);

    const currentMember = formattedMembers.find(
      (member) => member.user_id === userId
    );

    setCurrentMemberId(currentMember?.id ?? "");

    setDepartments(departmentResult.data ?? []);

    if (memoResult.error) {
      setError(memoResult.error.message);
      setMemos([]);
      setRecipients([]);
      setLoading(false);
      return;
    }

    const memoRows = (memoResult.data ?? []) as Memo[];
    setMemos(memoRows);

    if (memoRows.length) {
      const memoIds = memoRows.map((memo) => memo.id);

      const { data: recipientRows, error: recipientError } = await supabase
        .from("memo_recipients")
        .select(
          "id, memo_id, recipient_member_id, recipient_type, sequence_order, status, comments, acted_at"
        )
        .in("memo_id", memoIds)
        .order("sequence_order");

      if (recipientError) {
        setError(recipientError.message);
        setRecipients([]);
      } else {
        setRecipients((recipientRows ?? []) as Recipient[]);
      }
    } else {
      setRecipients([]);
    }

    setLoading(false);
  }, [organisationId, supabase]);

  useEffect(() => {
    const readOrganisation = () => {
      setOrganisationId(
        localStorage.getItem("talvorah_organisation_id") ?? ""
      );
    };

    readOrganisation();

    window.addEventListener(
      "talvorah:organisation-changed",
      readOrganisation
    );

    window.addEventListener("storage", readOrganisation);

    return () => {
      window.removeEventListener(
        "talvorah:organisation-changed",
        readOrganisation
      );
      window.removeEventListener("storage", readOrganisation);
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const memberName = useCallback(
    (memberId: string | null | undefined) => {
      if (!memberId) return "Not assigned";

      return (
        members.find((member) => member.id === memberId)?.full_name ??
        "Unknown employee"
      );
    },
    [members]
  );

  const departmentName = useCallback(
    (departmentId: string | null) => {
      if (!departmentId) return "General";

      return (
        departments.find((department) => department.id === departmentId)
          ?.name ?? "Department"
      );
    },
    [departments]
  );

  const visibleMemos = useMemo(() => {
    const term = search.toLowerCase();

    return memos.filter((memo) => {
      const isAuthor = memo.created_by_member_id === currentMemberId;
      const isRecipient = recipients.some(
        (recipient) =>
          recipient.memo_id === memo.id &&
          recipient.recipient_member_id === currentMemberId
      );

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "inbox" && isRecipient && !isAuthor) ||
        (activeTab === "outbox" && isAuthor) ||
        (activeTab === "drafts" && isAuthor && memo.status === "draft");

      const matchesSearch =
        memo.subject.toLowerCase().includes(term) ||
        memo.reference_number.toLowerCase().includes(term) ||
        memo.body.toLowerCase().includes(term);

      return matchesTab && matchesSearch;
    });
  }, [memos, recipients, currentMemberId, activeTab, search]);

  const counts = {
    all: memos.length,
    inbox: memos.filter(
      (memo) =>
        memo.created_by_member_id !== currentMemberId &&
        recipients.some(
          (recipient) =>
            recipient.memo_id === memo.id &&
            recipient.recipient_member_id === currentMemberId
        )
    ).length,
    outbox: memos.filter(
      (memo) => memo.created_by_member_id === currentMemberId
    ).length,
    drafts: memos.filter(
      (memo) =>
        memo.created_by_member_id === currentMemberId &&
        memo.status === "draft"
    ).length,
  };

  function resetComposer() {
    setSubject("");
    setBody("");
    setOriginatingDepartmentId("");
    setRouteRecipients([]);
  }

  function addRouteRecipient() {
    setRouteRecipients((previous) => [
      ...previous,
      { memberId: "", recipientType: "action" },
    ]);
  }

  function updateRouteRecipient(
    index: number,
    field: keyof RouteRecipient,
    value: string
  ) {
    setRouteRecipients((previous) =>
      previous.map((recipient, i) =>
        i === index ? { ...recipient, [field]: value } : recipient
      )
    );
  }

  function removeRouteRecipient(index: number) {
    setRouteRecipients((previous) =>
      previous.filter((_, i) => i !== index)
    );
  }

  async function createMemo(
    event: React.FormEvent<HTMLFormElement>,
    submitImmediately: boolean
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!organisationId) {
      setError("Select an organisation first.");
      return;
    }

    if (!currentMemberId) {
      setError(
        "You need an active employee membership in this organisation to create a memo."
      );
      return;
    }

    if (!subject.trim() || !body.trim()) {
      setError("Enter both the memo subject and its content.");
      return;
    }

    const validRecipients = routeRecipients.filter(
      (recipient) => recipient.memberId
    );

    if (submitImmediately && validRecipients.length === 0) {
      setError("Add at least one recipient before submitting the memo.");
      return;
    }

    if (
      new Set(validRecipients.map((recipient) => recipient.memberId)).size !==
      validRecipients.length
    ) {
      setError("A recipient cannot appear more than once in the routing list.");
      return;
    }

    if (validRecipients.some((recipient) => recipient.memberId === currentMemberId)) {
      setError("You cannot route the memo to yourself.");
      return;
    }

    setSaving(true);

    const referenceNumber = generateReference();

    const { data: memo, error: memoError } = await supabase
      .from("memos")
      .insert({
        organisation_id: organisationId,
        reference_number: referenceNumber,
        subject: subject.trim(),
        body: body.trim(),
        created_by_member_id: currentMemberId,
        originating_department_id: originatingDepartmentId || null,
        status: "draft",
      })
      .select(
        "id, organisation_id, reference_number, subject, body, created_by_member_id, originating_department_id, status, current_recipient_member_id, memo_date, created_at, updated_at"
      )
      .single();

    if (memoError || !memo) {
      setError(memoError?.message || "Could not create the memo.");
      setSaving(false);
      return;
    }

    if (validRecipients.length) {
      const recipientRows = validRecipients.map((recipient, index) => ({
        memo_id: memo.id,
        recipient_member_id: recipient.memberId,
        recipient_type: recipient.recipientType,
        sequence_order: index + 1,
        status: "pending",
      }));

      const { error: recipientsError } = await supabase
        .from("memo_recipients")
        .insert(recipientRows);

      if (recipientsError) {
        setError(
          `The memo draft was created, but its routing list could not be saved: ${recipientsError.message}`
        );
        setSaving(false);
        await loadData();
        return;
      }
    }

    if (submitImmediately) {
      const { error: submitError } = await supabase.rpc("submit_memo", {
        p_memo_id: memo.id,
      });

      if (submitError) {
        setError(
          `The draft was saved, but submission failed: ${submitError.message}`
        );
        setSaving(false);
        await loadData();
        return;
      }

      setSuccess("Memo submitted successfully.");
    } else {
      setSuccess("Memo saved as a draft.");
    }

    resetComposer();
    setShowComposer(false);
    setSaving(false);
    await loadData();
  }

  async function submitDraft(memo: Memo) {
    setError("");
    setSuccess("");
    setSaving(true);

    const { error: submitError } = await supabase.rpc("submit_memo", {
      p_memo_id: memo.id,
    });

    if (submitError) {
      setError(submitError.message);
    } else {
      setSuccess(`${memo.reference_number} has been submitted.`);
    }

    setSaving(false);
    await loadData();
  }

  async function loadMemoDetails(memo: Memo) {
    setSelectedMemo(memo);
    setActionComments("");
    setEventHistory([]);

    const { data, error: historyError } = await supabase
      .from("memo_events")
      .select(
        "id, memo_id, actor_member_id, actor_user_id, action, comments, created_at"
      )
      .eq("memo_id", memo.id)
      .order("created_at", { ascending: true });

    if (historyError) {
      setError(historyError.message);
    } else {
      setEventHistory((data ?? []) as MemoEvent[]);
    }
  }

  async function processMemo(action: "forward" | "approve" | "return" | "reject") {
    if (!selectedMemo) return;

    setError("");
    setSuccess("");
    setProcessingAction(action);

    const { error: actionError } = await supabase.rpc("act_on_memo", {
      p_memo_id: selectedMemo.id,
      p_action: action,
      p_comments: actionComments.trim() || null,
      p_acting_member_id: currentMemberId || null,
    });

    if (actionError) {
      setError(actionError.message);
      setProcessingAction("");
      return;
    }

    const actionMessages: Record<string, string> = {
      forward: "Memo forwarded successfully.",
      approve: "Memo approved successfully.",
      return: "Memo returned successfully.",
      reject: "Memo rejected.",
    };

    setSuccess(actionMessages[action]);
    setProcessingAction("");
    setSelectedMemo(null);
    setActionComments("");

    await loadData();
  }

  const selectedRecipients = selectedMemo
    ? recipients
        .filter((recipient) => recipient.memo_id === selectedMemo.id)
        .sort((a, b) => a.sequence_order - b.sequence_order)
    : [];

  const isSelectedAuthor =
    selectedMemo?.created_by_member_id === currentMemberId;

  const isCurrentRecipient =
    !!selectedMemo &&
    selectedMemo.current_recipient_member_id === currentMemberId;

  const canProcessSelected =
    !!selectedMemo &&
    selectedMemo.status !== "draft" &&
    ["submitted", "in_review"].includes(selectedMemo.status) &&
    (isCurrentRecipient || isPlatformSuperAdmin);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-emerald-700">
              Talvorah Workspace
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Memos
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Create, route, review and manage official organisational memos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setError("");
                setSuccess("");
                setShowComposer(true);
              }}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              + Create memo
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              ↻ Refresh
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

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "All accessible memos", value: counts.all, icon: "▤" },
            { label: "Inbox", value: counts.inbox, icon: "↙" },
            { label: "Sent by me", value: counts.outbox, icon: "↗" },
            { label: "My drafts", value: counts.drafts, icon: "▧" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{item.label}</p>
                <span className="text-lg text-emerald-600">{item.icon}</span>
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All memos"],
                ["inbox", "Inbox"],
                ["outbox", "Sent"],
                ["drafts", "Drafts"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setActiveTab(value)}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  activeTab === value
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reference or subject..."
            className={`${inputClass} lg:max-w-sm`}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">
                Memo register
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Official correspondence and routing history
              </p>
            </div>
            <span className="text-xs text-slate-400">
              {visibleMemos.length} memo(s)
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading memos...
            </div>
          ) : !organisationId ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Select an organisation to view its memos.
            </div>
          ) : visibleMemos.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700">
                ▤
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                No memos found
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Create a memo to begin using the correspondence workflow.
              </p>
              <button
                onClick={() => setShowComposer(true)}
                className="mt-5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Create your first memo
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleMemos.map((memo) => {
                const memoRecipients = recipients
                  .filter((recipient) => recipient.memo_id === memo.id)
                  .sort((a, b) => a.sequence_order - b.sequence_order);

                return (
                  <div
                    key={memo.id}
                    className="flex flex-col justify-between gap-4 px-5 py-5 transition hover:bg-slate-50 lg:flex-row lg:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-emerald-700">
                          {memo.reference_number}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize ${statusStyle(
                            memo.status
                          )}`}
                        >
                          {displayStatus(memo.status)}
                        </span>
                      </div>

                      <h3 className="font-semibold text-slate-900">
                        {memo.subject}
                      </h3>

                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {memo.body}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>
                          From: {memberName(memo.created_by_member_id)}
                        </span>
                        <span>
                          Department:{" "}
                          {departmentName(memo.originating_department_id)}
                        </span>
                        <span>
                          Created: {formatDate(memo.created_at)}
                        </span>
                        <span>
                          {memoRecipients.length} recipient(s)
                        </span>
                      </div>

                      {memo.current_recipient_member_id && (
                        <p className="mt-2 text-xs text-amber-700">
                          Current recipient:{" "}
                          {memberName(memo.current_recipient_member_id)}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {memo.status === "draft" &&
                        memo.created_by_member_id === currentMemberId && (
                          <button
                            onClick={() => submitDraft(memo)}
                            disabled={saving}
                            className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Submit
                          </button>
                        )}

                      <button
                        onClick={() => loadMemoDetails(memo)}
                        className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        View details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showComposer && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 sm:items-center">
            <div className="my-6 w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Create new memo
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Prepare your memo and define its routing sequence.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowComposer(false);
                    resetComposer();
                  }}
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(event) => createMemo(event, false)}
                className="space-y-5 p-6"
              >
                <div>
                  <label className={labelClass}>Memo subject *</label>
                  <input
                    required
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Enter the subject of the memo"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Originating department</label>
                  <select
                    value={originatingDepartmentId}
                    onChange={(event) =>
                      setOriginatingDepartmentId(event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Memo content *</label>
                  <textarea
                    required
                    rows={9}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="Write the full memo here..."
                    className={inputClass}
                  />
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Routing instructions
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Add recipients in the order the memo should travel.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addRouteRecipient}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      + Add recipient
                    </button>
                  </div>

                  {routeRecipients.length === 0 ? (
                    <div className="mt-4 rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">
                      No recipients added yet.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {routeRecipients.map((recipient, index) => (
                        <div
                          key={index}
                          className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[auto_1fr_170px_auto] sm:items-center"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-600">
                            {index + 1}
                          </span>

                          <select
                            value={recipient.memberId}
                            onChange={(event) =>
                              updateRouteRecipient(
                                index,
                                "memberId",
                                event.target.value
                              )
                            }
                            className={inputClass}
                          >
                            <option value="">Select employee</option>
                            {members
                              .filter(
                                (member) =>
                                  member.id !== currentMemberId &&
                                  !routeRecipients.some(
                                    (other, otherIndex) =>
                                      otherIndex !== index &&
                                      other.memberId === member.id
                                  )
                              )
                              .map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.full_name}
                                  {member.designation
                                    ? ` — ${member.designation}`
                                    : ""}
                                </option>
                              ))}
                          </select>

                          <select
                            value={recipient.recipientType}
                            onChange={(event) =>
                              updateRouteRecipient(
                                index,
                                "recipientType",
                                event.target.value
                              )
                            }
                            className={inputClass}
                          >
                            <option value="through">Through</option>
                            <option value="action">For action</option>
                            <option value="information">For information</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => removeRouteRecipient(index)}
                            className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mt-3 text-xs text-slate-400">
                    A recipient marked "Through" is included in the routing
                    chain. "For action" and "For information" identify the
                    recipient's intended role.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowComposer(false);
                      resetComposer();
                    }}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save draft"}
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={(event) => {
                      const form = event.currentTarget.closest("form");
                      if (form) {
                        const submitEvent = new Event("submit", {
                          bubbles: true,
                          cancelable: true,
                        });
                        Object.defineProperty(submitEvent, "submitMemoNow", {
                          value: true,
                        });
                        form.dispatchEvent(submitEvent);
                      }
                    }}
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Submit memo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {selectedMemo && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 sm:items-center">
            <div className="my-6 w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="font-mono text-xs font-semibold text-emerald-700">
                    {selectedMemo.reference_number}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    {selectedMemo.subject}
                  </h2>
                  <span
                    className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize ${statusStyle(
                      selectedMemo.status
                    )}`}
                  >
                    {displayStatus(selectedMemo.status)}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedMemo(null)}
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-400">Originator</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {memberName(selectedMemo.created_by_member_id)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">
                      Originating department
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {departmentName(
                        selectedMemo.originating_department_id
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Memo date</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {selectedMemo.memo_date}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Last updated</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {formatDate(selectedMemo.updated_at)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">
                    Memo content
                  </h3>
                  <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                    {selectedMemo.body}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">
                    Routing sequence
                  </h3>

                  {selectedRecipients.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No recipients have been assigned.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedRecipients.map((recipient, index) => (
                        <div
                          key={recipient.id}
                          className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800">
                              {memberName(recipient.recipient_member_id)}
                            </p>
                            <p className="mt-1 text-xs capitalize text-slate-500">
                              {recipient.recipient_type} ·{" "}
                              {displayStatus(recipient.status)}
                            </p>
                            {recipient.comments && (
                              <p className="mt-1 text-xs text-slate-500">
                                {recipient.comments}
                              </p>
                            )}
                          </div>
                          {recipient.acted_at && (
                            <span className="text-right text-[10px] text-slate-400">
                              {formatDate(recipient.acted_at)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">
                    Activity history
                  </h3>

                  {eventHistory.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No activity has been recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {eventHistory.map((event) => (
                        <div
                          key={event.id}
                          className="border-l-2 border-emerald-200 pl-4"
                        >
                          <p className="text-sm font-medium capitalize text-slate-800">
                            {displayStatus(event.action)}
                          </p>
                          {event.comments && (
                            <p className="mt-1 text-sm text-slate-600">
                              {event.comments}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-slate-400">
                            {memberName(event.actor_member_id)} ·{" "}
                            {formatDate(event.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedMemo.status === "draft" && isSelectedAuthor && (
                  <div className="border-t border-slate-100 pt-5">
                    <button
                      onClick={() => submitDraft(selectedMemo)}
                      disabled={saving}
                      className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Submit this memo
                    </button>
                  </div>
                )}

                {canProcessSelected && (
                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="mb-2 text-sm font-semibold text-slate-900">
                      Process memo
                    </h3>
                    <p className="mb-3 text-xs text-slate-500">
                      Add a comment if required, then choose the action.
                    </p>

                    <textarea
                      rows={3}
                      value={actionComments}
                      onChange={(event) =>
                        setActionComments(event.target.value)
                      }
                      placeholder="Enter comments or instructions..."
                      className={inputClass}
                    />

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => processMemo("forward")}
                        disabled={!!processingAction}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      >
                        {processingAction === "forward"
                          ? "Processing..."
                          : "Forward"}
                      </button>

                      <button
                        onClick={() => processMemo("approve")}
                        disabled={!!processingAction}
                        className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {processingAction === "approve"
                          ? "Processing..."
                          : "Approve"}
                      </button>

                      <button
                        onClick={() => processMemo("return")}
                        disabled={!!processingAction}
                        className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                      >
                        {processingAction === "return"
                          ? "Processing..."
                          : "Return"}
                      </button>

                      <button
                        onClick={() => processMemo("reject")}
                        disabled={!!processingAction}
                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        {processingAction === "reject"
                          ? "Processing..."
                          : "Reject"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
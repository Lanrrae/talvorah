
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import OrganisationSwitcher from "@/components/OrganisationSwitcher";
import { createClient } from "@/utils/supabase/client";

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_member_id: string;
  message_body: string;
  message_type: string;
  created_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  reply_to_message_id?: string | null;
};

type Conversation = {
  id: string;
  organisation_id: string;
  conversation_type: "direct" | "group";
  title: string | null;
  last_message_at: string | null;
  latestMessage: ChatMessage | null;
};

type Member = {
  id: string;
  user_id: string;
  role: string;
};

type Profile = {
  id?: string;
  user_id?: string;
  full_name?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  job_title?: string;
  avatar_url?: string;
  email?: string;
};

const navItems = [
  ["Overview", "/dashboard"],
  ["Departments", "/dashboard/departments"],
  ["Employees", "/dashboard/employees"],
  ["Projects", "/dashboard/projects"],
  ["Tasks", "/dashboard/tasks"],
  ["Messages", "/dashboard/messages"],
  ["Meetings", "/dashboard/meetings"],
  ["Documents", "/dashboard/documents"],
  ["Memos", "/dashboard/memos"],
  ["Circulars", "/dashboard/circulars"],
  ["Reports", "/dashboard/reports"],
  ["Calendar", "/dashboard/calendar"],
  ["Settings", "/dashboard/settings"],
];

function profileName(profile?: Profile) {
  if (!profile) return "";

  return (
    profile.full_name ||
    profile.display_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.email ||
    ""
  );
}

function memberName(member: Member, profiles: Record<string, Profile>) {
  return (
    profileName(profiles[member.user_id]) ||
    `${member.role.replaceAll("_", " ")} · ${member.user_id.slice(0, 8)}`
  );
}

function timeLabel(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (date.toDateString() === new Date().toDateString()) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });
}

function messageTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "T";
}

export default function MessagesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [organisationId, setOrganisationId] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentMemberId, setCurrentMemberId] = useState("");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [activeId, setActiveId] = useState("");
  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [search, setSearch] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [newType, setNewType] = useState<"direct" | "group">("group");
  const [newName, setNewName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [totalUnread, setTotalUnread] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const organisationRef = useRef("");
  const workspaceRequestRef = useRef(0);
  const messageRequestRef = useRef(0);
  const unreadRequestRef = useRef(0);

  const activeConversation = conversations.find(
    (item) => item.id === activeId
  );

  const filteredConversations = conversations.filter((conversation) => {
    const name =
      conversation.title ||
      (conversation.conversation_type === "direct"
        ? "Direct conversation"
        : "Group conversation");

    return name.toLowerCase().includes(search.trim().toLowerCase());
  });

  const loadUnreadCounts = useCallback(async () => {
    if (!organisationId) {
      setUnreadCounts({});
      setTotalUnread(0);
      return;
    }

    const requestId = ++unreadRequestRef.current;
    const selectedOrganisation = organisationId;

    try {
      const response = await fetch("/api/chat/unread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organisationId: selectedOrganisation }),
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load unread counts.");
      }

      if (
        requestId !== unreadRequestRef.current ||
        organisationRef.current !== selectedOrganisation
      ) return;

      setUnreadCounts(result.unreadCounts || {});
      setTotalUnread(Number(result.totalUnread || 0));
    } catch (err) {
      console.error("Unread messages:", err);
    }
  }, [organisationId]);

  const loadWorkspace = useCallback(async (selectedOrganisation: string) => {
    const requestId = ++workspaceRequestRef.current;

    setLoading(true);
    setError("");
    setConversations([]);
    setMembers([]);
    setProfiles({});
    setMessages([]);
    setActiveId("");
    setCurrentMemberId("");

    if (!selectedOrganisation) {
      setLoading(false);
      setError("Select an organisation to view its conversations.");
      return;
    }

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (requestId !== workspaceRequestRef.current) return;
      if (authError || !user) throw new Error("Please sign in to access messages.");

      setCurrentUserId(user.id);

      const { data: membership, error: membershipError } = await supabase
        .from("organisation_members")
        .select("id")
        .eq("organisation_id", selectedOrganisation)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (requestId !== workspaceRequestRef.current) return;
      if (membershipError) throw membershipError;

      if (!membership) {
        throw new Error("You are not an active member of this organisation.");
      }

      setCurrentMemberId(membership.id);

      const [conversationResponse, memberResponse, profileResponse] =
        await Promise.all([
          fetch(
            `/api/chat?organisationId=${encodeURIComponent(selectedOrganisation)}`,
            { cache: "no-store" }
          ),
          supabase
            .from("organisation_members")
            .select("id, user_id, role")
            .eq("organisation_id", selectedOrganisation)
            .eq("status", "active")
            .order("created_at", { ascending: true }),
          supabase.from("profiles").select("*"),
        ]);

      const conversationResult = await conversationResponse.json();

      if (requestId !== workspaceRequestRef.current) return;
      if (!conversationResponse.ok) {
        throw new Error(conversationResult.error || "Unable to load conversations.");
      }
      if (memberResponse.error) throw memberResponse.error;

      const profileMap: Record<string, Profile> = {};

      for (const profile of (profileResponse.data || []) as Profile[]) {
        const userId = profile.user_id || profile.id;
        if (userId) profileMap[userId] = profile;
      }

      setConversations(conversationResult.conversations || []);
      setMembers((memberResponse.data || []) as Member[]);
      setProfiles(profileMap);
    } catch (err) {
      if (requestId !== workspaceRequestRef.current) return;

      console.error("Messages workspace:", err);
      setError(err instanceof Error ? err.message : "Unable to load messages.");
    } finally {
      if (requestId === workspaceRequestRef.current) setLoading(false);
    }
  }, [supabase]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!organisationId || !conversationId) return;

    const requestId = ++messageRequestRef.current;
    const selectedOrganisation = organisationId;

    setLoadingMessages(true);
    setError("");

    try {
      const response = await fetch(
        `/api/chat?organisationId=${encodeURIComponent(selectedOrganisation)}&conversationId=${encodeURIComponent(conversationId)}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (
        requestId !== messageRequestRef.current ||
        organisationRef.current !== selectedOrganisation
      ) return;

      if (!response.ok) throw new Error(result.error || "Unable to load messages.");

      setMessages(result.messages || []);
    } catch (err) {
      if (requestId !== messageRequestRef.current) return;
      setError(err instanceof Error ? err.message : "Unable to load messages.");
      setMessages([]);
    } finally {
      if (requestId === messageRequestRef.current) setLoadingMessages(false);
    }
  }, [organisationId]);

  const markConversationRead = useCallback(async (conversationId: string) => {
    if (!organisationId || !conversationId) return;

    const selectedOrganisation = organisationId;

    try {
      const response = await fetch("/api/chat/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationId: selectedOrganisation,
          conversationId,
        }),
      });

      if (!response.ok) {
        console.error("Unable to mark conversation as read:", await response.text());
        return;
      }

      if (organisationRef.current === selectedOrganisation) {
        await loadUnreadCounts();
      }
    } catch (err) {
      console.error("Read status:", err);
    }
  }, [organisationId, loadUnreadCounts]);

  useEffect(() => {
    const selected =
      localStorage.getItem("talvorah_organisation_id") || "";

    organisationRef.current = selected;
    setOrganisationId(selected);
    void loadWorkspace(selected);

    const handleOrganisationChange = () => {
      const next = localStorage.getItem("talvorah_organisation_id") || "";
      if (next === organisationRef.current) return;

      organisationRef.current = next;
      workspaceRequestRef.current++;
      messageRequestRef.current++;
      unreadRequestRef.current++;

      setOrganisationId(next);
      setMessages([]);
      setActiveId("");
      setReplyingTo(null);
      setUnreadCounts({});
      setTotalUnread(0);
      setSuccess("");

      void loadWorkspace(next);
    };

    window.addEventListener("storage", handleOrganisationChange);
    window.addEventListener("talvorah:organisation-changed", handleOrganisationChange);

    return () => {
      workspaceRequestRef.current++;
      messageRequestRef.current++;
      unreadRequestRef.current++;
      window.removeEventListener("storage", handleOrganisationChange);
      window.removeEventListener("talvorah:organisation-changed", handleOrganisationChange);
    };
  }, [loadWorkspace]);

  useEffect(() => {
    if (!organisationId) return;
    void loadUnreadCounts();
  }, [organisationId, loadUnreadCounts]);

  useEffect(() => {
    messageRequestRef.current++;

    if (activeId) {
      void loadMessages(activeId);
      void markConversationRead(activeId);
    } else {
      setMessages([]);
      setLoadingMessages(false);
    }
  }, [activeId, loadMessages, markConversationRead]);

  useEffect(() => {
    if (!organisationId || !activeId) return;

    const selectedOrganisation = organisationId;
    const selectedConversation = activeId;

    const channel = supabase
      .channel(`talvorah-chat-${selectedOrganisation}-${selectedConversation}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        (payload) => {
          if (organisationRef.current !== selectedOrganisation) return;

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const incoming = payload.new as ChatMessage;

            setMessages((current) => {
              const exists = current.some((item) => item.id === incoming.id);
              const next = exists
                ? current.map((item) => item.id === incoming.id ? incoming : item)
                : [...current, incoming];

              return next.sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            });

            if (payload.eventType === "INSERT") {
              setConversations((current) =>
                current.map((item) =>
                  item.id === incoming.conversation_id
                    ? { ...item, last_message_at: incoming.created_at, latestMessage: incoming }
                    : item
                )
              );

              if (incoming.sender_member_id !== currentMemberId) {
                void markConversationRead(selectedConversation);
              }
            }
          }

          if (payload.eventType === "DELETE") {
            const removed = payload.old as Partial<ChatMessage>;
            if (removed.id) {
              setMessages((current) => current.filter((item) => item.id !== removed.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organisationId, activeId, currentMemberId, markConversationRead, supabase]);

  useEffect(() => {
    if (!organisationId) return;

    const selectedOrganisation = organisationId;

    const channel = supabase
      .channel(`talvorah-chat-inbox-${selectedOrganisation}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `organisation_id=eq.${selectedOrganisation}`,
        },
        (payload) => {
          if (organisationRef.current !== selectedOrganisation) return;

          const incoming = payload.new as ChatMessage;

          setConversations((current) => {
            const updated = current.map((item) =>
              item.id === incoming.conversation_id
                ? { ...item, last_message_at: incoming.created_at, latestMessage: incoming }
                : item
            );

            return updated.sort(
              (a, b) =>
                new Date(b.last_message_at || 0).getTime() -
                new Date(a.last_message_at || 0).getTime()
            );
          });

          void loadUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organisationId, supabase, loadUnreadCounts]);

  useEffect(() => {
    if (!organisationId) return;

    const selectedOrganisation = organisationId;

    const channel = supabase
      .channel(`talvorah-chat-conversations-${selectedOrganisation}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_conversations",
          filter: `organisation_id=eq.${selectedOrganisation}`,
        },
        () => {
          if (organisationRef.current !== selectedOrganisation) return;
          void loadWorkspace(selectedOrganisation);
          void loadUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organisationId, supabase, loadWorkspace, loadUnreadCounts]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = message.trim();

    if (!text || !activeConversation || sending) return;

    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_message",
          organisationId,
          conversationId: activeConversation.id,
          message: text,
          replyToMessageId: replyingTo?.id ?? null,
        }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Message could not be sent.");

      setMessage("");
      setReplyingTo(null);

      if (result.message) {
        setMessages((current) =>
          current.some((item) => item.id === result.message.id)
            ? current
            : [...current, result.message]
        );

        setConversations((current) =>
          current.map((item) =>
            item.id === activeConversation.id
              ? {
                  ...item,
                  last_message_at: result.message.created_at,
                  latestMessage: result.message,
                }
              : item
          )
        );
      } else {
        await loadMessages(activeConversation.id);
      }

      void loadUnreadCounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  async function createConversation() {
    if (!organisationId || creating) return;

    if (!selectedUsers.length) {
      setError("Select at least one other organisation member.");
      return;
    }

    if (newType === "direct" && selectedUsers.length !== 1) {
      setError("A direct message must have exactly one other participant.");
      return;
    }

    if (newType === "group" && !newName.trim()) {
      setError("Enter a name for the group conversation.");
      return;
    }

    setCreating(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_conversation",
          organisationId,
          type: newType,
          title: newType === "group" ? newName.trim() : null,
          participantUserIds: selectedUsers,
        }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Unable to create conversation.");

      setShowNew(false);
      setNewName("");
      setSelectedUsers([]);
      setNewType("group");

      await loadWorkspace(organisationId);

      if (result.conversationId) setActiveId(result.conversationId);

      setSuccess("Conversation created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create conversation.");
    } finally {
      setCreating(false);
    }
  }

  function toggleSelectedUser(userId: string) {
    setSelectedUsers((current) => {
      if (newType === "direct") {
        return current.includes(userId) ? [] : [userId];
      }

      return current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId];
    });
  }

  function getSenderName(memberId: string) {
    if (memberId === currentMemberId) return "You";

    const member = members.find((item) => item.id === memberId);
    return member ? memberName(member, profiles) : "Organisation member";
  }

  const unreadCount = totalUnread;

  return (
    <div className="min-h-screen bg-[#080d18] text-white lg:flex">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/10 bg-[#0b1425] p-5">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-wide">
            Talvorah<span className="text-emerald-400">.</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">Organisation Workspace</p>
        </div>

        <div className="mb-7 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-3 text-xs text-slate-400">CURRENT ORGANISATION</p>
          <OrganisationSwitcher />
        </div>

        <p className="mb-3 text-xs uppercase tracking-wider text-slate-500">
          Workspace
        </p>

        <nav className="space-y-1">
          {navItems.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                label === "Messages"
                  ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {label}
              {label === "Messages" && unreadCount > 0 && (
                <span className="float-right rounded-full bg-emerald-500 px-2 text-xs text-white">
                  {unreadCount}
                </span>
              )}
            </a>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-5">
          <p className="text-sm font-medium">Workspace Account</p>
          <p className="mt-1 break-all text-xs text-slate-500">
            {currentUserId || "Signed-in account"}
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-8">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-medium text-emerald-400">
              WORKSPACE / COMMUNICATION
            </p>
            <h2 className="text-3xl font-bold">Messages</h2>
            <p className="mt-2 text-sm text-slate-400">
              Connect with colleagues and collaborate across your organisation.
            </p>
          </div>

          <button
            onClick={() => {
              setError("");
              setSuccess("");
              setShowNew(true);
            }}
            disabled={!organisationId || loading}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold transition hover:bg-emerald-500 disabled:opacity-40"
          >
            + New Conversation
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {[
            { label: "Conversations", value: conversations.length, note: "Across your workspace" },
            { label: "Organisation Members", value: members.length, note: "Active members" },
            { label: "Unread Messages", value: unreadCount, note: "Awaiting your attention" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-[#101a2b] p-5">
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className="mt-2 text-3xl font-bold">{item.value}</p>
              <p className="mt-1 text-xs text-slate-500">{item.note}</p>
            </div>
          ))}
        </div>

        <div className="grid min-h-[650px] grid-cols-1 overflow-hidden rounded-2xl border border-white/10 bg-[#101a2b] md:grid-cols-[320px_minmax(0,1fr)]">
          <section className="flex min-h-0 flex-col border-b border-white/10 md:border-b-0 md:border-r">
            <div className="border-b border-white/10 p-5">
              <h3 className="text-lg font-semibold">Conversations</h3>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations..."
                className="mt-4 w-full rounded-xl border border-white/10 bg-[#080d18] px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex-1">
              {loading ? (
                <p className="p-5 text-sm text-slate-500">Loading conversations...</p>
              ) : filteredConversations.length === 0 ? (
                <div className="p-5">
                  <p className="text-sm text-slate-300">No conversations yet.</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Start a direct message or create a group conversation.
                  </p>
                </div>
              ) : (
                filteredConversations.map((conversation) => {
                  const name = conversation.title || "Direct conversation";
                  const preview = conversation.latestMessage?.message_body || "No messages yet";

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => {
                        setActiveId(conversation.id);
                        setReplyingTo(null);
                        setError("");
                      }}
                      className={`w-full border-b border-white/5 p-4 text-left transition hover:bg-white/[0.04] ${
                        activeId === conversation.id ? "bg-emerald-500/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold ${
                          conversation.conversation_type === "direct"
                            ? "bg-blue-600"
                            : "bg-emerald-600"
                        }`}>
                          {initials(name)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between gap-2">
                            <p className="truncate text-sm font-semibold">{name}</p>
                            <div className="flex shrink-0 items-center gap-2">
                              {(unreadCounts[conversation.id] || 0) > 0 && (
                                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold">
                                  {unreadCounts[conversation.id]}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500">
                                {timeLabel(conversation.last_message_at)}
                              </span>
                            </div>
                          </div>

                          <p className="mt-1 text-xs text-slate-500">
                            {conversation.conversation_type === "direct" ? "Direct message" : "Group conversation"}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-400">{preview}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="flex min-h-[600px] min-w-0 flex-col">
            {activeConversation ? (
              <>
                <div className="flex items-center gap-3 border-b border-white/10 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 font-bold">
                    {initials(activeConversation.title || "Direct conversation")}
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {activeConversation.title || "Direct conversation"}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {activeConversation.conversation_type === "direct" ? "Direct message" : "Group conversation"}
                    </p>
                  </div>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                  <div className="text-center">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-500">
                      Conversation history
                    </span>
                  </div>

                  {loadingMessages ? (
                    <p className="py-12 text-center text-sm text-slate-500">Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-500">
                      No messages yet. Start the conversation.
                    </div>
                  ) : (
                    messages.map((item) => {
                      const mine = item.sender_member_id === currentMemberId;
                      const original = item.reply_to_message_id
                        ? messages.find((candidate) => candidate.id === item.reply_to_message_id)
                        : null;

                      return (
                        <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-2xl p-4 sm:max-w-[75%] ${
                            mine
                              ? "rounded-br-sm bg-emerald-700 text-white"
                              : "rounded-bl-sm bg-[#1b293d] text-slate-100"
                          }`}>
                            {!mine && (
                              <p className="mb-2 text-xs font-semibold text-emerald-300">
                                {getSenderName(item.sender_member_id)}
                              </p>
                            )}

                            {item.reply_to_message_id && (
                              <div className="mb-3 rounded-lg border-l-2 border-emerald-400 bg-black/20 px-3 py-2 text-xs">
                                <p className="font-semibold">
                                  {original ? getSenderName(original.sender_member_id) : "Original message"}
                                </p>
                                <p className="mt-1 line-clamp-2">
                                  {original
                                    ? original.deleted_at ? "This message was deleted." : original.message_body
                                    : "Original message unavailable"}
                                </p>
                              </div>
                            )}

                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                              {item.deleted_at ? "This message was deleted." : item.message_body}
                            </p>

                            <div className="mt-2 flex items-center justify-between gap-4">
                              <p className={`text-[10px] ${mine ? "text-emerald-100" : "text-slate-500"}`}>
                                {messageTime(item.created_at)}
                                {item.edited_at ? " · edited" : ""}
                              </p>
                              {!item.deleted_at && (
                                <button
                                  type="button"
                                  onClick={() => setReplyingTo(item)}
                                  className="text-[10px] font-semibold text-emerald-300 hover:text-white"
                                >
                                  Reply
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-white/10 p-4">
                  {replyingTo && (
                    <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-emerald-300">
                          Replying to {getSenderName(replyingTo.sender_member_id)}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-300">
                          {replyingTo.deleted_at ? "This message was deleted." : replyingTo.message_body}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        aria-label="Cancel reply"
                        className="text-slate-400 hover:text-white"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <input
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                          event.preventDefault();
                          void sendMessage();
                        }
                      }}
                      placeholder="Write a message..."
                      maxLength={5000}
                      disabled={sending || loadingMessages}
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#080d18] px-4 py-3 text-sm outline-none focus:border-emerald-500 disabled:opacity-50"
                    />
                    <button
                      onClick={() => void sendMessage()}
                      disabled={!message.trim() || sending}
                      className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40"
                    >
                      {sending ? "Sending..." : "Send"}
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">
                    Press Enter to send. Shift + Enter for a new line.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500">
                {loading ? "Loading your workspace..." : "Select a conversation or create a new one to get started."}
              </div>
            )}
          </section>
        </div>

        {showNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#101a2b] p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold">New Conversation</h3>
                <button onClick={() => setShowNew(false)} className="text-xl text-slate-400 hover:text-white">
                  ×
                </button>
              </div>

              <label className="text-sm text-slate-400">Conversation type</label>
              <select
                value={newType}
                onChange={(event) => {
                  setNewType(event.target.value as "direct" | "group");
                  setSelectedUsers([]);
                  setError("");
                }}
                className="mb-5 mt-2 w-full rounded-xl border border-white/10 bg-[#080d18] px-4 py-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="group">Group conversation</option>
                <option value="direct">Direct message</option>
              </select>

              {newType === "group" && (
                <>
                  <label className="text-sm text-slate-400">Group name</label>
                  <input
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="e.g. Human Resources Team"
                    className="mb-5 mt-2 w-full rounded-xl border border-white/10 bg-[#080d18] px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  />
                </>
              )}

              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm text-slate-400">Select participants</label>
                <span className="text-xs text-slate-500">{selectedUsers.length} selected</span>
              </div>

              <div className="max-h-64 divide-y divide-white/5 overflow-y-auto rounded-xl border border-white/10">
                {members.filter((member) => member.user_id !== currentUserId).map((member) => {
                  const profile = profiles[member.user_id];
                  const name = memberName(member, profiles);

                  return (
                    <label key={member.id} className="flex cursor-pointer items-center gap-3 p-3 hover:bg-white/[0.04]">
                      <input
                        type={newType === "direct" ? "radio" : "checkbox"}
                        name="chat-participant"
                        checked={selectedUsers.includes(member.user_id)}
                        onChange={() => toggleSelectedUser(member.user_id)}
                        className="accent-emerald-500"
                      />

                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-200">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : initials(name)}
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate text-sm text-slate-200">{name}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {profile?.job_title || member.role.replaceAll("_", " ")}
                        </span>
                      </span>
                    </label>
                  );
                })}

                {members.filter((member) => member.user_id !== currentUserId).length === 0 && (
                  <p className="p-4 text-sm text-slate-500">No other active organisation members are available.</p>
                )}
              </div>

              <p className="mt-3 text-xs text-slate-500">
                You will automatically be included in the conversation.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowNew(false)}
                  className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void createConversation()}
                  disabled={creating || selectedUsers.length === 0}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

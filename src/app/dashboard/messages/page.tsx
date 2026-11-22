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

type ChatConversation = {
  id: string;
  organisation_id: string;
  conversation_type: "direct" | "group";
  title: string | null;
  last_message_at: string | null;
  latestMessage: ChatMessage | null;
};

type OrganisationMember = {
  id: string;
  user_id: string;
  role: string;
};

type MemberProfile = Record<string, unknown>;

function getProfileName(profile?: MemberProfile) {
  if (!profile) return "";

  const directName = ["full_name", "display_name", "name", "fullName"]
    .map((key) => profile[key])
    .find((value) => typeof value === "string" && value.trim());

  if (typeof directName === "string") return directName.trim();

  const firstName = profile.first_name ?? profile.firstName;
  const lastName = profile.last_name ?? profile.lastName;
  const combined = [firstName, lastName]
    .filter((value) => typeof value === "string" && value.trim())
    .join(" ");

  if (combined) return combined;

  const email = profile.email;
  return typeof email === "string" ? email : "";
}

function getProfileJobTitle(profile?: MemberProfile) {
  const value = profile?.job_title ?? profile?.jobTitle ?? profile?.position;
  return typeof value === "string" ? value : "";
}

function getProfileAvatar(profile?: MemberProfile) {
  const value = profile?.avatar_url ?? profile?.avatarUrl ?? profile?.photo_url;
  return typeof value === "string" && value.trim() ? value : "";
}

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

function formatTime(value?: string | null) {
  if (!value) return "";

  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatConversationTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return formatTime(value);
  }

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });
}

function memberLabel(
  member: OrganisationMember,
  profiles: Record<string, MemberProfile>
) {
  const profile = profiles[member.user_id];
  const name = getProfileName(profile);
  return (
    name ||
    `${member.role.replaceAll("_", " ")} · ${member.user_id.slice(0, 8)}`
  );
}

export default function MessagesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [organisationId, setOrganisationId] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentMemberId, setCurrentMemberId] = useState("");

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [members, setMembers] = useState<OrganisationMember[]>([]);
  const [profiles, setProfiles] = useState<Record<string, MemberProfile>>({});
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

  const workspaceRequestRef = useRef(0);
  const organisationIdRef = useRef("");
  const messageRequestRef = useRef(0);
  const unreadRequestRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeId
  );

  const filteredConversations = conversations.filter((conversation) => {
    const name =
      conversation.title ||
      (conversation.conversation_type === "direct"
        ? "Direct conversation"
        : "Group conversation");

    return name.toLowerCase().includes(search.trim().toLowerCase());
  });

  const loadWorkspace = useCallback(
    async (selectedOrganisationId: string) => {
      const requestId = ++workspaceRequestRef.current;

      if (!selectedOrganisationId) {
        setConversations([]);
        setMembers([]);
        setProfiles({});
        setMessages([]);
        setActiveId("");
        setCurrentMemberId("");
        setCurrentUserId("");
        setUnreadCounts({});
        setTotalUnread(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setConversations([]);
      setMembers([]);
      setProfiles({});
      setMessages([]);
      setActiveId("");
      setCurrentMemberId("");
      setUnreadCounts({});
      setTotalUnread(0);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (requestId !== workspaceRequestRef.current) return;

        if (authError || !user) {
          throw new Error("Please sign in to access your messages.");
        }

        setCurrentUserId(user.id);

        const { data: membership, error: membershipError } = await supabase
          .from("organisation_members")
          .select("id")
          .eq("organisation_id", selectedOrganisationId)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (requestId !== workspaceRequestRef.current) return;
        if (membershipError) throw membershipError;

        if (!membership) {
          throw new Error(
            "You are not an active member of this organisation."
          );
        }

        setCurrentMemberId(membership.id);

        const [conversationResponse, memberResponse, profileResponse] =
          await Promise.all([
            fetch(
              `/api/chat?organisationId=${encodeURIComponent(
                selectedOrganisationId
              )}`,
              { cache: "no-store" }
            ),
            supabase
              .from("organisation_members")
              .select("id, user_id, role")
              .eq("organisation_id", selectedOrganisationId)
              .eq("status", "active")
              .order("created_at", { ascending: true }),
            supabase.from("profiles").select("*"),
          ]);

        const conversationResult = await conversationResponse.json();

        if (requestId !== workspaceRequestRef.current) return;

        if (!conversationResponse.ok) {
          throw new Error(
            conversationResult.error || "Unable to load conversations."
          );
        }

        if (memberResponse.error) throw memberResponse.error;

        const activeMembers = (memberResponse.data ||
          []) as OrganisationMember[];
        const profileRows = (profileResponse.data || []) as MemberProfile[];
        const profileMap: Record<string, MemberProfile> = {};

        for (const profile of profileRows) {
          const profileUserId = profile.user_id ?? profile.id;

          if (typeof profileUserId === "string") {
            profileMap[profileUserId] = profile;
          }
        }

        setConversations(conversationResult.conversations || []);
        setMembers(activeMembers);
        setProfiles(profileMap);
      } catch (err) {
        if (requestId !== workspaceRequestRef.current) return;

        console.error("Messages workspace error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your workspace messages."
        );
      } finally {
        if (requestId === workspaceRequestRef.current) {
          setLoading(false);
        }
      }
    },
    [supabase]
  );

  const loadUnreadCounts = useCallback(async () => {
    const requestId = ++unreadRequestRef.current;
    const selectedOrganisationId = organisationId;

    if (!selectedOrganisationId) {
      setUnreadCounts({});
      setTotalUnread(0);
      return;
    }

    try {
      const response = await fetch("/api/chat/unread", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organisationId: selectedOrganisationId,
        }),
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load unread counts.");
      }

      if (
        requestId !== unreadRequestRef.current ||
        organisationIdRef.current !== selectedOrganisationId
      ) {
        return;
      }

      setUnreadCounts(result.unreadCounts || {});
      setTotalUnread(Number(result.totalUnread || 0));
    } catch (error) {
      if (requestId === unreadRequestRef.current) {
        console.error("Unread counts error:", error);
      }
    }
  }, [organisationId]);

  useEffect(() => {
    const selected =
      localStorage.getItem("talvorah_organisation_id") || "";

    organisationIdRef.current = selected;
    setOrganisationId(selected);

    if (selected) {
      void loadWorkspace(selected);
    } else {
      setLoading(false);
      setError("Select an organisation to view its conversations.");
    }

    const handleOrganisationChange = () => {
      const nextOrganisation =
        localStorage.getItem("talvorah_organisation_id") || "";

      if (nextOrganisation === organisationIdRef.current) return;

      organisationIdRef.current = nextOrganisation;

      workspaceRequestRef.current += 1;
      messageRequestRef.current += 1;
      unreadRequestRef.current += 1;

      setOrganisationId(nextOrganisation);
      setActiveId("");
      setMessages([]);
      setConversations([]);
      setMembers([]);
      setProfiles({});
      setCurrentMemberId("");
      setCurrentUserId("");
      setUnreadCounts({});
      setTotalUnread(0);
      setError("");
      setSuccess("");
      setReplyingTo(null);

      void loadWorkspace(nextOrganisation);

      if (!nextOrganisation) {
        setError("Select an organisation to view its conversations.");
      }
    };

    window.addEventListener("storage", handleOrganisationChange);
    window.addEventListener(
      "talvorah-organisation-changed",
      handleOrganisationChange
    );

    return () => {
      workspaceRequestRef.current += 1;
      messageRequestRef.current += 1;
      unreadRequestRef.current += 1;

      window.removeEventListener("storage", handleOrganisationChange);
      window.removeEventListener(
        "talvorah-organisation-changed",
        handleOrganisationChange
      );
    };
  }, [loadWorkspace]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!organisationId || !conversationId) return;

      const requestId = ++messageRequestRef.current;
      const selectedOrganisationId = organisationId;

      setLoadingMessages(true);
      setError("");

      try {
        const response = await fetch(
          `/api/chat?organisationId=${encodeURIComponent(
            selectedOrganisationId
          )}&conversationId=${encodeURIComponent(conversationId)}`,
          { cache: "no-store" }
        );

        const result = await response.json();

        if (
          requestId !== messageRequestRef.current ||
          organisationIdRef.current !== selectedOrganisationId
        ) {
          return;
        }

        if (!response.ok) {
          throw new Error(result.error || "Unable to load messages.");
        }

        setMessages((current) => {
          const combined = new Map<string, ChatMessage>();

          for (const item of result.messages || []) {
            combined.set(item.id, item);
          }

          for (const item of current) {
            if (item.conversation_id === conversationId) {
              combined.set(item.id, item);
            }
          }

          return Array.from(combined.values()).sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );
        });
      } catch (err) {
        if (requestId !== messageRequestRef.current) return;

        console.error("Message history error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load message history."
        );

        setMessages([]);
      } finally {
        if (requestId === messageRequestRef.current) {
          setLoadingMessages(false);
        }
      }
    },
    [organisationId]
  );

  useEffect(() => {
    messageRequestRef.current += 1;

    if (activeId) {
      void loadMessages(activeId);
    } else {
      setMessages([]);
      setLoadingMessages(false);
      setReplyingTo(null);
    }
  }, [activeId, loadMessages]);

  const markConversationRead = useCallback(
    async (conversationId: string) => {
      if (!organisationId || !conversationId) return;

      const selectedOrganisationId = organisationId;

      try {
        const response = await fetch("/api/chat/read", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            organisationId: selectedOrganisationId,
            conversationId,
          }),
        });

        if (!response.ok) {
          console.error(
            "Unable to update read status:",
            await response.text()
          );
          return;
        }

        if (organisationIdRef.current !== selectedOrganisationId) return;

        await loadUnreadCounts();
      } catch (error) {
        console.error("Unable to mark conversation as read:", error);
      }
    },
    [organisationId, loadUnreadCounts]
  );

  useEffect(() => {
    if (!activeId || !organisationId) return;

    void markConversationRead(activeId);
  }, [activeId, organisationId, markConversationRead]);

  useEffect(() => {
    if (!organisationId || !activeId) return;

    const selectedOrganisationId = organisationId;
    const selectedConversationId = activeId;

    const channel = supabase
      .channel(
        `talvorah-chat-${selectedOrganisationId}-${selectedConversationId}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        (payload) => {
          if (
            organisationIdRef.current !== selectedOrganisationId ||
            activeId !== selectedConversationId
          ) {
            return;
          }

          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            const incoming = payload.new as ChatMessage;

            setMessages((current) => {
              const exists = current.some(
                (item) => item.id === incoming.id
              );

              const next = exists
                ? current.map((item) =>
                    item.id === incoming.id ? incoming : item
                  )
                : [...current, incoming];

              return next.sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime()
              );
            });

            if (incoming.sender_member_id !== currentMemberId) {
              void markConversationRead(selectedConversationId);
            }

            void loadUnreadCounts();
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as Partial<ChatMessage>;

            if (deleted.id) {
              setMessages((current) =>
                current.filter((item) => item.id !== deleted.id)
              );
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Talvorah Chat subscription:", status);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    organisationId,
    activeId,
    currentMemberId,
    supabase,
    markConversationRead,
    loadUnreadCounts,
  ]);

  useEffect(() => {
    if (!organisationId) return;

    const selectedOrganisationId = organisationId;

    const channel = supabase
      .channel(`talvorah-chat-conversations-${selectedOrganisationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_conversations",
          filter: `organisation_id=eq.${selectedOrganisationId}`,
        },
        () => {
          if (
            organisationIdRef.current !== selectedOrganisationId
          ) {
            return;
          }

          void loadWorkspace(selectedOrganisationId);
          void loadUnreadCounts();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(
            "Talvorah Chat conversation subscription:",
            status
          );
        }
      });

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

      if (!response.ok) {
        throw new Error(result.error || "Message could not be sent.");
      }

      setMessage("");
      setReplyingTo(null);

      if (result.message) {
        setMessages((current) =>
          current.some((item) => item.id === result.message.id)
            ? current
            : [...current, result.message]
        );

        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === activeConversation.id
              ? {
                  ...conversation,
                  last_message_at: result.message.created_at,
                  latestMessage: result.message,
                }
              : conversation
          )
        );
      } else {
        await loadMessages(activeConversation.id);
      }

      void loadUnreadCounts();
    } catch (err) {
      console.error("Send message error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to send this message."
      );
    } finally {
      setSending(false);
    }
  }

  async function createConversation() {
    if (!organisationId || creating) return;

    if (selectedUsers.length === 0) {
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

      if (!response.ok) {
        throw new Error(result.error || "Unable to create conversation.");
      }

      setShowNew(false);
      setNewName("");
      setSelectedUsers([]);
      setNewType("group");

      await loadWorkspace(organisationId);

      if (result.conversationId) {
        setActiveId(result.conversationId);
      }

      setSuccess("Conversation created successfully.");
    } catch (err) {
      console.error("Create conversation error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create conversation."
      );
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

  function getSenderName(senderMemberId: string) {
    if (senderMemberId === currentMemberId) return "You";

    const member = members.find((item) => item.id === senderMemberId);
    return member ? memberLabel(member, profiles) : "Organisation member";
  }

  const unreadCount = totalUnread;

  return (
    <div className="min-h-screen bg-[#080b14] text-white flex">
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-white/10 bg-[#0b0f1a] flex-col p-5">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-wide">
            Talvorah<span className="text-purple-400">.</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Organisation Workspace
          </p>
        </div>

        <div className="mb-7 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs text-gray-500 mb-3">
            CURRENT ORGANISATION
          </p>
          <OrganisationSwitcher />
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
                label === "Messages"
                  ? "bg-purple-500/15 text-purple-300 border border-purple-500/20"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {label}
              {label === "Messages" && unreadCount > 0 && (
                <span className="float-right rounded-full bg-purple-500 px-2 text-xs text-white">
                  {unreadCount}
                </span>
              )}
            </a>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-5">
          <p className="text-sm font-medium">Workspace Account</p>
          <p className="text-xs text-gray-500 mt-1 break-all">
            {currentUserId || "Signed-in account"}
          </p>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-5 md:p-8">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <p className="text-sm text-purple-400 mb-2">
              WORKSPACE / COMMUNICATION
            </p>
            <h2 className="text-3xl font-bold">Communication</h2>
            <p className="text-gray-400 text-sm mt-2">
              Connect employees, departments and project teams.
            </p>
          </div>

          <button
            onClick={() => {
              setError("");
              setSuccess("");
              setShowNew(true);
            }}
            disabled={!organisationId || loading}
            className="rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 px-5 py-3 text-sm font-semibold transition"
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

        <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-5 min-h-[650px]">
          <section className="rounded-2xl border border-white/10 bg-[#0b0f1a] overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-semibold mb-3">Conversations</h3>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations..."
                className="w-full rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 text-sm outline-none focus:border-purple-500"
              />
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <p className="p-5 text-sm text-gray-500">
                  Loading conversations...
                </p>
              ) : filteredConversations.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-400">
                    No conversations found.
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    Start a direct message or create a group conversation.
                  </p>
                </div>
              ) : (
                filteredConversations.map((conversation) => {
                  const active = conversation.id === activeId;
                  const unread = unreadCounts[conversation.id] || 0;
                  const title =
                    conversation.title ||
                    (conversation.conversation_type === "direct"
                      ? "Direct conversation"
                      : "Group conversation");

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => {
                        setActiveId(conversation.id);
                        setReplyingTo(null);
                        setError("");
                        setSuccess("");
                      }}
                      className={`w-full text-left p-4 border-b border-white/5 transition ${
                        active
                          ? "bg-purple-500/10 border-l-2 border-l-purple-500"
                          : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {conversation.conversation_type === "direct"
                              ? "Direct message"
                              : "Group conversation"}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-[10px] text-gray-600">
                            {formatConversationTime(
                              conversation.last_message_at
                            )}
                          </p>
                          {unread > 0 && (
                            <span className="inline-flex mt-2 min-w-5 h-5 items-center justify-center rounded-full bg-purple-600 px-1.5 text-[10px] font-bold">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-gray-500 truncate">
                        {conversation.latestMessage?.message_body ||
                          "No messages yet"}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0b0f1a] overflow-hidden flex flex-col min-h-[650px]">
            {activeConversation ? (
              <>
                <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">
                      {activeConversation.title ||
                        (activeConversation.conversation_type === "direct"
                          ? "Direct conversation"
                          : "Group conversation")}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {activeConversation.conversation_type === "direct"
                        ? "Private conversation"
                        : "Group conversation"}
                    </p>
                  </div>

                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] text-gray-400">
                    {activeConversation.conversation_type === "direct"
                      ? "DIRECT"
                      : "GROUP"}
                  </span>
                </div>

                <div className="flex-1 min-h-[420px] max-h-[600px] overflow-y-auto p-4 md:p-6 space-y-4">
                  {loadingMessages ? (
                    <p className="text-sm text-gray-500 text-center py-10">
                      Loading messages...
                    </p>
                  ) : messages.filter(
                      (item) => item.conversation_id === activeConversation.id
                    ).length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-sm text-gray-400">
                        No messages yet.
                      </p>
                      <p className="text-xs text-gray-600 mt-2">
                        Send the first message to start the conversation.
                      </p>
                    </div>
                  ) : (
                    messages
                      .filter(
                        (item) =>
                          item.conversation_id === activeConversation.id
                      )
                      .map((item) => {
                        const mine =
                          item.sender_member_id === currentMemberId;
                        const repliedMessage = item.reply_to_message_id
                          ? messages.find(
                              (candidate) =>
                                candidate.id === item.reply_to_message_id
                            )
                          : null;

                        return (
                          <div
                            key={item.id}
                            className={`flex ${
                              mine ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 ${
                                mine
                                  ? "bg-purple-600 text-white rounded-br-md"
                                  : "bg-[#171e2d] text-gray-100 rounded-bl-md"
                              }`}
                            >
                              {!mine && (
                                <p className="text-[11px] font-semibold text-purple-300 mb-1">
                                  {getSenderName(item.sender_member_id)}
                                </p>
                              )}

                              {item.reply_to_message_id && (
                                <div className="mb-2 rounded-lg border-l-2 border-purple-300/70 bg-black/15 px-3 py-2">
                                  <p className="text-[10px] font-semibold text-purple-200">
                                    {repliedMessage
                                      ? getSenderName(
                                          repliedMessage.sender_member_id
                                        )
                                      : "Original message"}
                                  </p>
                                  <p className="mt-1 text-xs opacity-80 line-clamp-2">
                                    {repliedMessage
                                      ? repliedMessage.deleted_at
                                        ? "This message was deleted."
                                        : repliedMessage.message_body
                                      : "Original message unavailable"}
                                  </p>
                                </div>
                              )}

                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {item.deleted_at
                                  ? "This message was deleted."
                                  : item.message_body}
                              </p>

                              <div className="mt-2 flex items-center justify-between gap-4">
                                <p
                                  className={`text-[10px] ${
                                    mine ? "text-purple-200" : "text-gray-500"
                                  }`}
                                >
                                  {formatTime(item.created_at)}
                                  {item.edited_at ? " · edited" : ""}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingTo(item);
                                    const composer =
                                      document.querySelector<HTMLInputElement>(
                                        'input[placeholder="Write a message..."]'
                                      );
                                    composer?.focus();
                                  }}
                                  className={`text-[10px] font-semibold ${
                                    mine
                                      ? "text-purple-100 hover:text-white"
                                      : "text-purple-300 hover:text-purple-200"
                                  }`}
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-white/10">
                  {replyingTo && (
                    <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-purple-300">
                          Replying to{" "}
                          {getSenderName(replyingTo.sender_member_id)}
                        </p>
                        <p className="mt-1 truncate text-xs text-gray-300">
                          {replyingTo.deleted_at
                            ? "This message was deleted."
                            : replyingTo.message_body}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        aria-label="Cancel reply"
                        className="shrink-0 text-gray-400 hover:text-white"
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
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          void sendMessage();
                        }
                      }}
                      placeholder="Write a message..."
                      maxLength={5000}
                      disabled={sending || loadingMessages}
                      className="flex-1 min-w-0 rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 text-sm outline-none focus:border-purple-500 disabled:opacity-50"
                    />

                    <button
                      onClick={() => void sendMessage()}
                      disabled={!message.trim() || sending}
                      className="rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 px-5 py-3 text-sm font-semibold"
                    >
                      {sending ? "Sending..." : "Send"}
                    </button>
                  </div>

                  <p className="text-[10px] text-gray-600 mt-2">
                    Press Enter to send your message.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-8 text-center">
                {loading
                  ? "Loading your workspace..."
                  : "Select a conversation or create a new one to get started."}
              </div>
            )}
          </section>
        </div>

        {showNew && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#101522] p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">New Conversation</h3>
                <button
                  onClick={() => setShowNew(false)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>

              <label className="text-sm text-gray-400">
                Conversation type
              </label>

              <select
                value={newType}
                onChange={(event) => {
                  setNewType(event.target.value as "direct" | "group");
                  setSelectedUsers([]);
                  setError("");
                }}
                className="w-full mt-2 mb-5 rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 text-sm outline-none focus:border-purple-500"
              >
                <option value="group">Group conversation</option>
                <option value="direct">Direct message</option>
              </select>

              {newType === "group" && (
                <>
                  <label className="text-sm text-gray-400">
                    Group name
                  </label>
                  <input
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="e.g. Human Resources Team"
                    className="w-full mt-2 mb-5 rounded-xl border border-white/10 bg-[#080b14] px-4 py-3 text-sm outline-none focus:border-purple-500"
                  />
                </>
              )}

              <div className="flex items-center justify-between mb-3">
                <label className="text-sm text-gray-400">
                  Select participants
                </label>
                <span className="text-xs text-gray-500">
                  {selectedUsers.length} selected
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/5">
                {members
                  .filter((member) => member.user_id !== currentUserId)
                  .map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/[0.04]"
                    >
                      <input
                        type={newType === "direct" ? "radio" : "checkbox"}
                        name="chat-participant"
                        checked={selectedUsers.includes(member.user_id)}
                        onChange={() => toggleSelectedUser(member.user_id)}
                        className="accent-purple-500"
                      />

                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-sm font-semibold text-purple-200">
                        {getProfileAvatar(profiles[member.user_id]) ? (
                          <img
                            src={getProfileAvatar(profiles[member.user_id])}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          memberLabel(member, profiles)
                            .slice(0, 1)
                            .toUpperCase()
                        )}
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate text-sm text-gray-200">
                          {memberLabel(member, profiles)}
                        </span>
                        <span className="block truncate text-xs text-gray-500">
                          {getProfileJobTitle(profiles[member.user_id]) ||
                            member.role.replaceAll("_", " ")}
                        </span>
                      </span>
                    </label>
                  ))}

                {members.filter(
                  (member) => member.user_id !== currentUserId
                ).length === 0 && (
                  <p className="p-4 text-sm text-gray-500">
                    No other active organisation members are available.
                  </p>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-3">
                You will automatically be included in the conversation.
              </p>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNew(false)}
                  className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm"
                >
                  Cancel
                </button>

                <button
                  onClick={() => void createConversation()}
                  disabled={creating || selectedUsers.length === 0}
                  className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 px-4 py-3 text-sm font-semibold"
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
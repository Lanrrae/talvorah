import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

async function getAuthenticatedMember(
  supabase: ReturnType<typeof createClient>,
  organisationId: string
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, membership: null };
  }

  const { data: membership } = await supabase
    .from("organisation_members")
    .select("id")
    .eq("organisation_id", organisationId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  return { user, membership };
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const organisationId =
      request.nextUrl.searchParams.get("organisationId");
    const conversationId =
      request.nextUrl.searchParams.get("conversationId");

    if (!organisationId) {
      return NextResponse.json(
        { error: "An organisation must be selected." },
        { status: 400 }
      );
    }

    const { user, membership } = await getAuthenticatedMember(
      supabase,
      organisationId
    );

    if (!user || !membership) {
      return NextResponse.json(
        { error: "You are not an active member of this organisation." },
        { status: 403 }
      );
    }

    // Load messages for one conversation.
    if (conversationId) {
      const { data: participant } = await supabase
        .from("chat_participants")
        .select("id")
        .eq("organisation_id", organisationId)
        .eq("conversation_id", conversationId)
        .eq("member_id", membership.id)
        .maybeSingle();

      if (!participant) {
        return NextResponse.json(
          { error: "You do not have access to this conversation." },
          { status: 403 }
        );
      }

      const { data: messages, error } = await supabase
        .from("chat_messages")
        .select(
          "id, conversation_id, sender_member_id, reply_to_message_id, message_body, message_type, created_at, edited_at, deleted_at"
        )
        .eq("organisation_id", organisationId)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return NextResponse.json({ messages: messages || [] });
    }

    // Load the current member's conversations.
    const { data: participations, error: participationError } =
      await supabase
        .from("chat_participants")
        .select("conversation_id, last_read_at")
        .eq("organisation_id", organisationId)
        .eq("member_id", membership.id);

    if (participationError) throw participationError;

    const conversationIds = (participations || []).map(
      (item) => item.conversation_id
    );

    if (!conversationIds.length) {
      return NextResponse.json({ conversations: [] });
    }

    const { data: conversations, error: conversationsError } =
      await supabase
        .from("chat_conversations")
        .select("*")
        .eq("organisation_id", organisationId)
        .in("id", conversationIds)
        .order("last_message_at", {
          ascending: false,
          nullsFirst: false,
        });

    if (conversationsError) throw conversationsError;

    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select(
        "id, conversation_id, sender_member_id, reply_to_message_id, message_body, message_type, created_at"
      )
      .eq("organisation_id", organisationId)
      .in("conversation_id", conversationIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (messagesError) throw messagesError;

    const latestMessages = new Map<
      string,
      (typeof messages)[number]
    >();

    for (const item of messages || []) {
      if (!latestMessages.has(item.conversation_id)) {
        latestMessages.set(item.conversation_id, item);
      }
    }

    const result = (conversations || []).map((conversation) => ({
      ...conversation,
      latestMessage: latestMessages.get(conversation.id) || null,
    }));

    return NextResponse.json({ conversations: result });
  } catch (error) {
    console.error("Talvorah Chat GET error:", error);
    return NextResponse.json(
      { error: "Unable to load chat data." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const body = await request.json();

    const organisationId = body.organisationId as string;
    const action = body.action as string;

    if (!organisationId) {
      return NextResponse.json(
        { error: "An organisation must be selected." },
        { status: 400 }
      );
    }

    const { user, membership } = await getAuthenticatedMember(
      supabase,
      organisationId
    );

    if (!user || !membership) {
      return NextResponse.json(
        { error: "You are not an active member of this organisation." },
        { status: 403 }
      );
    }

    // SEND MESSAGE
    if (action === "send_message") {
      const conversationId = body.conversationId as string;
      const messageBody =
        typeof body.message === "string" ? body.message.trim() : "";

      const replyToMessageId =
        typeof body.replyToMessageId === "string"
          ? body.replyToMessageId
          : null;

      if (!conversationId || !messageBody) {
        return NextResponse.json(
          { error: "A conversation and message are required." },
          { status: 400 }
        );
      }

      if (messageBody.length > 5000) {
        return NextResponse.json(
          { error: "Messages cannot exceed 5,000 characters." },
          { status: 400 }
        );
      }

      const { data: participant } = await supabase
        .from("chat_participants")
        .select("id")
        .eq("organisation_id", organisationId)
        .eq("conversation_id", conversationId)
        .eq("member_id", membership.id)
        .maybeSingle();

      if (!participant) {
        return NextResponse.json(
          { error: "You are not a participant in this conversation." },
          { status: 403 }
        );
      }

      // Verify that the message being replied to belongs
      // to this same organisation and conversation.
      if (replyToMessageId) {
        const { data: originalMessage, error: replyError } =
          await supabase
            .from("chat_messages")
            .select("id")
            .eq("id", replyToMessageId)
            .eq("organisation_id", organisationId)
            .eq("conversation_id", conversationId)
            .is("deleted_at", null)
            .maybeSingle();

        if (replyError || !originalMessage) {
          return NextResponse.json(
            { error: "The message you are replying to could not be found." },
            { status: 404 }
          );
        }
      }

      const { data: message, error } = await supabase
        .from("chat_messages")
        .insert({
          organisation_id: organisationId,
          conversation_id: conversationId,
          sender_member_id: membership.id,
          message_body: messageBody,
          message_type: "text",
          reply_to_message_id: replyToMessageId,
        })
        .select()
        .single();

      if (error) throw error;

      // Update the conversation's latest activity timestamp.
      const { error: updateError } = await supabase
        .from("chat_conversations")
        .update({
          last_message_at: message.created_at,
          updated_at: message.created_at,
        })
        .eq("id", conversationId)
        .eq("organisation_id", organisationId);

      if (updateError) {
        console.error("Chat timestamp update error:", updateError);
      }

      return NextResponse.json({ success: true, message });
    }

    // CREATE CONVERSATION
    if (action === "create_conversation") {
      const type = body.type as "direct" | "group";
      const title =
        typeof body.title === "string" ? body.title.trim() : null;

      const requestedUserIds = Array.isArray(body.participantUserIds)
        ? body.participantUserIds.filter(
            (id: unknown): id is string =>
              typeof id === "string" && id.length > 0
          )
        : [];

      const userIds = [...new Set([user.id, ...requestedUserIds])];

      if (type !== "direct" && type !== "group") {
        return NextResponse.json(
          { error: "Invalid conversation type." },
          { status: 400 }
        );
      }

      if (type === "direct" && userIds.length !== 2) {
        return NextResponse.json(
          { error: "A direct conversation needs two participants." },
          { status: 400 }
        );
      }

      if (type === "group" && (userIds.length < 2 || !title)) {
        return NextResponse.json(
          {
            error:
              "A group needs a name and at least one other participant.",
          },
          { status: 400 }
        );
      }

      if (userIds.length > 50) {
        return NextResponse.json(
          { error: "A conversation cannot exceed 50 participants." },
          { status: 400 }
        );
      }

      const { data: members, error: membersError } = await supabase
        .from("organisation_members")
        .select("id, user_id")
        .eq("organisation_id", organisationId)
        .eq("status", "active")
        .in("user_id", userIds);

      if (membersError) throw membersError;

      if (!members || members.length !== userIds.length) {
        return NextResponse.json(
          {
            error:
              "One or more participants are not active organisation members.",
          },
          { status: 400 }
        );
      }

      const { data: conversation, error: conversationError } =
        await supabase
          .from("chat_conversations")
          .insert({
            organisation_id: organisationId,
            conversation_type: type,
            title: type === "group" ? title : null,
            created_by_member_id: membership.id,
          })
          .select()
          .single();

      if (conversationError) throw conversationError;

      const participantRows = members.map((member) => ({
        organisation_id: organisationId,
        conversation_id: conversation.id,
        member_id: member.id,
        added_by_member_id: membership.id,
        participant_role:
          member.id === membership.id ? "owner" : "member",
      }));

      const { error: participantsError } = await supabase
        .from("chat_participants")
        .insert(participantRows);

      if (participantsError) {
        console.error(
          "Chat participant creation error:",
          participantsError
        );

        return NextResponse.json(
          {
            error:
              "The conversation was created, but participants could not be added.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        conversationId: conversation.id,
      });
    }

    return NextResponse.json(
      { error: "Invalid chat action." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Talvorah Chat POST error:", error);
    return NextResponse.json(
      { error: "Unable to complete the chat request." },
      { status: 500 }
    );
  }
}
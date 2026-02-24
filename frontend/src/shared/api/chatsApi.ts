import type { ApiEndpointBuilder } from './apiBuilderType';

export interface ConversationItem {
  id: string;
  otherUser: { id: string; nickname: string | null; avatarPath: string | null };
  lastMessage: { content: string; senderId: string; createdAt: string } | null;
  /** When present and > 0, show unread badge in chat list */
  unreadCount?: number;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export function getChatsEndpoints(builder: ApiEndpointBuilder) {
  return {
    getConversations: builder.query<ConversationItem[], void>({
      query: () => '/chats/conversations',
      providesTags: ['Conversations'],
    }),
    getOrCreateConversation: builder.mutation<
      { id: string; participant1Id: string; participant2Id: string },
      string
    >({
      query: (userId) => ({ url: `/chats/conversations/with/${userId}`, method: 'POST' }),
      invalidatesTags: ['Conversations'],
    }),
    getMessages: builder.query<
      { messages: MessageItem[]; hasMore: boolean },
      { conversationId: string; limit?: number; before?: string }
    >({
      query: ({ conversationId, limit = 30, before }) => {
        const params = new URLSearchParams();
        params.set('limit', String(limit ?? 30));
        if (before) params.set('before', before);
        return { url: `/chats/conversations/${conversationId}/messages?${params}` };
      },
      providesTags: (_result, _err, { conversationId }) => [{ type: 'Messages', id: conversationId }],
    }),
    sendMessage: builder.mutation<MessageItem, { conversationId: string; content: string }>({
      query: ({ conversationId, content }) => ({
        url: `/chats/conversations/${conversationId}/messages`,
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: (_result, _err, { conversationId }) => [
        'Conversations',
        { type: 'Messages', id: conversationId },
      ],
    }),
  };
}

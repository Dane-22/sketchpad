export interface ChatUser {
  id: string;
  fullName: string;
  email: string;
  role: 'ENGINEER' | 'ARCHITECT' | 'ADMIN';
}

export interface GroupMember {
  id: string;
  channelId: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user?: ChatUser;
}

export interface ChatAttachment {
  type: 'canvas-location' | 'comment-pin';
  x?: number;
  y?: number;
  commentId?: string;
  label?: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  userId?: string | null;
  user?: ChatUser | null;
  isAi: boolean;
  content: string;
  attachments?: ChatAttachment[] | null;
  createdAt: string;
}

export interface ChatChannel {
  id: string;
  projectId: string;
  name: string;
  topic?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  members: GroupMember[];
  messages?: ChatMessage[];
  unreadCount?: number;
}

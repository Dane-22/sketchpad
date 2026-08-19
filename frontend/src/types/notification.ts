export type NotificationType =
  | 'AI_ANALYSIS_COMPLETE'
  | 'AI_COPILOT_REPLY'
  | 'AI_PROACTIVE_CAD_ALERT'
  | 'CHAT_MESSAGE'
  | 'CHAT_MENTION'
  | 'CHAT_CANVAS_LOCATION'
  | 'CHAT_GROUP_INVITE'
  | 'COMMENT_PIN_ADDED'
  | 'COMMENT_REPLY_ADDED';

export interface NotificationData {
  channelId?: string;
  channelName?: string;
  messageId?: string;
  senderName?: string;
  x?: number;
  y?: number;
  commentId?: string;
  prompt?: string;
  summary?: string;
  url?: string;
  [key: string]: any;
}

export interface NotificationItem {
  id: string;
  userId: string;
  projectId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data?: NotificationData | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreference {
  id?: string;
  userId?: string;
  chatPushEnabled: boolean;
  aiPushEnabled: boolean;
  commentPushEnabled: boolean;
  soundEnabled: boolean;
  mentionsOnly: boolean;
}

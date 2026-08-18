export interface UserBrief {
  id: string;
  fullName: string;
  email: string;
  role?: string;
}

export interface CommentReply {
  id: string;
  commentId: string;
  userId: string;
  user: UserBrief;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CanvasComment {
  id: string;
  projectId: string;
  userId: string;
  user: UserBrief;
  x: number;
  y: number;
  content: string;
  isResolved: boolean;
  createdAt: string;
  updatedAt?: string;
  replies: CommentReply[];
}

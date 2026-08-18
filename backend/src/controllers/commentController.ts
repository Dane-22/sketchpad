import { Request, Response } from 'express';
import { prisma } from '../config/db';

export const commentController = {
  // Get all comments for a project
  getComments: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const comments = await (prisma as any).comment.findMany({
        where: { projectId },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true }
          },
          replies: {
            include: {
              user: {
                select: { id: true, fullName: true, email: true, role: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      return res.json(comments);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch comments' });
    }
  },

  // Create a new comment pin
  createComment: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { x, y, content } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (x === undefined || y === undefined || !content) {
        return res.status(400).json({ error: 'Missing coordinates or comment content' });
      }

      const comment = await (prisma as any).comment.create({
        data: {
          projectId,
          userId,
          x: parseFloat(x),
          y: parseFloat(y),
          content,
          isResolved: false
        },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true }
          },
          replies: {
            include: {
              user: {
                select: { id: true, fullName: true, email: true, role: true }
              }
            }
          }
        }
      });

      return res.status(201).json(comment);
    } catch (error: any) {
      console.error('Error creating comment:', error);
      return res.status(500).json({ error: error.message || 'Failed to create comment' });
    }
  },

  // Add a reply to a comment thread
  addReply: async (req: Request, res: Response) => {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!content) {
        return res.status(400).json({ error: 'Reply content cannot be empty' });
      }

      const reply = await (prisma as any).commentReply.create({
        data: {
          commentId,
          userId,
          content
        },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true }
          }
        }
      });

      return res.status(201).json(reply);
    } catch (error: any) {
      console.error('Error adding reply:', error);
      return res.status(500).json({ error: error.message || 'Failed to add reply' });
    }
  },

  // Toggle or set resolved state
  toggleResolve: async (req: Request, res: Response) => {
    try {
      const { commentId } = req.params;
      const { isResolved } = req.body;

      const existing = await (prisma as any).comment.findUnique({
        where: { id: commentId }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      const resolvedState = typeof isResolved === 'boolean' ? isResolved : !existing.isResolved;

      const updated = await (prisma as any).comment.update({
        where: { id: commentId },
        data: { isResolved: resolvedState },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true }
          },
          replies: {
            include: {
              user: {
                select: { id: true, fullName: true, email: true, role: true }
              }
            }
          }
        }
      });

      return res.json(updated);
    } catch (error: any) {
      console.error('Error toggling resolve:', error);
      return res.status(500).json({ error: error.message || 'Failed to update resolve state' });
    }
  },

  // Delete a comment (safely cleans up replies first)
  deleteComment: async (req: Request, res: Response) => {
    try {
      const { commentId } = req.params;

      // Delete any replies first to avoid FK constraint issues
      try {
        await (prisma as any).commentReply.deleteMany({
          where: { commentId }
        });
      } catch (replyErr) {
        console.warn('Note on deleting replies:', replyErr);
      }

      // Delete the comment using deleteMany to prevent unhandled exception if already removed
      await (prisma as any).comment.deleteMany({
        where: { id: commentId }
      });

      return res.json({ message: 'Comment deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      return res.status(500).json({ error: error.message || 'Failed to delete comment' });
    }
  }
};

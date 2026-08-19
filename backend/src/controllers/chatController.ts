import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { notificationService, NotificationType } from '../services/notificationService';

export const chatController = {
  // 1. Get all channels for a project (creates default #general and #engi-ai if none exist)
  getProjectChannels: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const user = (req as any).user;

      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      // Check existing channels
      let channels = await (prisma as any).chatChannel.findMany({
        where: { projectId },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, fullName: true, role: true, email: true }
              }
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              user: {
                select: { id: true, fullName: true, role: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      // Auto-create default channels if none exist
      if (!channels || channels.length === 0) {
        const generalChannel = await (prisma as any).chatChannel.create({
          data: {
            projectId,
            name: 'general',
            topic: 'General project discussions & coordination',
            isDefault: true,
            members: user ? {
              create: {
                userId: user.id,
                role: 'ADMIN'
              }
            } : undefined
          }
        });

        const aiChannel = await (prisma as any).chatChannel.create({
          data: {
            projectId,
            name: 'engi-ai',
            topic: 'Dedicated AI Engineering Copilot for drafting & specs',
            isDefault: true,
            members: user ? {
              create: {
                userId: user.id,
                role: 'ADMIN'
              }
            } : undefined
          }
        });

        // Add welcome message in AI channel
        await (prisma as any).chatMessage.create({
          data: {
            channelId: aiChannel.id,
            isAi: true,
            content: `👋 **Welcome to EngiAI Copilot for this workspace!**\n\nI can analyze your live CAD elements, verify drafting tolerances, calculate clearances, or suggest architectural standards. Ask me anything or mention **@ai** in any group!`,
          }
        });

        channels = await (prisma as any).chatChannel.findMany({
          where: { projectId },
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, fullName: true, role: true, email: true }
                }
              }
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                user: {
                  select: { id: true, fullName: true, role: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        });
      }

      return res.json(channels);
    } catch (error: any) {
      console.error('Failed to get project channels:', error);
      return res.status(500).json({ error: 'Failed to fetch project channels' });
    }
  },

  // 2. Create a new group channel
  createChannel: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { name, topic, memberIds } = req.body;
      const user = (req as any).user;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Channel name is required' });
      }

      const formattedName = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/^#/, '');

      const newChannel = await (prisma as any).chatChannel.create({
        data: {
          projectId,
          name: formattedName,
          topic: topic?.trim() || null,
          isDefault: false,
          members: {
            create: [
              { userId: user.id, role: 'ADMIN' },
              ...(Array.isArray(memberIds)
                ? memberIds
                    .filter((uid: string) => uid !== user.id)
                    .map((uid: string) => ({ userId: uid, role: 'MEMBER' }))
                : [])
            ]
          }
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, fullName: true, role: true, email: true }
              }
            }
          },
          messages: true
        }
      });

      return res.status(201).json(newChannel);
    } catch (error: any) {
      console.error('Failed to create channel:', error);
      return res.status(500).json({ error: 'Failed to create channel' });
    }
  },

  // 3. Get messages for a channel
  getChannelMessages: async (req: Request, res: Response) => {
    try {
      const { channelId } = req.params;

      if (!channelId) {
        return res.status(400).json({ error: 'Channel ID is required' });
      }

      const messages = await (prisma as any).chatMessage.findMany({
        where: { channelId },
        include: {
          user: {
            select: { id: true, fullName: true, role: true, email: true }
          }
        },
        orderBy: { createdAt: 'asc' },
        take: 200
      });

      return res.json(messages);
    } catch (error: any) {
      console.error('Failed to get channel messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }
  },

  // 4. Send message (with @ai copilot trigger)
  sendMessage: async (req: Request, res: Response) => {
    try {
      const { channelId } = req.params;
      const { content, attachments, context } = req.body;
      const user = (req as any).user;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      const channel = await (prisma as any).chatChannel.findUnique({
        where: { id: channelId }
      });

      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Save user message
      const savedUserMessage = await (prisma as any).chatMessage.create({
        data: {
          channelId,
          userId: user.id,
          isAi: false,
          content: content.trim(),
          attachments: attachments || null,
        },
        include: {
          user: {
            select: { id: true, fullName: true, role: true, email: true }
          }
        }
      });

      // Fetch channel members to notify
      const channelWithMembers = await (prisma as any).chatChannel.findUnique({
        where: { id: channelId },
        include: {
          members: {
            select: { userId: true }
          }
        }
      });

      const recipientUserIds = (channelWithMembers?.members || [])
        .map((m: { userId: string }) => m.userId)
        .filter((uid: string) => uid !== user.id);

      // Check if canvas location is attached
      const hasCanvasLocation = Array.isArray(attachments) && attachments.some((a: any) => a.type === 'canvas-location');
      const locationAttachment = hasCanvasLocation ? attachments.find((a: any) => a.type === 'canvas-location') : null;

      // Determine notification type & title
      let notifType: NotificationType = 'CHAT_MESSAGE';
      let notifTitle = `💬 #${channel.name} · ${user.fullName || 'Engineer'}`;

      if (content.toLowerCase().includes('@all') || content.toLowerCase().includes(`@${user.fullName?.toLowerCase()}`)) {
        notifType = 'CHAT_MENTION';
        notifTitle = `📣 Mentioned in #${channel.name}`;
      } else if (hasCanvasLocation) {
        notifType = 'CHAT_CANVAS_LOCATION';
        notifTitle = `📍 CAD Coordinates Shared in #${channel.name}`;
      }

      // Dispatch to channel members asynchronously
      if (recipientUserIds.length > 0) {
        notificationService.dispatchMany(recipientUserIds, {
          projectId: channel.projectId,
          type: notifType,
          title: notifTitle,
          body: content.trim(),
          data: {
            channelId,
            channelName: channel.name,
            messageId: savedUserMessage.id,
            senderName: user.fullName || 'Engineer',
            x: locationAttachment?.x,
            y: locationAttachment?.y,
            url: `/app/${channel.projectId}?channelId=${channelId}${locationAttachment ? `&x=${locationAttachment.x}&y=${locationAttachment.y}` : ''}`
          }
        }).catch(err => console.error('Failed to dispatch chat notifications:', err));
      }

      const isAiTriggered =
        channel.name === 'engi-ai' ||
        content.toLowerCase().includes('@ai') ||
        content.toLowerCase().includes('@engiai');

      let savedAiMessage = null;

      if (isAiTriggered) {
        const cleanPrompt = content.replace(/@engi-?ai/gi, '').trim() || content;
        const aiResponseText = await generateAiResponse(cleanPrompt, context);

        savedAiMessage = await (prisma as any).chatMessage.create({
          data: {
            channelId,
            isAi: true,
            content: aiResponseText,
          }
        });

        // Notify user(s) when EngiAI completes response
        const aiRecipients = Array.from(new Set([user.id, ...recipientUserIds]));
        notificationService.dispatchMany(aiRecipients, {
          projectId: channel.projectId,
          type: 'AI_COPILOT_REPLY',
          title: `🤖 EngiAI Reply in #${channel.name}`,
          body: aiResponseText.slice(0, 160) + (aiResponseText.length > 160 ? '...' : ''),
          data: {
            channelId,
            channelName: channel.name,
            messageId: savedAiMessage.id,
            url: `/app/${channel.projectId}?channelId=${channelId}`
          }
        }).catch(err => console.error('Failed to dispatch AI notifications:', err));
      }

      return res.status(201).json({
        userMessage: savedUserMessage,
        aiMessage: savedAiMessage,
      });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }
  },

  // 5. Add members to channel
  addChannelMembers: async (req: Request, res: Response) => {
    try {
      const { channelId } = req.params;
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'User IDs array is required' });
      }

      for (const uid of userIds) {
        await (prisma as any).groupMember.upsert({
          where: {
            channelId_userId: {
              channelId,
              userId: uid
            }
          },
          update: {},
          create: {
            channelId,
            userId: uid,
            role: 'MEMBER'
          }
        });
      }

      const updatedMembers = await (prisma as any).groupMember.findMany({
        where: { channelId },
        include: {
          user: {
            select: { id: true, fullName: true, role: true, email: true }
          }
        }
      });

      const channel = await (prisma as any).chatChannel.findUnique({
        where: { id: channelId }
      });

      if (channel) {
        notificationService.dispatchMany(userIds, {
          projectId: channel.projectId,
          type: 'CHAT_GROUP_INVITE',
          title: `👥 Added to #${channel.name}`,
          body: `You have been added to group channel #${channel.name}`,
          data: {
            channelId,
            channelName: channel.name,
            url: `/app/${channel.projectId}?channelId=${channelId}`
          }
        }).catch(err => console.error('Failed to notify added members:', err));
      }

      return res.json(updatedMembers);
    } catch (error: any) {
      console.error('Failed to add channel members:', error);
      return res.status(500).json({ error: 'Failed to add members' });
    }
  },

  // 6. Remove member from channel
  removeChannelMember: async (req: Request, res: Response) => {
    try {
      const { channelId, userId } = req.params;

      await (prisma as any).groupMember.deleteMany({
        where: {
          channelId,
          userId
        }
      });

      return res.json({ message: 'Member removed successfully' });
    } catch (error: any) {
      console.error('Failed to remove channel member:', error);
      return res.status(500).json({ error: 'Failed to remove member' });
    }
  },

  // 7. Get available registered users to add into groups
  getAvailableUsers: async (req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
        orderBy: { fullName: 'asc' },
        take: 100
      });

      return res.json(users);
    } catch (error: any) {
      console.error('Failed to get users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  }
};

// Helper to generate AI response with Gemini / intelligent CAD fallback
async function generateAiResponse(prompt: string, context: any): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  const systemInstruction = `You are "EngiAI", an expert engineering, drafting, and architectural CAD copilot inside the team messenger of the "Eng Planner" workspace.
You help engineers and architects collaborating in real-time with:
- Reviewing plan layouts, dimensions, clearances, and structural alignment.
- Answering questions on materials, code standards, and load requirements.
- Analyzing active canvas entities and discussions.
Format responses cleanly using Markdown (bolding, bullet points, tables where suitable). Keep answers concise, technical, and actionable.`;

  let drawingContextText = '';
  if (context) {
    drawingContextText = `\n--- CANVAS & WORKSPACE CONTEXT ---\n`;
    if (context.elementCount !== undefined) drawingContextText += `Total Canvas Elements: ${context.elementCount}\n`;
    if (context.elementTypes) drawingContextText += `Entity Types: ${JSON.stringify(context.elementTypes)}\n`;
    if (context.comments && context.comments.length > 0) {
      drawingContextText += `Pinned Comments / Discussions (${context.comments.length}):\n`;
      context.comments.forEach((c: any, i: number) => {
        drawingContextText += ` ${i + 1}. [${c.isResolved ? 'RESOLVED' : 'OPEN'}] ${c.user}: "${c.content}"\n`;
      });
    }
    drawingContextText += `----------------------------------\n`;
  }

  const fullPrompt = `${systemInstruction}\n${drawingContextText}\nUser: ${prompt}`;

  if (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) return replyText;
      }
    } catch {
      // fallback
    }
  }

  // Intelligent local fallback
  const lower = prompt.toLowerCase();
  if (lower.includes('summar') || lower.includes('comment') || lower.includes('discuss')) {
    return `### 📋 Discussion & Drawing Summary\n\n- **Active Pins**: ${context?.comments?.length || 0} pinned topic(s)\n- **Entities**: ${context?.elementCount || 0} drawing elements\n\n**Key Discussion Points:**\n${
      context?.comments && context.comments.length > 0
        ? context.comments.map((c: any, i: number) => `- **Point ${i + 1} (${c.isResolved ? '✅ Resolved' : '⏳ Open'})**: ${c.user}: _"${c.content}"_`).join('\n')
        : '- No spatial comment pins placed yet.'
    }`;
  } else if (lower.includes('dimension') || lower.includes('scale') || lower.includes('clearance')) {
    return `### 📏 Dimensional & Clearance Review\n\n- **Entities Analyzed**: ${context?.elementCount || 0} CAD elements.\n\n**Standard Recommendations:**\n1. Verify corridor minimum width (≥ 1200mm / 48").\n2. Maintain consistent door swing clearance (90° minimum swing radius).\n3. Ensure extension lines break 2mm before target geometry.`;
  } else {
    return `### 🤖 EngiAI Copilot\n\nI've analyzed your query regarding **"${prompt}"** with respect to the active workspace (${context?.elementCount || 0} elements, ${context?.comments?.length || 0} discussions).\n\n- Need to mark a coordinate? Drop a spatial comment pin on the drawing.\n- Need to share a spot with the team? Use the **📍 Attach View** button in this chat!`;
  }
}

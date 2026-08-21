import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  MessageSquare,
  Hash,
  Bot,
  Plus,
  Send,
  X,
  Minimize2,
  Maximize2,
  MapPin,
  Loader2,
  Cpu,
  UserPlus,
  Paperclip,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  File as FileIcon,
  Download,
  Import
} from 'lucide-react';
import { processParsedDXF } from '../../features/planner/utils/importCAD';
import { convertPdfToImages, uploadCanvasAssetToServer } from '../../features/planner/utils/pdfConverter';
import { generateCadDocumentPreview } from '../../features/planner/utils/cadDocumentPreview';
import { useProjectMessenger } from '../../features/planner/hooks/useProjectMessenger';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';
import { CanvasComment } from '../../types/comment';
import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { CreateGroupModal } from '../modals/CreateGroupModal';
import { AddMembersModal } from '../modals/AddMembersModal';
import { ChatAttachment } from '../../types/chat';

interface ProjectMessengerWidgetProps {
  projectId: string;
  comments: CanvasComment[];
  onJumpToCanvas?: (x: number, y: number) => void;
  targetChannelId?: string | null;
}

export const ProjectMessengerWidget: React.FC<ProjectMessengerWidgetProps> = ({
  projectId,
  comments,
  onJumpToCanvas,
  targetChannelId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isChannelsExpanded, setIsChannelsExpanded] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [input, setInput] = useState('');

  const currentUser = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const { 
    elements, 
    stagePos, 
    stageScale, 
    unitMode,
    setElements,
    addElement,
    activeLayerId,
    stageWidth,
    stageHeight
  } = useCanvasState();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    channels,
    activeChannelId,
    activeChannel,
    messages,
    isLoadingMessages,
    isSending,
    unreadMap,
    totalUnreadCount,
    setActiveChannelId,
    sendMessage,
    createChannel,
    addMembersToChannel,
  } = useProjectMessenger(projectId);

  // Sync external targetChannelId from notification clicks
  useEffect(() => {
    if (targetChannelId) {
      setActiveChannelId(targetChannelId);
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [targetChannelId, setActiveChannelId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  // Context passed when invoking AI assistant in messages
  const getCanvasContext = () => {
    const typeCount: Record<string, number> = {};
    elements.forEach((el) => {
      typeCount[el.type] = (typeCount[el.type] || 0) + 1;
    });

    const commentSummaries = comments.map((c) => ({
      user: c.user?.fullName || 'User',
      content: c.content,
      isResolved: c.isResolved,
    }));

    return {
      elementCount: elements.length,
      elementTypes: typeCount,
      unitMode,
      comments: commentSummaries,
    };
  };

  const handleSend = async (e?: React.FormEvent, customContent?: string, customAttachments?: ChatAttachment[]) => {
    if (e) e.preventDefault();
    const text = customContent !== undefined ? customContent : input;
    if (!text.trim() || isSending) return;

    const context = getCanvasContext();
    await sendMessage(text, customAttachments, context);
    if (customContent === undefined) {
      setInput('');
    }
  };

  const handleAttachCurrentView = () => {
    // Calculate world center
    const centerX = Math.round((-stagePos.x + window.innerWidth / 2) / stageScale);
    const centerY = Math.round((-stagePos.y + window.innerHeight / 2) / stageScale);

    const attachment: ChatAttachment = {
      type: 'canvas-location',
      x: centerX,
      y: centerY,
      label: `Canvas Coords (X: ${centerX}, Y: ${centerY})`,
    };

    const attachText = input.trim()
      ? `${input.trim()} [📍 View Coordinates X:${centerX}, Y:${centerY}]`
      : `📍 Shared view coordinates (X: ${centerX}, Y: ${centerY})`;

    handleSend(undefined, attachText, [attachment]);
  };

  const handleAddAiMention = () => {
    if (!input.includes('@ai')) {
      setInput((prev) => (prev ? `@ai ${prev}` : '@ai '));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post('/api/v1/uploads/canvas-asset', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      const { url, originalName } = res.data;
      
      const attachment: ChatAttachment = {
        type: file.type.startsWith('image/') ? 'image' : 'file',
        fileUrl: url,
        fileName: originalName,
        label: originalName
      };

      const text = input.trim() ? input : `Shared a file: ${originalName}`;
      await sendMessage(text, [attachment], getCanvasContext());
      setInput('');
    } catch (err) {
      console.error('File upload failed', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImportToCanvas = async (fileUrl: string, fileName?: string, type?: string) => {
    if (!fileUrl) return;
    try {
      setIsUploading(true);
      
      if (type === 'image' || fileName?.match(/\.(png|jpg|jpeg|webp|svg)$/i)) {
        // Handle images natively
        return new Promise<void>((resolve, reject) => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const origWidth = img.width;
            const origHeight = img.height;
            
            let scaleFit = 1;
            const maxW = Math.max(stageWidth * 0.8, 800);
            const maxH = Math.max(stageHeight * 0.8, 600);
            scaleFit = Math.min(maxW / origWidth, maxH / origHeight, 1.5);
            const targetWidth = origWidth * scaleFit;
            const targetHeight = origHeight * scaleFit;
            
            const viewCenterX = (-stagePos.x + stageWidth / 2) / stageScale;
            const viewCenterY = (-stagePos.y + stageHeight / 2) / stageScale;
            const posX = viewCenterX - targetWidth / 2;
            const posY = viewCenterY - targetHeight / 2;

            const newElement: any = {
              id: Date.now().toString(),
              type: 'image',
              name: fileName || 'Imported Image',
              x: posX,
              y: posY,
              width: origWidth,
              height: origHeight,
              src: fileUrl,
              opacity: 1,
              locked: false,
              layerId: activeLayerId,
              scaleX: scaleFit,
              scaleY: scaleFit
            };

            addElement(newElement, true, false);
            if (onJumpToCanvas) {
              onJumpToCanvas(viewCenterX, viewCenterY);
            }
            setIsUploading(false);
            resolve();
          };
          img.onerror = (err) => {
            console.error('Failed to load image for canvas:', err);
            setIsUploading(false);
            alert('Failed to load image.');
            reject(err);
          };
          img.src = fileUrl;
        });
      }

      // Fetch the file from the URL to get a Blob for CAD/PDF conversion
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const file = new window.File([blob], fileName || 'imported-file', { type: blob.type });
      const ext = fileName?.split('.').pop()?.toLowerCase() || '';

      if (ext === 'pdf') {
        const pages = await convertPdfToImages(file, 2.0); // Reduced scale for lower latency
        if (pages.length > 0) {
          const page = pages[0]; // Import the first page
          let finalSrc = page.dataUrl;
          try {
            finalSrc = await uploadCanvasAssetToServer(page.blob, `${fileName}-p1.webp`);
          } catch (e) {
            console.warn('Could not upload PDF preview, using data URL');
          }
          
          let scaleFit = 1;
          const maxW = Math.max(stageWidth * 0.8, 800);
          const maxH = Math.max(stageHeight * 0.8, 600);
          scaleFit = Math.min(maxW / page.width, maxH / page.height, 1.5);
          const targetWidth = page.width * scaleFit;
          const targetHeight = page.height * scaleFit;
          
          const viewCenterX = (-stagePos.x + stageWidth / 2) / stageScale;
          const viewCenterY = (-stagePos.y + stageHeight / 2) / stageScale;
          const posX = viewCenterX - targetWidth / 2;
          const posY = viewCenterY - targetHeight / 2;

          const newElement: any = {
            id: Date.now().toString(),
            type: 'image',
            name: fileName || 'Imported PDF',
            x: posX,
            y: posY,
            width: page.width,
            height: page.height,
            src: finalSrc,
            opacity: 1,
            locked: false,
            layerId: activeLayerId,
            scaleX: scaleFit,
            scaleY: scaleFit
          };
          
          addElement(newElement, true, false);
          if (onJumpToCanvas) {
            onJumpToCanvas(viewCenterX, viewCenterY);
          }
          setIsUploading(false);
          return;
        }
      } else if (['dwg', 'skp', 'skb', 'doc', 'docx'].includes(ext)) {
        const cadPreview = await generateCadDocumentPreview(file);
        let finalSrc = cadPreview.dataUrl;
        try {
          finalSrc = await uploadCanvasAssetToServer(cadPreview.blob, `${fileName}-preview.webp`);
        } catch (e) {
          console.warn('Could not upload SKP preview, using data URL');
        }
        
        let scaleFit = 1;
        const maxW = Math.max(stageWidth * 0.8, 800);
        const maxH = Math.max(stageHeight * 0.8, 600);
        scaleFit = Math.min(maxW / cadPreview.width, maxH / cadPreview.height, 1.5);
        const targetWidth = cadPreview.width * scaleFit;
        const targetHeight = cadPreview.height * scaleFit;
        
        const viewCenterX = (-stagePos.x + stageWidth / 2) / stageScale;
        const viewCenterY = (-stagePos.y + stageHeight / 2) / stageScale;
        const posX = viewCenterX - targetWidth / 2;
        const posY = viewCenterY - targetHeight / 2;

        const newElement: any = {
          id: Date.now().toString(),
          type: 'image',
          name: fileName || 'Imported Model',
          x: posX,
          y: posY,
          width: cadPreview.width,
          height: cadPreview.height,
          src: finalSrc,
          opacity: 1,
          locked: false,
          layerId: activeLayerId,
          scaleX: scaleFit,
          scaleY: scaleFit
        };
        
        addElement(newElement, true, false);
        if (onJumpToCanvas) {
          onJumpToCanvas(viewCenterX, viewCenterY);
        }
        setIsUploading(false);
        return;
      }
      
      const formData = new FormData();
      formData.append('file', file);

      // Send to the conversion API
      const convRes = await axios.post('/api/v1/convert', formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = convRes.data;
      if (data && data.parsedDxf) {
        const { elements: newElements, scale, offsetX, offsetY } = processParsedDXF(
          data.parsedDxf,
          stageWidth,
          stageHeight
        );

        setElements([...elements, ...newElements]);
        
        // Jump to the newly added elements approximately
        if (onJumpToCanvas) {
          onJumpToCanvas(-offsetX / scale + stageWidth / (2 * scale), -offsetY / scale + stageHeight / (2 * scale));
        }
      }
    } catch (err) {
      console.error('Failed to import to canvas:', err);
      alert('Failed to import file to canvas. Ensure it is a valid CAD or PDF file.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[80] flex flex-col items-end pointer-events-auto">
        {/* FLOATING TRIGGER BUTTON (When closed) */}
        {!isOpen && (
          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white rounded-full shadow-2xl hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all hover:scale-105 active:scale-95 border border-white/20"
            title="Team Messenger"
          >
            <MessageSquare size={24} className="text-white drop-shadow-md" />

            {totalUnreadCount > 0 && (
              <span className="absolute top-0 right-0 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-md animate-bounce">
                {totalUnreadCount}
              </span>
            )}
          </button>
        )}

        {/* EXPANDED MESSENGER WINDOW */}
        {isOpen && (
          <div
            className={`bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
              isMinimized
                ? 'w-80 h-14'
                : 'w-[320px] sm:w-[380px] h-[480px]'
            }`}
          >
            {/* Top Bar */}
            <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-white">Project Messenger</h3>
                    <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[9px] font-semibold border border-blue-500/30">
                      {channels.length} Groups
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Cpu size={10} className="text-emerald-400" />
                    Live Collaboration & EngiAI Copilot
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {!isMinimized && (
                  <button
                    onClick={() => setIsChannelsExpanded(!isChannelsExpanded)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isChannelsExpanded 
                        ? 'text-blue-400 hover:text-white hover:bg-slate-800' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title={isChannelsExpanded ? 'Hide Channels' : 'Show Channels'}
                  >
                    {isChannelsExpanded ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
                  </button>
                )}
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title={isMinimized ? 'Expand' : 'Minimize'}
                >
                  {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <div className="flex-1 flex overflow-hidden">
                {/* LEFT SIDEBAR: Channels & Groups */}
                {isChannelsExpanded && (
                  <div className="w-44 sm:w-48 bg-slate-950/90 border-r border-slate-800 flex flex-col shrink-0 transition-all duration-300">
                    <div className="p-2.5 border-b border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                        Channels
                      </span>
                    <button
                      onClick={() => setIsCreateGroupOpen(true)}
                      className="p-1 text-blue-400 hover:text-white hover:bg-blue-600/20 rounded-md transition-colors"
                      title="Create Group"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Channel List */}
                  <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-0.5">
                    {channels.map((c) => {
                      const isActive = c.id === activeChannelId;
                      const unread = unreadMap[c.id] || 0;
                      const isAiChannel = c.name === 'engi-ai';

                      return (
                        <button
                          key={c.id}
                          onClick={() => setActiveChannelId(c.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all ${
                            isActive
                              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                              : 'text-slate-300 hover:bg-slate-850 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isAiChannel ? (
                              <Bot size={13} className={isActive ? 'text-white' : 'text-cyan-400'} />
                            ) : (
                              <Hash size={13} className={isActive ? 'text-white' : 'text-slate-400'} />
                            )}
                            <span className="text-xs truncate">{c.name}</span>
                          </div>

                          {unread > 0 && !isActive && (
                            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                              {unread}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  </div>
                )}

                {/* RIGHT CHAT AREA */}
                <div className="flex-1 flex flex-col bg-slate-900/60 overflow-hidden">
                  {/* Channel Header */}
                  <div className="px-3.5 py-2 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center gap-1 font-bold text-xs text-white">
                        {activeChannel?.name === 'engi-ai' ? (
                          <Bot size={14} className="text-cyan-400" />
                        ) : (
                          <Hash size={14} className="text-blue-400" />
                        )}
                        <span>{activeChannel?.name || 'Discussion'}</span>
                      </div>
                      {activeChannel?.topic && (
                        <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                          · {activeChannel.topic}
                        </span>
                      )}
                    </div>

                    {/* Member Controls */}
                    {activeChannel && activeChannel.name !== 'engi-ai' && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setIsAddMembersOpen(true)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-semibold text-slate-200 transition-colors"
                          title="Add Team Members"
                        >
                          <UserPlus size={11} className="text-blue-400" />
                          <span>{activeChannel.members?.length || 1}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3 text-xs">
                    {isLoadingMessages ? (
                      <div className="flex-1 flex items-center justify-center gap-2 text-slate-400 text-xs">
                        <Loader2 size={16} className="animate-spin text-blue-400" />
                        <span>Loading conversation...</span>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
                          <MessageSquare size={20} />
                        </div>
                        <p className="text-xs font-semibold text-slate-300">
                          Welcome to #{activeChannel?.name}
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-xs">
                          Start the discussion with your team or mention{' '}
                          <span className="text-cyan-400 font-bold">@ai</span> for engineering advice.
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.userId === currentUser?.id;
                        const isAi = msg.isAi;

                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col max-w-[88%] ${
                              isMe ? 'self-end items-end' : 'self-start items-start'
                            }`}
                          >
                            {/* Author Header */}
                            <div className="flex items-center gap-1.5 mb-1 px-1">
                              {isAi ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-300">
                                  <Sparkles size={10} /> EngiAI Copilot
                                </span>
                              ) : (
                                <>
                                  <span className="text-[10px] font-bold text-slate-300">
                                    {isMe ? 'You' : msg.user?.fullName || 'Engineer'}
                                  </span>
                                  {msg.user?.role && (
                                    <span className="px-1 py-0.2 rounded bg-slate-800 text-[8px] font-semibold text-slate-400">
                                      {msg.user.role}
                                    </span>
                                  )}
                                </>
                              )}
                              <span className="text-[9px] text-slate-400">
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            {/* Message Bubble */}
                            <div
                              className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                                isAi
                                  ? 'bg-slate-950/90 text-slate-100 border border-cyan-500/40 rounded-bl-xs shadow-md shadow-cyan-500/5'
                                  : isMe
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs shadow-md'
                                  : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-bl-xs shadow-xs'
                              }`}
                            >
                              {msg.content}

                              {/* Attachments */}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-white/15 flex flex-col gap-2">
                                  {msg.attachments.map((att, i) => {
                                    if (att.type === 'canvas-location') {
                                      return (
                                        <button
                                          key={i}
                                          type="button"
                                          onClick={() => {
                                            if (att.x !== undefined && att.y !== undefined && onJumpToCanvas) {
                                              onJumpToCanvas(att.x, att.y);
                                            }
                                          }}
                                          className="self-start flex items-center gap-1 px-2 py-1 rounded-lg bg-black/30 hover:bg-black/50 text-[10px] font-bold text-cyan-200 border border-cyan-400/30 transition-all hover:scale-105"
                                        >
                                          <MapPin size={10} className="text-cyan-400" />
                                          <span>{att.label || '📍 View on Canvas'}</span>
                                        </button>
                                      );
                                    } else if (att.type === 'image') {
                                      return (
                                        <div key={i} className="flex flex-col gap-1 items-start">
                                          <img 
                                            src={att.fileUrl} 
                                            alt={att.fileName || 'Image attachment'} 
                                            className="max-w-[200px] max-h-[200px] rounded-lg border border-white/20 object-cover"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleImportToCanvas(att.fileUrl!, att.fileName, att.type)}
                                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/40 text-[10px] font-bold text-emerald-200 border border-emerald-400/30 transition-all"
                                          >
                                            <Import size={10} />
                                            <span>Add to Canvas</span>
                                          </button>
                                        </div>
                                      );
                                    } else if (att.type === 'file') {
                                      const isConvertible = att.fileName?.match(/\.(dwg|dxf|skp|pdf)$/i);
                                      return (
                                        <div key={i} className="flex flex-col gap-1 items-start">
                                          <a 
                                            href={att.fileUrl} 
                                            download 
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 hover:bg-black/40 border border-white/10 transition-colors max-w-full"
                                          >
                                            <FileIcon size={16} className="text-blue-300 shrink-0" />
                                            <span className="text-xs text-blue-100 truncate">{att.fileName}</span>
                                            <Download size={12} className="text-slate-400 shrink-0 ml-2" />
                                          </a>
                                          {isConvertible && (
                                            <button
                                              type="button"
                                              onClick={() => handleImportToCanvas(att.fileUrl!, att.fileName, att.type)}
                                              className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/40 text-[10px] font-bold text-emerald-200 border border-emerald-400/30 transition-all"
                                            >
                                              <Import size={10} />
                                              <span>Import to Canvas</span>
                                            </button>
                                          )}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}

                    {isSending && (
                      <div className="self-start flex items-center gap-2 p-2.5 bg-slate-800/70 rounded-2xl border border-slate-700/60 text-xs text-slate-300">
                        <Loader2 size={13} className="animate-spin text-cyan-400" />
                        <span>Sending message & processing AI copilot...</span>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Toolbar & Shortcuts */}
                  <div className="px-3 py-1.5 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddAiMention}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 transition-colors"
                      title="Ask AI in this channel"
                    >
                      <Sparkles size={10} />
                      <span>@ai</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAttachCurrentView}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-semibold text-slate-300 transition-colors"
                      title="Share active canvas coordinates"
                    >
                      <MapPin size={10} className="text-blue-400" />
                      <span>Attach View</span>
                    </button>
                  </div>

                  {/* Message Input Form */}
                  <form
                    onSubmit={(e) => handleSend(e)}
                    className="p-2.5 border-t border-slate-800 bg-slate-950/80 flex gap-2 items-center"
                  >
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Attach File"
                    >
                      <Paperclip size={18} />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={`Message #${activeChannel?.name || 'group'} (type @ai to ask)...`}
                      disabled={isSending || isUploading}
                      className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isSending || isUploading}
                      className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 transition-opacity disabled:opacity-40 shadow-sm shrink-0 font-semibold"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onCreate={createChannel}
      />

      <AddMembersModal
        isOpen={isAddMembersOpen}
        onClose={() => setIsAddMembersOpen(false)}
        channel={activeChannel}
        onAddMembers={addMembersToChannel}
      />
    </>
  );
};

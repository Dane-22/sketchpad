import React, { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, X, Send, Minimize2, Maximize2, Trash2, Loader2, ArrowUpRight, Cpu } from 'lucide-react';
import axios from 'axios';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';
import { CanvasComment } from '../../types/comment';
import { useAuthStore } from '../../features/auth/store/useAuthStore';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface AIAssistantWidgetProps {
  comments: CanvasComment[];
}

export const AIAssistantWidget: React.FC<AIAssistantWidgetProps> = ({ comments }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const token = useAuthStore((state) => state.token);
  const { elements, unitMode } = useCanvasState();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: `👋 **Hello! I'm EngiAI**, your engineering & architectural assistant.\n\nI can analyze your active CAD drawing, verify dimensions, summarize team comment pins, or recommend structural and material specifications. What can I help you with today?`,
      timestamp: new Date(),
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  // Build current canvas context
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

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input.trim();
    if (!query || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const context = getCanvasContext();
      const res = await axios.post(
        '/api/v1/ai/chat',
        { prompt: query, context },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const aiReply: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.data.reply || "I've analyzed your drawing. Let me know if you need further adjustments.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch (err: any) {
      console.error('AI request error:', err);
      const errorMessage: Message = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: `⚠️ **Could not connect to AI service.** Please verify your network or check backend server logs.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: '📐 Analyze layout', prompt: 'Analyze the geometry and layout of this drawing' },
    { label: '📋 Summarize discussions', prompt: 'Summarize all pinned discussions and action items' },
    { label: '📏 Dimension check', prompt: 'Review drafting dimensions and standard clearances' },
    { label: '💡 Engineering advice', prompt: 'Provide engineering recommendations for this plan' },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[80] flex flex-col items-end pointer-events-auto">
      
      {/* FLOATING TRIGGER BUTTON (When closed or minimized) */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          className="group relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white rounded-full shadow-2xl hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all hover:scale-105 active:scale-95 border border-white/20"
        >
          <div className="p-1 rounded-full bg-white/20">
            <Sparkles size={18} className="animate-spin text-cyan-200 duration-3000" />
          </div>
          <span className="text-xs font-bold tracking-wide">EngiAI Assistant</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute top-1 right-1" />
        </button>
      )}

      {/* EXPANDED CHAT WIDGET */}
      {isOpen && (
        <div
          className={`bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
            isMinimized
              ? 'w-72 h-14'
              : 'w-[380px] sm:w-[420px] h-[540px]'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-800 bg-gradient-to-r from-blue-600/20 via-slate-900 to-cyan-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Bot size={18} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white">EngiAI</h3>
                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-semibold border border-cyan-500/30">
                    CAD Copilot
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Cpu size={10} className="text-emerald-400" />
                  {elements.length} elements · {comments.length} discussions
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([messages[0]])}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
                title="Clear conversation"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                    }`}
                  >
                    <div
                      className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs shadow-md'
                          : 'bg-slate-800/90 text-slate-100 border border-slate-700/70 rounded-bl-xs shadow-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 px-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {isLoading && (
                  <div className="self-start flex items-center gap-2 p-3 bg-slate-800/70 rounded-2xl border border-slate-700/60 text-xs text-slate-300">
                    <Loader2 size={14} className="animate-spin text-theme-accent" />
                    <span>Analyzing drawing geometry & discussions...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts */}
              <div className="px-3 py-2 border-t border-slate-800 bg-slate-950/40 flex gap-1.5 overflow-x-auto no-scrollbar">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(qp.prompt)}
                    disabled={isLoading}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-[10px] font-medium text-slate-200 transition-all hover:scale-105 disabled:opacity-50"
                  >
                    <span>{qp.label}</span>
                    <ArrowUpRight size={10} className="text-slate-400" />
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <form
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="p-3 border-t border-slate-800 bg-slate-950/60 flex gap-2 items-center"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask EngiAI about this drawing..."
                  disabled={isLoading}
                  className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-400 outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 transition-opacity disabled:opacity-40 shadow-sm shrink-0 font-semibold"
                >
                  <Send size={14} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};

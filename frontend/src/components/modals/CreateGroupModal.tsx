import React, { useState, useEffect } from 'react';
import { X, Hash, Users, Plus, Loader2, Check } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { ChatUser } from '../../types/chat';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, topic?: string, memberIds?: string[]) => Promise<any>;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = useAuthStore((state) => state.token);
  const currentUser = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!isOpen || !token) return;

    const loadUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const res = await axios.get<ChatUser[]>('/api/v1/users/available', {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Filter out current user from selectable list
        setAvailableUsers(res.data.filter((u) => u.id !== currentUser?.id));
      } catch (err) {
        console.error('Failed to load available users:', err);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadUsers();
    setName('');
    setTopic('');
    setSelectedUserIds([]);
  }, [isOpen, token, currentUser?.id]);

  if (!isOpen) return null;

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCreate(name, topic, selectedUserIds);
      onClose();
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Hash size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Create Project Discussion Group</h2>
              <p className="text-[11px] text-slate-400">Add a dedicated channel for team coordination</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Group / Channel Name <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">#</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. structural-review, mep-coordination"
                required
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Topic / Purpose <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Review foundation load points and beam sizes"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Members Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Users size={13} className="text-slate-400" />
                Add Team Members ({selectedUserIds.length} selected)
              </label>
            </div>

            <div className="max-h-40 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-2 flex flex-col gap-1">
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-400">
                  <Loader2 size={14} className="animate-spin text-blue-400" />
                  <span>Loading engineers...</span>
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500">
                  No other engineers registered yet. You can still create this group!
                </div>
              ) : (
                availableUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => toggleUserSelection(u.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                        isSelected
                          ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                          : 'hover:bg-slate-850 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-white">{u.fullName}</div>
                          <div className="text-[10px] text-slate-400">{u.role} · {u.email}</div>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-blue-500 border-blue-400 text-white' : 'border-slate-700'
                        }`}
                      >
                        {isSelected && <Check size={11} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-600/20 hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Creating Group...</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Create Channel</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

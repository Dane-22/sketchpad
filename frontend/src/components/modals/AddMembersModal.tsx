import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Loader2, Check } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { ChatUser, ChatChannel } from '../../types/chat';

interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: ChatChannel | null;
  onAddMembers: (channelId: string, userIds: string[]) => Promise<void>;
}

export const AddMembersModal: React.FC<AddMembersModalProps> = ({
  isOpen,
  onClose,
  channel,
  onAddMembers,
}) => {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!isOpen || !token || !channel) return;

    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get<ChatUser[]>('/api/v1/users/available', {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Filter out users who are already members of this channel
        const currentMemberIds = channel.members.map((m) => m.userId);
        setAvailableUsers(res.data.filter((u) => !currentMemberIds.includes(u.id)));
      } catch (err) {
        console.error('Failed to load available users:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
    setSelectedUserIds([]);
  }, [isOpen, token, channel]);

  if (!isOpen || !channel) return null;

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddMembers(channel.id, selectedUserIds);
      onClose();
    } catch (err) {
      console.error('Failed to add members:', err);
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
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Add Members to #{channel.name}</h2>
              <p className="text-[11px] text-slate-400">Invite engineers to join this discussion group</p>
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
              Select Engineers ({selectedUserIds.length} selected)
            </label>

            <div className="max-h-56 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-2 flex flex-col gap-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-400">
                  <Loader2 size={14} className="animate-spin text-indigo-400" />
                  <span>Loading engineers...</span>
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  All registered team members are already in this channel!
                </div>
              ) : (
                availableUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => toggleUser(u.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                          : 'hover:bg-slate-850 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-white">{u.fullName}</div>
                          <div className="text-[10px] text-slate-400">{u.role} · {u.email}</div>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-slate-700'
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
              disabled={selectedUserIds.length === 0 || isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Adding Members...</span>
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  <span>Add {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

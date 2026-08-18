import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { X } from 'lucide-react';

interface RenameProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export default function RenameProjectModal({ isOpen, onClose, projectId }: RenameProjectModalProps) {
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const token = useAuthStore(state => state.token);

  useEffect(() => {
    if (isOpen && projectId && projectId !== 'draft-project-123') {
      axios.get(`/api/v1/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setTitle(res.data.title || '');
      }).catch(console.error);
    }
  }, [isOpen, projectId, token]);

  const handleSave = async () => {
    if (!title.trim() || projectId === 'draft-project-123') return;
    setIsLoading(true);
    try {
      await axios.put(`/api/v1/projects/${projectId}/rename`, { title }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onClose();
    } catch (error) {
      console.error("Failed to rename project", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-[400px] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-theme-border flex justify-between items-center bg-theme-hover">
          <h2 className="font-bold text-lg text-theme-primary">Save / Rename Project</h2>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-primary transition-colors p-1 rounded-md hover:bg-theme-border">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">Project Name</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-theme-main border border-theme-border rounded-lg px-4 py-2 text-theme-primary focus:outline-none focus:border-blue-500"
              placeholder="Enter project name..."
              autoFocus
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-theme-border bg-theme-hover flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-theme-muted hover:text-theme-primary font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isLoading || !title.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? 'Saving...' : 'Save Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Share2, Copy, Check, Globe, Lock, X } from 'lucide-react';
import axios from 'axios';

interface ShareProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

const ShareProjectModal: React.FC<ShareProjectModalProps> = ({ isOpen, onClose, projectId }) => {
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    if (isOpen && projectId) {
      const token = localStorage.getItem('token');
      if (!token) return;
      axios.get(`http://localhost:5000/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setIsPublic(res.data.isPublic || false);
      })
      .catch(err => {
        console.error('Failed to load project details', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
    }
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/shared/${projectId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggle = async () => {
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/projects/${projectId}/public`, 
        { isPublic: !isPublic },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsPublic(!isPublic);
    } catch (error) {
      console.error('Failed to toggle public status', error);
      alert('Failed to update sharing settings.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-theme-primary flex items-center gap-2">
            <Share2 size={24} className="text-theme-accent" />
            Share Project
          </h2>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-4">Loading...</div>
        ) : (
          <>
            <div className="mb-6 p-4 rounded-lg border border-theme-border bg-theme-hover flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isPublic ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'}`}>
                  {isPublic ? <Globe size={20} /> : <Lock size={20} />}
                </div>
                <div>
                  <div className="font-semibold text-theme-primary">
                    {isPublic ? 'Anyone with link can view' : 'Only you can access'}
                  </div>
                  <div className="text-sm text-theme-muted">
                    {isPublic ? 'Public sharing is enabled.' : 'Project is private.'}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleToggle}
                disabled={isUpdating}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublic ? 'bg-green-500' : 'bg-gray-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className={`transition-all duration-300 overflow-hidden ${isPublic ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="text-sm text-theme-muted mb-2 font-medium">Share Link</div>
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  readOnly 
                  value={shareUrl}
                  className="flex-1 bg-theme-bg border border-theme-border text-theme-primary px-3 py-2 rounded focus:outline-none focus:border-theme-accent"
                />
                <button 
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-theme-accent text-white font-semibold rounded hover:brightness-110 transition-all"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default ShareProjectModal;

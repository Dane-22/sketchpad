import { useState, useMemo } from 'react';
import { useAutoSave } from '../../features/planner/hooks/useAutoSave';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';
import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Loader2, Check, Upload, Sun, Moon, LogOut, ArrowLeft, Undo2, Redo2, Share2, Download, Image as ImageIcon, MessageSquare } from 'lucide-react';
import RenameProjectModal from './RenameProjectModal';
import ExportModal from './ExportModal';
import ShareProjectModal from './ShareProjectModal';

interface TopNavbarProps {
  onOpenUploadModal?: () => void;
  onToggleComments?: () => void;
  commentCount?: number;
  isCommentsOpen?: boolean;
  isProjectLoaded?: boolean;
}

const TopNavbar: React.FC<TopNavbarProps> = ({
  onOpenUploadModal,
  onToggleComments,
  commentCount = 0,
  isCommentsOpen = false,
  isProjectLoaded = true,
}) => {
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { elements, setIsImportModalOpen, theme, setTheme, undo, redo, historyIndex, history } = useCanvasState();
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  
  const canvasState = useMemo(() => ({
    elements,
    version: 1,
    stageWidth: window.innerWidth,
    stageHeight: window.innerHeight,
    scale: 1,
  }), [elements]);
  
  const { isSaving, lastSaved, error, saveImmediate } = useAutoSave(
    projectId || 'draft-project-123',
    canvasState,
    isProjectLoaded,
    400
  );

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="h-14 bg-theme-surface/80 backdrop-blur-md flex items-center justify-between px-4 z-50 transition-colors duration-300 relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-theme-border after:to-transparent">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => navigate('/dashboard')}
          className="p-1.5 mr-2 text-theme-muted hover:text-theme-primary hover:bg-theme-hover rounded-lg transition-all hover:scale-105 active:scale-95"
          title="Back to Dashboard"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-theme-accent to-blue-400 bg-clip-text text-transparent drop-shadow-sm">ENG PLANNER</span>
      </div>
      
      <div className="flex items-center gap-3 text-sm text-theme-muted">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-theme-muted hover:text-theme-primary hover:bg-theme-hover rounded-lg transition-all hover:scale-105 active:scale-95"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="flex items-center gap-1 border-r border-theme-border pr-3 mr-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`p-2 rounded-lg transition-all ${canUndo ? 'text-theme-primary hover:bg-theme-hover hover:scale-105 active:scale-95' : 'text-theme-muted opacity-30 cursor-not-allowed'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`p-2 rounded-lg transition-all ${canRedo ? 'text-theme-primary hover:bg-theme-hover hover:scale-105 active:scale-95' : 'text-theme-muted opacity-30 cursor-not-allowed'}`}
            title="Redo (Ctrl+Y / Cmd+Shift+Z)"
          >
            <Redo2 size={18} />
          </button>
        </div>

        {/* Upload Image/Document Button */}
        {onOpenUploadModal && (
          <button 
            onClick={onOpenUploadModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 hover:from-cyan-600/30 hover:to-blue-600/30 border border-cyan-500/30 text-cyan-400 rounded-lg transition-all hover:scale-105 active:scale-95 font-medium shadow-sm"
            title="Upload Image or Document (.pdf, .png, .jpg)"
          >
            <ImageIcon size={16} />
            <span>Upload File</span>
          </button>
        )}

        <button 
          onClick={() => setIsImportModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-theme-hover hover:bg-white/10 hover:shadow-sm rounded-lg text-theme-primary transition-all hover:scale-105 active:scale-95"
          title="Import CAD (.dxf) - Ctrl+O"
        >
          <Upload size={16} />
          <span>Import CAD</span>
        </button>

        {/* Discussion / Comments Toggle Button */}
        {onToggleComments && (
          <button 
            onClick={onToggleComments}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all hover:scale-105 active:scale-95 font-medium ${
              isCommentsOpen
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'bg-theme-hover border-theme-border text-theme-primary hover:bg-white/10'
            }`}
            title="Toggle Canvas Discussions & Comment Pins"
          >
            <MessageSquare size={16} />
            <span>Discussions</span>
            {commentCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-900 text-[10px] font-bold">
                {commentCount}
              </span>
            )}
          </button>
        )}

        <button 
          onClick={() => setIsExportModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-theme-hover hover:bg-white/10 hover:shadow-sm rounded-lg text-theme-primary transition-all hover:scale-105 active:scale-95"
          title="Export Project"
        >
          <Download size={16} />
          <span>Export</span>
        </button>
        
        <button 
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-theme-hover hover:bg-white/10 hover:shadow-sm rounded-lg text-theme-primary transition-all hover:scale-105 active:scale-95"
          title="Share Project"
        >
          <Share2 size={16} />
          <span>Share</span>
        </button>
        
        <button 
          onClick={() => {
            saveImmediate();
            setIsRenameModalOpen(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600/30 to-blue-500/20 hover:from-blue-500/40 hover:to-blue-400/30 border border-blue-500/30 text-blue-400 rounded-lg transition-all font-medium hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:-translate-y-[1px] active:translate-y-[1px]"
          title="Save & Rename Project"
        >
          <Save size={16} />
          <span>Save</span>
        </button>

        <div className="flex items-center gap-2">
          {error ? (
            <span className="text-red-400 flex items-center gap-1"><Save size={14}/> Error saving</span>
          ) : isSaving ? (
            <span className="flex items-center gap-1"><Loader2 size={14} className="animate-spin"/> Saving...</span>
          ) : lastSaved ? (
            <span className="flex items-center gap-1 text-green-400"><Check size={14}/> Saved at {lastSaved.toLocaleTimeString()}</span>
          ) : null}
        </div>
        
        <button 
          onClick={handleLogout}
          className="p-2 text-red-400/80 hover:text-red-400 hover:bg-red-500/10 hover:shadow-[0_0_10px_rgba(239,68,68,0.1)] rounded-lg transition-all ml-2 flex items-center gap-1 hover:scale-105 active:scale-95"
          title="Logout"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
      <RenameProjectModal 
        isOpen={isRenameModalOpen} 
        onClose={() => setIsRenameModalOpen(false)} 
        projectId={projectId || 'draft-project-123'}
      />
      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        getStageDataUrl={() => {
          const canvas = document.querySelector('.konvajs-content canvas') as HTMLCanvasElement;
          return canvas ? canvas.toDataURL('image/png') : '';
        }}
      />
      <ShareProjectModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        projectId={projectId || ''}
      />
    </nav>
  );
};

export default TopNavbar;

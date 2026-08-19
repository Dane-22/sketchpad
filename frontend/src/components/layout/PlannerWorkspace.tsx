import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';

import TopNavbar from './TopNavbar';
import RibbonMenu from '../ribbon/RibbonMenu';
import CadCanvas from '../canvas/CadCanvas';
import BlockSidebar from './BlockSidebar';
import CommandBar from './CommandBar';
import ImportModal from './ImportModal';
import { UploadMediaModal } from '../modals/UploadMediaModal';
import { CommentsSidebar } from '../comments/CommentsSidebar';
import { CommentPopover } from '../comments/CommentPopover';
import { ProjectMessengerWidget } from '../chat/ProjectMessengerWidget';

import { useKeyboardShortcuts } from '../../features/planner/hooks/useKeyboardShortcuts';
import { useCanvasState } from '../../features/planner/hooks/useCanvasState';
import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { useComments } from '../../features/planner/hooks/useComments';
import { PropertiesPanel } from '../panels/PropertiesPanel';
import { LayerPanel } from '../panels/LayerPanel';

export default function PlannerWorkspace() {
  useKeyboardShortcuts();
  const { theme, setElements, setStagePos, stageScale } = useCanvasState();
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const token = useAuthStore(state => state.token);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [targetChannelId, setTargetChannelId] = useState<string | null>(null);

  const handleJumpToCanvas = useCallback((x: number, y: number) => {
    const newX = -x * stageScale + window.innerWidth / 2;
    const newY = -y * stageScale + window.innerHeight / 2;
    setStagePos({ x: newX, y: newY });
  }, [stageScale, setStagePos]);

  const handleOpenChannel = useCallback((channelId: string) => {
    setTargetChannelId(channelId);
  }, []);

  const {
    comments,
    activeCommentId,
    setActiveCommentId,
    isAddingComment,
    setIsAddingComment,
    pendingPinPos,
    setPendingPinPos,
    isSidebarOpen: isCommentsSidebarOpen,
    setIsSidebarOpen: setIsCommentsSidebarOpen,
    createComment,
    addReply,
    toggleResolve,
    deleteComment,
    currentUser
  } = useComments(projectId);

  const [isProjectLoaded, setIsProjectLoaded] = useState(false);

  useEffect(() => {
    if (projectId && token) {
      setIsProjectLoaded(false);
      axios.get(`/api/v1/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        const initialElements = res.data.canvasData?.elements || [];
        setElements(initialElements, true, true);
        setIsProjectLoaded(true);
      }).catch(err => {
        console.error("Failed to load project", err);
        setIsProjectLoaded(true);
      });
    }
  }, [projectId, token, setElements]);

  useEffect(() => {
    // 1. Process URL query parameters for deep linking
    const paramX = searchParams.get('x');
    const paramY = searchParams.get('y');
    const paramChannel = searchParams.get('channelId');
    const paramComment = searchParams.get('commentId');

    if (paramX !== null && paramY !== null) {
      const x = parseFloat(paramX);
      const y = parseFloat(paramY);
      if (!isNaN(x) && !isNaN(y)) {
        setTimeout(() => handleJumpToCanvas(x, y), 300);
      }
    }

    if (paramChannel) {
      setTargetChannelId(paramChannel);
    }

    if (paramComment) {
      setActiveCommentId(paramComment);
    }

    // 2. Listen to postMessages from Service Worker (sw.js)
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
        const data = event.data.data;
        if (data?.x !== undefined && data?.y !== undefined) {
          handleJumpToCanvas(data.x, data.y);
        }
        if (data?.channelId) {
          setTargetChannelId(data.channelId);
        }
        if (data?.commentId) {
          setActiveCommentId(data.commentId);
        }
      }
    };

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [searchParams, handleJumpToCanvas, setActiveCommentId]);

  const activeComment = comments.find(c => c.id === activeCommentId) || null;

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden ${theme}`}>
      <TopNavbar 
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onToggleComments={() => setIsCommentsSidebarOpen(!isCommentsSidebarOpen)}
        commentCount={comments.filter(c => !c.isResolved).length}
        isCommentsOpen={isCommentsSidebarOpen}
        isProjectLoaded={isProjectLoaded}
        onJumpToCanvas={handleJumpToCanvas}
        onOpenChannel={handleOpenChannel}
      />
      <RibbonMenu />
      <div className="flex-1 relative flex flex-col overflow-hidden">
        <PropertiesPanel />
        <LayerPanel />
        <div className="flex-1 relative flex overflow-hidden">
          <main className="flex-1 relative overflow-hidden">
            <CadCanvas 
              projectId={projectId}
              comments={comments}
              activeCommentId={activeCommentId}
              onSelectComment={(id) => {
                setActiveCommentId(id);
                setPendingPinPos(null);
              }}
              pendingPinPos={pendingPinPos}
              isAddingComment={isAddingComment}
              onDropPinAtPos={(pos) => {
                setPendingPinPos(pos);
                setActiveCommentId(null);
              }}
            />
            <BlockSidebar />
          </main>
          <CommentsSidebar 
            isOpen={isCommentsSidebarOpen}
            onClose={() => setIsCommentsSidebarOpen(false)}
            comments={comments}
            activeCommentId={activeCommentId}
            onSelectComment={(id) => {
              setActiveCommentId(id);
              setPendingPinPos(null);
            }}
            onStartAddComment={() => setIsAddingComment(true)}
            isAddingComment={isAddingComment}
          />
        </div>
        <CommandBar />
      </div>

      {/* Comment Popover */}
      <CommentPopover 
        activeComment={activeComment}
        pendingPinPos={pendingPinPos}
        onClose={() => {
          setActiveCommentId(null);
          setPendingPinPos(null);
          setIsAddingComment(false);
        }}
        onCreateComment={createComment}
        onAddReply={addReply}
        onToggleResolve={toggleResolve}
        onDeleteComment={deleteComment}
        currentUserId={currentUser?.id}
      />

      {/* In-App Team Messenger & EngiAI Copilot */}
      <ProjectMessengerWidget 
        projectId={projectId || 'draft-project-123'} 
        comments={comments} 
        onJumpToCanvas={handleJumpToCanvas}
        targetChannelId={targetChannelId}
      />

      {/* Modals */}
      <ImportModal />
      <UploadMediaModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}


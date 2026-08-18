import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Stage } from 'react-konva';
import DrawingLayer from '../components/canvas/DrawingLayer';
import GridLayer from '../components/canvas/GridLayer';
import { useCanvasState } from '../features/planner/hooks/useCanvasState';

const SharedProjectPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { setElements, stageScale, theme } = useCanvasState();
  const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setStageSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (projectId) {
      axios.get(`/api/v1/projects/shared/${projectId}`)
        .then(res => {
          setProject(res.data);
          if (res.data.canvasData?.elements) {
            setElements(res.data.canvasData.elements, false, true);
          }
        })
        .catch(err => {
          if (err.response?.status === 403) {
            setError('This project is not public.');
          } else {
            setError('Project not found or an error occurred.');
          }
        });
    }
  }, [projectId, setElements]);

  if (error) {
    return (
      <div className={`h-screen w-screen flex items-center justify-center bg-theme-bg text-theme-primary ${theme}`}>
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">{error}</h1>
          <p className="text-theme-muted mb-8">The link might be invalid or the project owner has made it private.</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={`h-screen w-screen flex items-center justify-center bg-theme-bg text-theme-primary ${theme}`}>
        <div className="text-xl">Loading shared project...</div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden bg-theme-bg ${theme}`}>
      <nav className="h-14 bg-theme-surface border-b border-theme-border flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg tracking-wider text-theme-accent">ENG PLANNER</span>
          <span className="text-theme-muted text-sm ml-4 border-l border-theme-border pl-4">Shared View</span>
        </div>
        <div className="text-theme-primary font-medium">{project.title}</div>
      </nav>
      
      <main className="flex-1 relative overflow-hidden">
        <Stage
          width={stageSize.width}
          height={stageSize.height - 56} // 56px is nav height
          scaleX={stageScale}
          scaleY={stageScale}
          draggable
        >
          <GridLayer 
            width={stageSize.width} 
            height={stageSize.height - 56} 
            scale={stageScale} 
            x={0} 
            y={0} 
          />
          <DrawingLayer />
        </Stage>
      </main>
    </div>
  );
};

export default SharedProjectPage;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { Plus, Clock, LogOut, MoreVertical, Eye, Edit2, Archive, ArchiveRestore, Trash2, CheckCircle2, Folder } from 'lucide-react';
import axios from 'axios';
import ConfirmModal from '../components/layout/ConfirmModal';

interface Project {
  id: string;
  title: string;
  description: string;
  updatedAt: string;
  createdAt: string;
}


export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`/api/v1/projects?archived=${activeTab === 'archived'}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data);
    } catch (error) {
      console.error("Failed to fetch projects", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchProjects();
  }, [token, activeTab]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleCreateProject = async () => {
    try {
      const response = await axios.post('/api/v1/projects', 
        { title: 'New Project', description: 'Untitled workspace' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/app/${response.data.id}`);
    } catch (error) {
      console.error("Failed to create project", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleArchiveToggle = async (e: React.MouseEvent, projectId: string, currentArchived: boolean) => {
    e.stopPropagation();
    try {
      await axios.put(`/api/v1/projects/${projectId}/archive`, 
        { isArchived: !currentArchived },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchProjects();
    } catch (error) {
      console.error("Failed to toggle archive status", error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    try {
      await axios.delete(`/api/v1/projects/${projectToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjectToDelete(null);
      fetchProjects();
    } catch (error) {
      console.error("Failed to delete project", error);
    }
  };

  // Generate Mock Activity Stream
  const activityStream = projects
    .slice(0, 5) // Last 5 active projects
    .map(p => ({
      id: p.id,
      title: p.title,
      date: new Date(p.updatedAt).toLocaleDateString(),
      action: p.createdAt === p.updatedAt ? 'created' : 'updated'
    }));

  return (
    <div className="min-h-screen bg-[#1a1b23] text-slate-200 p-8 font-sans overflow-x-hidden relative">
      
      {/* Background ambient light */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="flex justify-between items-center mb-16 pt-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome, {user?.fullName?.toUpperCase() || 'ENGINEER'}</h1>
            <p className="text-slate-400 text-sm">Manage your planning projects</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleLogout}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition-all flex items-center gap-2 border border-white/10 text-sm font-medium backdrop-blur-md text-slate-300"
            >
              <LogOut size={16} />
              Sign Out
            </button>
            <button 
              onClick={handleCreateProject}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/15 rounded-lg transition-all flex items-center gap-2 font-medium text-white border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)] backdrop-blur-md text-sm"
            >
              <Plus size={16} />
              New Project
            </button>
          </div>
        </header>

        <div className="flex gap-8 mb-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`text-sm font-medium transition-all ${
              activeTab === 'active' 
                ? 'text-white' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Active Projects {activeTab === 'active' && <div className="h-0.5 w-full bg-blue-500 mt-1 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`text-sm font-medium transition-all ${
              activeTab === 'archived' 
                ? 'text-white' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Archived {activeTab === 'archived' && <div className="h-0.5 w-full bg-blue-500 mt-1 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
          </button>
        </div>

        {isLoading ? (
          <div className="text-slate-500 text-center py-20 flex justify-center items-center">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 bg-[#222431]/50 border border-white/5 rounded-2xl backdrop-blur-md">
            <h2 className="text-xl font-semibold mb-2 text-white">No {activeTab} projects</h2>
            <p className="text-slate-400 mb-6 text-sm">
              {activeTab === 'active' ? 'Create your first project to start planning.' : 'You have no archived projects.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {projects.map((project, index) => {
              const isFirst = index === 0 && activeTab === 'active';
              
              return (
                <div 
                  key={project.id}
                  onClick={() => navigate(`/app/${project.id}`)}
                  className={`relative group bg-[#222431] rounded-2xl p-4 cursor-pointer transition-all duration-300 overflow-hidden ${
                    isFirst 
                      ? 'border border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.1)] hover:shadow-[0_0_40px_rgba(245,158,11,0.15)]' 
                      : 'border border-white/5 hover:border-blue-500/30 shadow-lg hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]'
                  }`}
                >
                  {/* Radial Glow */}
                  <div className={`absolute inset-0 opacity-40 transition-opacity duration-300 group-hover:opacity-60 pointer-events-none ${
                    isFirst
                      ? 'bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15)_0%,transparent_70%)]'
                      : 'bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,transparent_70%)]'
                  }`} />

                  {/* Top actions */}
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <div className="flex-1" /> {/* Spacer */}
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/app/${project.id}`); }}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="View Project"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/app/${project.id}`); }}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Edit Project"
                      >
                        <Edit2 size={16} />
                      </button>
                      <div className="relative">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setOpenMenuId(openMenuId === project.id ? null : project.id);
                          }}
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {openMenuId === project.id && (
                          <div className="absolute right-0 top-full mt-2 w-40 bg-[#2a2c3a] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
                            <button
                              onClick={(e) => handleArchiveToggle(e, project.id, activeTab === 'archived')}
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                            >
                              {activeTab === 'archived' ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                              {activeTab === 'archived' ? 'Restore' : 'Archive'}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setProjectToDelete(project.id); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Glass Folder Icon */}
                  <div className="h-28 flex items-center justify-center mb-3 relative z-10 pointer-events-none">
                    <div className="relative transition-transform duration-500 group-hover:scale-105">
                      {/* Inner Glow */}
                      <div className={`absolute inset-2 blur-xl rounded-full opacity-60 ${
                        isFirst ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      
                      {/* Folder SVG */}
                      <Folder 
                        size={80} 
                        strokeWidth={1.5}
                        className={`relative z-10 drop-shadow-2xl ${
                          isFirst 
                            ? 'text-amber-200 fill-amber-500/30' 
                            : 'text-blue-200 fill-blue-500/30'
                        }`}
                        style={{
                          filter: isFirst 
                            ? 'drop-shadow(0 0 10px rgba(245,158,11,0.4))' 
                            : 'drop-shadow(0 0 10px rgba(59,130,246,0.4))'
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10 px-1">
                    <h3 className="font-semibold text-base mb-1 text-white truncate">{project.title}</h3>
                    <p className="text-xs text-slate-400 mb-3 line-clamp-1">{project.description}</p>
                    
                    <div className="flex items-center text-[11px] text-slate-500 gap-1.5 font-medium">
                      <Clock size={12} />
                      <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-slate-500 font-medium">
          Showing {projects.length} project{projects.length !== 1 && 's'}
        </div>
      </div>

      {/* Activity Stream Widget */}
      <div className="fixed bottom-8 right-8 w-72 bg-[#222431]/80 backdrop-blur-xl border border-white/10 rounded-xl p-5 shadow-2xl z-40">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-blue-400" />
          Recent Activity
        </h4>
        <div className="space-y-4">
          {activityStream.length > 0 ? activityStream.map((activity, i) => (
            <div key={`${activity.id}-${i}`} className="relative pl-4 border-l border-white/10">
              <div className="absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full bg-slate-600 ring-4 ring-[#222431]" />
              <p className="text-sm text-slate-200">
                <span className="font-medium text-white">{activity.title}</span> {activity.action}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{activity.date}</p>
            </div>
          )) : (
            <p className="text-xs text-slate-500">No recent activity.</p>
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!projectToDelete}
        title="Delete Project"
        message="Are you sure you want to permanently delete this project? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
}

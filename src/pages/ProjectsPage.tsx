import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ProjectResponse } from '../services/api';
import { Header } from '../components/Header';
import { Modal } from '../components/Modal';

import { 
  Plus, 
  Search, 
  FolderGit2, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [size] = useState(6);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  // Fields state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const loadProjects = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.projects.list({
        search,
        page,
        size,
        sort: 'createdAt,desc'
      });
      setProjects(data.content);
      setTotalPages(data.totalPages);
    } catch (e) {
      console.error('Error loading projects', e);
    } finally {
      setLoading(false);
    }
  }, [search, page, size]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.projects.create({ name, description });
      setIsCreateOpen(false);
      setName('');
      setDescription('');
      loadProjects();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create project';
      setError(errorMsg);
    }
  };

  const handleEditInit = (e: React.MouseEvent, project: ProjectResponse) => {
    e.stopPropagation(); // Avoid triggering card navigation
    setSelectedProjectId(project.id);
    setName(project.name);
    setDescription(project.description || '');
    setError('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedProjectId) return;
    try {
      await api.projects.update(selectedProjectId, { name, description });
      setIsEditOpen(false);
      setName('');
      setDescription('');
      setSelectedProjectId(null);
      loadProjects();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update project';
      setError(errorMsg);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation(); // Avoid triggering card navigation
    const confirmMsg = `Are you sure you want to delete project "${name}"?\nThis will soft-delete the project and its tasks.`;
    if (confirm(confirmMsg)) {
      try {
        await api.projects.delete(id);
        loadProjects();
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete project';
        alert(errorMsg);
      }
    }
  };



  return (
    <div className="main-content">
      <Header title="Projects Management" />
      <div className="page-body">
        
        {/* Header action bar */}
        <div className="flex-row-between">
          <div className="search-input-wrapper" style={{ maxWidth: '360px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search projects..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <button className="btn btn-primary" onClick={() => { setName(''); setDescription(''); setError(''); setIsCreateOpen(true); }}>
            <Plus size={18} />
            <span>New Project</span>
          </button>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
            Loading projects list...
          </div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            {search ? 'No projects match your search.' : 'No active projects found. Create your first project!'}
          </div>
        ) : (
          <div className="grid grid-cols-2" style={{ marginBottom: '2rem' }}>
            {projects.map(project => (
              <div 
                key={project.id} 
                className="project-card"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <FolderGit2 size={20} className="text-primary" style={{ color: 'var(--color-primary)' }} />
                    <h3 className="project-name" style={{ margin: 0 }}>{project.name}</h3>
                  </div>
                  <p className="project-desc">{project.description || 'No description provided.'}</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ID: #{project.id}
                  </span>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem', borderRadius: '6px' }}
                      onClick={(e) => handleEditInit(e, project)}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '0.4rem', borderRadius: '6px' }}
                      onClick={(e) => handleDelete(e, project.id, project.name)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
            <button 
              className="btn btn-secondary" 
              disabled={page === 0} 
              onClick={() => setPage(p => Math.max(0, p - 1))}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Page {page + 1} of {totalPages}
            </span>
            <button 
              className="btn btn-secondary" 
              disabled={page === totalPages - 1} 
              onClick={() => setPage(p => p + 1)}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

      </div>

      {/* Create Project Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Project">
        <form onSubmit={handleCreate}>
          {error && (
            <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem', backgroundColor: 'rgba(239,68,68,0.08)', padding: '0.5rem', borderRadius: '6px' }}>
              {error}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input 
              type="text" 
              className="form-input" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              maxLength={100}
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description (Max 250 characters)</label>
            <textarea 
              className="form-textarea" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              maxLength={250}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Project">
        <form onSubmit={handleEditSubmit}>
          {error && (
            <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem', backgroundColor: 'rgba(239,68,68,0.08)', padding: '0.5rem', borderRadius: '6px' }}>
              {error}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input 
              type="text" 
              className="form-input" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              maxLength={100}
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description (Max 250 characters)</label>
            <textarea 
              className="form-textarea" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              maxLength={250}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { api, TaskResponse, ProjectResponse } from '../services/api';
import { Header } from '../components/Header';
import { Trash2, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DeletedTasksPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDeletedTasks = async () => {
    setLoading(true);
    try {
      const data = await api.tasks.getDeleted();
      setTasks(data.content);
      
      const projs = await api.projects.list({ size: 100 });
      setProjects(projs.content);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedTasks();
  }, []);

  const handleRestore = async (id: number, title: string) => {
    try {
      await api.tasks.restore(id);
      alert(`Restored task "${title}"`);
      loadDeletedTasks();
    } catch (err: any) {
      alert(err.message || 'Failed to restore task. Make sure parent project is not deleted.');
    }
  };

  const handleHardDelete = async (id: number, title: string) => {
    if (!isAdmin) {
      alert('Only administrators can hard-delete tickets permanently.');
      return;
    }
    const doubleConfirm = confirm(`WARNING: Hard-deleting "${title}" will permanently erase it from the database.\nThis cannot be undone. Proceed?`);
    if (doubleConfirm) {
      try {
        await api.tasks.hardDelete(id);
        loadDeletedTasks();
      } catch (err: any) {
        alert(err.message || 'Failed to hard delete task.');
      }
    }
  };

  return (
    <div className="main-content">
      <Header title="Trash Bin" />
      <div className="page-body">
        
        {/* Banner info */}
        <div style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          border: '1px solid var(--border-color)', 
          borderRadius: 'var(--border-radius)', 
          padding: '1.25rem', 
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <Trash2 size={24} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              Soft-Deleted Workflow Tickets
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Tickets deleted by members go here first. They can be restored. Admin authorization is required to permanently delete (hard delete) records.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
            Loading trash bin...
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            Trash bin is empty!
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Project</th>
                  <th>Task Title</th>
                  <th>Type</th>
                  <th>Deleted At</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id} style={{ cursor: 'default' }}>
                    <td>#{task.id}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {projects.find(p => p.id === task.projectId)?.name || `Project #${task.projectId}`}
                    </td>
                    <td style={{ fontWeight: 600 }}>{task.title}</td>
                    <td><span className={`badge badge-${task.type.toLowerCase()}`}>{task.type}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {task.deletedAt ? new Date(task.deletedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', gap: '0.25rem' }}
                          onClick={() => handleRestore(task.id, task.title)}
                        >
                          <RotateCcw size={12} />
                          <span>Restore</span>
                        </button>
                        {isAdmin && (
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', gap: '0.25rem' }}
                            onClick={() => handleHardDelete(task.id, task.title)}
                          >
                            <Trash2 size={12} />
                            <span>Purge</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

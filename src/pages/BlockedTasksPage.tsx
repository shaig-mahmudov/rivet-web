import React, { useEffect, useState } from 'react';
import { api, TaskResponse, ProjectResponse } from '../services/api';
import { Header } from '../components/Header';
import { TaskSlider } from '../components/TaskSlider';
import { AlertOctagon, Folder, Calendar } from 'lucide-react';

export const BlockedTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const loadBlockedTasks = React.useCallback(async () => {
    setLoading(true);
    try {
      const [data, projs] = await Promise.all([
        api.tasks.getBlocked(),
        api.projects.list({ size: 100 })
      ]);
      setTasks(data);
      setProjects(projs.content);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBlockedTasks();
  }, [loadBlockedTasks]);

  return (
    <div className="main-content">
      <Header title="Blocked Tasks Board" />
      <div className="page-body">
        
        {/* Banner */}
        <div style={{ 
          backgroundColor: 'rgba(239, 68, 68, 0.05)', 
          border: '1px solid rgba(239, 68, 68, 0.15)', 
          borderRadius: 'var(--border-radius)', 
          padding: '1.25rem', 
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <AlertOctagon size={24} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              Action Required: Blocked Engineering Tasks
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              These tasks cannot transition to DONE because they either depend on unfinished tickets or are marked as BLOCKED. Resolving blockers resumes execution.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
            Loading blocked tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            No blocked tasks found in the workspace!
          </div>
        ) : (
          <div className="grid grid-cols-2">
            {tasks.map(task => (
              <div 
                key={task.id} 
                className="task-card"
                onClick={() => setSelectedTaskId(task.id)}
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  borderLeft: '4px solid var(--color-danger)',
                  padding: '1.25rem',
                  height: '100%',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span className={`badge badge-${task.type.toLowerCase()}`}>{task.type}</span>
                    <span className={`badge badge-${(task.priority || 'medium').toLowerCase()}`}>{task.priority || 'MEDIUM'}</span>
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    {task.title}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {task.description || 'No description provided.'}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Folder size={12} />
                    <span>Project: <strong style={{ color: 'var(--color-primary-light)' }}>{projects.find(p => p.id === task.projectId)?.name || 'Standalone'}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Ticket: #{task.id}</span>
                    {task.dueDate && (
                      <span style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Calendar size={12} />
                        <span>Due: {task.dueDate}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      <TaskSlider 
        taskId={selectedTaskId}
        isOpen={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={loadBlockedTasks}
      />
    </div>
  );
};

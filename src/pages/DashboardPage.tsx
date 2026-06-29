import React, { useEffect, useState } from 'react';
import { api, TaskResponse } from '../services/api';
import { Header } from '../components/Header';
import { 
  FolderGit2, 
  CheckSquare, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [projectsCount, setProjectsCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [blockedTasks, setBlockedTasks] = useState<TaskResponse[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<TaskResponse[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [projData, blockedData, inProgressData, doneData, urgentData] = await Promise.all([
          api.projects.list({ size: 1 }),
          api.tasks.getBlocked(),
          api.tasks.list({ status: 'IN_PROGRESS', size: 1 }),
          api.tasks.list({ status: 'DONE', size: 1 }),
          api.tasks.list({ priority: 'URGENT', size: 10 })
        ]);

        setProjectsCount(projData.totalElements);
        setInProgressCount(inProgressData.totalElements);
        setDoneCount(doneData.totalElements);
        setBlockedTasks(blockedData);

        const urgentActive = urgentData.content.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED');
        setUrgentTasks(urgentActive);

      } catch (e) {
        console.error('Error loading dashboard data', e);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="main-content">
        <Header title="Dashboard" />
        <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div style={{ color: 'var(--text-secondary)' }}>Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Header title="Overview" />
      <div className="page-body">
        {/* Row 1: Welcome Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            System Health
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Real-time analytics for your engineering projects and ticket backlogs.
          </p>
        </div>

        {/* Row 2: Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--color-primary)' }}>
              <FolderGit2 size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-title">Active Projects</span>
              <span className="stat-value">{projectsCount}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--color-secondary)' }}>
              <CheckSquare size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-title">In Progress Tasks</span>
              <span className="stat-value">{inProgressCount}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)' }}>
              <AlertTriangle size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-title">Blocked Tasks</span>
              <span className="stat-value">{blockedTasks.length}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)' }}>
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-title">Completed (Done)</span>
              <span className="stat-value">{doneCount}</span>
            </div>
          </div>
        </div>

        {/* Row 3: Main Dashboard Content */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
          
          {/* Column A: Blocked Tickets */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)' }}>
                <AlertTriangle size={18} />
                <span>Blocked Workflow Tickets ({blockedTasks.length})</span>
              </h3>
              <Link to="/blocked-tasks" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                <span>View all</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {blockedTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                All clear! No tasks are currently blocked.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {blockedTasks.slice(0, 5).map(task => (
                  <div 
                    key={task.id} 
                    style={{ 
                      backgroundColor: 'var(--bg-tertiary)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: 'var(--border-radius-sm)', 
                      padding: '0.9rem 1.2rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        {task.title}
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Task ID: #{task.id} • Type: <strong style={{ color: 'var(--color-accent)' }}>{task.type}</strong>
                      </span>
                    </div>
                    <span className="badge badge-critical">Blocked</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column B: Urgent Tasks */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-accent)' }}>
                <Clock size={18} />
                <span>Urgent Tasks ({urgentTasks.length})</span>
              </h3>
            </div>

            {urgentTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No urgent tasks are currently active.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {urgentTasks.slice(0, 5).map(task => (
                  <div 
                    key={task.id} 
                    style={{ 
                      backgroundColor: 'var(--bg-tertiary)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: 'var(--border-radius-sm)', 
                      padding: '0.9rem 1.2rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        {task.title}
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Due Date: <strong style={{ color: 'var(--color-danger)' }}>{task.dueDate || 'No Date'}</strong>
                      </span>
                    </div>
                    <span className={`badge badge-${(task.priority || 'medium').toLowerCase()}`}>
                      {task.priority || 'MEDIUM'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

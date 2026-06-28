import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, ProjectResponse, TaskResponse, UserResponse } from '../services/api';
import { Header } from '../components/Header';
import { Modal } from '../components/Modal';
import { TaskSlider } from '../components/TaskSlider';
import { 
  Plus, 
  Search, 
  KanbanSquare, 
  Table, 
  ChevronLeft, 
  Calendar,
  FolderDot
} from 'lucide-react';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Filters State
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  
  // Tasks pagination
  const [page] = useState(0);

  // Selected Task Slider
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Create Task Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [error, setError] = useState('');
  
  // Create Task fields
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskType, setTaskType] = useState<'BUG' | 'FEATURE' | 'REFACTOR' | 'INCIDENT' | 'RELIABILITY' | 'DOCUMENTATION' | 'TEST' | 'CHORE'>('FEATURE');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [taskSeverity, setTaskSeverity] = useState<string>('');
  const [taskTechContext, setTaskTechContext] = useState('');
  const [taskExpectedOutcome, setTaskExpectedOutcome] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  const loadProjectDetails = React.useCallback(async () => {
    if (!id) return;
    try {
      const proj = await api.projects.list({ page: 0, size: 100 });
      const currentProj = proj.content.find(p => p.id === Number(id));
      if (!currentProj) {
        navigate('/projects');
        return;
      }
      setProject(currentProj);
      
      const usersList = await api.users.list();
      setUsers(usersList);
    } catch (e) {
      console.error(e);
      navigate('/projects');
    }
  }, [id, navigate]);

  const loadTasks = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        search: search || undefined,
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        type: filterType || undefined,
        page,
        size: 50, // Higher limit for Kanban
        sort: 'createdAt,desc'
      };
      const data = await api.projects.listTasks(Number(id), params);
      setTasks(data.content);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id, search, filterStatus, filterPriority, filterType, page]);

  useEffect(() => {
    loadProjectDetails();
  }, [loadProjectDetails]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!id) return;
    
    try {
      await api.tasks.create({
        projectId: Number(id),
        title: taskTitle,
        description: taskDesc || null,
        type: taskType,
        priority: taskPriority,
        severity: taskSeverity || null,
        technicalContext: taskTechContext || null,
        expectedOutcome: taskExpectedOutcome || null,
        assigneeId: taskAssigneeId ? Number(taskAssigneeId) : null,
        dueDate: taskDueDate || null
      });

      setIsCreateOpen(false);
      // Reset form
      setTaskTitle('');
      setTaskDesc('');
      setTaskType('FEATURE');
      setTaskPriority('MEDIUM');
      setTaskSeverity('');
      setTaskTechContext('');
      setTaskExpectedOutcome('');
      setTaskAssigneeId('');
      setTaskDueDate('');

      loadTasks();
    } catch (err: unknown) {
      const errorWithDetails = err as Error & { details?: { errors?: Record<string, string> } };
      let message = errorWithDetails.message || 'Failed to create task';
      if (errorWithDetails.details && errorWithDetails.details.errors) {
        message = Object.values(errorWithDetails.details.errors).join(', ');
      }
      setError(message);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setFilterStatus('');
    setFilterPriority('');
    setFilterType('');
  };

  // Kanban status groups
  const KANBAN_STATUSES = [
    { title: 'To Do', value: 'TODO' },
    { title: 'In Progress', value: 'IN_PROGRESS' },
    { title: 'In Review', value: 'IN_REVIEW' },
    { title: 'Blocked', value: 'BLOCKED' },
    { title: 'Done', value: 'DONE' },
    { title: 'Reopened', value: 'REOPENED' },
    { title: 'Cancelled', value: 'CANCELLED' }
  ];

  const getStatusTasks = (status: string) => {
    return tasks.filter(t => t.status === status);
  };

  if (!project) {
    return (
      <div className="main-content">
        <Header title="Project Loading..." />
        <div className="page-body" style={{ textAlign: 'center', padding: '3rem' }}>
          Loading project data...
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Header title={`${project.name}`} />
      <div className="page-body">
        
        {/* Breadcrumb link */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Link to="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem' }}>
            <ChevronLeft size={16} />
            <span>Back to Projects</span>
          </Link>
        </div>

        {/* Project info card */}
        <div 
          style={{ 
            backgroundColor: 'var(--bg-secondary)', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--border-radius)', 
            padding: '1.5rem', 
            marginBottom: '2rem',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <FolderDot className="text-primary" size={24} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{project.name}</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '800px' }}>
            {project.description || 'No description provided for this project.'}
          </p>
        </div>

        {/* Filters and View Toggles Panel */}
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search tasks..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <div className="filter-item">
            <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="IN_REVIEW">IN REVIEW</option>
              <option value="BLOCKED">BLOCKED</option>
              <option value="DONE">DONE</option>
              <option value="REOPENED">REOPENED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div className="filter-item">
            <select className="form-select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          <div className="filter-item">
            <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              <option value="BUG">BUG</option>
              <option value="FEATURE">FEATURE</option>
              <option value="REFACTOR">REFACTOR</option>
              <option value="INCIDENT">INCIDENT</option>
              <option value="RELIABILITY">RELIABILITY</option>
              <option value="DOCUMENTATION">DOCUMENTATION</option>
              <option value="TEST">TEST</option>
              <option value="CHORE">CHORE</option>
            </select>
          </div>

          <button className="btn btn-secondary" style={{ padding: '0.65rem 0.8rem' }} onClick={resetFilters}>
            Clear
          </button>

          {/* View Toggles */}
          <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: '8px', marginLeft: 'auto' }}>
            <button 
              className="btn btn-secondary" 
              style={{ 
                padding: '0.4rem 0.6rem', 
                border: 'none', 
                backgroundColor: viewMode === 'kanban' ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: viewMode === 'kanban' ? 'white' : 'var(--text-secondary)'
              }}
              onClick={() => setViewMode('kanban')}
            >
              <KanbanSquare size={16} />
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ 
                padding: '0.4rem 0.6rem', 
                border: 'none', 
                backgroundColor: viewMode === 'list' ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: viewMode === 'list' ? 'white' : 'var(--text-secondary)'
              }}
              onClick={() => setViewMode('list')}
            >
              <Table size={16} />
            </button>
          </div>

          {/* Create Task Button */}
          <button className="btn btn-primary" onClick={() => { setError(''); setIsCreateOpen(true); }}>
            <Plus size={18} />
            <span>Add Ticket</span>
          </button>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-secondary)' }}>
            Loading tasks...
          </div>
        ) : (
          <>
            {/* VIEW MODE: KANBAN BOARD */}
            {viewMode === 'kanban' && (
              <div className="kanban-container">
                {KANBAN_STATUSES.map(col => {
                  const colTasks = getStatusTasks(col.value);
                  return (
                    <div key={col.value} className="kanban-column">
                      <div className="kanban-header">
                        <div className="kanban-title">
                          <span style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            backgroundColor: col.value === 'BLOCKED' ? 'var(--color-danger)' : col.value === 'DONE' ? 'var(--color-success)' : 'var(--color-primary)' 
                          }}></span>
                          <span>{col.title}</span>
                        </div>
                        <span className="kanban-badge">{colTasks.length}</span>
                      </div>
                      
                      <div className="kanban-list">
                        {colTasks.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Empty column
                          </div>
                        ) : (
                          colTasks.map(task => (
                            <div 
                              key={task.id} 
                              className="task-card"
                              onClick={() => setSelectedTaskId(task.id)}
                            >
                              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                <span className={`badge badge-${task.type.toLowerCase()}`}>{task.type}</span>
                                {task.severity && (
                                  <span className={`badge badge-${task.severity.toLowerCase()}`}>{task.severity}</span>
                                )}
                              </div>
                              
                              <h4 className="task-title">{task.title}</h4>
                              
                              <div className="task-meta">
                                <span className={`badge badge-${(task.priority || 'medium').toLowerCase()}`}>
                                  {task.priority || 'MEDIUM'}
                                </span>
                                {task.dueDate && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                    <Calendar size={10} />
                                    <span>{task.dueDate.substring(5)}</span>
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.03)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                                <span>ID: #{task.id}</span>
                                <span>{users.find(u => u.id === task.assigneeId)?.username || 'Unassigned'}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VIEW MODE: LIST / TABLE */}
            {viewMode === 'list' && (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Severity</th>
                      <th>Assignee</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                          No tasks match filters.
                        </td>
                      </tr>
                    ) : (
                      tasks.map(task => (
                        <tr key={task.id} onClick={() => setSelectedTaskId(task.id)}>
                          <td>#{task.id}</td>
                          <td style={{ fontWeight: 600 }}>{task.title}</td>
                          <td><span className={`badge badge-${task.type.toLowerCase()}`}>{task.type}</span></td>
                          <td><span className={`badge badge-${task.status.toLowerCase()}`}>{task.status}</span></td>
                          <td><span className={`badge badge-${(task.priority || 'medium').toLowerCase()}`}>{task.priority || 'MEDIUM'}</span></td>
                          <td>{task.severity ? <span className={`badge badge-${task.severity.toLowerCase()}`}>{task.severity}</span> : '-'}</td>
                          <td>{users.find(u => u.id === task.assigneeId)?.username || 'Unassigned'}</td>
                          <td>{task.dueDate || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

      </div>

      {/* Slide-over Task Details Panel */}
      <TaskSlider 
        taskId={selectedTaskId}
        isOpen={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={loadTasks}
      />

      {/* Create Task Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Workflow Ticket">
        <form onSubmit={handleCreateTask}>
          {error && (
            <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem', backgroundColor: 'rgba(239,68,68,0.08)', padding: '0.5rem', borderRadius: '6px' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Ticket Title *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Implement refresh token route"
              value={taskTitle} 
              onChange={(e) => setTaskTitle(e.target.value)} 
              maxLength={100}
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description (Max 250 characters)</label>
            <textarea 
              className="form-textarea" 
              placeholder="Provide a brief description of the required tasks..."
              value={taskDesc} 
              onChange={(e) => setTaskDesc(e.target.value)} 
              maxLength={250}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Task Type *</label>
              <select className="form-select" value={taskType} onChange={(e) => setTaskType(e.target.value as 'BUG' | 'FEATURE' | 'REFACTOR' | 'INCIDENT' | 'RELIABILITY' | 'DOCUMENTATION' | 'TEST' | 'CHORE')}>
                <option value="FEATURE">FEATURE</option>
                <option value="BUG">BUG</option>
                <option value="REFACTOR">REFACTOR</option>
                <option value="INCIDENT">INCIDENT</option>
                <option value="RELIABILITY">RELIABILITY</option>
                <option value="DOCUMENTATION">DOCUMENTATION</option>
                <option value="TEST">TEST</option>
                <option value="CHORE">CHORE</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT')}>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Severity (Optional)</label>
              <select className="form-select" value={taskSeverity} onChange={(e) => setTaskSeverity(e.target.value)}>
                <option value="">NONE</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assignee</label>
              <select className="form-select" value={taskAssigneeId} onChange={(e) => setTaskAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input 
              type="date" 
              className="form-input" 
              value={taskDueDate} 
              onChange={(e) => setTaskDueDate(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Technical Context (Max 1000 characters)</label>
            <textarea 
              className="form-textarea" 
              placeholder="e.g. Involves order creation routes, database unique transaction key handlers..."
              value={taskTechContext} 
              onChange={(e) => setTaskTechContext(e.target.value)} 
              maxLength={1000}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Expected Outcome (Max 1000 characters)</label>
            <textarea 
              className="form-textarea" 
              placeholder="e.g. Duplicate orders are rejected and single order is created."
              value={taskExpectedOutcome} 
              onChange={(e) => setTaskExpectedOutcome(e.target.value)} 
              maxLength={1000}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Ticket
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

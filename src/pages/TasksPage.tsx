import React, { useEffect, useState } from 'react';
import { api, TaskResponse, UserResponse, ProjectResponse } from '../services/api';
import { Header } from '../components/Header';
import { TaskSlider } from '../components/TaskSlider';
import { 
  Search, 
  KanbanSquare, 
  Table, 
  Calendar,
  FolderOpen
} from 'lucide-react';

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Filters State
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterAssigneeId, setFilterAssigneeId] = useState('');
  
  // Selected Task Slider
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const usersList = await api.users.list();
      setUsers(usersList);

      const projectsList = await api.projects.list({ size: 100 });
      setProjects(projectsList.content);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadTasks = React.useCallback(async () => {
    try {
      const params: Record<string, unknown> = {
        search: search || undefined,
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        type: filterType || undefined,
        projectId: filterProjectId ? Number(filterProjectId) : undefined,
        assigneeId: filterAssigneeId ? Number(filterAssigneeId) : undefined,
        size: 100 // High limit for boards
      };
      const data = await api.tasks.list(params);
      setTasks(data.content);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterPriority, filterType, filterProjectId, filterAssigneeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('text/plain', taskId.toString());
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('text/plain');
    if (!taskIdStr) return;
    const taskId = Number(taskIdStr);

    const draggedTask = tasks.find(t => t.id === taskId);
    if (!draggedTask) return;
    if (draggedTask.status === newStatus) return;

    // Optimistically update UI
    setTasks(prevTasks =>
      prevTasks.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t)
    );

    try {
      await api.tasks.transition(taskId, newStatus, 'Moved via Kanban board drag-and-drop');
    } catch (err: unknown) {
      // Revert optimistic update
      setTasks(prevTasks =>
        prevTasks.map(t => t.id === taskId ? { ...t, status: draggedTask.status } : t)
      );
      const errorMsg = err instanceof Error ? err.message : 'Workflow transition rejected';
      alert(`Could not move task: ${errorMsg}`);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setFilterStatus('');
    setFilterPriority('');
    setFilterType('');
    setFilterProjectId('');
    setFilterAssigneeId('');
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

  return (
    <div className="main-content">
      <Header title="All Workspace Tasks" />
      <div className="page-body">
        
        {/* Description Banner */}
        <div style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Overview of all tasks across all projects inside the workspace. Click on any card to edit details.
        </div>

        {/* Filter Toolbar */}
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search all tasks..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <div className="filter-item">
            <select className="form-select" value={filterProjectId} onChange={(e) => setFilterProjectId(e.target.value)}>
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <select className="form-select" value={filterAssigneeId} onChange={(e) => setFilterAssigneeId(e.target.value)}>
              <option value="">All Assignees</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
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
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-secondary)' }}>
            Loading workspace tasks...
          </div>
        ) : (
          <>
            {/* VIEW MODE: KANBAN BOARD */}
            {viewMode === 'kanban' && (
              <div className="kanban-container">
                {KANBAN_STATUSES.map(col => {
                  const colTasks = getStatusTasks(col.value);
                  return (
                    <div 
                      key={col.value} 
                      className="kanban-column"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, col.value)}
                    >
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
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, task.id)}
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
                              
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem', borderTop: '1px dashed rgba(255,255,255,0.03)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>ID: #{task.id}</span>
                                  <span>{users.find(u => u.id === task.assigneeId)?.username || 'Unassigned'}</span>
                                </div>
                                <div style={{ color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <FolderOpen size={10} />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {projects.find(p => p.id === task.projectId)?.name || 'Standalone'}
                                  </span>
                                </div>
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
                      <th>Project</th>
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
                        <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                          No tasks match filters.
                        </td>
                      </tr>
                    ) : (
                      tasks.map(task => (
                        <tr key={task.id} onClick={() => setSelectedTaskId(task.id)}>
                          <td>#{task.id}</td>
                          <td style={{ color: 'var(--color-primary-light)', fontWeight: 500 }}>
                            {projects.find(p => p.id === task.projectId)?.name || 'Standalone'}
                          </td>
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
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { 
  api, 
  TaskResponse, 
  UserResponse, 
  TaskCommentResponse, 
  AcceptanceCriteriaResponse,
  TaskDependencyResponse,
  TaskActivityResponse 
} from '../services/api';
import { 
  X, 
  Calendar, 
  AlertCircle, 
  MessageSquare, 
  Plus, 
  Trash2,
  Sparkles,
  Link2,
  ListTodo,
  FileText,
  History,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TaskSliderProps {
  taskId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export const TaskSlider: React.FC<TaskSliderProps> = ({ taskId, isOpen, onClose, onTaskUpdated }) => {
  const { user } = useAuth();
  const [task, setTask] = useState<TaskResponse | null>(null);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'criteria' | 'comments' | 'dependencies' | 'timeline'>('details');

  // Nested endpoint data
  const [comments, setComments] = useState<TaskCommentResponse[]>([]);
  const [criteria, setCriteria] = useState<AcceptanceCriteriaResponse[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependencyResponse[]>([]);
  const [blockedTasks, setBlockedTasks] = useState<TaskResponse[]>([]);
  const [timeline, setTimeline] = useState<TaskActivityResponse[]>([]);

  // Inputs State
  const [newCommentBody, setNewCommentBody] = useState('');
  const [newCommentType, setNewCommentType] = useState<'GENERAL' | 'REVIEW' | 'BLOCKER' | 'INTERNAL_NOTE'>('GENERAL');
  const [newCriteriaText, setNewCriteriaText] = useState('');
  
  // AI Suggestions State
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState('');

  // Status transitions state
  const [transitionStatus, setTransitionStatus] = useState('');
  const [transitionReason, setTransitionReason] = useState('');
  const [transitionError, setTransitionError] = useState('');
  const [showTransitionForm, setShowTransitionForm] = useState(false);

  // Dependency add state
  const [allProjectTasks, setAllProjectTasks] = useState<TaskResponse[]>([]);
  const [selectedDepTaskId, setSelectedDepTaskId] = useState('');
  const [depError, setDepError] = useState('');

  // Field Edit State
  const [isEditingFields, setIsEditingFields] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editSeverity, setEditSeverity] = useState('');
  const [editTechContext, setEditTechContext] = useState('');
  const [editExpectedOutcome, setEditExpectedOutcome] = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [saveError, setSaveError] = useState('');

  // Helper to map allowed transitions
  // Status transition graph defined in backend
  const getAllowedTransitions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'TODO':
        return ['IN_PROGRESS', 'CANCELLED'];
      case 'IN_PROGRESS':
        return ['IN_REVIEW', 'BLOCKED', 'CANCELLED'];
      case 'BLOCKED':
        return ['IN_PROGRESS', 'CANCELLED'];
      case 'IN_REVIEW':
        return ['DONE', 'IN_PROGRESS', 'BLOCKED'];
      case 'DONE':
        return ['REOPENED'];
      case 'REOPENED':
        return ['IN_PROGRESS', 'CANCELLED'];
      default:
        return [];
    }
  };

  const isReasonRequired = (from: string, to: string) => {
    if (from === 'IN_PROGRESS' && to === 'BLOCKED') return true;
    if (from === 'IN_REVIEW' && to === 'IN_PROGRESS') return true;
    if (from === 'IN_REVIEW' && to === 'BLOCKED') return true;
    if (from === 'DONE' && to === 'REOPENED') return true;
    return false;
  };

  const loadTaskData = async () => {
    if (!taskId) return;
    try {
      const taskDetails = await api.tasks.getById(taskId);
      setTask(taskDetails);
      
      // Initialize edit fields
      setEditTitle(taskDetails.title);
      setEditDesc(taskDetails.description || '');
      setEditPriority(taskDetails.priority || 'MEDIUM');
      setEditSeverity(taskDetails.severity || '');
      setEditTechContext(taskDetails.technicalContext || '');
      setEditExpectedOutcome(taskDetails.expectedOutcome || '');
      setEditAssigneeId(taskDetails.assigneeId ? String(taskDetails.assigneeId) : '');
      setEditDueDate(taskDetails.dueDate || '');

      // Load users for assignee dropdown
      const usersList = await api.users.list();
      setUsers(usersList);

      // Load nested data based on active tab or preload
      await loadTabSpecificData(activeTab, taskDetails);
    } catch (e) {
      console.error('Error loading task details', e);
    }
  };

  const loadTabSpecificData = async (tab: typeof activeTab, currentTask = task) => {
    if (!taskId || !currentTask) return;
    try {
      if (tab === 'comments') {
        const commentsData = await api.tasks.listComments(taskId);
        setComments(commentsData.content);
      } else if (tab === 'criteria') {
        const criteriaList = await api.tasks.listCriteria(taskId);
        setCriteria(criteriaList);
        setAiSuggestions([]); // Clear previous suggestions
      } else if (tab === 'dependencies') {
        const deps = await api.tasks.listDependencies(taskId);
        setDependencies(deps);
        const blocked = await api.tasks.listBlockedTasksOfDependency(taskId);
        setBlockedTasks(blocked);
        
        // Load other tasks in the same project to allow adding dependencies
        if (currentTask.projectId) {
          const projectTasks = await api.projects.listTasks(currentTask.projectId, { size: 100 });
          setAllProjectTasks(projectTasks.content.filter(t => t.id !== taskId));
        }
      } else if (tab === 'timeline') {
        const log = await api.tasks.getTimeline(taskId);
        setTimeline(log.content);
      }
    } catch (e) {
      console.error(`Error loading tab data for ${tab}`, e);
    }
  };

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskData();
    }
  }, [taskId, isOpen]);

  useEffect(() => {
    if (task) {
      loadTabSpecificData(activeTab);
    }
  }, [activeTab]);

  // Handle direct field updates (like title, description)
  const handleFieldSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    setSaveError('');
    try {
      const updated = await api.tasks.partialUpdate(task.id, {
        title: editTitle,
        description: editDesc,
        priority: editPriority || null,
        severity: editSeverity || null,
        technicalContext: editTechContext || null,
        expectedOutcome: editExpectedOutcome || null,
        assigneeId: editAssigneeId ? Number(editAssigneeId) : null,
        dueDate: editDueDate || null
      });
      setTask(updated);
      setIsEditingFields(false);
      onTaskUpdated();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save task edits');
    }
  };

  // Handle status transitions
  const handleTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !transitionStatus) return;
    setTransitionError('');

    try {
      await api.tasks.transition(task.id, transitionStatus, transitionReason);
      
      // Reload task details
      const reloadedTask = await api.tasks.getById(task.id);
      setTask(reloadedTask);
      setShowTransitionForm(false);
      setTransitionStatus('');
      setTransitionReason('');
      onTaskUpdated();
      // Reload timeline if current tab
      if (activeTab === 'timeline') {
        loadTabSpecificData('timeline', reloadedTask);
      }
    } catch (err: any) {
      setTransitionError(err.message || 'Workflow transition rejected. Check task blocking conditions.');
    }
  };

  // Comments Actions
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !newCommentBody.trim()) return;
    try {
      await api.tasks.createComment(taskId, {
        type: newCommentType,
        body: newCommentBody
      });
      setNewCommentBody('');
      loadTabSpecificData('comments');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!taskId) return;
    if (confirm('Delete this comment?')) {
      try {
        await api.tasks.deleteComment(taskId, commentId);
        loadTabSpecificData('comments');
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Acceptance Criteria Actions
  const handleAddCriteria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !newCriteriaText.trim()) return;
    try {
      await api.tasks.createCriteria(taskId, newCriteriaText);
      setNewCriteriaText('');
      loadTabSpecificData('criteria');
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleCriteria = async (criteriaId: number, currentCompleted: boolean) => {
    if (!taskId) return;
    try {
      if (currentCompleted) {
        await api.tasks.reopenCriteria(taskId, criteriaId);
      } else {
        await api.tasks.completeCriteria(taskId, criteriaId);
      }
      loadTabSpecificData('criteria');
    } catch (err: any) {
      alert(err.message || 'Could not update criteria state');
    }
  };

  const handleDeleteCriteria = async (criteriaId: number) => {
    if (!taskId) return;
    try {
      await api.tasks.deleteCriteria(taskId, criteriaId);
      loadTabSpecificData('criteria');
    } catch (err) {
      console.error(err);
    }
  };

  // AI draft criteria generators
  const handleAiDraftCriteria = async () => {
    if (!taskId) return;
    setLoadingAi(true);
    setAiError('');
    try {
      const res = await api.tasks.aiCriteriaDraft(taskId);
      setAiSuggestions(res.suggestions);
    } catch (err: any) {
      setAiError(err.message || 'AI Provider is currently disabled or unconfigured in .env configuration.');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleSaveAiSuggestions = async (suggestionsToSave: string[]) => {
    if (!taskId || suggestionsToSave.length === 0) return;
    try {
      await api.tasks.bulkCreateCriteria(taskId, suggestionsToSave);
      setAiSuggestions([]);
      loadTabSpecificData('criteria');
    } catch (err: any) {
      alert(err.message || 'Failed to save suggestions');
    }
  };

  // Dependencies Actions
  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !selectedDepTaskId) return;
    setDepError('');
    try {
      await api.tasks.addDependency(taskId, Number(selectedDepTaskId));
      setSelectedDepTaskId('');
      loadTabSpecificData('dependencies');
      onTaskUpdated();
    } catch (err: any) {
      setDepError(err.message || 'Circular dependencies or cross-project dependencies are not allowed.');
    }
  };

  const handleRemoveDependency = async (depTaskId: number) => {
    if (!taskId) return;
    try {
      await api.tasks.removeDependency(taskId, depTaskId);
      loadTabSpecificData('dependencies');
      onTaskUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to remove dependency');
    }
  };

  if (!isOpen || !task) return null;

  const allowedNextStatuses = getAllowedTransitions(task.status);
  const showWorkflowWarning = allowedNextStatuses.length === 0;

  return (
    <div className="task-slider-overlay" onClick={onClose}>
      <div className="task-slider-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Slider Header */}
        <div className="task-slider-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className={`badge badge-${task.status.toLowerCase()}`}>{task.status}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ticket #{task.id}</span>
          </div>
          <button 
            className="modal-close" 
            onClick={onClose} 
            style={{ padding: '0.25rem', display: 'flex', alignItems: 'center' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Slider Body */}
        <div className="task-slider-body">
          
          {/* Tab Menu */}
          <div className="slider-tabs">
            <button 
              className={`slider-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              <FileText size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Details
            </button>
            <button 
              className={`slider-tab-btn ${activeTab === 'criteria' ? 'active' : ''}`}
              onClick={() => setActiveTab('criteria')}
            >
              <ListTodo size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Acceptance Checklist
            </button>
            <button 
              className={`slider-tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
              onClick={() => setActiveTab('comments')}
            >
              <MessageSquare size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Comments ({comments.length || ''})
            </button>
            <button 
              className={`slider-tab-btn ${activeTab === 'dependencies' ? 'active' : ''}`}
              onClick={() => setActiveTab('dependencies')}
            >
              <Link2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Workflow Blocks
            </button>
            <button 
              className={`slider-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              <History size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Timeline Logs
            </button>
          </div>

          {/* TAB CONTENT: DETAILS */}
          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Status and Transition Block */}
              <div style={{ padding: '1.25rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Current Status</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{task.status}</strong>
                  </div>
                  {allowedNextStatuses.length > 0 && !showTransitionForm && (
                    <button className="btn btn-accent" onClick={() => { setTransitionStatus(allowedNextStatuses[0]); setShowTransitionForm(true); }}>
                      Transition Status
                    </button>
                  )}
                </div>

                {showTransitionForm && (
                  <form onSubmit={handleTransitionSubmit} style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>Workflow State Transition</h4>
                    
                    {transitionError && (
                      <div style={{ color: 'var(--color-danger)', fontSize: '0.8rem', padding: '0.5rem', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '4px', marginBottom: '0.75rem' }}>
                        {transitionError}
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Next Target Status</label>
                      <select 
                        className="form-select" 
                        value={transitionStatus}
                        onChange={(e) => setTransitionStatus(e.target.value)}
                      >
                        {allowedNextStatuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>

                    {isReasonRequired(task.status, transitionStatus) && (
                      <div className="form-group">
                        <label className="form-label">Transition Reason *</label>
                        <textarea 
                          className="form-textarea" 
                          placeholder="Provide the explanation for this status move"
                          value={transitionReason}
                          onChange={(e) => setTransitionReason(e.target.value)}
                          required
                          style={{ minHeight: '60px' }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setShowTransitionForm(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                        Confirm Move
                      </button>
                    </div>
                  </form>
                )}

                {showWorkflowWarning && (
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <AlertCircle size={14} />
                    <span>No further status transitions allowed from DONE status. Reopen task if needed.</span>
                  </div>
                )}
              </div>

              {/* Title & Desc View / Edit */}
              {!isEditingFields ? (
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{task.title}</span>
                    <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setIsEditingFields(true)}>
                      Edit Fields
                    </button>
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', whiteSpace: 'pre-wrap', backgroundColor: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    {task.description || 'No description provided.'}
                  </p>
                  
                  <div className="grid grid-cols-2" style={{ marginTop: '1.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Task Type</span>
                      <span className={`badge badge-${task.type.toLowerCase()}`}>{task.type}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Priority</span>
                      <span className={`badge badge-${(task.priority || 'medium').toLowerCase()}`}>{task.priority || 'MEDIUM'}</span>
                    </div>
                    {task.severity && (
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Severity</span>
                        <span className={`badge badge-${task.severity.toLowerCase()}`}>{task.severity}</span>
                      </div>
                    )}
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Due Date</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}><Calendar size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {task.dueDate || 'No due date'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Assignee</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                        {users.find(u => u.id === task.assigneeId)?.username || 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  {task.technicalContext && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Technical Context</span>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontFamily: 'monospace' }}>
                        {task.technicalContext}
                      </div>
                    </div>
                  )}

                  {task.expectedOutcome && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Expected Outcome</span>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        {task.expectedOutcome}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <form onSubmit={handleFieldSave}>
                  {saveError && (
                    <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem', backgroundColor: 'rgba(239,68,68,0.08)', padding: '0.5rem', borderRadius: '6px' }}>
                      {saveError}
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Title *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editTitle} 
                      onChange={(e) => setEditTitle(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description (Max 250 characters)</label>
                    <textarea 
                      className="form-textarea" 
                      value={editDesc} 
                      onChange={(e) => setEditDesc(e.target.value)} 
                      maxLength={250}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Priority</label>
                      <select className="form-select" value={editPriority} onChange={(e) => setEditPriority(e.target.value)}>
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="URGENT">URGENT</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Severity (Optional)</label>
                      <select className="form-select" value={editSeverity} onChange={(e) => setEditSeverity(e.target.value)}>
                        <option value="">NONE</option>
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Assignee</label>
                      <select className="form-select" value={editAssigneeId} onChange={(e) => setEditAssigneeId(e.target.value)}>
                        <option value="">Unassigned</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Due Date</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={editDueDate} 
                        onChange={(e) => setEditDueDate(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Technical Context (Max 1000 characters)</label>
                    <textarea 
                      className="form-textarea" 
                      value={editTechContext} 
                      onChange={(e) => setEditTechContext(e.target.value)} 
                      maxLength={1000}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expected Outcome (Max 1000 characters)</label>
                    <textarea 
                      className="form-textarea" 
                      value={editExpectedOutcome} 
                      onChange={(e) => setEditExpectedOutcome(e.target.value)} 
                      maxLength={1000}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsEditingFields(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Save Changes
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}

          {/* TAB CONTENT: ACCEPTANCE CHECKLIST */}
          {activeTab === 'criteria' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Acceptance Criteria Checklist</h4>
                <button 
                  className="btn btn-accent" 
                  onClick={handleAiDraftCriteria}
                  disabled={loadingAi}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  <Sparkles size={14} />
                  <span>{loadingAi ? 'AI Generating...' : 'Suggest AI Draft'}</span>
                </button>
              </div>

              {/* AI Draft Suggestions Block */}
              {aiSuggestions.length > 0 && (
                <div style={{ border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--border-radius)', padding: '1rem', backgroundColor: 'rgba(6, 182, 212, 0.04)', marginBottom: '1.5rem' }}>
                  <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Sparkles size={14} />
                    <span>AI-Generated Draft Criteria Suggestions</span>
                  </h5>
                  <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                    {aiSuggestions.map((suggestion, idx) => (
                      <div key={idx} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.4rem' }}>
                        <span style={{ flex: 1, paddingRight: '1rem' }}>{suggestion}</span>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
                          onClick={() => handleSaveAiSuggestions([suggestion])}
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                    <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => setAiSuggestions([])}>
                      Clear Suggestions
                    </button>
                    <button className="btn btn-accent" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => handleSaveAiSuggestions(aiSuggestions)}>
                      Accept & Add All
                    </button>
                  </div>
                </div>
              )}

              {aiError && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-warning)', border: '1px solid rgba(245,158,11,0.2)', backgroundColor: 'rgba(245,158,11,0.05)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
                  {aiError}
                </div>
              )}

              {/* Checklist list */}
              {criteria.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No acceptance criteria defined yet. Use form below or AI to create.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '2rem' }}>
                  {criteria.map(c => (
                    <div key={c.id} className="criteria-item">
                      <input 
                        type="checkbox" 
                        className="criteria-checkbox" 
                        checked={c.completed}
                        onChange={() => handleToggleCriteria(c.id, c.completed)}
                      />
                      <span className={`criteria-text ${c.completed ? 'completed' : ''}`}>
                        {c.text}
                      </span>
                      <button 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} 
                        onClick={() => handleDeleteCriteria(c.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Criteria Form */}
              <form onSubmit={handleAddCriteria} style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Type new acceptance criterion..." 
                  value={newCriteriaText}
                  onChange={(e) => setNewCriteriaText(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} />
                  <span>Add</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB CONTENT: COMMENTS */}
          {activeTab === 'comments' && (
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Task Discussion</h4>

              <div className="comments-list">
                {comments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No comments yet. Start the conversation!
                  </div>
                ) : (
                  comments.map(c => (
                    <div 
                      key={c.id} 
                      className={`comment-card comment-badge-${c.type.toLowerCase().replace('_note', 'note')}`}
                    >
                      <div className="comment-card-header">
                        <div>
                          <strong className="comment-author">
                            {users.find(u => u.id === c.authorId)?.username || `User #${c.authorId}`}
                          </strong>
                          <span style={{ marginLeft: '0.5rem' }} className={`badge badge-${c.type === 'INTERNAL_NOTE' ? 'documentation' : c.type.toLowerCase()}`}>
                            {c.type}
                          </span>
                        </div>
                        <span className="comment-date">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="comment-body">{c.body}</p>
                      
                      {user && user.id === c.authorId && (
                        <button 
                          style={{ position: 'absolute', right: '0.75rem', bottom: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} 
                          onClick={() => handleDeleteComment(c.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <select 
                    className="form-select" 
                    value={newCommentType} 
                    onChange={(e) => setNewCommentType(e.target.value as any)}
                  >
                    <option value="GENERAL">GENERAL</option>
                    <option value="REVIEW">REVIEW</option>
                    <option value="BLOCKER">BLOCKER</option>
                    <option value="INTERNAL_NOTE">INTERNAL NOTE</option>
                  </select>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Type comments..." 
                    value={newCommentBody}
                    onChange={(e) => setNewCommentBody(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary">
                    Post Comment
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB CONTENT: WORKFLOW BLOCKS (DEPENDENCIES) */}
          {activeTab === 'dependencies' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Depend on (Blocked by) */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertTriangle size={16} className="text-secondary" style={{ color: 'var(--color-secondary)' }} />
                  <span>This task depends on (blocked by):</span>
                </h4>
                
                {dependencies.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
                    No dependencies. This task can be scheduled immediately.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {dependencies.map(dep => (
                      <div key={dep.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.85rem' }}>
                          Ticket #{dep.dependsOnTaskId} - <strong>{dep.dependsOnTaskTitle}</strong> (<i>{dep.dependsOnTaskStatus}</i>)
                        </span>
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                          onClick={() => handleRemoveDependency(dep.dependsOnTaskId)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Dependency Form */}
                <form onSubmit={handleAddDependency} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
                  <select 
                    className="form-select"
                    value={selectedDepTaskId}
                    onChange={(e) => setSelectedDepTaskId(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Choose a task to depend on --</option>
                    {allProjectTasks.map(t => (
                      <option key={t.id} value={t.id}>#{t.id} - {t.title} ({t.status})</option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn-secondary">
                    Add Block
                  </button>
                </form>
                {depError && (
                  <div style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    {depError}
                  </div>
                )}
              </div>

              {/* Blocked tasks */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={16} className="text-accent" style={{ color: 'var(--color-accent)' }} />
                  <span>Tasks currently blocked by this task:</span>
                </h4>
                
                {blockedTasks.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
                    No other tasks are waiting on this one.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {blockedTasks.map(b => (
                      <div key={b.id} style={{ fontSize: '0.85rem', backgroundColor: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        Ticket #{b.id} - <strong>{b.title}</strong> (<i>{b.status}</i>)
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB CONTENT: TIMELINE LOGS */}
          {activeTab === 'timeline' && (
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Task Audit Trail</h4>

              <div className="timeline-list">
                {timeline.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No activity logs recorded yet.
                  </div>
                ) : (
                  timeline.map(log => (
                    <div key={log.id} className="timeline-item">
                      <div className={`timeline-dot ${log.type.includes('STATUS') ? 'cyan' : ''}`}></div>
                      <div className="timeline-time">
                        {new Date(log.createdAt).toLocaleString()} • {log.actor?.username || 'system'}
                      </div>
                      <div className="timeline-msg">{log.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { api, UserResponse } from '../services/api';
import { Header } from '../components/Header';
import { Modal } from '../components/Modal';
import { Plus, User, Shield, Edit3, Trash2, RotateCcw } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [error, setError] = useState('');

  // Form Fields state
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const active = await api.users.list();
      setUsers(active);
      const deleted = await api.users.getDeleted();
      setDeletedUsers(deleted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.users.create({
        username,
        email,
        password,
        role
      });
      setIsCreateOpen(false);
      resetForm();
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  };

  const handleEditInit = (u: UserResponse) => {
    setSelectedUserId(u.id);
    setUsername(u.username);
    setEmail(u.email);
    setRole(u.role);
    setError('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedUserId) return;
    try {
      await api.users.update(selectedUserId, {
        username,
        email,
        role
      });
      setIsEditOpen(false);
      resetForm();
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to disable user "${name}"?`)) {
      try {
        await api.users.delete(id);
        loadUsers();
      } catch (err: any) {
        alert(err.message || 'Failed to disable user');
      }
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.users.restore(id);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to restore user');
    }
  };

  const resetForm = () => {
    setSelectedUserId(null);
    setUsername('');
    setEmail('');
    setPassword('');
    setRole('USER');
  };

  return (
    <div className="main-content">
      <Header title="User Administration" />
      <div className="page-body">
        
        {/* Top actions */}
        <div className="flex-row-between">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Manage developers and administrators access levels and system membership.
          </p>

          <button className="btn btn-primary" onClick={() => { resetForm(); setError(''); setIsCreateOpen(true); }}>
            <Plus size={18} />
            <span>Add User</span>
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
            Loading users data...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Active Users Table */}
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                Active System Users ({users.length})
              </h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Email Address</th>
                      <th>Access Role</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ cursor: 'default' }}>
                        <td>#{u.id}</td>
                        <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: 'none' }}>
                          <User size={16} className="text-secondary" />
                          <span>{u.username}</span>
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge ${u.role === 'ADMIN' ? 'badge-critical' : 'badge-low'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            {u.role === 'ADMIN' && <Shield size={10} />}
                            {u.role}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => handleEditInit(u)}>
                              <Edit3 size={14} />
                            </button>
                            <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => handleDelete(u.id, u.username)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Suspended/Deleted Users Table */}
            {deletedUsers.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-danger)' }}>
                  Suspended / Soft-Deleted Users ({deletedUsers.length})
                </h3>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Email Address</th>
                        <th>Access Role</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deletedUsers.map(u => (
                        <tr key={u.id} style={{ cursor: 'default' }}>
                          <td>#{u.id}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{u.username}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                          <td>
                            <span className="badge badge-low">{u.role}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', gap: '0.25rem' }}
                              onClick={() => handleRestore(u.id)}
                            >
                              <RotateCcw size={12} />
                              <span>Reactivate</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Create User Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New System User">
        <form onSubmit={handleCreate}>
          {error && (
            <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem', backgroundColor: 'rgba(239,68,68,0.08)', padding: '0.5rem', borderRadius: '6px' }}>
              {error}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Username *</label>
            <input 
              type="text" 
              className="form-input" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input 
              type="email" 
              className="form-input" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password *</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Role Access *</label>
            <select className="form-select" value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="USER">USER (Developer/QA)</option>
              <option value="ADMIN">ADMIN (Manager)</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create User
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Modify User Access">
        <form onSubmit={handleEditSubmit}>
          {error && (
            <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem', backgroundColor: 'rgba(239,68,68,0.08)', padding: '0.5rem', borderRadius: '6px' }}>
              {error}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Username *</label>
            <input 
              type="text" 
              className="form-input" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input 
              type="email" 
              className="form-input" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Role Access *</label>
            <select className="form-select" value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="USER">USER (Developer/QA)</option>
              <option value="ADMIN">ADMIN (Manager)</option>
            </select>
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

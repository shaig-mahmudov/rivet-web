import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderGit2, 
  CheckSquare, 
  AlertTriangle, 
  Users, 
  Trash2, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logoUrl from '../assets/images/rivet_logo.webp';

export const Sidebar: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm('Are you sure you want to log out?')) {
      await logout();
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
        <img src={logoUrl} alt="Rivet Logo" style={{ maxWidth: '100%', maxHeight: '40px', objectFit: 'contain' }} />
      </div>

      <ul className="sidebar-menu">
        <li>
          <NavLink to="/" className={({ isActive }) => `sidebar-item-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/projects" className={({ isActive }) => `sidebar-item-link ${isActive ? 'active' : ''}`}>
            <FolderGit2 size={20} />
            <span>Projects</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/tasks" className={({ isActive }) => `sidebar-item-link ${isActive ? 'active' : ''}`}>
            <CheckSquare size={20} />
            <span>All Tasks</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/blocked-tasks" className={({ isActive }) => `sidebar-item-link ${isActive ? 'active' : ''}`}>
            <AlertTriangle size={20} />
            <span>Blocked Tasks</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/deleted-tasks" className={({ isActive }) => `sidebar-item-link ${isActive ? 'active' : ''}`}>
            <Trash2 size={20} />
            <span>Trash bin</span>
          </NavLink>
        </li>
        {isAdmin && (
          <li>
            <NavLink to="/admin/users" className={({ isActive }) => `sidebar-item-link ${isActive ? 'active' : ''}`}>
              <Users size={20} />
              <span>Users (Admin)</span>
            </NavLink>
          </li>
        )}
      </ul>

      {user && (
        <div className="sidebar-footer">
          <div className="user-badge" style={{ marginBottom: '1rem' }}>
            <div className="user-avatar">
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{user.username}</span>
              <span className="user-role">{user.role}</span>
            </div>
          </div>
          <a href="#logout" onClick={handleLogout} className="sidebar-item-link" style={{ color: 'var(--color-danger)' }}>
            <LogOut size={20} />
            <span>Log Out</span>
          </a>
        </div>
      )}
    </aside>
  );
};

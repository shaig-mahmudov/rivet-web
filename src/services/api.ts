/**
 * Central API client for Rivet
 * Wraps fetching with auto-injected JWT token and transparent refresh token rotation logic
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export interface AuthResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: UserResponse;
}

export interface ProjectResponse {
  id: number;
  name: string;
  description: string;
}

export interface TaskResponse {
  id: number;
  projectId?: number;
  assigneeId?: number;
  title: string;
  description?: string;
  type: 'BUG' | 'FEATURE' | 'REFACTOR' | 'INCIDENT' | 'RELIABILITY' | 'DOCUMENTATION' | 'TEST' | 'CHORE';
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  technicalContext?: string;
  expectedOutcome?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'DONE' | 'REOPENED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  dueDate?: string;
}

export interface PageWrapper<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  size: number;
  number: number;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

export interface TaskCommentResponse {
  id: number;
  taskId: number;
  authorId: number;
  authorUsername?: string; // Loaded dynamically or mocked if API doesn't include it
  type: 'GENERAL' | 'REVIEW' | 'BLOCKER' | 'INTERNAL_NOTE';
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcceptanceCriteriaResponse {
  id: number;
  taskId: number;
  text: string;
  completed: boolean;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  completedById?: number;
}

export interface TaskDependencyResponse {
  id: number;
  taskId: number;
  dependsOnTaskId: number;
  dependsOnTaskTitle: string;
  dependsOnTaskStatus: string;
  createdById: number;
  createdAt: string;
}

export interface TaskActivityResponse {
  id: number;
  type: string;
  actor: {
    id: number;
    username: string;
    email: string;
  };
  oldValue?: string;
  newValue?: string;
  message: string;
  metadata?: string;
  createdAt: string;
}

// Token storage helpers
const storage = {
  getAccessToken: () => localStorage.getItem('rivet_access_token'),
  getRefreshToken: () => localStorage.getItem('rivet_refresh_token'),
  getUser: (): UserResponse | null => {
    const u = localStorage.getItem('rivet_user');
    return u ? JSON.parse(u) : null;
  },
  setSession: (auth: AuthResponse) => {
    localStorage.setItem('rivet_access_token', auth.accessToken);
    localStorage.setItem('rivet_refresh_token', auth.refreshToken);
    localStorage.setItem('rivet_user', JSON.stringify(auth.user));
  },
  clearSession: () => {
    localStorage.removeItem('rivet_access_token');
    localStorage.removeItem('rivet_refresh_token');
    localStorage.removeItem('rivet_user');
  }
};

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

async function request<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const token = storage.getAccessToken();
  const headers = new Headers(options.headers || {});
  
  const isPublicAuthEndpoint = url.startsWith('/auth/') && !url.includes('/auth/logout');
  if (token && !isPublicAuthEndpoint) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  const config = { ...options, headers };
  const response = await fetch(`${API_BASE}${url}`, config);
  
  // Handing Token Expiry (401 Unauthorized)
  if (response.status === 401) {
    const refreshToken = storage.getRefreshToken();
    if (refreshToken && !url.includes('/auth/refresh') && !url.includes('/auth/login')) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });
          
          if (refreshRes.ok) {
            const data: AuthResponse = await refreshRes.json();
            storage.setSession(data);
            onRefreshed(data.accessToken);
            isRefreshing = false;
          } else {
            storage.clearSession();
            isRefreshing = false;
            window.location.href = '/login';
            throw new Error('Session expired. Please log in again.');
          }
        } catch (err) {
          storage.clearSession();
          isRefreshing = false;
          window.location.href = '/login';
          throw err;
        }
      }
      
      // Queue requests until refresh finishes
      return new Promise<T>((resolve) => {
        subscribeTokenRefresh((newToken) => {
          headers.set('Authorization', `Bearer ${newToken}`);
          resolve(fetch(`${API_BASE}${url}`, { ...options, headers }).then(res => res.json() as Promise<T>));
        });
      });
    } else if (url.includes('/auth/refresh')) {
      storage.clearSession();
      window.location.href = '/login';
    }
  }
  
  if (response.status === 204) {
    return null as T;
  }
  
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  
  if (!response.ok) {
    const errorMsg = data.message || data.error || `HTTP error! status: ${response.status}`;
    // If validation details exist, throw detailed error
    const err = new Error(errorMsg) as Error & { status?: number; details?: unknown };
    err.status = response.status;
    err.details = data; // store validation errors
    throw err;
  }
  
  return data as T;
}

export const api = {
  storage,
  
  // Auth API
  auth: {
    login: async (requestBody: Record<string, unknown>): Promise<AuthResponse> => {
      const data = await request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      storage.setSession(data);
      return data;
    },
    register: async (requestBody: Record<string, unknown>): Promise<AuthResponse> => {
      const data = await request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      storage.setSession(data);
      return data;
    },
    bootstrapAdmin: async (requestBody: Record<string, unknown>): Promise<AuthResponse> => {
      return request<AuthResponse>('/auth/bootstrap/admin', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
    },
    logout: async (): Promise<void> => {
      const refreshToken = storage.getRefreshToken();
      try {
        await request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        });
      } finally {
        storage.clearSession();
      }
    }
  },

  // Users API
  users: {
    list: (): Promise<UserResponse[]> => request('/users'),
    getDeleted: (): Promise<UserResponse[]> => request('/users/deleted'),
    getById: (id: number): Promise<UserResponse> => request(`/users/${id}`),
    create: (user: Record<string, unknown>): Promise<UserResponse> => request<UserResponse>('/users', {
      method: 'POST',
      body: JSON.stringify(user)
    }),
    update: (id: number, user: Record<string, unknown>): Promise<UserResponse> => request<UserResponse>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user)
    }),
    delete: (id: number): Promise<void> => request(`/users/${id}`, {
      method: 'DELETE'
    }),
    restore: (id: number): Promise<UserResponse> => request(`/users/${id}/restore`, {
      method: 'POST'
    })
  },

  // Projects API
  projects: {
    list: (params: { search?: string; ownerId?: number; page?: number; size?: number; sort?: string } = {}): Promise<PageWrapper<ProjectResponse>> => {
      const q = new URLSearchParams();
      if (params.search) q.append('search', params.search);
      if (params.ownerId) q.append('ownerId', String(params.ownerId));
      if (params.page !== undefined) q.append('page', String(params.page));
      if (params.size !== undefined) q.append('size', String(params.size));
      if (params.sort) q.append('sort', params.sort);
      return request(`/projects?${q.toString()}`);
    },
    getById: (id: number): Promise<ProjectResponse> => request(`/projects/${id}`),
    create: (project: { name: string; description?: string }): Promise<ProjectResponse> => request('/projects', {
      method: 'POST',
      body: JSON.stringify(project)
    }),
    update: (id: number, project: { name: string; description?: string }): Promise<ProjectResponse> => request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(project)
    }),
    delete: (id: number): Promise<void> => request(`/projects/${id}`, {
      method: 'DELETE'
    }),
    hardDelete: (id: number): Promise<void> => request(`/projects/${id}/hard`, {
      method: 'DELETE'
    }),
    restore: (id: number): Promise<ProjectResponse> => request(`/projects/${id}/restore`, {
      method: 'POST'
    }),
    listTasks: (id: number, params: Record<string, unknown> = {}): Promise<PageWrapper<TaskResponse>> => {
      const q = new URLSearchParams();
      Object.keys(params).forEach(key => {
        const val = params[key];
        if (val !== undefined && val !== null && val !== '') {
          q.append(key, String(val));
        }
      });
      return request<PageWrapper<TaskResponse>>(`/projects/${id}/tasks?${q.toString()}`);
    }
  },

  // Tasks API
  tasks: {
    list: (params: Record<string, unknown> = {}): Promise<PageWrapper<TaskResponse>> => {
      const q = new URLSearchParams();
      Object.keys(params).forEach(key => {
        const val = params[key];
        if (val !== undefined && val !== null && val !== '') {
          q.append(key, String(val));
        }
      });
      return request<PageWrapper<TaskResponse>>(`/tasks?${q.toString()}`);
    },
    getDeleted: (page = 0, size = 10): Promise<PageWrapper<TaskResponse>> => {
      return request(`/tasks/deleted?page=${page}&size=${size}`);
    },
    getBlocked: (): Promise<TaskResponse[]> => request('/tasks/blocked'),
    getBlockedPage: (page = 0, size = 10): Promise<PageWrapper<TaskResponse>> => {
      return request(`/tasks/blocked/page?page=${page}&size=${size}`);
    },
    getById: (id: number): Promise<TaskResponse> => request(`/tasks/${id}`),
    create: (task: Record<string, unknown>): Promise<TaskResponse> => request<TaskResponse>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task)
    }),
    update: (id: number, task: Record<string, unknown>): Promise<TaskResponse> => request<TaskResponse>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task)
    }),
    partialUpdate: (id: number, task: Record<string, unknown>): Promise<TaskResponse> => request<TaskResponse>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(task)
    }),
    delete: (id: number): Promise<void> => request(`/tasks/${id}`, {
      method: 'DELETE'
    }),
    hardDelete: (id: number): Promise<void> => request(`/tasks/${id}/hard`, {
      method: 'DELETE'
    }),
    restore: (id: number): Promise<TaskResponse> => request(`/tasks/${id}/restore`, {
      method: 'POST'
    }),
    changeStatus: (id: number, status: string): Promise<TaskResponse> => request(`/tasks/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    }),
    transition: (id: number, targetStatus: string, reason?: string): Promise<unknown> => request<unknown>(`/tasks/${id}/transitions`, {
      method: 'POST',
      body: JSON.stringify({ targetStatus, reason })
    }),
    changePriority: (id: number, priority: string): Promise<TaskResponse> => request(`/tasks/${id}/priority`, {
      method: 'POST',
      body: JSON.stringify({ priority })
    }),
    
    // Comments Nested
    listComments: (taskId: number, page = 0, size = 20): Promise<PageWrapper<TaskCommentResponse>> => {
      return request(`/tasks/${taskId}/comments?page=${page}&size=${size}&sort=createdAt,asc`);
    },
    createComment: (taskId: number, comment: { type: string; body: string }): Promise<TaskCommentResponse> => {
      return request(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify(comment)
      });
    },
    updateComment: (taskId: number, commentId: number, body: string): Promise<TaskCommentResponse> => {
      return request(`/tasks/${taskId}/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ body })
      });
    },
    deleteComment: (taskId: number, commentId: number): Promise<void> => {
      return request(`/tasks/${taskId}/comments/${commentId}`, {
        method: 'DELETE'
      });
    },

    // Acceptance Criteria Nested
    listCriteria: (taskId: number): Promise<AcceptanceCriteriaResponse[]> => {
      return request(`/tasks/${taskId}/acceptance-criteria`);
    },
    createCriteria: (taskId: number, text: string): Promise<AcceptanceCriteriaResponse> => {
      return request(`/tasks/${taskId}/acceptance-criteria`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });
    },
    bulkCreateCriteria: (taskId: number, items: string[]): Promise<AcceptanceCriteriaResponse[]> => {
      return request(`/tasks/${taskId}/acceptance-criteria/bulk`, {
        method: 'POST',
        body: JSON.stringify({ items })
      });
    },
    updateCriteria: (taskId: number, criteriaId: number, text: string): Promise<AcceptanceCriteriaResponse> => {
      return request(`/tasks/${taskId}/acceptance-criteria/${criteriaId}`, {
        method: 'PATCH',
        body: JSON.stringify({ text })
      });
    },
    completeCriteria: (taskId: number, criteriaId: number): Promise<AcceptanceCriteriaResponse> => {
      return request(`/tasks/${taskId}/acceptance-criteria/${criteriaId}/complete`, {
        method: 'PATCH'
      });
    },
    reopenCriteria: (taskId: number, criteriaId: number): Promise<AcceptanceCriteriaResponse> => {
      return request(`/tasks/${taskId}/acceptance-criteria/${criteriaId}/reopen`, {
        method: 'PATCH'
      });
    },
    deleteCriteria: (taskId: number, criteriaId: number): Promise<void> => {
      return request(`/tasks/${taskId}/acceptance-criteria/${criteriaId}`, {
        method: 'DELETE'
      });
    },
    aiCriteriaDraft: (taskId: number): Promise<{ taskId: number; suggestions: string[] }> => {
      return request(`/tasks/${taskId}/ai/acceptance-criteria/draft`, {
        method: 'POST'
      });
    },

    // Dependencies
    listDependencies: (taskId: number): Promise<TaskDependencyResponse[]> => {
      return request(`/tasks/${taskId}/dependencies`);
    },
    listBlockedTasksOfDependency: (taskId: number): Promise<TaskResponse[]> => {
      return request(`/tasks/${taskId}/blocked-tasks`);
    },
    addDependency: (taskId: number, dependsOnTaskId: number): Promise<TaskDependencyResponse> => {
      return request(`/tasks/${taskId}/dependencies/${dependsOnTaskId}`, {
        method: 'POST'
      });
    },
    removeDependency: (taskId: number, dependsOnTaskId: number): Promise<void> => {
      return request(`/tasks/${taskId}/dependencies/${dependsOnTaskId}`, {
        method: 'DELETE'
      });
    },

    // Timeline
    getTimeline: (taskId: number, page = 0, size = 20): Promise<PageWrapper<TaskActivityResponse>> => {
      return request(`/tasks/${taskId}/timeline?page=${page}&size=${size}&sort=createdAt,desc`);
    }
  }
};

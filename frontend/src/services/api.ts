import axios, { AxiosInstance, AxiosResponse } from "axios";
import {
  User,
  Group,
  Expense,
  Settlement,
  RegisterData,
  LoginData,
  ApiResponse,
  PaginatedResponse,
} from "../types";

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> => {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>(
      "/auth/login",
      {
        email,
        password,
      }
    );
    return response.data.data || response.data;
  },

  register: async (
    userData: RegisterData
  ): Promise<{ user: User; token: string }> => {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>(
      "/auth/register",
      userData
    );
    return response.data.data || response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>("/auth/profile");
    return response.data.user || response.data.data;
  },

  updateProfile: async (userData: Partial<User>): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(
      "/auth/profile",
      userData
    );
    return response.data.user || response.data.data;
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    await api.put("/auth/change-password", { currentPassword, newPassword });
  },

  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get<ApiResponse<{ users: User[] }>>(
      "/auth/users"
    );
    return response.data.users || response.data.data || [];
  },
};

// Groups API
export const groupsApi = {
  createGroup: async (groupData: {
    name: string;
    description?: string;
    currency?: string;
  }): Promise<Group> => {
    const response = await api.post<ApiResponse<Group>>("/groups", groupData);
    return response.data.group || response.data.data;
  },

  getUserGroups: async (): Promise<Group[]> => {
    const response = await api.get<ApiResponse<Group[]>>("/groups");
    return response.data.groups || response.data.data;
  },

  getGroup: async (groupId: string): Promise<Group> => {
    const response = await api.get<ApiResponse<Group>>(`/groups/${groupId}`);
    return response.data.group || response.data.data;
  },

  updateGroup: async (
    groupId: string,
    groupData: Partial<Group>
  ): Promise<Group> => {
    const response = await api.put<ApiResponse<Group>>(
      `/groups/${groupId}`,
      groupData
    );
    return response.data.group || response.data.data;
  },

  deleteGroup: async (groupId: string): Promise<void> => {
    await api.delete(`/groups/${groupId}`);
  },

  addMember: async (
    groupId: string,
    email: string,
    role?: string
  ): Promise<Group> => {
    const response = await api.post<ApiResponse<Group>>(
      `/groups/${groupId}/members`,
      { email, role }
    );
    return response.data.group || response.data.data;
  },

  removeMember: async (groupId: string, userId: string): Promise<void> => {
    await api.delete(`/groups/${groupId}/members/${userId}`);
  },

  changeMemberRole: async (
    groupId: string,
    userId: string,
    role: string
  ): Promise<void> => {
    await api.put(`/groups/${groupId}/members/${userId}/role`, { role });
  },
};

// Expenses API
export const expensesApi = {
  getUserExpenses: async (params?: {
    groupId?: string;
  }): Promise<{ expenses: Expense[] }> => {
    const response = await api.get<ApiResponse<{ expenses: Expense[] }>>(
      "/expenses",
      { params }
    );
    return response.data;
  },

  createExpense: async (expenseData: {
    description: string;
    amount: number;
    groupId: string;
    category?: string;
    date?: string;
    notes?: string;
    splitType?: string;
    customSplits?: any[];
  }): Promise<{ expense: Expense }> => {
    const response = await api.post<ApiResponse<{ expense: Expense }>>(
      "/expenses",
      expenseData
    );
    return response.data;
  },

  getGroupExpenses: async (
    groupId: string,
    params?: {
      page?: number;
      limit?: number;
      category?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResponse<Expense>> => {
    const response = await api.get<PaginatedResponse<Expense>>(
      `/expenses/groups/${groupId}/expenses`,
      { params }
    );
    return response.data;
  },

  getExpense: async (expenseId: string): Promise<Expense> => {
    const response = await api.get<ApiResponse<Expense>>(
      `/expenses/expenses/${expenseId}`
    );
    return response.data.expense || response.data.data;
  },

  updateExpense: async (
    expenseId: string,
    expenseData: {
      description?: string;
      amount?: number;
      category?: string;
      date?: string;
      notes?: string;
      splitType?: string;
      customSplits?: any[];
    }
  ): Promise<{ expense: Expense }> => {
    const response = await api.put<ApiResponse<{ expense: Expense }>>(
      `/expenses/${expenseId}`,
      expenseData
    );
    return response.data;
  },

  deleteExpense: async (expenseId: string): Promise<void> => {
    await api.delete(`/expenses/${expenseId}`);
  },

  markSplitAsPaid: async (expenseId: string, userId: string): Promise<void> => {
    await api.put(`/expenses/expenses/${expenseId}/splits/${userId}/paid`);
  },

  getExpenseSummary: async (groupId: string): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(
      `/expenses/groups/${groupId}/expenses/summary`
    );
    return response.data.summary || response.data.data;
  },
};

// Settlements API
export const settlementsApi = {
  calculateSettlements: async (groupId: string): Promise<Settlement[]> => {
    const response = await api.get<ApiResponse<Settlement[]>>(
      `/settlements/groups/${groupId}/settlements/calculate`
    );
    return response.data.settlements || response.data.data;
  },

  getGroupSettlements: async (
    groupId: string,
    params?: { status?: string }
  ): Promise<{ settlements: Settlement[] }> => {
    const response = await api.get<ApiResponse<{ settlements: Settlement[] }>>(
      `/settlements/group/${groupId}`,
      { params }
    );
    return response.data;
  },

  getUserSettlements: async (params?: {
    groupId?: string;
    status?: string;
  }): Promise<{ settlements: Settlement[] }> => {
    const response = await api.get<ApiResponse<{ settlements: Settlement[] }>>(
      "/settlements",
      { params }
    );
    return response.data;
  },

  createSettlement: async (settlementData: {
    toUserId: string;
    groupId: string;
    amount: number;
    method?: string;
    notes?: string;
  }): Promise<{ settlement: Settlement }> => {
    const response = await api.post<ApiResponse<{ settlement: Settlement }>>(
      "/settlements",
      settlementData
    );
    return response.data;
  },

  updateSettlementStatus: async (
    settlementId: string,
    statusData: { status: string; method?: string; notes?: string }
  ): Promise<{ settlement: Settlement }> => {
    const response = await api.put<ApiResponse<{ settlement: Settlement }>>(
      `/settlements/${settlementId}`,
      statusData
    );
    return response.data;
  },

  deleteSettlement: async (settlementId: string): Promise<void> => {
    await api.delete(`/settlements/${settlementId}`);
  },

  getSettlementStats: async (params?: {
    groupId?: string;
  }): Promise<{ stats: any }> => {
    const response = await api.get<ApiResponse<{ stats: any }>>(
      "/settlements/stats",
      { params }
    );
    return response.data;
  },
};

export default api;

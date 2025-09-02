export interface User {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  groups: string[];
  createdAt: string;
}

export interface Group {
  _id: string;
  name: string;
  description?: string;
  members: GroupMember[];
  expenses: string[];
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  user: User;
  role: "admin" | "member";
  joinedAt: string;
}

export interface Expense {
  _id: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: User;
  paidByMultiple?: PaidByMultiple[];
  group?: string | Group;
  category:
    | "food"
    | "transport"
    | "entertainment"
    | "shopping"
    | "bills"
    | "other";
  date: string;
  splits: ExpenseSplit[];
  splitType: "equal" | "percentage" | "custom";
  notes?: string;
  receipt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaidByMultiple {
  user: User;
  amount: number;
}

export interface ExpenseSplit {
  user: User;
  amount: number;
  percentage: number;
  isPaid: boolean;
}

export interface Settlement {
  _id: string;
  fromUser: User;
  toUser: User;
  group: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "cancelled";
  method: "cash" | "bank_transfer" | "digital_wallet" | "other";
  notes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalPages: number;
  currentPage: number;
  total: number;
}

import React, { useState, useEffect } from "react";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Users,
  DollarSign,
  Calendar,
  Tag,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { expensesApi, groupsApi } from "../services/api";
import { Expense, Group } from "../types";
import { formatCurrency } from "../utils/currency";
import toast from "react-hot-toast";

const Expenses: React.FC = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Quick add form state
  const [quickAddForm, setQuickAddForm] = useState({
    description: "",
    amount: "",
    groupId: "",
    category: "food",
  });

  // Full create/edit form state
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    groupId: "",
    category: "food",
    date: new Date().toISOString().split("T")[0],
    splitType: "equal" as "equal" | "percentage" | "custom",
    customSplits: [] as { userId: string; amount: number }[],
    notes: "",
  });

  useEffect(() => {
    fetchExpenses();
    fetchGroups();
  }, [selectedGroup]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedGroup) params.groupId = selectedGroup;

      const response = await expensesApi.getUserExpenses(params);
      setExpenses(response.expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const userGroups = await groupsApi.getUserGroups();
      setGroups(userGroups);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !quickAddForm.description ||
      !quickAddForm.amount ||
      !quickAddForm.groupId
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const expenseData = {
        description: quickAddForm.description,
        amount: parseFloat(quickAddForm.amount),
        groupId: quickAddForm.groupId,
        category: quickAddForm.category,
        date: new Date().toISOString(),
        splitType: "equal" as const,
        notes: "",
      };

      await expensesApi.createExpense(expenseData);
      await fetchExpenses();
      setQuickAddForm({
        description: "",
        amount: "",
        groupId: "",
        category: "food",
      });
      setShowQuickAdd(false);
      toast.success("Expense added successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add expense");
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "food":
        return "🍽️";
      case "transport":
        return "🚗";
      case "entertainment":
        return "🎬";
      case "shopping":
        return "🛍️";
      case "utilities":
        return "⚡";
      case "health":
        return "🏥";
      case "travel":
        return "✈️";
      case "other":
        return "📝";
      default:
        return "📝";
    }
  };

  const getSplitTypeColor = (splitType: string) => {
    switch (splitType) {
      case "equal":
        return "bg-blue-100 text-blue-800";
      case "percentage":
        return "bg-green-100 text-green-800";
      case "custom":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredExpenses = expenses.filter(
    (expense) =>
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
            <p className="text-gray-600 mt-1">
              Track and manage your shared expenses
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowQuickAdd(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Quick Add</span>
            </button>
            <button
              onClick={() => {
                setEditingExpense(null);
                setExpenseForm({
                  description: "",
                  amount: "",
                  groupId: "",
                  category: "food",
                  date: new Date().toISOString().split("T")[0],
                  splitType: "equal",
                  customSplits: [],
                  notes: "",
                });
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Receipt className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Expenses
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {expenses.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-success-600">
                {formatCurrency(
                  expenses.reduce((sum, expense) => sum + expense.amount, 0)
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <Users className="h-6 w-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Groups</p>
              <p className="text-2xl font-bold text-warning-600">
                {groups.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-info-100 rounded-lg">
              <Calendar className="h-6 w-6 text-info-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-info-600">
                {formatCurrency(
                  expenses
                    .filter((expense) => {
                      const expenseDate = new Date(expense.date);
                      const now = new Date();
                      return (
                        expenseDate.getMonth() === now.getMonth() &&
                        expenseDate.getFullYear() === now.getFullYear()
                      );
                    })
                    .reduce((sum, expense) => sum + expense.amount, 0)
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Groups</option>
            {groups.map((group) => (
              <option key={group._id} value={group._id}>
                {group.name}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Expenses
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredExpenses.length === 0 ? (
            <div className="p-6 text-center">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No expenses found</p>
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <div key={expense._id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">
                      {getCategoryIcon(expense.category)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {expense.description}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{expense.group.name}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(expense.date)}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Tag className="h-4 w-4" />
                          <span className="capitalize">{expense.category}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(expense.amount)}
                      </p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSplitTypeColor(
                          expense.splitType
                        )}`}
                      >
                        {expense.splitType}
                      </span>
                    </div>

                    <div className="flex space-x-2">
                      <button className="p-2 text-gray-400 hover:text-primary-600 transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-danger-600 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Add Expense
            </h3>
            <form onSubmit={handleQuickAdd}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={quickAddForm.description}
                    onChange={(e) =>
                      setQuickAddForm({
                        ...quickAddForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="What did you spend on?"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (LKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickAddForm.amount}
                    onChange={(e) =>
                      setQuickAddForm({
                        ...quickAddForm,
                        amount: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group
                  </label>
                  <select
                    value={quickAddForm.groupId}
                    onChange={(e) =>
                      setQuickAddForm({
                        ...quickAddForm,
                        groupId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="">Select a group</option>
                    {groups.map((group) => (
                      <option key={group._id} value={group._id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={quickAddForm.category}
                    onChange={(e) =>
                      setQuickAddForm({
                        ...quickAddForm,
                        category: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="food">Food & Dining</option>
                    <option value="transport">Transportation</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="shopping">Shopping</option>
                    <option value="utilities">Utilities</option>
                    <option value="health">Health & Medical</option>
                    <option value="travel">Travel</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;

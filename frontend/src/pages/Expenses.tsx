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
import AddExpenseModal from "../components/AddExpenseModal";

const Expenses: React.FC = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);

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

  const filteredExpenses = expenses.filter((expense) => {
    // Filter by group
    if (selectedGroup === "no-group") {
      // Show only non-group expenses
      if (expense.group && typeof expense.group === "object") {
        return false;
      }
    } else if (selectedGroup) {
      // Show only expenses from selected group
      if (
        !expense.group ||
        (typeof expense.group === "object" &&
          expense.group._id !== selectedGroup)
      ) {
        return false;
      }
    }

    // Filter by search term
    return (
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={`skeleton-${i}`}
                className="bg-white p-6 rounded-lg shadow"
              >
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
              onClick={() => setShowAddExpenseModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
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
              <p className="text-sm font-medium text-gray-600">
                Group Expenses
              </p>
              <p className="text-2xl font-bold text-warning-600">
                {
                  expenses.filter(
                    (expense) =>
                      expense.group && typeof expense.group === "object"
                  ).length
                }
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
              <p className="text-sm font-medium text-gray-600">
                Non-Group Expenses
              </p>
              <p className="text-2xl font-bold text-info-600">
                {
                  expenses.filter(
                    (expense) =>
                      !expense.group ||
                      (typeof expense.group === "string" &&
                        !groups.some((g) => g._id === expense.group))
                  ).length
                }
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
            <option value="">All Expenses</option>
            <option value="no-group">Non-Group Expenses</option>
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
            filteredExpenses.map((expense) => {
              const userSplit = expense.splits.find(
                (split) => split.user._id === user?._id
              );
              const otherSplits = expense.splits.filter(
                (split) => split.user._id !== user?._id
              );
              const isUserPayer = expense.paidBy._id === user?._id;
              const userOweAmount = userSplit?.amount || 0;
              const userPaidAmount = isUserPayer ? expense.amount : 0;

              return (
                <div
                  key={expense._id}
                  className="p-6 border-b border-gray-200 last:border-b-0"
                >
                  {/* Expense Header */}
                  <div className="flex items-center justify-between mb-4">
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
                            <span>
                              {expense.group &&
                              typeof expense.group === "object"
                                ? expense.group.name
                                : "No Group"}
                            </span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(expense.date)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Tag className="h-4 w-4" />
                            <span className="capitalize">
                              {expense.category}
                            </span>
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

                  {/* Payment Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {/* Who Paid */}
                    <div>
                      <p className="font-medium text-gray-700 mb-2">Paid by:</p>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">
                          {expense.paidBy.firstName} {expense.paidBy.lastName}
                        </span>
                        {isUserPayer && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            You
                          </span>
                        )}
                      </div>
                      {expense.paidByMultiple &&
                        expense.paidByMultiple.length > 0 && (
                          <div className="mt-2">
                            {expense.paidByMultiple.map((payer, index) => (
                              <div
                                key={`payer-${payer.user._id}-${index}`}
                                className="text-xs text-gray-500"
                              >
                                {payer.user.firstName} {payer.user.lastName}:{" "}
                                {formatCurrency(payer.amount)}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>

                    {/* Your Status */}
                    <div>
                      <p className="font-medium text-gray-700 mb-2">
                        Your status:
                      </p>
                      <div className="space-y-1">
                        {isUserPayer ? (
                          <div className="flex items-center justify-between">
                            <span className="text-green-600">You paid</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(userPaidAmount)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-orange-600">You owe</span>
                            <span className="font-medium text-orange-600">
                              {formatCurrency(userOweAmount)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Status</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              userSplit?.isPaid
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {userSplit?.isPaid ? "Paid" : "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Other Participants */}
                    <div>
                      <p className="font-medium text-gray-700 mb-2">
                        Other participants:
                      </p>
                      <div className="space-y-1">
                        {otherSplits.length > 0 ? (
                          otherSplits.map((split) => (
                            <div
                              key={split.user._id}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-gray-600">
                                {split.user.firstName} {split.user.lastName}
                              </span>
                              <div className="flex items-center space-x-1">
                                <span className="text-gray-500">
                                  {formatCurrency(split.amount)}
                                </span>
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    split.isPaid
                                      ? "bg-green-400"
                                      : "bg-yellow-400"
                                  }`}
                                ></span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">
                            No other participants
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
        onExpenseAdded={() => {
          fetchExpenses();
          setShowAddExpenseModal(false);
        }}
      />
    </div>
  );
};

export default Expenses;

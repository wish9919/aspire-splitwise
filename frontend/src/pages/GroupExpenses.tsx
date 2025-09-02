import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  Calendar,
  Tag,
  DollarSign,
  Edit,
  Trash2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { groupsApi, expensesApi } from "../services/api";
import { Group, Expense } from "../types";
import { formatCurrency } from "../utils/currency";
import toast from "react-hot-toast";
import AddExpenseModal from "../components/AddExpenseModal";
import EditExpenseModal from "../components/EditExpenseModal";

const GroupExpenses: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Filtering and pagination states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [limit] = useState(20);

  const categories = [
    "all",
    "food",
    "transport",
    "entertainment",
    "shopping",
    "bills",
    "other",
  ];

  useEffect(() => {
    if (groupId) {
      loadGroupData();
      loadExpenses();
    }
  }, [groupId, currentPage, selectedCategory, startDate, endDate]);

  const loadGroupData = async () => {
    if (!groupId) return;

    try {
      const groupData = await groupsApi.getGroup(groupId);
      setGroup(groupData);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load group data");
      toast.error("Failed to load group data");
    }
  };

  const loadExpenses = async () => {
    if (!groupId) return;

    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit,
      };

      if (selectedCategory && selectedCategory !== "all") {
        params.category = selectedCategory;
      }
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await expensesApi.getGroupExpenses(groupId, params);

      // Remove duplicates and sort by date (latest first)
      const uniqueExpenses = (response.data || []).filter(
        (expense, index, self) =>
          index === self.findIndex((e) => e._id === expense._id)
      );

      const sortedExpenses = uniqueExpenses.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setExpenses(sortedExpenses);
      setTotalPages(response.totalPages || 1);
      setTotalExpenses(response.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load expenses");
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = () => {
    setShowAddExpenseModal(true);
  };

  const handleExpenseAdded = () => {
    loadExpenses(); // Reload expenses to show the new expense
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadExpenses();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
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
      case "bills":
        return "📄";
      default:
        return "💰";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowEditExpenseModal(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        await expensesApi.deleteExpense(expenseId);
        toast.success("Expense deleted successfully");
        loadExpenses(); // Reload data
      } catch (error: any) {
        console.error("Delete expense error:", error);
        toast.error(
          error.response?.data?.message || "Failed to delete expense"
        );
      }
    }
  };

  const handleExpenseUpdated = () => {
    loadExpenses(); // Reload data to show the updated expense
  };

  const filteredExpenses = expenses.filter((expense) =>
    searchTerm
      ? expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.paidBy.firstName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        expense.paidBy.lastName.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  if (loading && !group) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="px-4 py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Group Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "The group you're looking for doesn't exist."}
          </p>
          <button
            onClick={() => navigate("/groups")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Groups
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/groups/${groupId}`)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Group</span>
            </button>
          </div>
          <button
            onClick={handleAddExpense}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Expense</span>
          </button>
        </div>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {group.name} Expenses
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>{totalExpenses} expenses</span>
              <span>•</span>
              <span>Currency: {group.currency}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </form>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.slice(1).map((category) => (
              <option key={category} value={category}>
                {getCategoryIcon(category)}{" "}
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>

          {/* Date Filters */}
          <div className="flex space-x-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Start Date"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="End Date"
            />
          </div>

          {/* Clear Filters */}
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <div className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={`skeleton-${i}`} className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredExpenses.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredExpenses.map((expense) => {
              const isUserPayer = expense.paidBy._id === user?._id;
              const userSplit = expense.splits.find(
                (split) => split.user._id === user?._id
              );
              const allSplits = expense.splits;

              return (
                <div key={expense._id} className="p-6">
                  {/* Expense Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">
                        {getCategoryIcon(expense.category)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {expense.description}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
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
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(expense.amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {expense.currency}
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEditExpense(expense)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit expense"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense._id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Who Paid */}
                    <div>
                      <p className="font-medium text-gray-700 mb-2">Paid by:</p>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">
                          {expense.paidBy.firstName} {expense.paidBy.lastName}
                        </span>
                        {isUserPayer && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
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
                          <div className="text-sm text-gray-600">
                            You paid {formatCurrency(expense.amount)}
                          </div>
                        ) : userSplit ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">You owe</span>
                              <span className="font-medium text-gray-900">
                                {formatCurrency(userSplit.amount)}
                              </span>
                            </div>
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
                        ) : (
                          <div className="text-sm text-gray-500">
                            You're not involved in this expense
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Other Participants */}
                  {allSplits.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Participants:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {allSplits.map((split) => (
                          <div
                            key={split.user._id}
                            className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg"
                          >
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium text-xs">
                                {split.user.firstName[0]}
                                {split.user.lastName[0]}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-900">
                                {split.user.firstName} {split.user.lastName}
                              </span>
                              <span className="text-gray-500 ml-1">
                                ({formatCurrency(split.amount)})
                              </span>
                            </div>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                split.isPaid ? "bg-green-400" : "bg-yellow-400"
                              }`}
                            ></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {expense.notes && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Notes:</span>{" "}
                        {expense.notes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <DollarSign className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No expenses found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || selectedCategory !== "all" || startDate || endDate
                ? "Try adjusting your filters to see more expenses."
                : "Get started by adding the first expense to this group."}
            </p>
            <button
              onClick={handleAddExpense}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Expense
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * limit + 1} to{" "}
                {Math.min(currentPage * limit, totalExpenses)} of{" "}
                {totalExpenses} expenses
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded">
                  {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {group && (
        <AddExpenseModal
          isOpen={showAddExpenseModal}
          onClose={() => setShowAddExpenseModal(false)}
          group={group}
          onExpenseAdded={handleExpenseAdded}
        />
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <EditExpenseModal
          isOpen={showEditExpenseModal}
          onClose={() => {
            setShowEditExpenseModal(false);
            setEditingExpense(null);
          }}
          expense={editingExpense}
          group={group}
          onExpenseUpdated={handleExpenseUpdated}
        />
      )}
    </div>
  );
};

export default GroupExpenses;

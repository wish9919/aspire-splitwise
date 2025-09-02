import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Receipt,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Edit,
  Trash2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { groupsApi, expensesApi, settlementsApi } from "../services/api";
import { Group, Expense, Settlement } from "../types";
import { formatCurrency } from "../utils/currency";
import toast from "react-hot-toast";
import AddExpenseModal from "../components/AddExpenseModal";
import EditExpenseModal from "../components/EditExpenseModal";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalExpenses: 0,
    totalOwed: 0,
    totalOwing: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch user groups
      const userGroups = await groupsApi.getUserGroups();
      setGroups(userGroups);

      // Fetch all user expenses (both group and non-group)
      const allExpenses: Expense[] = [];

      // Fetch all user expenses in one call to avoid duplicates
      try {
        const userExpensesResponse = await expensesApi.getUserExpenses();
        allExpenses.push(...userExpensesResponse.expenses);
      } catch (error) {
        console.error("Error fetching user expenses:", error);
      }

      // Remove duplicates and sort by date, then take most recent
      const uniqueExpenses = allExpenses.filter(
        (expense, index, self) =>
          index === self.findIndex((e) => e._id === expense._id)
      );

      const sortedExpenses = uniqueExpenses
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      setRecentExpenses(sortedExpenses);

      // Fetch user settlements
      const userSettlements = await settlementsApi.getUserSettlements();
      setSettlements(userSettlements.settlements);

      // Calculate stats
      const totalExpenses = allExpenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
      );

      // Calculate what user is owed (money others owe to user)
      const totalOwed = allExpenses.reduce((sum, expense) => {
        // If user paid for this expense, they are owed money from others
        if (expense.paidBy._id === user?._id) {
          const unpaidSplits = expense.splits.filter((split) => !split.isPaid);
          return (
            sum +
            unpaidSplits.reduce((splitSum, split) => splitSum + split.amount, 0)
          );
        }
        return sum;
      }, 0);

      // Calculate what user owes (money user owes to others)
      const totalOwing = allExpenses.reduce((sum, expense) => {
        // If user didn't pay for this expense, they might owe money
        if (expense.paidBy._id !== user?._id) {
          const userSplit = expense.splits.find(
            (split) => split.user._id === user?._id
          );
          if (userSplit && !userSplit.isPaid) {
            return sum + userSplit.amount;
          }
        }
        return sum;
      }, 0);

      setStats({
        totalGroups: userGroups.length,
        totalExpenses,
        totalOwed,
        totalOwing,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
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
        fetchDashboardData(); // Reload data
      } catch (error: any) {
        console.error("Delete expense error:", error);
        toast.error(
          error.response?.data?.message || "Failed to delete expense"
        );
      }
    }
  };

  const handleExpenseUpdated = () => {
    fetchDashboardData(); // Reload data to show the updated expense
  };

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
    <div className="px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your expenses
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddExpenseModal(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </button>
          <Link
            to="/groups"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Groups</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalGroups}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <Receipt className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Expenses
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalExpenses)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <ArrowUpRight className="h-6 w-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">You're Owed</p>
              <p className="text-2xl font-bold text-warning-600">
                {formatCurrency(stats.totalOwed)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-danger-100 rounded-lg">
              <ArrowDownRight className="h-6 w-6 text-danger-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">You Owe</p>
              <p className="text-2xl font-bold text-danger-600">
                {formatCurrency(stats.totalOwing)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Groups */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Your Groups
              </h2>
              <Link
                to="/groups"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            {groups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No groups yet</p>
                <Link
                  to="/groups"
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first group
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {groups.slice(0, 5).map((group) => (
                  <Link
                    key={group._id}
                    to={`/groups/${group._id}`}
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <Users className="h-5 w-5 text-primary-600" />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">
                          {group.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {group.members.length} member
                          {group.members.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-gray-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Expenses
              </h2>
              <Link
                to="/expenses"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentExpenses.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No expenses yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentExpenses.map((expense) => {
                  const userSplit = expense.splits.find(
                    (split) => split.user._id === user?._id
                  );
                  const allSplits = expense.splits;
                  const isUserPayer = expense.paidBy._id === user?._id;
                  const userOweAmount = userSplit?.amount || 0;
                  const userPaidAmount = isUserPayer ? expense.amount : 0;

                  return (
                    <div
                      key={expense._id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      {/* Expense Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div className="p-2 bg-success-100 rounded-lg">
                            <Receipt className="h-5 w-5 text-success-600" />
                          </div>
                          <div className="ml-3">
                            <p className="font-medium text-gray-900">
                              {expense.description}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(expense.date)} •{" "}
                              {expense.group &&
                              typeof expense.group === "object"
                                ? expense.group.name
                                : "No Group"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              {formatCurrency(expense.amount)}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {expense.category}
                            </p>
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

                      {/* Payment Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {/* Who Paid */}
                        <div>
                          <p className="font-medium text-gray-700 mb-1">
                            Paid by:
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">
                              {expense.paidBy.firstName}{" "}
                              {expense.paidBy.lastName}
                            </span>
                            {isUserPayer && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                You
                              </span>
                            )}
                          </div>
                          {expense.paidByMultiple &&
                            expense.paidByMultiple.length > 0 && (
                              <div className="mt-1">
                                {expense.paidByMultiple.map((payer, index) => (
                                  <div
                                    key={`payer-${payer.user._id}-${index}`}
                                    className="text-xs text-gray-500"
                                  >
                                    {payer.user.firstName} {payer.user.lastName}
                                    : {formatCurrency(payer.amount)}
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>

                        {/* Your Status */}
                        <div>
                          <p className="font-medium text-gray-700 mb-1">
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
                      </div>

                      {/* Other Participants */}
                      {allSplits.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-700 mb-2">
                            Participants:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {allSplits.map((split) => (
                              <div
                                key={split.user._id}
                                className="flex items-center space-x-1 text-xs bg-gray-100 px-2 py-1 rounded"
                              >
                                <span className="text-gray-600">
                                  {split.user.firstName} {split.user.lastName}
                                </span>
                                <span className="text-gray-500">
                                  ({formatCurrency(split.amount)})
                                </span>
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    split.isPaid
                                      ? "bg-green-400"
                                      : "bg-yellow-400"
                                  }`}
                                ></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending Settlements */}
      {settlements.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Settlements
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {settlements.slice(0, 3).map((settlement) => (
                <div
                  key={settlement._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="p-2 bg-warning-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-warning-600" />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">
                        {settlement.fromUser._id === user?._id
                          ? `You owe ${settlement.toUser.firstName}`
                          : `${settlement.fromUser.firstName} owes you`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(settlement.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(settlement.amount)}
                    </p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
                      Pending
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
        onExpenseAdded={() => {
          fetchDashboardData();
          setShowAddExpenseModal(false);
        }}
      />

      {/* Edit Expense Modal */}
      {editingExpense && (
        <EditExpenseModal
          isOpen={showEditExpenseModal}
          onClose={() => {
            setShowEditExpenseModal(false);
            setEditingExpense(null);
          }}
          expense={editingExpense}
          group={
            editingExpense.group && typeof editingExpense.group === "object"
              ? editingExpense.group
              : null
          }
          onExpenseUpdated={handleExpenseUpdated}
        />
      )}
    </div>
  );
};

export default Dashboard;

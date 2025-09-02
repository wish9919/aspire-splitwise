import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Receipt,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { groupsApi, expensesApi, settlementsApi } from "../services/api";
import { Group, Expense, Settlement } from "../types";
import { formatCurrency } from "../utils/currency";
import toast from "react-hot-toast";
import AddExpenseModal from "../components/AddExpenseModal";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
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

      // Fetch recent expenses from all groups
      const allExpenses: Expense[] = [];
      for (const group of userGroups) {
        try {
          const groupExpenses = await expensesApi.getGroupExpenses(group._id, {
            limit: 5,
          });
          allExpenses.push(...groupExpenses.data);
        } catch (error) {
          console.error(
            `Error fetching expenses for group ${group._id}:`,
            error
          );
        }
      }

      // Sort by date and take most recent
      const sortedExpenses = [...allExpenses]
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
      const userExpenses = allExpenses.filter(
        (expense) => expense.paidBy._id === user?._id
      );
      const userSplits = allExpenses.flatMap((expense) =>
        expense.splits.filter((split) => split.user._id === user?._id)
      );

      const totalOwed = userExpenses.reduce((sum, expense) => {
        const unpaidSplits = expense.splits.filter((split) => !split.isPaid);
        return (
          sum +
          unpaidSplits.reduce((splitSum, split) => splitSum + split.amount, 0)
        );
      }, 0);

      const totalOwing = userSplits
        .filter((split) => !split.isPaid)
        .reduce((sum, split) => sum + split.amount, 0);

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
                {recentExpenses.map((expense) => (
                  <div
                    key={expense._id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <div className="p-2 bg-success-100 rounded-lg">
                        <Receipt className="h-5 w-5 text-success-600" />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">
                          {expense.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          {expense.paidBy.firstName} •{" "}
                          {formatDate(expense.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(expense.amount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {expense.splits.find(
                          (split) => split.user._id === user?._id
                        )?.isPaid
                          ? "Paid"
                          : "Pending"}
                      </p>
                    </div>
                  </div>
                ))}
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
    </div>
  );
};

export default Dashboard;

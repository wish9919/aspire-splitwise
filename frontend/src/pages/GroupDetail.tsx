import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { groupsApi, expensesApi, settlementsApi } from "../services/api";
import { Group, Expense, Settlement } from "../types";
import toast from "react-hot-toast";
import AddExpenseModal from "../components/AddExpenseModal";
import InviteMemberModal from "../components/InviteMemberModal";
import EditGroupModal from "../components/EditGroupModal";

const GroupDetail: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);

  useEffect(() => {
    if (groupId) {
      loadGroupData();
    }
  }, [groupId]);

  const loadGroupData = async () => {
    if (!groupId) return;

    try {
      setLoading(true);
      setError(null);

      // Load group data, expenses, settlements, and summary in parallel
      const [groupData, expensesData, settlementsData, summaryData] =
        await Promise.all([
          groupsApi.getGroup(groupId),
          expensesApi.getGroupExpenses(groupId, { limit: 10 }),
          settlementsApi.getGroupSettlements(groupId),
          expensesApi.getExpenseSummary(groupId),
        ]);

      setGroup(groupData);

      // Remove duplicates and sort by date (latest first)
      const uniqueExpenses = (expensesData.data || []).filter(
        (expense, index, self) =>
          index === self.findIndex((e) => e._id === expense._id)
      );

      const sortedExpenses = uniqueExpenses.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setExpenses(sortedExpenses);

      setSettlements(settlementsData.settlements || []);
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load group data");
      toast.error("Failed to load group data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = () => {
    setShowAddExpenseModal(true);
  };

  const handleExpenseAdded = () => {
    loadGroupData(); // Reload data to show the new expense
  };

  const handleInviteMember = () => {
    setShowInviteMemberModal(true);
  };

  const handleEditGroup = () => {
    setShowEditGroupModal(true);
  };

  const handleMemberAdded = () => {
    loadGroupData(); // Reload data to show the new member
  };

  const handleGroupUpdated = () => {
    loadGroupData(); // Reload data to show the updated group info
  };

  if (loading) {
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

  const isAdmin = group.members.find(
    (member) => member.user._id === user?._id && member.role === "admin"
  );

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">
      {/* Group Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {group.name}
            </h1>
            {group.description && (
              <p className="text-gray-600 mb-4">{group.description}</p>
            )}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>{group.members.length} members</span>
              <span>•</span>
              <span>{expenses.length} expenses</span>
              <span>•</span>
              <span>Currency: {group.currency}</span>
            </div>
          </div>
          <div className="flex space-x-2">
            {isAdmin && (
              <button
                onClick={handleEditGroup}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Edit Group
              </button>
            )}
            <button
              onClick={handleAddExpense}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Expense
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Expense Summary */}
          {summary && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Expense Summary
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {group.currency} {summary.totalSpent?.toFixed(2) || "0.00"}
                  </div>
                  <div className="text-sm text-gray-600">Total Spent</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {group.currency} {summary.totalOwed?.toFixed(2) || "0.00"}
                  </div>
                  <div className="text-sm text-gray-600">Total Owed</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Expenses */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Recent Expenses
              </h2>
              <button
                onClick={() => navigate(`/groups/${groupId}/expenses`)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All
              </button>
            </div>
            {expenses.length > 0 ? (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div
                    key={expense._id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {expense.description}
                      </div>
                      <div className="text-sm text-gray-500">
                        Paid by {expense.paidBy.firstName}{" "}
                        {expense.paidBy.lastName}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {expense.currency} {expense.amount.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(expense.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No expenses yet. Add the first expense to get started!</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Members */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Members</h2>
              {isAdmin && (
                <button
                  onClick={handleInviteMember}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Invite
                </button>
              )}
            </div>
            <div className="space-y-3">
              {group.members.map((member) => (
                <div
                  key={member.user._id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-sm">
                        {member.user.firstName[0]}
                        {member.user.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.user.firstName} {member.user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {member.user.email}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      member.role === "admin"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Settlements */}
          {settlements.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Pending Settlements
              </h2>
              <div className="space-y-3">
                {settlements.slice(0, 3).map((settlement) => (
                  <div
                    key={settlement._id}
                    className="p-3 bg-yellow-50 rounded-lg"
                  >
                    <div className="text-sm text-gray-600">
                      {settlement.fromUser.firstName} owes{" "}
                      {settlement.toUser.firstName}
                    </div>
                    <div className="font-semibold text-gray-900">
                      {settlement.currency} {settlement.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
                {settlements.length > 3 && (
                  <button
                    onClick={() => navigate(`/groups/${groupId}/settlements`)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View all {settlements.length} settlements
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {group && (
        <>
          <AddExpenseModal
            isOpen={showAddExpenseModal}
            onClose={() => setShowAddExpenseModal(false)}
            group={group}
            onExpenseAdded={handleExpenseAdded}
          />
          <InviteMemberModal
            isOpen={showInviteMemberModal}
            onClose={() => setShowInviteMemberModal(false)}
            group={group}
            onMemberAdded={handleMemberAdded}
          />
          <EditGroupModal
            isOpen={showEditGroupModal}
            onClose={() => setShowEditGroupModal(false)}
            group={group}
            onGroupUpdated={handleGroupUpdated}
          />
        </>
      )}
    </div>
  );
};

export default GroupDetail;

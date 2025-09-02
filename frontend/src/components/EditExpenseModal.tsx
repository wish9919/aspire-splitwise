import React, { useState, useEffect } from "react";
import { X, DollarSign, Calendar, Tag, Plus, Trash2 } from "lucide-react";
import { expensesApi } from "../services/api";
import { Expense, Group, User, PaidByMultiple } from "../types";

import toast from "react-hot-toast";

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  group?: Group | null;
  onExpenseUpdated: () => void;
}

const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  isOpen,
  onClose,
  expense,
  group,
  onExpenseUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "other",
    date: "",
    notes: "",
    splitType: "equal",
  });

  // State for multiple payers
  const [paidByMultiple, setPaidByMultiple] = useState<PaidByMultiple[]>([]);
  const [participants, setParticipants] = useState<User[]>([]);
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});

  // User search states
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchMode, setSearchMode] = useState<"payer" | "participant">(
    "payer"
  );
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    if (isOpen && expense) {
      // Initialize form with expense data
      setFormData({
        description: expense.description,
        amount: expense.amount.toString(),
        category: expense.category,
        date: new Date(expense.date).toISOString().slice(0, 16),
        notes: expense.notes || "",
        splitType: expense.splitType,
      });

      // Initialize paidByMultiple
      if (expense.paidByMultiple && expense.paidByMultiple.length > 0) {
        setPaidByMultiple(expense.paidByMultiple);
      } else {
        // Single payer
        setPaidByMultiple([{ user: expense.paidBy, amount: expense.amount }]);
      }

      // Initialize participants
      if (group && group.members && Array.isArray(group.members)) {
        setParticipants(group.members.map((member) => member.user));
      } else {
        // For non-group expenses, get participants from splits
        const participantUsers = expense.splits
          ? expense.splits.map((split) => split.user)
          : [];
        setParticipants(participantUsers);
      }

      // Initialize custom splits if needed
      if (expense.splitType === "custom" && expense.splits) {
        const splits: Record<string, number> = {};
        expense.splits.forEach((split) => {
          if (split.user && split.user._id) {
            splits[split.user._id] = split.amount;
          }
        });
        setCustomSplits(splits);
      }

      loadAllUsers();
    }
  }, [isOpen, expense, group]);

  const loadAllUsers = async () => {
    try {
      // This would need to be implemented in the API
      // For now, we'll use the participants from the expense
      if (expense && expense.splits) {
        const allParticipantUsers = expense.splits
          .map((split) => split.user)
          .filter((user) => user);
        setAllUsers(allParticipantUsers);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.length > 0) {
      const filtered = allUsers.filter(
        (user) =>
          user?.firstName?.toLowerCase().includes(term.toLowerCase()) ||
          user?.lastName?.toLowerCase().includes(term.toLowerCase()) ||
          user?.email?.toLowerCase().includes(term.toLowerCase())
      );
      setSearchResults(filtered);
      setShowUserSearch(true);
    } else {
      setShowUserSearch(false);
    }
  };

  const addPaidByUser = (userToAdd: User) => {
    if (!paidByMultiple.find((p) => p.user._id === userToAdd._id)) {
      const newPayer: PaidByMultiple = {
        user: userToAdd,
        amount: 0,
      };
      setPaidByMultiple([...paidByMultiple, newPayer]);
    }
    setSearchTerm("");
    setShowUserSearch(false);
  };

  const removePaidByUser = (userId: string) => {
    setPaidByMultiple(paidByMultiple.filter((p) => p.user._id !== userId));
  };

  const updatePaidByAmount = (userId: string, amount: number) => {
    setPaidByMultiple(
      paidByMultiple.map((p) => (p.user._id === userId ? { ...p, amount } : p))
    );
  };

  const addParticipant = (userToAdd: User) => {
    if (!participants.find((p) => p._id === userToAdd._id)) {
      setParticipants([...participants, userToAdd]);
    }
    setSearchTerm("");
    setShowUserSearch(false);
  };

  const removeParticipant = (userId: string) => {
    setParticipants(participants.filter((p) => p._id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expense) return;

    try {
      setLoading(true);

      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      // Validate paidByMultiple amounts if multiple payers
      if (paidByMultiple.length > 1) {
        const totalPaidAmount = paidByMultiple.reduce(
          (sum, p) => sum + p.amount,
          0
        );
        if (Math.abs(totalPaidAmount - amount) > 0.01) {
          toast.error("Total paid amounts must equal the expense amount");
          return;
        }
      }

      // Validate participants for non-group expenses
      if (!group && participants.length === 0) {
        toast.error("Please select at least one participant");
        return;
      }

      const expenseData = {
        description: formData.description,
        amount,
        groupId: group?._id,
        category: formData.category,
        date: formData.date,
        notes: formData.notes,
        splitType: formData.splitType,
        participants: group
          ? undefined
          : participants.filter((p) => p && p._id).map((p) => p._id),
        paidByMultiple:
          paidByMultiple.length > 0
            ? paidByMultiple
                .filter((p) => p && p.user)
                .map((p) => ({
                  user: p.user._id,
                  amount: p.amount,
                }))
            : undefined,
        ...(formData.splitType === "custom" && {
          customSplits: Object.entries(customSplits).map(
            ([userId, amount]) => ({ userId, amount })
          ),
        }),
      };

      await expensesApi.updateExpense(expense._id, expenseData);
      toast.success("Expense updated successfully");
      onExpenseUpdated();
      onClose();
    } catch (error: any) {
      console.error("Update expense error:", error);
      toast.error(error.response?.data?.message || "Failed to update expense");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !expense) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Edit Expense</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description
            </label>
            <input
              type="text"
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                id="amount"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="datetime-local"
                id="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Category
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="food">🍽️ Food</option>
                <option value="transport">🚗 Transport</option>
                <option value="entertainment">🎬 Entertainment</option>
                <option value="shopping">🛍️ Shopping</option>
                <option value="bills">📄 Bills</option>
                <option value="other">💰 Other</option>
              </select>
            </div>
          </div>

          {/* Paid By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paid By
            </label>
            <div className="space-y-2">
              {paidByMultiple
                .filter((payer) => payer && payer.user)
                .map((payer, index) => (
                  <div
                    key={`payer-${payer.user._id}-${index}`}
                    className="flex items-center space-x-2"
                  >
                    <div className="flex-1 flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {payer.user.firstName?.[0]}
                          {payer.user.lastName?.[0]}
                        </span>
                      </div>
                      <span className="text-sm text-gray-700">
                        {payer.user.firstName} {payer.user.lastName}
                      </span>
                    </div>
                    {paidByMultiple.length > 1 && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={payer.amount}
                          onChange={(e) =>
                            updatePaidByAmount(
                              payer.user._id,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                        <button
                          type="button"
                          onClick={() => removePaidByUser(payer.user._id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

              <button
                type="button"
                onClick={() => {
                  setSearchMode("payer");
                  setShowUserSearch(true);
                }}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Payer</span>
              </button>
            </div>
          </div>

          {/* Participants (for non-group expenses) */}
          {!group && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Participants
              </label>
              <div className="space-y-2">
                {participants
                  .filter((participant) => participant && participant._id)
                  .map((participant) => (
                    <div
                      key={participant._id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-medium text-sm">
                            {participant.firstName?.[0]}
                            {participant.lastName?.[0]}
                          </span>
                        </div>
                        <span className="text-sm text-gray-700">
                          {participant.firstName} {participant.lastName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeParticipant(participant._id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                <button
                  type="button"
                  onClick={() => {
                    setSearchMode("participant");
                    setShowUserSearch(true);
                  }}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Participant</span>
                </button>
              </div>
            </div>
          )}

          {/* Split Type */}
          <div>
            <label
              htmlFor="splitType"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Split Type
            </label>
            <select
              id="splitType"
              value={formData.splitType}
              onChange={(e) =>
                setFormData({ ...formData, splitType: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="equal">Equal Split</option>
              <option value="percentage">Percentage Split</option>
              <option value="custom">Custom Split</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any additional notes..."
            />
          </div>

          {/* User Search Modal */}
          {showUserSearch && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {searchMode === "payer" ? "Add Payer" : "Add Participant"}
                  </h3>
                  <button
                    onClick={() => setShowUserSearch(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults
                    .filter((user) => user && user._id)
                    .map((user) => (
                      <div
                        key={user._id}
                        onClick={() => {
                          if (searchMode === "payer") {
                            addPaidByUser(user);
                          } else {
                            addParticipant(user);
                          }
                        }}
                        className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {user.firstName?.[0]}
                            {user.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditExpenseModal;

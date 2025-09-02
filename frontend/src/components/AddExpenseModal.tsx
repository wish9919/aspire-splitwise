import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { expensesApi, authApi } from "../services/api";
import { Group, User } from "../types";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { Search, Plus, X, Users } from "lucide-react";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: Group;
  onExpenseAdded: () => void;
}

// Removed PaidByUser interface - using single payer now

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  group,
  onExpenseAdded,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "other",
    date: new Date().toISOString().slice(0, 16),
    notes: "",
    splitType: "equal",
  });
  const [loading, setLoading] = useState(false);
  const [customSplits, setCustomSplits] = useState<{
    [userId: string]: number;
  }>({});
  const [selectedPayer, setSelectedPayer] = useState<User | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchMode, setSearchMode] = useState<"payer" | "participant">(
    "payer"
  );
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    if (isOpen && user) {
      // Initialize payer to current user
      setSelectedPayer(user);

      // Initialize participants based on group or empty for non-group expenses
      if (group) {
        const groupMembers = group.members.map((member) => member.user);
        setParticipants(groupMembers);
        // Initialize custom splits with equal amounts
        const equalAmount = 0;
        const initialSplits: { [userId: string]: number } = {};
        groupMembers.forEach((member) => {
          initialSplits[member._id] = equalAmount;
        });
        setCustomSplits(initialSplits);
      } else {
        setParticipants([]);
        setCustomSplits({});
      }

      // Load all users for search
      loadAllUsers();
    }
  }, [isOpen, group, user]);

  // Ensure payer is included in participants when payer changes
  useEffect(() => {
    if (
      selectedPayer &&
      !participants.find((p) => p._id === selectedPayer._id)
    ) {
      setParticipants((prev) => [...prev, selectedPayer]);
      setCustomSplits((prev) => ({
        ...prev,
        [selectedPayer._id]: 0,
      }));
    }
  }, [selectedPayer]);

  const loadAllUsers = async () => {
    try {
      const users = await authApi.getAllUsers();
      setAllUsers(users);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCustomSplitChange = (userId: string, amount: string) => {
    setCustomSplits((prev) => ({
      ...prev,
      [userId]: parseFloat(amount) || 0,
    }));
  };

  const handleSearchUsers = (term: string) => {
    setSearchTerm(term);
    if (term.length > 0) {
      const filtered = allUsers.filter(
        (user) =>
          user.firstName.toLowerCase().includes(term.toLowerCase()) ||
          user.lastName.toLowerCase().includes(term.toLowerCase()) ||
          user.email.toLowerCase().includes(term.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  };

  const addParticipant = (user: User) => {
    if (!participants.find((p) => p._id === user._id)) {
      setParticipants([...participants, user]);
      setCustomSplits((prev) => ({
        ...prev,
        [user._id]: 0,
      }));
    }
    setSearchTerm("");
    setSearchResults([]);
    setShowUserSearch(false);
  };

  const removeParticipant = (userId: string) => {
    setParticipants(participants.filter((p) => p._id !== userId));
    setCustomSplits((prev) => {
      const newSplits = { ...prev };
      delete newSplits[userId];
      return newSplits;
    });
  };

  const selectPayer = (user: User) => {
    setSelectedPayer(user);
    setSearchTerm("");
    setSearchResults([]);
    setShowUserSearch(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description.trim() || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (participants.length === 0) {
      toast.error("Please add at least one participant");
      return;
    }

    if (!selectedPayer) {
      toast.error("Please select a payer");
      return;
    }

    if (formData.splitType === "custom") {
      const totalCustomAmount = Object.values(customSplits).reduce(
        (sum, split) => sum + split,
        0
      );
      if (Math.abs(totalCustomAmount - amount) > 0.01) {
        toast.error("Custom split amounts must equal the total expense amount");
        return;
      }
    }

    try {
      setLoading(true);

      const expenseData = {
        description: formData.description,
        amount,
        groupId: group?._id,
        category: formData.category,
        date: formData.date,
        notes: formData.notes,
        splitType: formData.splitType,
        participants: group ? undefined : participants.map((p) => p._id),
        paidByMultiple: selectedPayer
          ? [{ user: selectedPayer._id, amount }]
          : undefined,
        ...(formData.splitType === "custom" && {
          customSplits: Object.entries(customSplits).map(
            ([userId, amount]) => ({ userId, amount })
          ),
        }),
      };

      // Debug: Log the expense data being sent
      console.log("Expense data being sent:", expenseData);

      await expensesApi.createExpense(expenseData);

      toast.success("Expense added successfully!");
      onExpenseAdded();
      onClose();

      // Reset form
      setFormData({
        description: "",
        amount: "",
        category: "other",
        date: new Date().toISOString().slice(0, 16),
        notes: "",
        splitType: "equal",
      });
      setSelectedPayer(null);
      setParticipants([]);
      setCustomSplits({});
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: "food", label: "Food & Dining" },
    { value: "transport", label: "Transportation" },
    { value: "entertainment", label: "Entertainment" },
    { value: "shopping", label: "Shopping" },
    { value: "bills", label: "Bills & Utilities" },
    { value: "other", label: "Other" },
  ];

  // Removed multiple payer calculations

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Expense" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Description *
          </label>
          <input
            type="text"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="What was this expense for?"
            required
          />
        </div>

        {/* Amount and Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Amount (LKR) *
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date */}
        <div>
          <label
            htmlFor="date"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Date *
          </label>
          <input
            type="datetime-local"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Paid By Section */}
        <div>
          <label
            htmlFor="paid-by-section"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Paid By
          </label>

          {/* Single Payer Selection */}
          {selectedPayer ? (
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-sm text-gray-700 flex-1">
                {selectedPayer.firstName} {selectedPayer.lastName}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPayer(null)}
                className="p-1 text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="text-sm text-gray-500 mb-3">No payer selected</div>
          )}

          {/* Select Payer Button */}
          <button
            type="button"
            onClick={() => {
              setSearchMode("payer");
              setShowUserSearch(true);
            }}
            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{selectedPayer ? "Change Payer" : "Select Payer"}</span>
          </button>

          {/* User Search */}
          {showUserSearch && (
            <div className="mt-2 border border-gray-300 rounded-lg p-3">
              <div className="relative">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => {
                        if (searchMode === "payer") {
                          selectPayer(user);
                        } else {
                          addParticipant(user);
                        }
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                    >
                      {user.firstName} {user.lastName} ({user.email})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Participants Section (for non-group expenses) */}
        {!group && (
          <div>
            <label
              htmlFor="participants-section"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Participants *
            </label>

            {participants.length > 0 && (
              <div className="space-y-2 mb-3">
                {participants.map((participant) => (
                  <div
                    key={participant._id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm text-gray-700">
                      {participant.firstName} {participant.lastName}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeParticipant(participant._id)}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setSearchMode("participant");
                setShowUserSearch(true);
              }}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="h-4 w-4" />
              <span>Add Participant</span>
            </button>
          </div>
        )}

        {/* Split Type */}
        <div>
          <label
            htmlFor="splitType"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            How to split
          </label>
          <select
            id="splitType"
            name="splitType"
            value={formData.splitType}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="equal">Split equally</option>
            <option value="custom">Custom amounts</option>
          </select>
        </div>

        {/* Custom Splits */}
        {formData.splitType === "custom" && (
          <div>
            <label
              htmlFor="custom-splits"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Split amounts
            </label>
            <div
              id="custom-splits"
              className="space-y-2 max-h-40 overflow-y-auto"
            >
              {participants.map((participant) => (
                <div
                  key={participant._id}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-gray-700">
                    {participant.firstName} {participant.lastName}
                  </span>
                  <input
                    type="number"
                    value={customSplits[participant._id] || 0}
                    onChange={(e) =>
                      handleCustomSplitChange(participant._id, e.target.value)
                    }
                    step="0.01"
                    min="0"
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Total: LKR{" "}
              {Object.values(customSplits)
                .reduce((sum, amount) => sum + amount, 0)
                .toFixed(2)}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Notes (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Any additional notes..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Expense"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddExpenseModal;

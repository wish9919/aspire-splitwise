import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { expensesApi } from "../services/api";
import { Group } from "../types";
import toast from "react-hot-toast";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  onExpenseAdded: () => void;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  group,
  onExpenseAdded,
}) => {
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "other",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    splitType: "equal",
  });
  const [loading, setLoading] = useState(false);
  const [customSplits, setCustomSplits] = useState<{
    [userId: string]: number;
  }>({});

  useEffect(() => {
    if (isOpen) {
      // Initialize custom splits with equal amounts
      const equalAmount = 0;
      const initialSplits: { [userId: string]: number } = {};
      group.members.forEach((member) => {
        initialSplits[member.user._id] = equalAmount;
      });
      setCustomSplits(initialSplits);
    }
  }, [isOpen, group.members]);

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
        groupId: group._id,
        category: formData.category,
        date: formData.date,
        notes: formData.notes,
        splitType: formData.splitType,
        ...(formData.splitType === "custom" && {
          customSplits: Object.entries(customSplits).map(
            ([userId, amount]) => ({ userId, amount })
          ),
        }),
      };

      await expensesApi.createExpense(expenseData);

      toast.success("Expense added successfully!");
      onExpenseAdded();
      onClose();

      // Reset form
      setFormData({
        description: "",
        amount: "",
        category: "other",
        date: new Date().toISOString().split("T")[0],
        notes: "",
        splitType: "equal",
      });
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
              Amount ({group.currency}) *
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
            Date
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

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
              {group.members.map((member) => (
                <div
                  key={member.user._id}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-gray-700">
                    {member.user.firstName} {member.user.lastName}
                  </span>
                  <input
                    type="number"
                    value={customSplits[member.user._id] || 0}
                    onChange={(e) =>
                      handleCustomSplitChange(member.user._id, e.target.value)
                    }
                    step="0.01"
                    min="0"
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Total: {group.currency}{" "}
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

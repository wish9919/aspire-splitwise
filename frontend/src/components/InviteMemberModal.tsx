import React, { useState } from "react";
import Modal from "./Modal";
import { groupsApi, authApi } from "../services/api";
import { Group, User } from "../types";
import toast from "react-hot-toast";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  onMemberAdded: () => void;
}

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  group,
  onMemberAdded,
}) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleEmailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    // Search for users if email is valid
    if (value.includes("@") && value.length > 3) {
      setSearchLoading(true);
      try {
        const users = await authApi.getAllUsers();
        const filtered = users.filter(
          (user) =>
            user.email.toLowerCase().includes(value.toLowerCase()) &&
            !group.members.some((member) => member.user._id === user._id)
        );
        setSearchResults(filtered.slice(0, 5)); // Limit to 5 results
      } catch (error) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleUserSelect = (user: User) => {
    setEmail(user.email);
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      setLoading(true);
      await groupsApi.addMember(group._id, email, role);

      toast.success("Member invited successfully!");
      onMemberAdded();
      onClose();

      // Reset form
      setEmail("");
      setRole("member");
      setSearchResults([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to invite member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Member" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Email Address *
          </label>
          <div className="relative">
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter email address"
              required
            />

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user._id}
                    type="button"
                    onClick={() => handleUserSelect(user)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </button>
                ))}
              </div>
            )}

            {searchLoading && (
              <div className="absolute right-3 top-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </div>

        {/* Role */}
        <div>
          <label
            htmlFor="role"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "member")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Admins can manage group settings and invite/remove members
          </p>
        </div>

        {/* Current Members */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Members
          </label>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {group.members.map((member) => (
              <div
                key={member.user._id}
                className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
              >
                <span className="text-gray-700">
                  {member.user.firstName} {member.user.lastName}
                </span>
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
            {loading ? "Inviting..." : "Invite Member"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default InviteMemberModal;

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Users,
  MoreVertical,
  Trash2,
  UserPlus,
  Calendar,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { groupsApi, authApi } from "../services/api";
import { Group, User } from "../types";
import toast from "react-hot-toast";

const Groups: React.FC = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    currency: "LKR",
  });
  const [newMember, setNewMember] = useState({
    userId: "",
    role: "member",
  });

  useEffect(() => {
    fetchGroups();
    fetchAllUsers();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const userGroups = await groupsApi.getUserGroups();
      setGroups(userGroups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const users = await authApi.getAllUsers();
      setAllUsers(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const group = await groupsApi.createGroup(newGroup);
      setGroups([...groups, group]);
      setShowCreateModal(false);
      setNewGroup({ name: "", description: "", currency: "LKR" });
      toast.success("Group created successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create group");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !newMember.userId) return;

    try {
      const selectedUser = allUsers.find((u) => u._id === newMember.userId);
      if (!selectedUser) {
        toast.error("Selected user not found");
        return;
      }

      await groupsApi.addMember(
        selectedGroup._id,
        selectedUser.email,
        newMember.role
      );
      await fetchGroups(); // Refresh groups to get updated member list
      setShowAddMemberModal(false);
      setNewMember({ userId: "", role: "member" });
      setSelectedGroup(null);
      toast.success("Member added successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add member");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this group? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await groupsApi.deleteGroup(groupId);
      setGroups(groups.filter((group) => group._id !== groupId));
      toast.success("Group deleted successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete group");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isGroupAdmin = (group: Group) => {
    return group.members.some(
      (member) => member.user._id === user?._id && member.role === "admin"
    );
  };

  const getAvailableUsers = (group: Group) => {
    const memberIds = group.members.map((member) => member.user._id);
    return allUsers.filter(
      (u) => u._id !== user?._id && !memberIds.includes(u._id)
    );
  };

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
          <p className="text-gray-600 mt-1">
            Manage your expense groups and members
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </button>
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No groups yet
          </h3>
          <p className="text-gray-500 mb-6">
            Create your first group to start splitting expenses with friends
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create your first group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div
              key={group._id}
              className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Users className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {group.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {group.members.length} member
                        {group.members.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {group.description && (
                  <p className="text-gray-600 text-sm mb-4">
                    {group.description}
                  </p>
                )}

                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <Calendar className="h-4 w-4 mr-1" />
                  Created {formatDate(group.createdAt)}
                </div>

                <div className="flex items-center justify-between">
                  <Link
                    to={`/groups/${group._id}`}
                    className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                  >
                    View Details →
                  </Link>

                  {isGroupAdmin(group) && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedGroup(group);
                          setShowAddMemberModal(true);
                        }}
                        className="p-1 text-gray-400 hover:text-primary-600"
                        title="Add Member"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group._id)}
                        className="p-1 text-gray-400 hover:text-danger-600"
                        title="Delete Group"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Create New Group
            </h2>
            <form onSubmit={handleCreateGroup}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newGroup.name}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter group name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newGroup.description}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                    placeholder="Enter group description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={newGroup.currency}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, currency: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="LKR">LKR (Sri Lankan Rupee)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Add Member to {selectedGroup.name}
            </h2>
            <form onSubmit={handleAddMember}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select User
                  </label>
                  <select
                    required
                    value={newMember.userId}
                    onChange={(e) =>
                      setNewMember({ ...newMember, userId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Choose a user to add...</option>
                    {getAvailableUsers(selectedGroup).map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.firstName} {user.lastName} (@{user.username})
                      </option>
                    ))}
                  </select>
                  {getAvailableUsers(selectedGroup).length === 0 && (
                    <p className="mt-1 text-sm text-gray-500">
                      No available users to add to this group.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={newMember.role}
                    onChange={(e) =>
                      setNewMember({ ...newMember, role: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setSelectedGroup(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;

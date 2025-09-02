import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Users,
  TrendingUp,
  Filter,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { settlementsApi, groupsApi } from "../services/api";
import { Settlement, Group } from "../types";
import { formatCurrency } from "../utils/currency";
import toast from "react-hot-toast";

const Settlements: React.FC = () => {
  const { user } = useAuth();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
    totalAmount: 0,
    pendingAmount: 0,
    completedAmount: 0,
  });

  useEffect(() => {
    fetchSettlements();
    fetchGroups();
    fetchStats();
  }, [selectedGroup, statusFilter]);

  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedGroup) params.groupId = selectedGroup;
      if (statusFilter) params.status = statusFilter;

      const response = await settlementsApi.getUserSettlements(params);
      setSettlements(response.settlements);
    } catch (error) {
      console.error("Error fetching settlements:", error);
      toast.error("Failed to load settlements");
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

  const fetchStats = async () => {
    try {
      const params: any = {};
      if (selectedGroup) params.groupId = selectedGroup;

      const response = await settlementsApi.getSettlementStats(params);
      setStats(response.stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleUpdateStatus = async (
    settlementId: string,
    newStatus: string
  ) => {
    try {
      await settlementsApi.updateSettlementStatus(settlementId, {
        status: newStatus,
      });
      await fetchSettlements();
      await fetchStats();
      toast.success("Settlement status updated successfully!");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update settlement"
      );
    }
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    if (!window.confirm("Are you sure you want to delete this settlement?")) {
      return;
    }

    try {
      await settlementsApi.deleteSettlement(settlementId);
      await fetchSettlements();
      await fetchStats();
      toast.success("Settlement deleted successfully!");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to delete settlement"
      );
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-warning-600" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-danger-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success-100 text-success-800";
      case "pending":
        return "bg-warning-100 text-warning-800";
      case "cancelled":
        return "bg-danger-100 text-danger-800";
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

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
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
        <h1 className="text-3xl font-bold text-gray-900">Settlements</h1>
        <p className="text-gray-600 mt-1">
          Manage your expense settlements and payments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Settlements
              </p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <Clock className="h-6 w-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-warning-600">
                {stats.pending}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-success-600">
                {stats.completed}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-danger-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-danger-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Pending Amount
              </p>
              <p className="text-2xl font-bold text-danger-600">
                {formatCurrency(stats.pendingAmount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
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
            <option value="">All Groups</option>
            {groups.map((group) => (
              <option key={group._id} value={group._id}>
                {group.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Settlements List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Settlements</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {settlements.length === 0 ? (
            <div className="p-6 text-center">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No settlements found</p>
            </div>
          ) : (
            settlements.map((settlement) => (
              <div key={settlement._id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(settlement.status)}
                    <div>
                      <p className="font-medium text-gray-900">
                        {settlement.fromUser._id === user?._id ? (
                          <>
                            You owe{" "}
                            <span className="font-semibold">
                              {settlement.toUser.firstName}{" "}
                              {settlement.toUser.lastName}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-semibold">
                              {settlement.fromUser.firstName}{" "}
                              {settlement.fromUser.lastName}
                            </span>{" "}
                            owes you
                          </>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {settlement.group.name} •{" "}
                        {formatDate(settlement.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(settlement.amount)}
                      </p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          settlement.status
                        )}`}
                      >
                        {settlement.status}
                      </span>
                    </div>

                    {settlement.status === "pending" && (
                      <div className="flex space-x-2">
                        {settlement.toUser._id === user?._id && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(settlement._id, "completed")
                            }
                            className="px-3 py-1 text-sm bg-success-600 text-white rounded-md hover:bg-success-700 transition-colors"
                          >
                            Mark Paid
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleUpdateStatus(settlement._id, "cancelled")
                          }
                          className="px-3 py-1 text-sm bg-danger-600 text-white rounded-md hover:bg-danger-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {settlement.status === "completed" && (
                      <button
                        onClick={() => handleDeleteSettlement(settlement._id)}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Settlements;

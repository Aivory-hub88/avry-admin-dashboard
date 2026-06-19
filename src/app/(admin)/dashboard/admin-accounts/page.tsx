"use client";
import React, { useState, useEffect, useCallback } from "react";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";
import WriteGate from "@/components/rbac/WriteGate";
import { useAuth } from "@/hooks/useAuth";
import { CreateAdminModal } from "@/components/admin/CreateAdminModal";
import { AdminTable } from "@/components/admin/AdminTable";
import { DeactivateModal } from "@/components/admin/DeactivateModal";

interface Admin {
  id: string;
  email: string;
  full_name: string;
  account_type: string;
  created_at: string;
  created_by: string;
  banned_at: string | null;
  ban_duration: string | null;
  email_confirmed_at: string | null;
}

export default function AdminAccountsPage() {
  const { role } = useAuth();
  const isSuperAdmin = role === "superadmin";

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  // Refresh trigger for AdminTable
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchAdmins = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/admin/api/admin/list");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch admins");
      }

      setAdmins(data.admins || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch admins");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleDeactivate = (admin: Admin) => {
    setSelectedAdmin(admin);
    setShowDeactivateModal(true);
  };

  const handleReactivate = (admin: Admin) => {
    setSelectedAdmin({ ...admin, ban_duration: "reactivate" });
    setShowDeactivateModal(true);
  };

  const handleModalSuccess = async () => {
    setRefreshTrigger((prev) => prev + 1);
    await fetchAdmins();
    setShowDeactivateModal(false);
    setSelectedAdmin(null);
    setSuccessMessage(selectedAdmin?.ban_duration === "reactivate" 
      ? "Admin reactivated successfully." 
      : "Admin deactivated successfully.");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Access guard
  if (!isLoading && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold text-white mb-2">Access Denied</p>
        <p className="text-sm text-gray-400">
          This page is only accessible to superadmin users.
        </p>
      </div>
    );
  }

  if (isLoading) return <LoadingSkeleton rows={8} />;
  if (error) return <ErrorState message={error} onRetry={fetchAdmins} />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Admin Accounts</h1>
        <WriteGate>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-[#00e59e]/15 border border-[#00e59e]/30 px-4 py-2 text-sm font-medium text-[#00e59e] hover:bg-[#00e59e]/25 transition-colors"
          >
            + Create Admin
          </button>
        </WriteGate>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="rounded-lg bg-[#00e59e]/10 border border-[#00e59e]/20 px-4 py-3 text-sm text-[#00e59e]">
          {successMessage}
        </div>
      )}

      {/* Admin Table */}
      <AdminTable 
        isSuperAdmin={isSuperAdmin} 
        refreshTrigger={refreshTrigger} 
      />

      {/* Create Admin Modal */}
      {showCreateModal && (
        <CreateAdminModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            setRefreshTrigger((prev) => prev + 1);
            fetchAdmins();
            setSuccessMessage("Admin account created successfully.");
            setTimeout(() => setSuccessMessage(null), 3000);
          }}
        />
      )}

      {/* Deactivate/Reactivate Modal */}
      {selectedAdmin && (
        <DeactivateModal
          isOpen={showDeactivateModal}
          adminId={selectedAdmin.id}
          adminEmail={selectedAdmin.email}
          isReactivation={selectedAdmin.ban_duration === "reactivate"}
          onClose={() => {
            setShowDeactivateModal(false);
            setSelectedAdmin(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
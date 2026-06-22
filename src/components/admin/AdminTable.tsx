"use client";
import { bffFetch } from "@/lib/bff";

import React, { useEffect, useState } from "react";
import { MoreVertical, Shield, ShieldAlert } from "lucide-react";
import { DeactivateModal } from "./DeactivateModal";

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

interface AdminTableProps {
  isSuperAdmin: boolean;
  refreshTrigger: number;
}

export function AdminTable({ isSuperAdmin, refreshTrigger }: AdminTableProps) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showMenu, setShowMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, [refreshTrigger]);

  const fetchAdmins = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await bffFetch("/api/admin/admin-accounts");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch admins");
      }

      setAdmins(data.admins || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch admins");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = (admin: Admin) => {
    setSelectedAdmin(admin);
    setShowDeactivateModal(true);
    setShowMenu(null);
  };

  const handleReactivate = (admin: Admin) => {
    setSelectedAdmin({ ...admin, ban_duration: "reactivate" });
    setShowDeactivateModal(true);
    setShowMenu(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading admins...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Name
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Email
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Type
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Created By
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Created At
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Status
              </th>
              {isSuperAdmin && (
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 ? (
              <tr>
                <td
                  colSpan={isSuperAdmin ? 7 : 6}
                  className="text-center py-12 text-gray-500"
                >
                  No admins found
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm">
                    <div className="font-medium">{admin.full_name}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {admin.email}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex items-center gap-1">
                      {admin.account_type === "superadmin" ? (
                        <ShieldAlert className="text-purple-600" size={16} />
                      ) : (
                        <Shield className="text-blue-600" size={16} />
                      )}
                      <span className="capitalize">{admin.account_type}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {admin.created_by}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatDate(admin.created_at)}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {admin.ban_duration ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                        Deactivated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        Active
                      </span>
                    )}
                  </td>
                  {isSuperAdmin && (
                    <td className="py-3 px-4 text-right">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setShowMenu(
                              showMenu === admin.id ? null : admin.id
                            )
                          }
                          className="p-2 hover:bg-gray-100 rounded-md"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {showMenu === admin.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg z-10">
                            {admin.ban_duration ? (
                              <button
                                onClick={() => handleReactivate(admin)}
                                className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-gray-50"
                              >
                                Reactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeactivate(admin)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                              >
                                Deactivate
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedAdmin && (
        <DeactivateModal
          isOpen={showDeactivateModal}
          adminId={selectedAdmin.id}
          adminEmail={selectedAdmin.email}
          onClose={() => {
            setShowDeactivateModal(false);
            setSelectedAdmin(null);
          }}
          onSuccess={() => {
            fetchAdmins();
          }}
        />
      )}
    </>
  );
}
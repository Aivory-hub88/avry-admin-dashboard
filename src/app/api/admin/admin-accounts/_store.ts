// Shared in-memory store for admin accounts mock data
// TODO: wire to real endpoint

export interface AdminAccount {
  id: string;
  email: string;
  fullName: string;
  status: "active" | "suspended";
  createdAt: string;
  lastLogin: string | null;
  forcePasswordChange: boolean;
}

// Mutable array shared across all route handlers in this module
export const adminAccountsStore: AdminAccount[] = [
  {
    id: "adm-001",
    email: "admin@aivory.id",
    fullName: "Admin One",
    status: "active",
    createdAt: "2023-06-01T00:00:00Z",
    lastLogin: "2026-05-06T08:30:00Z",
    forcePasswordChange: false,
  },
  {
    id: "adm-002",
    email: "ops.admin@aivory.id",
    fullName: "Ops Admin",
    status: "active",
    createdAt: "2024-01-15T10:00:00Z",
    lastLogin: "2026-05-05T14:20:00Z",
    forcePasswordChange: false,
  },
];

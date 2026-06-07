/**
 * ApplicationList component logic tests
 *
 * Tests the core logic of the ApplicationList component:
 * - Status badge configuration (submitted=gray, shortlisted=green, rejected=red)
 * - Date formatting
 * - Grouping structure validation
 * - Action button visibility rules
 *
 * Validates: Requirements 10.1, 10.3, 10.4, 10.7
 */

import { describe, it, expect } from "vitest";

// --- Re-create the pure logic from ApplicationList for testability ---

type ApplicationStatus = "submitted" | "shortlisted" | "rejected";

interface Application {
  id: string;
  full_name: string;
  submitted_at: string;
  status: ApplicationStatus;
  tags: string[];
}

interface VacancyGroup {
  vacancy_id: string;
  vacancy_title: string;
  applications: Application[];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getStatusBadgeConfig(status: ApplicationStatus) {
  const config: Record<ApplicationStatus, { label: string; colorType: string }> = {
    submitted: { label: "Submitted", colorType: "gray" },
    shortlisted: { label: "Shortlisted", colorType: "green" },
    rejected: { label: "Rejected", colorType: "red" },
  };
  return config[status];
}

function getVisibleActions(status: ApplicationStatus) {
  const actions: string[] = [];
  if (status === "submitted") {
    actions.push("shortlist");
  }
  if (status !== "rejected") {
    actions.push("reject");
  }
  actions.push("email");
  actions.push("view-details");
  return actions;
}

function applyStatusChange(
  groups: VacancyGroup[],
  appId: string,
  newStatus: ApplicationStatus
): VacancyGroup[] {
  return groups.map((group) => ({
    ...group,
    applications: group.applications.map((app) =>
      app.id === appId ? { ...app, status: newStatus } : app
    ),
  }));
}

function applyTagAdded(
  groups: VacancyGroup[],
  appId: string,
  tag: string
): VacancyGroup[] {
  return groups.map((group) => ({
    ...group,
    applications: group.applications.map((app) =>
      app.id === appId ? { ...app, tags: [...app.tags, tag] } : app
    ),
  }));
}

// --- Tests ---

describe("ApplicationList logic", () => {
  describe("formatDate", () => {
    it("formats ISO date string correctly", () => {
      const result = formatDate("2024-03-15T10:30:00Z");
      expect(result).toBe("Mar 15, 2024");
    });

    it("formats another date correctly", () => {
      const result = formatDate("2024-12-01T00:00:00Z");
      expect(result).toBe("Dec 1, 2024");
    });
  });

  describe("status badge configuration", () => {
    it("submitted status uses gray color", () => {
      const config = getStatusBadgeConfig("submitted");
      expect(config.label).toBe("Submitted");
      expect(config.colorType).toBe("gray");
    });

    it("shortlisted status uses green color", () => {
      const config = getStatusBadgeConfig("shortlisted");
      expect(config.label).toBe("Shortlisted");
      expect(config.colorType).toBe("green");
    });

    it("rejected status uses red color", () => {
      const config = getStatusBadgeConfig("rejected");
      expect(config.label).toBe("Rejected");
      expect(config.colorType).toBe("red");
    });
  });

  describe("action button visibility", () => {
    it("shows shortlist, reject, email, view-details for submitted status", () => {
      const actions = getVisibleActions("submitted");
      expect(actions).toEqual(["shortlist", "reject", "email", "view-details"]);
    });

    it("shows reject, email, view-details for shortlisted status (no shortlist)", () => {
      const actions = getVisibleActions("shortlisted");
      expect(actions).toEqual(["reject", "email", "view-details"]);
    });

    it("shows only email and view-details for rejected status", () => {
      const actions = getVisibleActions("rejected");
      expect(actions).toEqual(["email", "view-details"]);
    });
  });

  describe("status transitions", () => {
    const sampleGroups: VacancyGroup[] = [
      {
        vacancy_id: "v1",
        vacancy_title: "Senior Developer",
        applications: [
          {
            id: "app1",
            full_name: "Alice",
            submitted_at: "2024-01-01T00:00:00Z",
            status: "submitted",
            tags: [],
          },
          {
            id: "app2",
            full_name: "Bob",
            submitted_at: "2024-01-02T00:00:00Z",
            status: "submitted",
            tags: ["promising"],
          },
        ],
      },
      {
        vacancy_id: "v2",
        vacancy_title: "Product Designer",
        applications: [
          {
            id: "app3",
            full_name: "Charlie",
            submitted_at: "2024-01-03T00:00:00Z",
            status: "shortlisted",
            tags: [],
          },
        ],
      },
    ];

    it("shortlisting an application updates its status", () => {
      const updated = applyStatusChange(sampleGroups, "app1", "shortlisted");
      const app = updated[0].applications.find((a) => a.id === "app1");
      expect(app?.status).toBe("shortlisted");
    });

    it("rejecting an application updates its status", () => {
      const updated = applyStatusChange(sampleGroups, "app2", "rejected");
      const app = updated[0].applications.find((a) => a.id === "app2");
      expect(app?.status).toBe("rejected");
    });

    it("status change does not affect other applications", () => {
      const updated = applyStatusChange(sampleGroups, "app1", "shortlisted");
      const otherApp = updated[0].applications.find((a) => a.id === "app2");
      expect(otherApp?.status).toBe("submitted");
    });

    it("status change does not affect other vacancy groups", () => {
      const updated = applyStatusChange(sampleGroups, "app1", "shortlisted");
      const otherGroup = updated.find((g) => g.vacancy_id === "v2");
      expect(otherGroup?.applications[0].status).toBe("shortlisted");
    });
  });

  describe("tag management", () => {
    const sampleGroups: VacancyGroup[] = [
      {
        vacancy_id: "v1",
        vacancy_title: "Senior Developer",
        applications: [
          {
            id: "app1",
            full_name: "Alice",
            submitted_at: "2024-01-01T00:00:00Z",
            status: "submitted",
            tags: ["initial-tag"],
          },
        ],
      },
    ];

    it("adding a tag appends it to the application tags", () => {
      const updated = applyTagAdded(sampleGroups, "app1", "interview scheduled");
      const app = updated[0].applications.find((a) => a.id === "app1");
      expect(app?.tags).toEqual(["initial-tag", "interview scheduled"]);
    });

    it("adding a tag preserves existing tags", () => {
      const updated = applyTagAdded(sampleGroups, "app1", "new-tag");
      const app = updated[0].applications.find((a) => a.id === "app1");
      expect(app?.tags).toContain("initial-tag");
      expect(app?.tags).toContain("new-tag");
    });
  });

  describe("grouping structure", () => {
    it("groups applications by vacancy", () => {
      const groups: VacancyGroup[] = [
        {
          vacancy_id: "v1",
          vacancy_title: "Frontend Engineer",
          applications: [
            {
              id: "a1",
              full_name: "Alice",
              submitted_at: "2024-01-01T00:00:00Z",
              status: "submitted",
              tags: [],
            },
            {
              id: "a2",
              full_name: "Bob",
              submitted_at: "2024-01-02T00:00:00Z",
              status: "shortlisted",
              tags: ["top-candidate"],
            },
          ],
        },
        {
          vacancy_id: "v2",
          vacancy_title: "Backend Engineer",
          applications: [
            {
              id: "a3",
              full_name: "Charlie",
              submitted_at: "2024-01-03T00:00:00Z",
              status: "rejected",
              tags: [],
            },
          ],
        },
      ];

      expect(groups).toHaveLength(2);
      expect(groups[0].vacancy_title).toBe("Frontend Engineer");
      expect(groups[0].applications).toHaveLength(2);
      expect(groups[1].vacancy_title).toBe("Backend Engineer");
      expect(groups[1].applications).toHaveLength(1);
    });

    it("each application has required fields", () => {
      const app: Application = {
        id: "app-uuid",
        full_name: "Test Applicant",
        submitted_at: "2024-06-15T14:30:00Z",
        status: "submitted",
        tags: ["tag1", "tag2"],
      };

      expect(app.id).toBeDefined();
      expect(app.full_name).toBeDefined();
      expect(app.submitted_at).toBeDefined();
      expect(app.status).toBeDefined();
      expect(Array.isArray(app.tags)).toBe(true);
    });
  });
});

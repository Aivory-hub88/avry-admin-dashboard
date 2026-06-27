"use client";
import React, { useState } from "react";
import ApplicationList from "./ApplicationList";
import VacancyEditor from "./VacancyEditor";
import VacancyList from "./VacancyList";

type CareersTab = "create-vacancy" | "manage-vacancies" | "applications";

interface EditingVacancy {
  id: string;
  title: string;
  status: "draft" | "open" | "closed";
  posted_at: string | null;
  department?: string;
  location?: string;
  employment_type?: string;
}

const TABS: { id: CareersTab; label: string }[] = [
  { id: "create-vacancy", label: "Create Vacancy" },
  { id: "manage-vacancies", label: "Manage Vacancies" },
  { id: "applications", label: "Applications" },
];

export default function CareersAdminPanel() {
  const [activeTab, setActiveTab] = useState<CareersTab>("create-vacancy");
  const [editingVacancy, setEditingVacancy] = useState<EditingVacancy | null>(null);

  const handleEditVacancy = (vacancy: EditingVacancy) => {
    setEditingVacancy(vacancy);
    setActiveTab("create-vacancy");
  };

  const handleCancelEdit = () => {
    setEditingVacancy(null);
  };

  const handleVacancySaved = () => {
    setEditingVacancy(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">Careers Management</h1>

      {/* Tab navigation */}
      <div className="border-b border-white/[0.07]">
        <nav className="-mb-px flex gap-4" aria-label="Careers tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id !== "create-vacancy") {
                  setEditingVacancy(null);
                }
              }}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-[#b7cba6] text-[#b7cba6]"
                  : "border-transparent text-gray-400 hover:border-white/20 hover:text-gray-200"
              }`}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div role="tabpanel">
        {activeTab === "create-vacancy" && (
          <div className="rounded-lg border border-white/[0.07] bg-[#2a2a27] p-6">
            <VacancyEditor
              editingVacancyId={editingVacancy?.id ?? null}
              onSaved={handleVacancySaved}
              onCancel={editingVacancy ? handleCancelEdit : undefined}
            />
          </div>
        )}

        {activeTab === "manage-vacancies" && (
          <VacancyList onEdit={handleEditVacancy} />
        )}

        {activeTab === "applications" && <ApplicationList />}
      </div>
    </div>
  );
}

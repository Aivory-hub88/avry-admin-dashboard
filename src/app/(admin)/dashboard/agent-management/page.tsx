"use client";
import React, { useState, useEffect, useCallback } from "react";

interface AgentItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  tags?: string[];
  status?: string;
  config?: Record<string, unknown>;
}

const BLANK = { name: "", description: "", category: "general", icon: "", tagsStr: "", status: "draft", configStr: "{}" };
const inp = "w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00e59e]/50";

export default function AgentManagementPage() {
  const [items, setItems] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/admin/api/admin/agent-catalog");
      if (!res.ok) { if (res.status === 401) { window.location.href = "/admin/signin"; return; } throw new Error(`Failed to load (${res.status})`); }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  function openCreate() { setEditingId(null); setForm({ ...BLANK }); setFormErr(null); setModalOpen(true); }
  function openEdit(a: AgentItem) {
    setEditingId(a.id);
    setForm({
      name: a.name || "", description: a.description || "", category: a.category || "general",
      icon: a.icon || "", tagsStr: (a.tags || []).join(", "), status: a.status || "draft",
      configStr: JSON.stringify(a.config || {}, null, 2),
    });
    setFormErr(null); setModalOpen(true);
  }

  async function save() {
    setFormErr(null);
    if (!form.name.trim()) { setFormErr("Name is required"); return; }
    let config: unknown = {};
    try { config = form.configStr.trim() ? JSON.parse(form.configStr) : {}; }
    catch { setFormErr("Config must be valid JSON"); return; }
    const body = {
      name: form.name.trim(), description: form.description, category: form.category, icon: form.icon,
      status: form.status, tags: form.tagsStr.split(",").map((s) => s.trim()).filter(Boolean), config,
    };
    setSaving(true);
    try {
      const url = editingId ? `/admin/api/admin/agent-catalog/${editingId}` : "/admin/api/admin/agent-catalog";
      const res = await fetch(url, { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setModalOpen(false); await fetchList();
    } catch (e) { setFormErr(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function togglePublish(a: AgentItem) {
    const next = a.status === "published" ? "draft" : "published";
    await fetch(`/admin/api/admin/agent-catalog/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    fetchList();
  }

  async function del(a: AgentItem) {
    if (!confirm(`Delete agent "${a.name}"?`)) return;
    await fetch(`/admin/api/admin/agent-catalog/${a.id}`, { method: "DELETE" });
    fetchList();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Agent Management</h1>
          <p className="text-sm text-white/40 mt-1">Configure agents and publish them to the user dashboard Agents page.</p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-[#00e59e]/15 border border-[#00e59e]/30 px-4 py-2 text-sm font-medium text-[#00e59e] hover:bg-[#00e59e]/25 transition-colors">+ New Agent</button>
      </div>

      {loading ? (
        <div className="text-white/40 py-12 text-center">Loading…</div>
      ) : error ? (
        <div className="text-red-400 py-12 text-center">{error} <button onClick={fetchList} className="underline ml-2">Retry</button></div>
      ) : items.length === 0 ? (
        <div className="text-white/40 py-12 text-center border border-white/10 rounded-xl">No agents yet. Click &ldquo;New Agent&rdquo; to create one.</div>
      ) : (
        <div className="overflow-x-auto border border-white/10 rounded-xl">
          <table className="w-full text-sm">
            <thead className="text-white/40 text-left border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Tags</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-white/5 text-white/80">
                  <td className="px-4 py-3 font-medium text-white">{a.name}</td>
                  <td className="px-4 py-3">{a.category}</td>
                  <td className="px-4 py-3 text-white/50">{(a.tags || []).join(", ")}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${a.status === "published" ? "bg-[#00e59e]/15 text-[#00e59e]" : "bg-white/10 text-white/50"}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => togglePublish(a)} className="text-[#00e59e] hover:underline">{a.status === "published" ? "Unpublish" : "Publish"}</button>
                    <button onClick={() => openEdit(a)} className="text-white/70 hover:underline">Edit</button>
                    <button onClick={() => del(a)} className="text-red-400 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">{editingId ? "Edit Agent" : "New Agent"}</h2>
            <div className="space-y-3">
              <div><label className="block text-xs text-white/50 mb-1">Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} placeholder="WhatsApp Sales Agent" /></div>
              <div><label className="block text-xs text-white/50 mb-1">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inp} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-white/50 mb-1">Category</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inp} /></div>
                <div><label className="block text-xs text-white/50 mb-1">Icon (slug)</label><input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className={inp} placeholder="whatsapp" /></div>
              </div>
              <div><label className="block text-xs text-white/50 mb-1">Tags (comma-separated)</label><input value={form.tagsStr} onChange={(e) => setForm({ ...form, tagsStr: e.target.value })} className={inp} placeholder="whatsapp, sales" /></div>
              <div><label className="block text-xs text-white/50 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inp}>
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </select>
              </div>
              <div><label className="block text-xs text-white/50 mb-1">Config (JSON)</label><textarea value={form.configStr} onChange={(e) => setForm({ ...form, configStr: e.target.value })} rows={5} className={`${inp} font-mono`} /></div>
              {formErr && <p className="text-red-400 text-sm">{formErr}</p>}
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-white/60 hover:text-white">Cancel</button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-[#00e59e] px-4 py-2 text-sm font-medium text-black hover:bg-[#00e59e]/90 disabled:opacity-50">{saving ? "Saving…" : editingId ? "Save Changes" : "Create Agent"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

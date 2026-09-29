import { useState } from "react";
import { getEvents, getTeams, updateTeamSubmission } from "../lib/store.js";

export default function Teams() {
  const events = getEvents();
  const [teams, setTeams] = useState(getTeams);
  const [filterEvent, setFilterEvent] = useState("");
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ projectName: "", description: "", github: "", demo: "" });

  const filtered = teams.filter(t => !filterEvent || t.eventId === filterEvent);

  function openEdit(team) {
    setEditId(team.id);
    setForm({ projectName: team.projectName || "", description: team.description || "", github: team.github || "", demo: team.demo || "" });
  }

  function saveSubmission(e) {
    e.preventDefault();
    updateTeamSubmission(editId, form);
    setTeams(getTeams());
    setEditId(null);
  }

  return (
    <div>
      <div className="page-header">
        <h1>Teams & Submissions</h1>
        <p>{teams.length} teams across all events</p>
      </div>

      <div className="filter-row">
        <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)}>
          <option value="">All Events</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </div>

      <div className="card">
        {filtered.length === 0 ? <div className="empty"><p>No teams found.</p></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Team</th><th>Event</th><th>Members</th><th>Project</th><th>Links</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td><strong>{t.name}</strong></td>
                    <td>{events.find(e => e.id === t.eventId)?.name || "—"}</td>
                    <td>{t.members.join(", ")}</td>
                    <td>{t.projectName ? <><strong>{t.projectName}</strong><br /><span style={{ color: "var(--text-muted)", fontSize: 12 }}>{t.description}</span></> : <span style={{ color: "var(--text-muted)" }}>Not submitted</span>}</td>
                    <td>
                      {t.github && <a href={t.github} target="_blank" rel="noreferrer" style={{ color: "var(--blue)", marginRight: 8, fontSize: 13 }}>GitHub</a>}
                      {t.demo && <a href={t.demo} target="_blank" rel="noreferrer" style={{ color: "var(--blue)", fontSize: 13 }}>Demo</a>}
                    </td>
                    <td><button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}>Edit Submission</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editId && (
        <div className="modal-backdrop" onClick={() => setEditId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Submission</h3>
              <button className="modal-close" onClick={() => setEditId(null)}>×</button>
            </div>
            <form onSubmit={saveSubmission}>
              <div className="form-group"><label>Project Name</label><input required value={form.projectName} onChange={e => setForm({ ...form, projectName: e.target.value })} /></div>
              <div className="form-group"><label>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="form-group"><label>GitHub Repo URL</label><input type="url" value={form.github} onChange={e => setForm({ ...form, github: e.target.value })} /></div>
              <div className="form-group"><label>Demo URL</label><input type="url" value={form.demo} onChange={e => setForm({ ...form, demo: e.target.value })} /></div>
              <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditId(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Submission</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

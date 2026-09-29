import { useState } from "react";
import { getEvents, getRegistrations, addRegistration, updateRegistrationStatus } from "../lib/store.js";

function uid() { return `r${Date.now()}`; }

function statusBadge(s) {
  const map = { "Checked-in": "badge-green", Approved: "badge-yellow", Registered: "badge-gray" };
  return <span className={`badge ${map[s] || "badge-gray"}`}>{s}</span>;
}

function exportCSV(regs, events) {
  const rows = [["Name", "Email", "Event", "College", "Role", "Team", "GitHub", "Status"]];
  regs.forEach(r => rows.push([r.name, r.email, events.find(e => e.id === r.eventId)?.name || "", r.college, r.role, r.team, r.github, r.status]));
  const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "registrations.csv";
  a.click();
}

export default function Registrations() {
  const events = getEvents();
  const [regs, setRegs] = useState(getRegistrations);
  const [filterEvent, setFilterEvent] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", college: "", role: "Student", github: "", team: "", eventId: events[0]?.id || "" });

  const filtered = regs.filter(r =>
    (!filterEvent || r.eventId === filterEvent) &&
    (!filterStatus || r.status === filterStatus)
  );

  function handleAdd(e) {
    e.preventDefault();
    const reg = { id: uid(), ...form, status: "Registered", time: new Date().toISOString() };
    addRegistration(reg);
    setRegs(getRegistrations());
    setShowForm(false);
    setForm({ name: "", email: "", college: "", role: "Student", github: "", team: "", eventId: events[0]?.id || "" });
  }

  function updateStatus(id, status) {
    updateRegistrationStatus(id, status);
    setRegs(getRegistrations());
  }

  return (
    <div>
      <div className="row page-header">
        <div className="flex-1">
          <h1>Registrations</h1>
          <p>{regs.length} total registrations</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(filtered, events)}>Export CSV</button>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Registration</button>
      </div>

      <div className="filter-row">
        <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)}>
          <option value="">All Events</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option>Registered</option>
          <option>Approved</option>
          <option>Checked-in</option>
        </select>
      </div>

      <div className="card">
        {filtered.length === 0 ? <div className="empty"><p>No registrations found.</p></div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Event</th><th>College</th><th>Role</th><th>Team</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.name}</strong><br /><span style={{ color: "var(--text-muted)", fontSize: 12 }}>{r.email}</span></td>
                    <td>{events.find(e => e.id === r.eventId)?.name || "—"}</td>
                    <td>{r.college}</td>
                    <td>{r.role}</td>
                    <td>{r.team || "—"}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        {r.status === "Registered" && <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(r.id, "Approved")}>Approve</button>}
                        {r.status === "Approved" && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(r.id, "Checked-in")}>Check In</button>}
                        {r.status === "Checked-in" && <span style={{ color: "var(--green)", fontSize: 12 }}>✓ Done</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Registration</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="form-group"><label>Event</label>
                <select required value={form.eventId} onChange={e => setForm({ ...form, eventId: e.target.value })}>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Full Name</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="form-group"><label>Email</label><input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>College / Company</label><input required value={form.college} onChange={e => setForm({ ...form, college: e.target.value })} /></div>
                <div className="form-group"><label>Role</label><select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option>Student</option><option>Professional</option></select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>GitHub Profile</label><input value={form.github} onChange={e => setForm({ ...form, github: e.target.value })} placeholder="username" /></div>
                <div className="form-group"><label>Team Name (optional)</label><input value={form.team} onChange={e => setForm({ ...form, team: e.target.value })} /></div>
              </div>
              <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { getEvents, addEvent, getRegistrations, getTeams, getScores, saveScore, publishResults } from "../lib/store.js";

function fmt(d) { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
function uid() { return `e${Date.now()}`; }

function EventDetail({ event, onBack }) {
  const regs = getRegistrations().filter(r => r.eventId === event.id);
  const teams = getTeams().filter(t => t.eventId === event.id);
  const scores = getScores();
  const [tab, setTab] = useState("registrations");

  const leaderboard = teams.map(t => {
    const s = scores.find(sc => sc.teamId === t.id);
    const total = s ? s.innovation + s.technical + s.design + s.impact : 0;
    return { ...t, score: s, total };
  }).sort((a, b) => b.total - a.total);

  return (
    <div>
      <div className="row" style={{ marginBottom: 20 }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back</button>
        <div className="page-header" style={{ margin: 0, flex: 1 }}>
          <h1>{event.name}</h1>
          <p>{event.type} · {fmt(event.date)} · {event.mode} · {event.venue}</p>
        </div>
      </div>

      <div className="tabs">
        {["registrations", "teams", "judging"].map(t => (
          <div key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>

      {tab === "registrations" && (
        <div className="card">
          {regs.length === 0 ? <div className="empty"><p>No registrations for this event.</p></div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>College</th><th>Role</th><th>Team</th><th>Status</th></tr></thead>
                <tbody>
                  {regs.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.name}</strong><br /><span style={{ color: "var(--text-muted)", fontSize: 12 }}>{r.email}</span></td>
                      <td>{r.college}</td>
                      <td>{r.role}</td>
                      <td>{r.team || "—"}</td>
                      <td><span className={`badge ${r.status === "Checked-in" ? "badge-green" : r.status === "Approved" ? "badge-yellow" : "badge-gray"}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "teams" && (
        <div className="card">
          {teams.length === 0 ? <div className="empty"><p>No teams yet.</p></div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Team</th><th>Members</th><th>Project</th><th>Links</th></tr></thead>
                <tbody>
                  {teams.map(t => (
                    <tr key={t.id}>
                      <td><strong>{t.name}</strong></td>
                      <td>{t.members.join(", ")}</td>
                      <td>{t.projectName ? <><strong>{t.projectName}</strong><br /><span style={{ color: "var(--text-muted)", fontSize: 12 }}>{t.description}</span></> : "—"}</td>
                      <td>
                        {t.github && <a href={t.github} target="_blank" rel="noreferrer" style={{ color: "var(--blue)", marginRight: 8 }}>GitHub</a>}
                        {t.demo && <a href={t.demo} target="_blank" rel="noreferrer" style={{ color: "var(--blue)" }}>Demo</a>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "judging" && (
        <div>
          <div className="card">
            <div className="section-title">Leaderboard</div>
            {leaderboard.length === 0 ? <div className="empty"><p>No teams to judge.</p></div> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Team</th><th>Project</th><th>Innovation</th><th>Technical</th><th>Design</th><th>Impact</th><th>Total</th></tr></thead>
                  <tbody>
                    {leaderboard.map((t, i) => (
                      <tr key={t.id}>
                        <td><span className="podium">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span></td>
                        <td><strong>{t.name}</strong></td>
                        <td>{t.projectName || "—"}</td>
                        <td>{t.score?.innovation ?? "—"}</td>
                        <td>{t.score?.technical ?? "—"}</td>
                        <td>{t.score?.design ?? "—"}</td>
                        <td>{t.score?.impact ?? "—"}</td>
                        <td><strong>{t.total || "—"}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {leaderboard.some(t => t.score) && (
              <div style={{ marginTop: 14 }}>
                <button className="btn btn-primary btn-sm" onClick={() => { publishResults(event.name); alert("Results published!"); }}>Publish Results</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Events() {
  const [events, setEvents] = useState(getEvents);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Hackathon", date: "", mode: "Offline", venue: "", capacity: "", description: "", tracks: "", prizes: "" });

  function handleAdd(e) {
    e.preventDefault();
    const ev = { id: uid(), ...form, capacity: Number(form.capacity), status: new Date(form.date) < new Date() ? "past" : "upcoming" };
    addEvent(ev);
    setEvents(getEvents());
    setShowForm(false);
    setForm({ name: "", type: "Hackathon", date: "", mode: "Offline", venue: "", capacity: "", description: "", tracks: "", prizes: "" });
  }

  if (selected) return <EventDetail event={selected} onBack={() => setSelected(null)} />;

  return (
    <div>
      <div className="row page-header">
        <div className="flex-1">
          <h1>Events</h1>
          <p>{events.length} events · GDG Indore</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Create Event</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {events.map(ev => (
          <div key={ev.id} className="card" style={{ cursor: "pointer" }} onClick={() => setSelected(ev)}>
            <div className="row">
              <div className="flex-1">
                <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                  <strong style={{ fontSize: 15 }}>{ev.name}</strong>
                  <span className={`badge ${ev.status === "past" ? "badge-gray" : "badge-green"}`}>{ev.status === "past" ? "Past" : "Upcoming"}</span>
                  <span className="badge badge-blue">{ev.type}</span>
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  {new Date(ev.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · {ev.mode} · {ev.venue}
                </div>
                {ev.tracks && <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>Tracks: {ev.tracks}</div>}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Capacity: {ev.capacity}</div>
              <span style={{ color: "var(--blue)", fontSize: 13 }}>View →</span>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Event</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="form-group"><label>Event Name</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="form-row">
                <div className="form-group"><label>Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option>Hackathon</option><option>Meetup</option><option>Workshop</option></select></div>
                <div className="form-group"><label>Mode</label><select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}><option>Offline</option><option>Online</option></select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Date</label><input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                <div className="form-group"><label>Capacity</label><input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Venue</label><input value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} /></div>
              <div className="form-group"><label>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="form-group"><label>Tracks</label><input value={form.tracks} onChange={e => setForm({ ...form, tracks: e.target.value })} placeholder="e.g. Web, AI/ML, FinTech" /></div>
              <div className="form-group"><label>Prizes</label><input value={form.prizes} onChange={e => setForm({ ...form, prizes: e.target.value })} /></div>
              <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

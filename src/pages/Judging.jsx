import { useState } from "react";
import { getEvents, getTeams, getScores, saveScore, publishResults } from "../lib/store.js";

export default function Judging() {
  const events = getEvents();
  const [filterEvent, setFilterEvent] = useState(events[0]?.id || "");
  const [scores, setScores] = useState(getScores);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ innovation: 5, technical: 5, design: 5, impact: 5 });

  const teams = getTeams().filter(t => t.eventId === filterEvent && t.projectName);
  const leaderboard = teams.map(t => {
    const s = scores.find(sc => sc.teamId === t.id);
    const total = s ? s.innovation + s.technical + s.design + s.impact : 0;
    return { ...t, score: s, total };
  }).sort((a, b) => b.total - a.total);

  function openScore(team) {
    setEditing(team.id);
    const s = scores.find(sc => sc.teamId === team.id);
    setForm(s ? { innovation: s.innovation, technical: s.technical, design: s.design, impact: s.impact } : { innovation: 5, technical: 5, design: 5, impact: 5 });
  }

  function saveScoreForm(e) {
    e.preventDefault();
    saveScore({ teamId: editing, ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, Number(v)])) });
    setScores(getScores());
    setEditing(null);
  }

  const evName = events.find(e => e.id === filterEvent)?.name || "";

  return (
    <div>
      <div className="page-header">
        <h1>Judging</h1>
        <p>Score submissions and view results</p>
      </div>

      <div className="filter-row" style={{ marginBottom: 20 }}>
        <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)}>
          {events.filter(e => e.type === "Hackathon").map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 16 }}>
          <div className="section-title flex-1" style={{ margin: 0 }}>Leaderboard — {evName}</div>
          {leaderboard.some(t => t.score) && (
            <button className="btn btn-primary btn-sm" onClick={() => { publishResults(evName); alert("Results published!"); }}>Publish Results</button>
          )}
        </div>

        {teams.length === 0 ? (
          <div className="empty"><p>No project submissions for this event yet.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Team / Project</th><th>Innovation /10</th><th>Technical /10</th><th>Design /10</th><th>Impact /10</th><th>Total /40</th><th>Action</th></tr>
              </thead>
              <tbody>
                {leaderboard.map((t, i) => (
                  <tr key={t.id}>
                    <td><span className="podium">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span></td>
                    <td><strong>{t.name}</strong><br /><span style={{ color: "var(--text-muted)", fontSize: 12 }}>{t.projectName}</span></td>
                    <td>{t.score?.innovation ?? <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                    <td>{t.score?.technical ?? <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                    <td>{t.score?.design ?? <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                    <td>{t.score?.impact ?? <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                    <td><strong>{t.total || <span style={{ color: "var(--text-muted)" }}>—</span>}</strong></td>
                    <td><button className="btn btn-secondary btn-sm" onClick={() => openScore(t)}>Score</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Score — {leaderboard.find(t => t.id === editing)?.name}</h3>
              <button className="modal-close" onClick={() => setEditing(null)}>×</button>
            </div>
            <form onSubmit={saveScoreForm}>
              {["innovation", "technical", "design", "impact"].map(c => (
                <div className="form-group" key={c}>
                  <label>{c.charAt(0).toUpperCase() + c.slice(1)} (1–10)</label>
                  <input type="number" min={1} max={10} required value={form[c]} onChange={e => setForm({ ...form, [c]: e.target.value })} />
                </div>
              ))}
              <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Score</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

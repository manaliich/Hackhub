import { useState } from "react";
import { getActivityLog } from "../lib/store.js";

const icons = {
  "event.created": "📅",
  "registration.created": "📝",
  "registration.approved": "✅",
  "participant.checked_in": "🎫",
  "submission.received": "📦",
  "results.published": "🏆",
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fmt(iso) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ActivityLog() {
  const log = getActivityLog();
  const [filter, setFilter] = useState("");

  const filtered = log.filter(l => !filter || l.activity === filter);

  return (
    <div>
      <div className="page-header">
        <h1>Activity Log</h1>
        <p>A history of everything that happened in HackHub</p>
      </div>

      <div className="filter-row">
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Activity</option>
          <option value="event.created">Event Created</option>
          <option value="registration.created">New Registration</option>
          <option value="registration.approved">Registration Approved</option>
          <option value="participant.checked_in">Participant Checked In</option>
          <option value="submission.received">Submission Received</option>
          <option value="results.published">Results Published</option>
        </select>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty"><p>No activity yet.</p></div>
        ) : (
          filtered.map(l => (
            <div key={l.id} className="log-item">
              <span style={{ fontSize: 18, marginTop: 2 }}>{icons[l.activity] || "•"}</span>
              <div className="flex-1">
                <div className="log-label">{l.label}</div>
                <div className="log-detail">{l.detail}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="log-time">{timeAgo(l.time)}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{fmt(l.time)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

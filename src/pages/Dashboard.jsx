import { getEvents, getRegistrations } from "../lib/store.js";

function fmt(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function statusBadge(s) {
  const map = { "Checked-in": "badge-green", Approved: "badge-yellow", Registered: "badge-gray" };
  return <span className={`badge ${map[s] || "badge-gray"}`}>{s}</span>;
}

export default function Dashboard() {
  const events = getEvents();
  const regs = getRegistrations();
  const today = new Date();
  const upcoming = events.filter(e => new Date(e.date) >= today).length;
  const checkedIn = regs.filter(r => r.status === "Checked-in").length;
  const recent = [...regs].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of GDG Indore events and registrations</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Events</div>
          <div className="stat-value">{events.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Registrations</div>
          <div className="stat-value">{regs.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Upcoming Events</div>
          <div className="stat-value">{upcoming}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Checked In</div>
          <div className="stat-value">{checkedIn}</div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Recent Registrations</div>
        {recent.length === 0 ? (
          <div className="empty"><p>No registrations yet.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Event</th>
                  <th>College / Company</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.name}</strong><br /><span style={{ color: "var(--text-muted)", fontSize: 12 }}>{r.email}</span></td>
                    <td>{events.find(e => e.id === r.eventId)?.name || "—"}</td>
                    <td>{r.college}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td style={{ color: "var(--text-muted)" }}>{fmt(r.time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

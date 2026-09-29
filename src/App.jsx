import { useState } from "react";
import { reset } from "./lib/store.js";
import About from "./pages/About.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Events from "./pages/Events.jsx";
import Registrations from "./pages/Registrations.jsx";
import Teams from "./pages/Teams.jsx";
import Judging from "./pages/Judging.jsx";
import Workflows from "./pages/Workflows.jsx";
import ActivityLog from "./pages/ActivityLog.jsx";

const nav = [
  { id: "about", label: "About", icon: "ℹ️" },
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "events", label: "Events", icon: "📅" },
  { id: "registrations", label: "Registrations", icon: "📝" },
  { id: "teams", label: "Teams & Submissions", icon: "👥" },
  { id: "judging", label: "Judging", icon: "⭐" },
  { id: "workflows", label: "Workflows", icon: "⚡" },
  { id: "log", label: "Activity Log", icon: "🕐" },
];

const pages = { about: About, dashboard: Dashboard, events: Events, registrations: Registrations, teams: Teams, judging: Judging, workflows: Workflows, log: ActivityLog };

export default function App() {
  const [page, setPage] = useState("about");
  const Page = pages[page];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          HackHub
          <span>GDG Indore</span>
        </div>
        <nav className="sidebar-nav">
          {nav.map(n => (
            <div key={n.id} className={`nav-item ${page === n.id ? "active" : ""}`} onClick={() => setPage(n.id)}>
              <span>{n.icon}</span> {n.label}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn-reset" onClick={() => { if (confirm("Reset all demo data?")) reset(); }}>Reset demo data</button>
        </div>
      </aside>
      <main className="main">
        <Page />
      </main>
    </div>
  );
}

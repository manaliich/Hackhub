export default function About() {
  return (
    <div>
      <div className="page-header">
        <h1>About HackHub</h1>
        <p>Event and hackathon management for tech communities</p>
      </div>

      <div className="about-hero">
        <h2>One platform for your entire event</h2>
        <p>HackHub manages registrations, teams, submissions and judging — so you can focus on running a great hackathon instead of chasing spreadsheets.</p>
      </div>

      <div className="section">
        <div className="section-title">The problem</div>
        <div className="card">
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 640 }}>
            Communities like GDG run many hackathons, meetups and workshops every year.
            Registrations come in through forms. Teams coordinate on Discord. Results go into
            Google Sheets. Certificates are sent over email. Every community uses a different
            set of tools, and there is no single place that connects them all.
          </p>
        </div>
      </div>

      <div className="section">
        <div className="section-title">The solution</div>
        <div className="card">
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 640 }}>
            HackHub manages your event from start to finish. And the <strong style={{ color: 'var(--text)' }}>Workflows</strong> section,
            powered by viaSocket Embed, lets each community connect HackHub with 2,300+ apps
            they already use — without leaving the platform. No custom development needed.
          </p>
        </div>
      </div>

      <div className="section">
        <div className="section-title">How it works</div>
        <div className="steps">
          <div className="step-card">
            <div className="step-num">1</div>
            <h4>Manage your event in HackHub</h4>
            <p>Create events, collect registrations, manage teams, judge submissions and publish results — all in one place.</p>
          </div>
          <div className="step-card">
            <div className="step-num">2</div>
            <h4>Open the Workflows page</h4>
            <p>Go to Workflows in the sidebar and connect HackHub with 2,300+ apps your community already uses.</p>
          </div>
          <div className="step-card">
            <div className="step-num">3</div>
            <h4>Workflows run on their own</h4>
            <p>New registrations notify your Discord. Approvals update your Sheet. Results go to email. All automatic.</p>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Built for</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {["GDG Chapters", "College Coding Clubs", "Bootcamps", "Developer Communities", "Hackathon Organizers"].map(t => (
            <span key={t} className="badge badge-blue" style={{ padding: '5px 12px', fontSize: 13 }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

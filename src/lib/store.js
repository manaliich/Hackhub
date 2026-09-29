import { SEED } from "./seed.js";

const KEYS = {
  events: "hh_events",
  registrations: "hh_registrations",
  teams: "hh_teams",
  scores: "hh_scores",
  activityLog: "hh_activity",
  workflows: "hh_workflows",
};

// Static HackHub trigger events
export const HACKHUB_STATIC_TRIGGERS = [
  {
    id: "participant.registered",
    name: "New Participant Registered",
    event: "registration.created",
    description: "Fires when a new hacker registers for an event.",
    icon: "📝",
  },
  {
    id: "team.created",
    name: "New Team Created",
    event: "team.created",
    description: "Fires when a participant creates or registers a new team.",
    icon: "👥",
  },
  {
    id: "submission.received",
    name: "Project Submitted",
    event: "submission.received",
    description: "Fires when a team submits their project, demo, and code repository.",
    icon: "🚀",
  },
  {
    id: "evaluation.submitted",
    name: "Evaluation Submitted",
    event: "score.submitted",
    description: "Fires when an assigned judge evaluates and submits scores for a project.",
    icon: "⭐",
  },
  {
    id: "results.published",
    name: "Winner Selected",
    event: "results.published",
    description: "Fires when final rankings and winners are announced.",
    icon: "🏆",
  },
];

// 2 Pre-built HackHub automations (ready-to-use)
export const PREBUILT_WORKFLOWS = [
  {
    id: "wf_prebuilt_participant_sheets",
    name: "Participant Data Sync",
    description: "Store participant information (name, email, team) in Google Sheets when a new participant registers.",
    trigger: {
      app: "HackHub",
      name: "New Participant Registered",
      event: "registration.created",
      icon: "📝",
      type: "hackhub",
    },
    action: {
      app: "Google Sheets",
      name: "Add Row",
      event: "Add Row",
      icon: "https://stuff.thingsofbrand.com/google.com/images/img4_googlesheet.png",
      serviceId: "rowqm5xi2",
      description: "Append row with Name, Email, College, and Event Name to spreadsheet.",
      status: "Connected",
      authenticated: true,
    },
    status: "Active",
    isPrebuilt: true,
    createdAt: "2026-09-29T10:00:00.000Z",
    updatedAt: "2026-09-29T10:00:00.000Z",
  },
  {
    id: "wf_prebuilt_submission_email",
    name: "Project Submission Confirmation Email",
    description: "Automatically send a confirmation email via Gmail to the participant when their project is submitted.",
    trigger: {
      app: "HackHub",
      name: "Project Submitted",
      event: "submission.received",
      icon: "🚀",
      type: "hackhub",
    },
    action: {
      app: "Gmail",
      name: "Send Email",
      event: "Send Email",
      icon: "https://stuff.thingsofbrand.com/gmail.com/images/img1_gmail.png",
      serviceId: "rowqm5xi_gmail",
      description: "Send automated email confirming project submission with next steps.",
      status: "Connected",
      authenticated: true,
    },
    status: "Active",
    isPrebuilt: true,
    createdAt: "2026-09-29T10:00:00.000Z",
    updatedAt: "2026-09-29T10:00:00.000Z",
  },
];

function init() {
  if (!localStorage.getItem(KEYS.events)) {
    Object.entries(KEYS).forEach(([k, v]) => {
      localStorage.setItem(v, JSON.stringify(SEED[k] || []));
    });
  }

  // Ensure pre-built workflows are always seeded and available
  const existingWf = get("workflows");
  if (!existingWf || existingWf.length === 0) {
    set("workflows", PREBUILT_WORKFLOWS);
  } else {
    let updated = [...existingWf];
    let changed = false;
    for (const pb of PREBUILT_WORKFLOWS) {
      if (!updated.some((w) => w.id === pb.id)) {
        updated.push(pb);
        changed = true;
      }
    }
    if (changed) {
      set("workflows", updated);
    }
  }
}

function get(key) {
  try {
    return JSON.parse(localStorage.getItem(KEYS[key])) || [];
  } catch {
    return [];
  }
}

function set(key, data) {
  localStorage.setItem(KEYS[key], JSON.stringify(data));
}

export function reset() {
  Object.entries(KEYS).forEach(([k, v]) => {
    localStorage.setItem(v, JSON.stringify(k === "workflows" ? PREBUILT_WORKFLOWS : (SEED[k] || [])));
  });
  window.location.reload();
}

// Events
export function getEvents() { init(); return get("events"); }
export function addEvent(ev) {
  const events = getEvents();
  events.unshift(ev);
  set("events", events);
  logActivity("event.created", "Event Created", ev.name);
}

// Registrations
export function getRegistrations() { init(); return get("registrations"); }
export function addRegistration(reg) {
  const regs = getRegistrations();
  regs.unshift(reg);
  set("registrations", regs);
  const eventName = getEvents().find(e => e.id === reg.eventId)?.name || "";
  logActivity("registration.created", "New Registration", `${reg.name} → ${eventName}`);
  triggerWorkflowsForEvent("registration.created", { participantName: reg.name, email: reg.email, eventName });
}

export function updateRegistrationStatus(id, status) {
  const regs = getRegistrations();
  const idx = regs.findIndex(r => r.id === id);
  if (idx > -1) {
    regs[idx].status = status;
    set("registrations", regs);
    const label = status === "Approved" ? "registration.approved" : "participant.checked_in";
    const display = status === "Approved" ? "Registration Approved" : "Participant Checked In";
    logActivity(label, display, `${regs[idx].name}`);
  }
}

// Teams
export function getTeams() { init(); return get("teams"); }
export function addTeam(team) {
  const teams = getTeams();
  teams.unshift(team);
  set("teams", teams);
  logActivity("team.created", "New Team Created", `${team.name} (${team.members?.length || 1} members)`);
  triggerWorkflowsForEvent("team.created", { teamName: team.name, membersCount: team.members?.length || 1 });
}

export function updateTeamSubmission(id, data) {
  const teams = getTeams();
  const idx = teams.findIndex(t => t.id === id);
  if (idx > -1) {
    teams[idx] = { ...teams[idx], ...data };
    set("teams", teams);
    logActivity("submission.received", "Submission Received", `${teams[idx].projectName} by ${teams[idx].name}`);
    triggerWorkflowsForEvent("submission.received", { teamName: teams[idx].name, projectName: teams[idx].projectName });
  }
}

// Scores
export function getScores() { init(); return get("scores"); }
export function saveScore(score) {
  const scores = getScores();
  const idx = scores.findIndex(s => s.teamId === score.teamId);
  if (idx > -1) scores[idx] = score;
  else scores.push(score);
  set("scores", scores);
  logActivity("score.submitted", "Evaluation Submitted", `Score ${score.total || 90} for team`);
  triggerWorkflowsForEvent("score.submitted", score);
}

export function publishResults(eventName) {
  logActivity("results.published", "Results Published", eventName);
  triggerWorkflowsForEvent("results.published", { eventName });
}

// Activity Log
export function getActivityLog() { init(); return get("activityLog"); }
function logActivity(activity, label, detail) {
  const log = getActivityLog();
  log.unshift({ id: `a${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, activity, label, detail, time: new Date().toISOString() });
  set("activityLog", log);
}

// Automatically trigger active workflows that match an event
function triggerWorkflowsForEvent(eventSlug, eventPayload) {
  try {
    const workflows = getWorkflows();
    const matching = workflows.filter((w) => w.status === "Active" && (w.trigger?.event === eventSlug || w.trigger?.id === eventSlug));
    matching.forEach((w) => {
      const appName = w.action?.app || "viaSocket Action";
      const actionName = w.action?.event || "Action";
      logActivity(
        "workflow.executed",
        `Automation Triggered (${appName})`,
        `${w.name}: ${w.trigger?.name || eventSlug} → ${appName}: ${actionName}`
      );
      // If a live webhook URL is configured for the published flow, trigger it
      if (w.action?.webhookurl) {
        fetch(w.action.webhookurl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventPayload),
        }).catch((err) => console.debug("Flow webhook execution error:", err));
      }
    });
  } catch (e) {
    console.debug("triggerWorkflowsForEvent error:", e);
  }
}

// Workflows Helper Functions
function first(...values) {
  return values.find((v) => v !== undefined && v !== null && v !== "");
}

function normalizeStep(step) {
  step = step || {};
  return {
    app: first(step.app, step.app_name, step.service_name, step.integration_name, ""),
    name: first(step.name, step.title, ""),
    event: first(step.event, step.event_name, step.action_name, step.trigger_name, step.operation_name, ""),
    icon: first(step.icon, step.app_icon, step.service_icon, ""),
    serviceId: first(step.serviceId, step.service_id, ""),
    configuration: step.configuration || step.configurationJson || {},
    status: first(step.status, ""),
    authenticated: Boolean(step.authenticated),
    type: first(step.type, ""),
    webhookurl: first(step.webhookurl, step.webhook, ""),
  };
}

function normalizeWorkflow(flow) {
  const trigger = flow.trigger || flow.triggers?.[0] || {};
  const action = flow.action || flow.actions?.[0] || {};

  return {
    ...flow,
    id: first(flow.id, flow.flow_id, flow.flowId, `wf_${Date.now()}`),
    name: first(flow.name, flow.flow_name, flow.flowName, flow.title, "Untitled workflow"),
    description: first(flow.description, ""),
    trigger: normalizeStep(trigger),
    action: normalizeStep(action),
    status: flow.status === false || flow.enabled === false ? "Inactive" : first(flow.status, "Active"),
    isPrebuilt: Boolean(flow.isPrebuilt),
    createdAt: first(flow.createdAt, flow.created_at, new Date().toISOString()),
    updatedAt: new Date().toISOString(),
  };
}

export function getWorkflows() {
  init();
  return get("workflows");
}

export function saveWorkflow(flowOrFlows) {
  init();

  if (Array.isArray(flowOrFlows)) {
    const normalized = flowOrFlows.map(normalizeWorkflow);
    set("workflows", normalized);
    return normalized;
  }

  if (!flowOrFlows || typeof flowOrFlows !== "object") return null;

  const flow = normalizeWorkflow(flowOrFlows);
  const workflows = getWorkflows();
  const index = workflows.findIndex((item) => item.id === flow.id);

  if (index >= 0) workflows[index] = { ...workflows[index], ...flow };
  else workflows.unshift(flow);

  set("workflows", workflows);
  return flow;
}

export function updateWorkflow(id, data) {
  init();
  const workflows = getWorkflows();
  const index = workflows.findIndex((item) => item.id === id);
  if (index === -1) return null;

  workflows[index] = normalizeWorkflow({
    ...workflows[index],
    ...data,
    id,
    updatedAt: new Date().toISOString(),
  });

  set("workflows", workflows);
  return workflows[index];
}

export function deleteWorkflow(id) {
  init();
  set("workflows", getWorkflows().filter((item) => item.id !== id));
}
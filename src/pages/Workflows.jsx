import { useCallback, useEffect, useRef, useState } from "react";
import {
  hasEmbedToken,
  mountViasocket,
  destroyViasocket,
  onViasocketMessage,
  getConnectedAuthentications,
  isServiceAuthenticated,
} from "../lib/viasocket.js";
import {
  getWorkflows,
  saveWorkflow,
  updateWorkflow,
  deleteWorkflow,
  HACKHUB_STATIC_TRIGGERS,
  PREBUILT_WORKFLOWS,
} from "../lib/store.js";

function Icon({ src, name }) {
  if (src) {
    return <img className="workflow-app-icon" src={src} alt={name || "App"} onError={(e) => { e.currentTarget.style.display = "none"; }} />;
  }
  return <div className="workflow-app-icon workflow-app-icon-fallback">{(name || "?").slice(0, 1).toUpperCase()}</div>;
}

function parseFlowAction(flow) {
  if (!flow || typeof flow !== "object") return null;

  // Must be an active / published flow to be considered connected
  const isActive = flow.status === "active" || flow.action === "published" || flow.action === "updated";
  if (!isActive) return null;

  let title = flow.title || "";
  let appName = "";
  let actionName = title;

  // Many viaSocket flow titles are in the format "Action on App" e.g. "Add Row on Google Sheets"
  if (title.includes(" on ")) {
    const parts = title.split(" on ");
    actionName = parts[0].trim();
    appName = parts.slice(1).join(" on ").trim();
  }

  let icon = "";
  if (flow.serviceIcons) {
    if (Array.isArray(flow.serviceIcons) && flow.serviceIcons.length > 0) {
      icon = flow.serviceIcons[0];
    } else if (typeof flow.serviceIcons === "object") {
      icon = Object.values(flow.serviceIcons)[0] || "";
    } else if (typeof flow.serviceIcons === "string") {
      icon = flow.serviceIcons;
    }
  }

  if (!appName) {
    appName = flow.service_name || flow.serviceName || flow.service_id || "Connected Service";
  }

  return {
    app: appName,
    name: actionName,
    event: actionName,
    icon: icon,
    serviceId: flow.id || flow.service_id || "",
    webhookurl: flow.webhookurl || flow.webhook || "",
    description: flow.description || `Executed through viaSocket (${actionName})`,
    configuration: flow.payload || {},
    status: "Connected",
    authenticated: true,
  };
}

function WorkflowCard({ workflow, onEdit, onDelete, onToggleStatus }) {
  const trigger = workflow.trigger || {};
  const action = workflow.action || {};

  return (
    <article className="workflow-card">
      <div className="workflow-card-header">
        <div>
          <div className="workflow-card-title-row">
            <h3>{workflow.name || "Untitled workflow"}</h3>
            {workflow.isPrebuilt && <span className="badge badge-prebuilt">Pre-built</span>}
          </div>
          {workflow.description && <p>{workflow.description}</p>}
        </div>
        <button
          className={`badge badge-toggle ${workflow.status === "Active" ? "badge-green" : "badge-gray"}`}
          onClick={() => onToggleStatus && onToggleStatus(workflow)}
          title="Click to toggle status"
        >
          {workflow.status || "Active"}
        </button>
      </div>

      <div className="workflow-connection">
        <div className="workflow-mini-step">
          <span className="mini-label">HACKHUB TRIGGER</span>
          <div className="mini-app">
            <span className="mini-trigger-icon">{trigger.icon || "⚡"}</span>
            <div>
              <strong>{trigger.name || trigger.event || "Select trigger"}</strong>
              <span>HackHub Event: {trigger.event || "static"}</span>
            </div>
          </div>
        </div>

        <div className="workflow-connector">→</div>

        <div className="workflow-mini-step">
          <span className="mini-label">VIASOCKET ACTION</span>
          <div className="mini-app">
            <Icon src={action.icon} name={action.app} />
            <div>
              <strong>{action.app ? `${action.app}: ${action.event || action.name || "Configured"}` : "Not configured"}</strong>
              <span>{action.authenticated ? "● Connected & Authenticated" : (action.event || "Choose viaSocket action")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="workflow-card-footer">
        <span>{workflow.updatedAt ? new Date(workflow.updatedAt).toLocaleDateString() : "Ready to use"}</span>
        <div className="row">
          <button className="btn btn-secondary btn-sm" onClick={() => onEdit(workflow)}>Edit</button>
          {!workflow.isPrebuilt && (
            <button className="btn btn-secondary btn-sm danger-button" onClick={() => onDelete(workflow.id)}>Delete</button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Workflows() {
  const [workflows, setWorkflows] = useState(() => getWorkflows());
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Static HackHub trigger picker state
  const [showTriggerPicker, setShowTriggerPicker] = useState(false);

  // viaSocket Action configuration modal
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState(null);
  const embedContainerRef = useRef(null);
  const embedInstanceRef = useRef(null);

  const [builder, setBuilder] = useState({
    name: "",
    description: "",
    trigger: null,
    action: null,
    status: "Active",
  });

  const refresh = useCallback(() => setWorkflows(getWorkflows()), []);

  // Closes viaSocket embed cleanly
  const handleCloseEmbed = useCallback(() => {
    if (embedInstanceRef.current) {
      destroyViasocket(embedInstanceRef.current, embedContainerRef.current);
      embedInstanceRef.current = null;
    }
    setIsEmbedOpen(false);
  }, []);

  // Open viaSocket for Action configuration ONLY
  function openActionEmbed() {
    setAuthNotice(null);
    setIsEmbedOpen(true);
  }

  // Mount viaSocket inside the full-screen modal only when isEmbedOpen is true
  useEffect(() => {
    if (!isEmbedOpen) return;

    let isCurrent = true;

    async function initEmbed() {
      try {
        if (!embedContainerRef.current) return;

        const instance = await mountViasocket({
          parent: embedContainerRef.current,
          config: {
            showEnabled: false, // Land directly on the integrations catalog
            showServices: true,
            pageheading: "Action",
            pagesubheading: "Select an app, connect your account, and choose an action for this HackHub workflow.",
          },
          onFlow: (flow) => {
            console.log("viaSocket flow event received:", flow);

            // CRITICAL AUTHENTICATION CHECK:
            // Do NOT mark as connected if the flow is merely "initiated" (drafted).
            // A service is ONLY marked as connected when authentication is complete
            // and the user has published/completed the flow.
            if (flow.status === "drafted" || flow.action === "initiated") {
              console.log("Flow is drafted/initiated. Awaiting user authentication and publish...");
              return;
            }

            const parsedAction = parseFlowAction(flow);
            if (parsedAction) {
              setBuilder((prev) => ({
                ...prev,
                action: parsedAction,
              }));
              handleCloseEmbed();
            }
          },
        });

        if (!isCurrent) {
          destroyViasocket(instance, embedContainerRef.current);
          return;
        }

        embedInstanceRef.current = instance;
      } catch (err) {
        console.error("Failed to mount viaSocket:", err);
      }
    }

    initEmbed();

    // Close on Escape key
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        handleCloseEmbed();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      isCurrent = false;
      window.removeEventListener("keydown", onKeyDown);
      if (embedInstanceRef.current) {
        destroyViasocket(embedInstanceRef.current, embedContainerRef.current);
        embedInstanceRef.current = null;
      }
    };
  }, [isEmbedOpen, handleCloseEmbed]);

  // Window message listener for authentication results and published flows
  useEffect(() => {
    const unsubscribe = onViasocketMessage((data) => {
      console.debug("viaSocket window message:", data);

      // 1. User clicked close slider inside viaSocket iframe
      if (data?.type === "close-slider") {
        handleCloseEmbed();
        return;
      }

      // 2. Authentication failure / cancellation handling
      if (data?.type === "viasocket_connection_failed" || data?.event === "failed") {
        setAuthNotice("Authentication was cancelled or failed. Service was not connected.");
        return;
      }

      // 3. Successful OAuth connection event from viaSocket connect component
      if (data?.type === "viasocket_connection_success" || data?.event === "viasocket_connection_success") {
        console.log("viaSocket OAuth authentication successful:", data);
        const authData = data.data || {};
        const appName = authData.service_name || authData.name || "Connected App";
        setBuilder((prev) => ({
          ...prev,
          action: {
            ...(prev.action || {}),
            app: appName,
            serviceId: authData.service_id || authData.id || "",
            status: "Connected",
            authenticated: true,
          },
        }));
        return;
      }

      // 4. Flow publication event (Action configured and saved)
      const flow = data?.flow || data?.data?.flow || (data?.id && (data?.action || data?.status) ? data : null);
      if (flow && typeof flow === "object") {
        // Must be genuinely published/active, not merely drafted or clicked
        if (flow.status === "active" || flow.action === "published" || flow.action === "updated") {
          const parsed = parseFlowAction(flow);
          if (parsed) {
            setBuilder((prev) => ({
              ...prev,
              action: parsed,
            }));
            handleCloseEmbed();
          }
        }
      }
    });

    return unsubscribe;
  }, [handleCloseEmbed]);

  // Clean up any lingering embed instances on unmount
  useEffect(() => {
    return () => {
      if (embedInstanceRef.current) {
        destroyViasocket(embedInstanceRef.current, embedContainerRef.current);
        embedInstanceRef.current = null;
      }
    };
  }, []);

  function openCreate() {
    setEditingId(null);
    setBuilder({
      name: "",
      description: "",
      trigger: null,
      action: null,
      status: "Active",
    });
    setBuilderOpen(true);
  }

  function openEdit(workflow) {
    setEditingId(workflow.id);
    setBuilder({
      name: workflow.name || "",
      description: workflow.description || "",
      trigger: workflow.trigger || null,
      action: workflow.action || null,
      status: workflow.status || "Active",
    });
    setBuilderOpen(true);
  }

  function selectStaticTrigger(t) {
    setBuilder((prev) => ({
      ...prev,
      trigger: {
        app: "HackHub",
        name: t.name,
        event: t.event,
        icon: t.icon,
        description: t.description,
        type: "hackhub",
      },
    }));
    setShowTriggerPicker(false);
  }

  function handleSave() {
    if (!builder.name.trim()) {
      alert("Enter a workflow name.");
      return;
    }
    if (!builder.trigger?.name && !builder.trigger?.event) {
      alert("Please select a static HackHub trigger event.");
      return;
    }
    if (!builder.action?.app && !builder.action?.event) {
      alert("Please configure an Action through viaSocket before saving.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        updateWorkflow(editingId, builder);
      } else {
        saveWorkflow({
          ...builder,
          id: `hackhub_${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      refresh();
      setBuilderOpen(false);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id) {
    if (!confirm("Delete this workflow from HackHub?")) return;
    deleteWorkflow(id);
    refresh();
  }

  function handleToggleStatus(wf) {
    const newStatus = wf.status === "Active" ? "Inactive" : "Active";
    updateWorkflow(wf.id, { status: newStatus });
    refresh();
  }

  return (
    <>
      {/* Full-screen viaSocket Embed interface - rendered ONLY when explicitly configuring Action */}
      {isEmbedOpen && (
        <div className="viasocket-modal-overlay" role="dialog" aria-modal="true" aria-label="viaSocket Action Selector">
          <header className="viasocket-modal-header">
            <div className="viasocket-modal-header-left">
              <button
                type="button"
                className="viasocket-modal-back"
                onClick={handleCloseEmbed}
              >
                ← Back to Workflow Builder
              </button>
              <div className="viasocket-modal-divider" />
              <div className="viasocket-modal-title">
                <span className="viasocket-modal-badge">Configure Action</span>
                <span className="viasocket-modal-subtitle">
                  {builder.trigger?.name
                    ? `Action for: "${builder.trigger.name}"`
                    : "Select an app, authenticate, and configure its action"}
                </span>
              </div>
            </div>
            <div className="viasocket-modal-header-right">
              <button
                type="button"
                className="viasocket-modal-close"
                onClick={handleCloseEmbed}
                title="Close and return to workflow builder"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </header>

          {authNotice && (
            <div className="viasocket-auth-alert">
              <span>⚠️ {authNotice}</span>
              <button onClick={() => setAuthNotice(null)}>Dismiss</button>
            </div>
          )}

          <main className="viasocket-embed-viewport">
            <div
              id="viasocket-embed-container"
              ref={embedContainerRef}
              style={{ width: "100%", height: "100%" }}
            />
          </main>
        </div>
      )}

      {/* Static HackHub Trigger Picker Modal */}
      {showTriggerPicker && (
        <div className="modal-backdrop" onClick={() => setShowTriggerPicker(false)}>
          <div className="modal trigger-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Select HackHub Trigger Event</h3>
                <p className="modal-subtitle">Choose the predefined HackHub event that initiates this workflow.</p>
              </div>
              <button className="modal-close" onClick={() => setShowTriggerPicker(false)}>×</button>
            </div>
            <div className="trigger-options-list">
              {HACKHUB_STATIC_TRIGGERS.map((t) => (
                <div
                  key={t.id}
                  className={`trigger-option-card ${builder.trigger?.event === t.event ? "selected" : ""}`}
                  onClick={() => selectStaticTrigger(t)}
                >
                  <span className="trigger-option-icon">{t.icon}</span>
                  <div className="trigger-option-copy">
                    <div className="trigger-option-name">{t.name}</div>
                    <div className="trigger-option-desc">{t.description}</div>
                    <span className="trigger-option-tag">Event: {t.event}</span>
                  </div>
                  {builder.trigger?.event === t.event && <span className="trigger-check">✓</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {builderOpen ? (
        <div className="workflow-builder-page">
          <div className="workflow-builder-header">
            <div>
              <button className="back-button" onClick={() => setBuilderOpen(false)}>← Back to Workflows</button>
              <h1>{editingId ? "Edit Workflow" : "Create Workflow"}</h1>
              <p>Connect a static HackHub event to an authenticated viaSocket action.</p>
            </div>
            <div className="row">
              <button className="btn btn-secondary" onClick={() => setBuilderOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Workflow"}
              </button>
            </div>
          </div>

          {!hasEmbedToken && (
            <div className="embed-token-banner">
              <strong>viaSocket embed token not configured.</strong>
              <span>Set VITE_VIASOCKET_EMBED_TOKEN in .env and restart the dev server.</span>
            </div>
          )}

          <div className="builder-card">
            <div className="builder-form">
              <label>
                Workflow name
                <input
                  value={builder.name}
                  onChange={(e) => setBuilder({ ...builder, name: e.target.value })}
                  placeholder="e.g. Project Submission to Gmail"
                />
              </label>
              <label>
                Description <span className="optional">(optional)</span>
                <textarea
                  value={builder.description}
                  onChange={(e) => setBuilder({ ...builder, description: e.target.value })}
                  placeholder="What should this automation do?"
                />
              </label>
            </div>

            <div className="builder-flow">
              {/* Step 1: Static HackHub Trigger */}
              <div className={`builder-step ${builder.trigger ? "configured" : ""}`}>
                <div className="builder-step-top">
                  <div className="builder-step-type">
                    <span className="step-dot trigger-dot" />
                    <div>
                      <div className="builder-step-label">TRIGGER: HACKHUB EVENT (STATIC)</div>
                      <div className="builder-step-title">
                        {builder.trigger ? builder.trigger.name : "Choose Trigger"}
                      </div>
                    </div>
                  </div>
                  {builder.trigger && (
                    <button className="icon-button" onClick={() => setBuilder({ ...builder, trigger: null })} title="Remove trigger">×</button>
                  )}
                </div>

                {builder.trigger ? (
                  <div className="configured-step">
                    <span className="configured-trigger-icon">{builder.trigger.icon || "⚡"}</span>
                    <div className="configured-step-copy">
                      <strong>{builder.trigger.name}</strong>
                      <span>HackHub Event: <code>{builder.trigger.event}</code></span>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowTriggerPicker(true)}>Change</button>
                  </div>
                ) : (
                  <button className="builder-add-step" onClick={() => setShowTriggerPicker(true)}>
                    <span>＋</span>
                    <span>Select Trigger</span>
                  </button>
                )}

                <div className="builder-step-help">
                  Predefined HackHub event that starts this automation.
                </div>
              </div>

              <div className="builder-down-arrow">↓</div>

              {/* Step 2: viaSocket Action */}
              <div className={`builder-step ${builder.action?.app ? "configured" : ""}`}>
                <div className="builder-step-top">
                  <div className="builder-step-type">
                    <span className="step-dot action-dot" />
                    <div>
                      <div className="builder-step-label">ACTION: VIASOCKET INTEGRATION</div>
                      <div className="builder-step-title">
                        {builder.action?.app ? `${builder.action.app}: ${builder.action.event || builder.action.name || "Action"}` : "Choose Action"}
                      </div>
                    </div>
                  </div>
                  {builder.action?.app && (
                    <button className="icon-button" onClick={() => setBuilder({ ...builder, action: null })} title="Remove action">×</button>
                  )}
                </div>

                {builder.action?.app ? (
                  <div className="configured-step">
                    <Icon src={builder.action.icon} name={builder.action.app} />
                    <div className="configured-step-copy">
                      <strong>{builder.action.app}</strong>
                      <span>{builder.action.event || builder.action.name || "Action"}</span>
                      {builder.action.authenticated && (
                        <span className="auth-status-tag">✓ Authenticated & Connected</span>
                      )}
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={openActionEmbed}>Change</button>
                  </div>
                ) : (
                  <button className="builder-add-step" onClick={openActionEmbed}>
                    <span>＋</span>
                    <span>Select Action</span>
                  </button>
                )}

                <div className="builder-step-help">
                  Action performed in the connected external app (Google Sheets, Gmail, Slack, etc.) via viaSocket.
                </div>
              </div>

              <div className="builder-tools-row">
                <button
                  type="button"
                  className="builder-add-tool-btn"
                  onClick={openActionEmbed}
                >
                  <span>＋</span> Add New Tool
                </button>
              </div>
            </div>

            <div className="builder-note">
              <strong>Workflow structure:</strong> <code>HackHub Static Event → viaSocket Action</code>.<br />
              Select a predefined HackHub trigger (e.g., <strong>Project Submitted</strong>), then configure the corresponding action in viaSocket (e.g., <strong>Gmail: Send Email</strong>).
            </div>
          </div>
        </div>
      ) : (
        <div className="workflows-page">
          <div className="page-header workflows-page-header">
            <div>
              <h1>Workflows</h1>
              <p>Automate hackathon operations by connecting HackHub events to external apps.</p>
            </div>
            <div className="row" style={{ gap: "10px" }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  openCreate();
                  openActionEmbed();
                }}
              >
                + Add New Tool
              </button>
              <button className="btn btn-primary" onClick={openCreate}>
                + Create Workflow
              </button>
            </div>
          </div>

          {!hasEmbedToken && (
            <div className="embed-token-banner">
              <strong>viaSocket embed token not configured.</strong>
              <span>Set VITE_VIASOCKET_EMBED_TOKEN in .env and restart the dev server.</span>
            </div>
          )}

          {/* Pre-built HackHub Automations Banner */}
          <div className="prebuilt-info-card">
            <div className="prebuilt-info-header">
              <span className="prebuilt-badge-icon">⚡</span>
              <div>
                <h4>Pre-Built Automations Available</h4>
                <p>Ready-made workflows you can use right away without manual setup.</p>
              </div>
            </div>
          </div>

          <div className="workflows-list">
            {workflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onEdit={openEdit}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>

          <div className="workflows-footer">
            <span>Automations powered by <strong>HackHub & viaSocket</strong></span>
            <span className={hasEmbedToken ? "footer-connected" : ""}>
              {hasEmbedToken ? "● Connected" : "○ Not connected"}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

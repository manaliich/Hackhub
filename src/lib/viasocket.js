// viaSocket Embed & Authentication integration
export const EMBED_TOKEN = import.meta.env.VITE_VIASOCKET_EMBED_TOKEN;
export const EMBED_ORIGIN = "https://embedfrontend.viasocket.com";
export const hasEmbedToken = Boolean(EMBED_TOKEN);

let scriptPromise = null;
let connectScriptPromise = null;

/**
 * Loads the viaSocket runtime script onto window.viaSocket.
 *
 * CRITICAL FIX:
 * We intentionally DO NOT set embedToken, parentId, or config attributes on the <script> element.
 * If attributes like embedToken are present on the script tag, prod-embedcomponent.js's self-invoking
 * function auto-initializes and mounts to document.body immediately on script load. Since the backend
 * config contains type: "all_space", the embed automatically calls open() and forcibly renders over
 * the entire viewport on initial page load / page navigation.
 *
 * By loading the script purely as a library without attributes, window.viaSocket is registered
 * but remains completely inactive until explicitly mounted via viaSocket.mount() into a designated element.
 */
export function loadViasocketScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not available"));
  }

  if (window.viaSocket && typeof window.viaSocket.mount === "function") {
    return Promise.resolve(window.viaSocket);
  }

  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("viasocket-embed-main-script");
    if (existing) {
      if (window.viaSocket && typeof window.viaSocket.mount === "function") {
        resolve(window.viaSocket);
        return;
      }
      existing.addEventListener("load", () => resolve(window.viaSocket));
      existing.addEventListener("error", () => {
        scriptPromise = null;
        reject(new Error("viaSocket embed script failed to load"));
      });
      return;
    }

    const script = document.createElement("script");
    script.id = "viasocket-embed-main-script";
    script.src = "https://embed.viasocket.com/prod-embedcomponent.js";
    script.async = true;

    script.onload = () => {
      if (window.viaSocket) {
        resolve(window.viaSocket);
      } else {
        reject(new Error("viaSocket runtime not found after script load"));
      }
    };

    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("viaSocket embed script failed to load"));
    };

    document.head.appendChild(script);
  });

  return scriptPromise;
}

/**
 * Loads the viaSocket Connect Component script for direct OAuth popups if needed.
 */
export function loadConnectComponentScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("Window is not available"));
  if (typeof window.openViasocketConnection === "function") return Promise.resolve(window.openViasocketConnection);
  if (connectScriptPromise) return connectScriptPromise;

  connectScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("viasocket-connect-component-script");
    if (existing) {
      if (typeof window.openViasocketConnection === "function") {
        resolve(window.openViasocketConnection);
        return;
      }
      existing.addEventListener("load", () => resolve(window.openViasocketConnection));
      existing.addEventListener("error", () => reject(new Error("viaSocket connect script failed to load")));
      return;
    }

    const script = document.createElement("script");
    script.id = "viasocket-connect-component-script";
    script.src = "https://embed.viasocket.com/prod-connectcomponent.js";
    script.async = true;
    script.onload = () => resolve(window.openViasocketConnection);
    script.onerror = () => {
      connectScriptPromise = null;
      reject(new Error("viaSocket connect script failed to load"));
    };
    document.head.appendChild(script);
  });

  return connectScriptPromise;
}

/**
 * Opens the native viaSocket OAuth connection popup for a given service.
 */
export async function openAppConnectionPopup(serviceId) {
  if (!hasEmbedToken || !serviceId) return false;
  await loadConnectComponentScript();
  if (typeof window.openViasocketConnection === "function") {
    window.openViasocketConnection(EMBED_TOKEN, serviceId);
    return true;
  }
  return false;
}

/**
 * Fetches real active authentications for the current user from viaSocket's API.
 * Never uses mock or fake authentication data.
 */
export async function getConnectedAuthentications() {
  if (!hasEmbedToken) return [];
  try {
    const res = await fetch("https://flow-api.viasocket.com/embed/authentications", {
      headers: {
        Authorization: EMBED_TOKEN,
      },
    });
    const data = await res.json();
    if (data && data.success && Array.isArray(data.data)) {
      return data.data; // List of active, verified authentications
    }
    return [];
  } catch (err) {
    console.error("Failed to query viaSocket authentications:", err);
    return [];
  }
}

/**
 * Verifies whether a service is genuinely authenticated in viaSocket.
 */
export async function isServiceAuthenticated(serviceIdOrName) {
  if (!serviceIdOrName) return false;
  const auths = await getConnectedAuthentications();
  const target = serviceIdOrName.toLowerCase().trim();
  return auths.some((a) => {
    if (a.isExpired) return false;
    const nameMatch = a.service_name && a.service_name.toLowerCase().trim() === target;
    const idMatch = a.service_id && a.service_id.toLowerCase().trim() === target;
    return Boolean(nameMatch || idMatch);
  });
}

/**
 * Mounts the viaSocket integrations catalog into a dedicated parent container.
 * Configured with showEnabled: false so that it lands directly on the catalog view
 * (search bar, app grid with Slack, Gmail, Sheets, GitHub, etc.) matching full-screen expectations.
 */
export async function mountViasocket({ parent, config = {}, onFlow }) {
  if (!hasEmbedToken) {
    throw new Error("No viaSocket embed token provided");
  }

  await loadViasocketScript();

  if (!window.viaSocket || typeof window.viaSocket.mount !== "function") {
    throw new Error("viaSocket.mount is not available");
  }

  const mergedConfig = {
    type: "all_space",
    showEnabled: false, // Land directly on the catalog (search + app grid)
    showServices: true,
    pageheading: "Integration",
    pagesubheading: "Connect any app or tool to your HackHub workflow.",
    ...config,
  };

  const embed = window.viaSocket.mount({
    embedToken: EMBED_TOKEN,
    parent,
    config: mergedConfig,
  });

  if (typeof onFlow === "function" && embed && typeof embed.on === "function") {
    embed.on("flow", onFlow);
  }

  return embed;
}

/**
 * Safely tears down the viaSocket embed instance, its DOM nodes, and removes backdrops.
 */
export function destroyViasocket(instance, container) {
  try {
    if (instance && typeof instance.destroy === "function") {
      instance.destroy();
    }
  } catch (err) {
    console.warn("Error destroying viaSocket instance:", err);
  }

  if (container) {
    try {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    } catch (e) {
      // ignore
    }
  }

  // Remove any lingering floating elements or backdrops
  const strayElements = document.querySelectorAll(
    "#iframe-viasocket-embed-parent-container, .vs-embed__backdrop, #viasocket-embed-open-button"
  );
  strayElements.forEach((el) => {
    try {
      el.remove();
    } catch (e) {
      // ignore
    }
  });

  // Restore body scroll in case viaSocket modified it
  if (typeof document !== "undefined") {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }
}

/**
 * Listens for messages posted from viaSocket embed origin.
 */
export function onViasocketMessage(callback) {
  function handler(event) {
    if (event.origin !== EMBED_ORIGIN && event.origin !== "https://flow.viasocket.com") return;
    callback(event.data, event);
  }

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

// Backwards compatibility aliases
export const loadViasocketEmbed = loadViasocketScript;
export function openViasocket() {
  if (typeof window.openViasocket === "function") {
    return window.openViasocket();
  }
  return false;
}
export function openViasocketFlow(flowId) {
  if (!flowId || typeof window.openViasocket !== "function") return false;
  return window.openViasocket(flowId);
}
export function closeViasocket() {
  if (typeof window.handleclose === "function") {
    window.handleclose();
  }
  destroyViasocket();
  return true;
}

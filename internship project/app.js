const STORAGE_KEY = "trackhire-applications";
const THEME_KEY = "trackhire-theme";
const COMMANDS = [
  { id: "dashboard", label: "Go to Dashboard", action: () => navigateTo("dashboard") },
  { id: "applications", label: "Open Applications", action: () => navigateTo("applications") },
  { id: "add", label: "Add Application", action: () => navigateTo("add") },
  { id: "analytics", label: "Open Analytics", action: () => navigateTo("analytics") },
  { id: "settings", label: "Open Settings", action: () => navigateTo("settings") },
  { id: "theme", label: "Toggle Theme", action: toggleTheme },
];

const emptyStateText = {
  dashboard: "Your job hunt dashboard is ready when you add your first application.",
  applications: "Track your first internship or role and stay on top of interviews, deadlines, and offers.",
};

const state = {
  theme: "light",
  applications: [],
  activity: [],
  checklist: [
    { id: "resume", label: "Update resume and portfolio", done: false },
    { id: "company-list", label: "Research target companies", done: false },
    { id: "prep-interview", label: "Practice interview questions", done: false },
    { id: "network", label: "Follow up with contacts", done: false },
  ],
  filters: {
    status: "All",
    sort: "Newest",
    query: "",
  },
  activeAppId: null,
  editMode: false,
  pendingDeleteId: null,
};

const statusLabels = ["All", "Wishlist", "Applied", "Assessment", "Interview", "Offer", "Selected", "Rejected"];
const sortOptions = ["Newest", "Oldest", "Company Name", "Deadline"];
const jobTypes = ["Internship", "Full Time", "Part Time", "Contract", "Remote"];
const statusPalette = {
  Wishlist: "wishlist",
  Applied: "applied",
  Assessment: "assessment",
  Interview: "interview",
  Offer: "offer",
  Selected: "selected",
  Rejected: "rejected",
};

const dom = {
  landing: document.getElementById("landing-page"),
  appPage: document.getElementById("app-page"),
  openDashboardBtn: document.getElementById("open-dashboard-btn"),
  sidebarButtons: document.querySelectorAll(".nav-item"),
  themeToggle: document.getElementById("theme-toggle"),
  toastContainer: document.getElementById("toast-container"),
  modalOverlay: document.getElementById("modal-overlay"),
  modalTitle: document.getElementById("modal-title"),
  modalMessage: document.getElementById("modal-message"),
  modalConfirm: document.getElementById("modal-confirm"),
  modalCancel: document.getElementById("modal-cancel"),
  commandOverlay: document.getElementById("command-palette-overlay"),
  commandSearch: document.getElementById("command-search"),
  commandList: document.getElementById("command-list"),
  importFile: document.getElementById("import-file"),
  routeTitle: document.getElementById("route-title"),
  mobileNav: document.getElementById("mobile-nav"),
  mobileNavToggle: document.getElementById("mobile-nav-toggle"),
  themeToggle: document.getElementById("theme-toggle"),
};

const views = {
  dashboard: document.getElementById("view-dashboard"),
  applications: document.getElementById("view-applications"),
  add: document.getElementById("view-add"),
  details: document.getElementById("view-details"),
  analytics: document.getElementById("view-analytics"),
  settings: document.getElementById("view-settings"),
};

const inputs = {
  filterButtons: document.querySelectorAll("[data-filter]"),
  sortButtons: document.querySelectorAll("[data-sort]"),
  searchInput: document.getElementById("search-input"),
  appForm: document.getElementById("application-form"),
  formFields: {
    company: document.getElementById("company-name"),
    role: document.getElementById("role-name"),
    location: document.getElementById("location-name"),
    url: document.getElementById("application-url"),
    salary: document.getElementById("application-salary"),
    applied: document.getElementById("applied-date"),
    deadline: document.getElementById("deadline-date"),
    notes: document.getElementById("application-notes"),
    type: document.getElementById("job-type"),
    status: document.getElementById("application-status"),
  },
  exportJson: document.getElementById("export-json"),
  exportCsv: document.getElementById("export-csv"),
  importJson: document.getElementById("import-json"),
  backupData: document.getElementById("backup-data"),
  restoreData: document.getElementById("restore-data"),
  clearData: document.getElementById("clear-data"),
  storageInfo: document.getElementById("storage-info"),
  themeSelect: document.getElementById("theme-select"),
};

const canvases = {
  status: document.getElementById("status-distribution-chart"),
  monthly: document.getElementById("monthly-applications-chart"),
  weekly: document.getElementById("weekly-applications-chart"),
  trends: document.getElementById("application-trends-chart"),
};

function setTheme(theme) {
  state.theme = theme;
  document.body.classList.toggle("theme-dark", theme === "dark");
  document.body.classList.toggle("theme-light", theme === "light");
  localStorage.setItem(THEME_KEY, theme);
  inputs.themeSelect.value = theme;
}

function toggleTheme() {
  setTheme(state.theme === "dark" ? "light" : "dark");
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const theme = localStorage.getItem(THEME_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      state.applications = Array.isArray(parsed.applications) ? parsed.applications : [];
      state.activity = Array.isArray(parsed.activity) ? parsed.activity : [];
      state.checklist = Array.isArray(parsed.checklist) ? parsed.checklist : state.checklist;
    } catch (error) {
      console.error("Invalid saved data", error);
      state.applications = [];
      state.activity = [];
    }
  }
  if (theme === "dark" || theme === "light") {
    setTheme(theme);
  } else {
    setTheme(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    applications: state.applications,
    activity: state.activity,
    checklist: state.checklist,
  }));
}

function notify(title, message = "", variant = "success") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
  dom.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatCountdown(deadline) {
  const diff = Math.floor((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (Number.isNaN(diff)) return "—";
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} overdue`;
  if (diff === 0) return "Due today";
  return `${diff} day${diff === 1 ? "" : "s"} left`;
}

function getDeadlineState(deadline) {
  const diff = Math.floor((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff <= 7) return "urgent";
  return "on-track";
}

function sortApplications(items) {
  return [...items].sort((a, b) => {
    switch (state.filters.sort) {
      case "Oldest": return new Date(a.createdAt) - new Date(b.createdAt);
      case "Company Name": return a.company.localeCompare(b.company);
      case "Deadline": return new Date(a.deadline || a.appliedDate) - new Date(b.deadline || b.appliedDate);
      default: return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });
}

function filterApplications(items) {
  return items.filter((app) => {
    const statusMatch = state.filters.status === "All" || app.status === state.filters.status;
    const query = state.filters.query.trim().toLowerCase();
    const searchMatch = query === "" || [app.company, app.role, app.location, app.type, app.status].some((value) => String(value || "").toLowerCase().includes(query));
    return statusMatch && searchMatch;
  });
}

function getRouteTitle(route) {
  switch (route) {
    case "dashboard": return "Dashboard";
    case "applications": return "Applications";
    case "add": return "Add Application";
    case "details": return "Application Details";
    case "analytics": return "Analytics";
    case "settings": return "Settings";
    default: return "TrackHire";
  }
}

function computeMetrics() {
  const counts = statusLabels.slice(1).reduce((acc, label) => ({ ...acc, [label]: 0 }), {});
  const total = state.applications.length;
  state.applications.forEach((app) => {
    if (counts[app.status] >= 0) counts[app.status] += 1;
  });
  const applied = counts.Applied + counts.Assessment + counts.Interview + counts.Offer + counts.Selected + counts.Rejected;
  const interviewRate = total ? Math.round(((counts.Interview + counts.Offer + counts.Selected) / total) * 100) : 0;
  const offerRate = total ? Math.round(((counts.Offer + counts.Selected) / total) * 100) : 0;
  const selectionRate = total ? Math.round((counts.Selected / total) * 100) : 0;
  const rejectionRate = total ? Math.round((counts.Rejected / total) * 100) : 0;
  return { total, counts, applied, interviewRate, offerRate, selectionRate, rejectionRate };
}

function calculateRecentActivity() {
  return [...state.activity].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 6);
}

function renderNavigation() {
  dom.sidebarButtons.forEach((button) => {
    const view = button.dataset.target;
    button.classList.toggle("active", getCurrentRoute() === view);
  });
}

function getCurrentRoute() {
  return window.location.hash.replace("#", "") || "dashboard";
}

function navigateTo(view, params = {}) {
  let hash = `#${view}`;
  const keys = Object.keys(params);
  if (keys.length) {
    hash += `?${keys.map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&")}`;
  }
  window.location.hash = hash;
}

function parseHash() {
  const [hash, query] = window.location.hash.split("?");
  const route = hash.replace("#", "") || "dashboard";
  const params = {};
  if (query) {
    query.split("&").forEach((pair) => {
      const [key, value] = pair.split("=");
      params[decodeURIComponent(key)] = decodeURIComponent(value || "");
    });
  }
  return { route, params };
}

function showView(viewId) {
  Object.values(views).forEach((section) => {
    section.classList.toggle("hidden", section.id !== `view-${viewId}`);
  });
  dom.landing.classList.toggle("hidden", viewId !== "landing");
  dom.appPage.classList.toggle("hidden", viewId === "landing");
  renderNavigation();
}

function renderDashboard() {
  const { total, counts, interviewRate, offerRate, selectionRate, rejectionRate } = computeMetrics();
  const upcoming = state.applications
    .filter((app) => app.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 3);
  const recent = [...state.applications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
  const activity = calculateRecentActivity();
  const progressValue = total ? Math.round(((counts.Offer + counts.Selected) / total) * 100) : 8;

  views.dashboard.innerHTML = `
    <div class="section-heading">
      <div>
        <p class="badge">Dashboard overview</p>
        <h2>Application progress at a glance</h2>
      </div>
      <button class="btn btn-secondary" onclick="navigateTo('add')">Quick add</button>
    </div>

    <div class="dashboard-grid stats-grid">
      ${statusLabels.slice(1).map((label) => `
        <article class="status-card">
          <p>${label}</p>
          <strong>${counts[label] || 0}</strong>
        </article>
      `).join("")}
    </div>

    <div class="dashboard-grid-2">
      <section class="widget-card">
        <header>
          <div>
            <h3>Job hunt progress</h3>
            <p class="section-description">Track momentum from applications to offers.</p>
          </div>
          <span class="badge">${progressValue}%</span>
        </header>
        <div class="metric-box">
          <div>
            <h3>${total}</h3>
            <span>Total opportunities</span>
          </div>
          <div>
            <h3>${counts.Offer + counts.Selected}</h3>
            <span>Offers & selections</span>
          </div>
        </div>
        <div class="metric-box">
          <div>
            <h3>${interviewRate}%</h3>
            <span>Interview rate</span>
          </div>
          <div>
            <h3>${offerRate}%</h3>
            <span>Offer rate</span>
          </div>
        </div>
      </section>

      <section class="widget-card">
        <header>
          <div>
            <h3>Upcoming deadlines</h3>
            <p class="section-description">Never miss a closing date.</p>
          </div>
        </header>
        ${upcoming.length ? `
          <div class="card-list">
            ${upcoming.map((app) => `
              <article class="card-item">
                <div class="meta"><strong>${app.role}</strong><span>${app.company}</span></div>
                <div class="meta"><span>${formatDate(app.deadline)}</span><span class="badge ${getDeadlineState(app.deadline) === 'urgent' ? 'warning' : getDeadlineState(app.deadline) === 'overdue' ? 'danger' : ''}">${formatCountdown(app.deadline)}</span></div>
              </article>
            `).join("")}
          </div>
        ` : `
          <div class="empty-state">
            <h3>No deadlines yet</h3>
            <p>Add an application to see the next opportunities and countdowns.</p>
          </div>
        `}
      </section>
    </div>

    <div class="dashboard-grid-2">
      <section class="widget-card">
        <header>
          <div>
            <h3>Interview preparation</h3>
            <p class="section-description">Checklist for every stage of the interview process.</p>
          </div>
        </header>
        <div class="checklist-items" id="checklist-items"></div>
      </section>

      <section class="widget-card">
        <header>
          <div>
            <h3>Recent application activity</h3>
            <p class="section-description">Your latest updates and timeline for action.</p>
          </div>
        </header>
        <div class="timeline">
          ${activity.length ? activity.map((event) => `
            <article class="timeline-item">
              <p>${event.title}</p>
              <span>${new Date(event.time).toLocaleString()}</span>
            </article>
          `).join("") : `
            <div class="empty-state">
              <h3>Activity feed is empty</h3>
              <p>Add applications or update statuses to populate your timeline.</p>
            </div>
          `}
        </div>
      </section>
    </div>
  `;
  renderChecklist();
}

function renderChecklist() {
  const container = document.getElementById("checklist-items");
  if (!container) return;
  container.innerHTML = state.checklist.map((item) => `
    <label class="checkbox-row">
      <input type="checkbox" data-checklist="${item.id}" ${item.done ? "checked" : ""}>
      <span>${item.label}</span>
    </label>
  `).join("");
  container.querySelectorAll("input[data-checklist]").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const id = event.target.dataset.checklist;
      const item = state.checklist.find((task) => task.id === id);
      if (item) {
        item.done = event.target.checked;
        saveState();
      }
    });
  });
}

function renderApplications() {
  const apps = sortApplications(filterApplications(state.applications));
  const listContainer = document.getElementById("applications-list");
  listContainer.innerHTML = apps.length ? `
    <div class="table-card application-table">
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Role</th>
            <th>Location</th>
            <th>Type</th>
            <th>Applied</th>
            <th>Deadline</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${apps.map((app) => `
            <tr>
              <td><strong>${app.company}</strong></td>
              <td>${app.role}</td>
              <td>${app.location}</td>
              <td>${app.type}</td>
              <td>${formatDate(app.appliedDate)}</td>
              <td>${formatDate(app.deadline)}</td>
              <td><span class="status-pill ${statusPalette[app.status]}">${app.status}</span></td>
              <td>
                <div class="action-group">
                  <button class="btn btn-ghost" onclick="navigateTo('details', {id:'${app.id}'})">View</button>
                  <button class="btn btn-secondary" onclick="navigateTo('add', {id:'${app.id}'})">Edit</button>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <div class="application-cards">
      ${apps.map((app) => `
        <article class="card-item">
          <div class="meta"><strong>${app.company}</strong><span>${app.location}</span></div>
          <h3>${app.role}</h3>
          <div class="meta"><span>${app.type}</span><span>${formatDate(app.appliedDate)}</span></div>
          <div class="meta"><span>${formatDate(app.deadline)}</span><span class="status-pill ${statusPalette[app.status]}">${app.status}</span></div>
          <div class="action-group">
            <button class="btn btn-ghost" onclick="navigateTo('details', {id:'${app.id}'})">View</button>
            <button class="btn btn-secondary" onclick="navigateTo('add', {id:'${app.id}'})">Edit</button>
          </div>
        </article>
      `).join("")}
    </div>
  ` : `
    <div class="empty-state" style="padding:2rem;">
      <h3>Nothing to track yet</h3>
      <p>${emptyStateText.applications}</p>
      <button class="btn btn-primary" onclick="navigateTo('add')">Add your first application</button>
    </div>
  `;
}

function renderFilterControls() {
  inputs.filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.filters.status);
  });
  inputs.sortButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.sort === state.filters.sort);
  });
  inputs.searchInput.value = state.filters.query;
}

function renderAddForm() {
  const { params } = parseHash();
  const id = params.id || null;
  state.editMode = Boolean(id);
  state.activeAppId = id;
  const app = state.applications.find((item) => item.id === id) || {};
  inputs.formFields.company.value = app.company || "";
  inputs.formFields.role.value = app.role || "";
  inputs.formFields.location.value = app.location || "";
  inputs.formFields.url.value = app.url || "";
  inputs.formFields.salary.value = app.salary || "";
  inputs.formFields.applied.value = app.appliedDate ? app.appliedDate.slice(0, 10) : "";
  inputs.formFields.deadline.value = app.deadline ? app.deadline.slice(0, 10) : "";
  inputs.formFields.notes.value = app.notes || "";
  inputs.formFields.type.value = app.type || jobTypes[0];
  inputs.formFields.status.value = app.status || statusLabels[1];
  document.getElementById("form-heading").textContent = state.editMode ? "Edit application" : "Add application";
  document.getElementById("form-submit").textContent = state.editMode ? "Save changes" : "Create application";
  if (!state.editMode) {
    inputs.formFields.applied.value = new Date().toISOString().slice(0, 10);
  }
}

function renderDetails() {
  const { params } = parseHash();
  const app = state.applications.find((item) => item.id === params.id);
  if (!app) {
    views.details.innerHTML = `
      <div class="empty-state">
        <h3>Application not found</h3>
        <p>Return to the applications list to continue tracking.</p>
        <button class="btn btn-primary" onclick="navigateTo('applications')">Applications</button>
      </div>
    `;
    return;
  }
  const timeline = app.timeline || [];
  const statusHistory = app.history || [];
  views.details.innerHTML = `
    <div class="section-heading">
      <div>
        <p class="badge">Application details</p>
        <h2>${app.role} at ${app.company}</h2>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="navigateTo('add', {id:'${app.id}'})">Edit</button>
        <button class="btn btn-ghost" onclick="duplicateApplication('${app.id}')">Duplicate</button>
        <button class="btn btn-danger" onclick="confirmDelete('${app.id}')">Delete</button>
      </div>
    </div>

    <div class="dashboard-grid-2">
      <section class="panel">
        <h3>Company information</h3>
        <div class="data-meta"><span>Company: <strong>${app.company}</strong></span><span>Location: ${app.location}</span><span>Type: ${app.type}</span></div>
        <p>${app.notes || "No additional company notes added yet."}</p>
      </section>

      <section class="panel">
        <h3>Job information</h3>
        <div class="data-meta"><span>Role: <strong>${app.role}</strong></span><span>Salary/Stipend: ${app.salary || "Not provided"}</span><span>Application URL: ${app.url ? `<a href="${app.url}" target="_blank" rel="noreferrer">View posting</a>` : "Not provided"}</span></div>
        <p>Status: <span class="status-pill ${statusPalette[app.status]}">${app.status}</span> • Applied ${formatDate(app.appliedDate)}</p>
        <p>Deadline: ${formatDate(app.deadline)} • <span class="badge ${getDeadlineState(app.deadline) === 'urgent' ? 'warning' : getDeadlineState(app.deadline) === 'overdue' ? 'danger' : ''}">${formatCountdown(app.deadline)}</span></p>
      </section>
    </div>

    <div class="dashboard-grid-2">
      <section class="panel">
        <h3>Application timeline</h3>
        <div class="timeline">
          ${timeline.length ? timeline.map((event) => `
            <div class="timeline-item"><strong>${event.title}</strong><span>${formatDate(event.date)}</span><p>${event.description || ""}</p></div>
          `).join("") : `<div class="empty-state"><h3>No timeline events yet</h3><p>Update the application to record milestones and follow ups.</p></div>`}
        </div>
      </section>

      <section class="panel">
        <h3>Status history</h3>
        <div class="timeline">
          ${statusHistory.length ? statusHistory.map((history) => `
            <div class="timeline-item"><strong>${history.status}</strong><span>${new Date(history.time).toLocaleString()}</span></div>
          `).join("") : `<div class="empty-state"><h3>Status history is empty</h3><p>The status history is generated when you make updates.</p></div>`}
        </div>
      </section>
    </div>
  `;
}

function renderAnalytics() {
  const { total, counts, interviewRate, offerRate, selectionRate, rejectionRate } = computeMetrics();
  views.analytics.innerHTML = `
    <div class="section-heading">
      <div>
        <p class="badge">Insights</p>
        <h2>Performance metrics from your applications</h2>
      </div>
    </div>
    <div class="stats-grid">
      <article class="analytics-card"><h3>Total Applications</h3><strong>${total}</strong></article>
      <article class="analytics-card"><h3>Interview Rate</h3><strong>${interviewRate}%</strong></article>
      <article class="analytics-card"><h3>Offer Rate</h3><strong>${offerRate}%</strong></article>
      <article class="analytics-card"><h3>Selection Rate</h3><strong>${selectionRate}%</strong></article>
      <article class="analytics-card"><h3>Rejection Rate</h3><strong>${rejectionRate}%</strong></article>
    </div>
    <div class="dashboard-grid-2">
      <section class="chart-card">
        <header><h3>Status distribution</h3></header>
        <canvas id="status-distribution-chart"></canvas>
      </section>
      <section class="chart-card">
        <header><h3>Monthly applications</h3></header>
        <canvas id="monthly-applications-chart"></canvas>
      </section>
    </div>
    <div class="dashboard-grid-2">
      <section class="chart-card">
        <header><h3>Weekly applications</h3></header>
        <canvas id="weekly-applications-chart"></canvas>
      </section>
      <section class="chart-card">
        <header><h3>Application trends</h3></header>
        <canvas id="application-trends-chart"></canvas>
      </section>
    </div>
  `;
  canvases.status = document.getElementById("status-distribution-chart");
  canvases.monthly = document.getElementById("monthly-applications-chart");
  canvases.weekly = document.getElementById("weekly-applications-chart");
  canvases.trends = document.getElementById("application-trends-chart");
  drawStatusChart(counts);
  drawMonthlyChart();
  drawWeeklyChart();
  drawTrendChart();
}

function drawCanvas(canvas) {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return ctx;
}

function drawStatusChart(counts) {
  const ctx = drawCanvas(canvases.status);
  if (!ctx) return;
  const categories = ["Wishlist", "Applied", "Assessment", "Interview", "Offer", "Selected", "Rejected"];
  const values = categories.map((key) => counts[key] || 0);
  const colors = ["#8b5cf6", "#3b82f6", "#0ea5e9", "#f59e0b", "#10b981", "#22c55e", "#ef4444"];
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  const centerX = ctx.canvas.width / (2 * (window.devicePixelRatio || 1));
  const centerY = ctx.canvas.height / (2 * (window.devicePixelRatio || 1));
  const radius = Math.min(centerX, centerY) - 24;
  let startAngle = -Math.PI / 2;

  values.forEach((value, index) => {
    const slice = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = colors[index];
    ctx.fill();
    startAngle += slice;
  });
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = "var(--bg)";
  ctx.fill();
  ctx.fillStyle = "var(--text)";
  ctx.font = "600 16px Inter, system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Status mix", centerX, centerY + 6);
}

function buildMonthlyData() {
  const buckets = new Array(12).fill(0);
  const now = new Date();
  state.applications.forEach((app) => {
    const date = new Date(app.createdAt);
    if (!Number.isNaN(date.getTime())) {
      const month = date.getMonth();
      buckets[month] += 1;
    }
  });
  return buckets;
}

function drawBarChart(canvas, labels, values, color) {
  const ctx = drawCanvas(canvas);
  if (!ctx) return;
  const width = ctx.canvas.width / (window.devicePixelRatio || 1);
  const height = ctx.canvas.height / (window.devicePixelRatio || 1);
  const padding = 32;
  const barWidth = Math.max(20, (width - padding * 2) / values.length - 14);
  const maxValue = Math.max(...values, 1);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  values.forEach((value, index) => {
    const x = padding + index * (barWidth + 14);
    const barHeight = (value / maxValue) * (height - padding * 2);
    ctx.fillRect(x, height - padding - barHeight, barWidth, barHeight);
    ctx.fillStyle = "var(--muted)";
    ctx.font = "12px Inter, system-ui";
    ctx.fillText(labels[index], x, height - padding + 18);
    ctx.fillStyle = color;
  });
}

function drawMonthlyChart() {
  const monthly = buildMonthlyData();
  const labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  drawBarChart(canvases.monthly, labels, monthly, "#818cf8");
}

function drawWeeklyChart() {
  const labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const values = new Array(7).fill(0);
  state.applications.forEach((app) => {
    const date = new Date(app.createdAt);
    if (!Number.isNaN(date.getTime())) {
      values[(date.getDay() + 6) % 7] += 1;
    }
  });
  drawBarChart(canvases.weekly, labels, values, "#22c55e");
}

function drawTrendChart() {
  const ctx = drawCanvas(canvases.trends);
  if (!ctx) return;
  const width = ctx.canvas.width / (window.devicePixelRatio || 1);
  const height = ctx.canvas.height / (window.devicePixelRatio || 1);
  const padding = 40;
  const days = 8;
  const now = new Date();
  const values = new Array(days).fill(0);
  state.applications.forEach((app) => {
    const date = new Date(app.createdAt);
    if (!Number.isNaN(date.getTime())) {
      const diff = Math.floor((now - date) / 86400000);
      if (diff < days) values[days - diff - 1] += 1;
    }
  });
  const maxValue = Math.max(...values, 1);
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = padding + (index * (width - padding * 2)) / (days - 1);
    const y = height - padding - (value / maxValue) * (height - padding * 2);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#06b6d4";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "rgba(6, 182, 212, 0.18)";
  ctx.lineTo(width - padding, height - padding);
  ctx.lineTo(padding, height - padding);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "var(--text)";
  ctx.font = "12px Inter, system-ui";
  values.forEach((value, index) => {
    const x = padding + (index * (width - padding * 2)) / (days - 1);
    const y = height - padding - (value / maxValue) * (height - padding * 2) - 10;
    ctx.fillText(value, x - 4, y);
    ctx.fillText(`${days - index - 1}d`, x - 10, height - padding + 16);
  });
}

function renderSettings() {
  const estimate = navigator.storage && navigator.storage.estimate ? navigator.storage.estimate() : Promise.resolve({ usage: localStorage.length * 1024, quota: 512000 });
  estimate.then((info) => {
    inputs.storageInfo.textContent = `Using ${Math.round((info.usage || 0) / 1024)} KB of browser storage`; 
  });
}

function persistAndRefresh(message) {
  saveState();
  renderCurrentView();
  if (message) notify(message);
}

function addActivity(title) {
  state.activity.unshift({ title, time: new Date().toISOString() });
  if (state.activity.length > 50) state.activity.pop();
}

function addApplication(event) {
  event.preventDefault();
  const data = {
    company: inputs.formFields.company.value.trim(),
    role: inputs.formFields.role.value.trim(),
    location: inputs.formFields.location.value.trim(),
    url: inputs.formFields.url.value.trim(),
    salary: inputs.formFields.salary.value.trim(),
    appliedDate: inputs.formFields.applied.value,
    deadline: inputs.formFields.deadline.value,
    notes: inputs.formFields.notes.value.trim(),
    type: inputs.formFields.type.value,
    status: inputs.formFields.status.value,
  };
  if (!data.company || !data.role || !data.appliedDate) {
    notify("Form incomplete", "Company, role, and application date are required.", "danger");
    return;
  }
  if (state.editMode && state.activeAppId) {
    const app = state.applications.find((item) => item.id === state.activeAppId);
    if (app) {
      Object.assign(app, data);
      app.updatedAt = new Date().toISOString();
      app.history = app.history || [];
      app.history.push({ status: app.status, time: new Date().toISOString() });
      app.timeline = app.timeline || [];
      app.timeline.push({ title: `Updated status to ${app.status}`, date: new Date().toISOString(), description: "Application data updated." });
      addActivity(`Updated ${app.role} at ${app.company}`);
      persistAndRefresh("Application updated successfully.");
      if (app.status === "Selected") launchConfetti();
      navigateTo("applications");
    }
  } else {
    const id = `app-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const createdAt = new Date().toISOString();
    const app = {
      id,
      ...data,
      createdAt,
      updatedAt: createdAt,
      history: [{ status: data.status, time: createdAt }],
      timeline: [{ title: "Application created", date: createdAt, description: "Your role was added to TrackHire." }],
    };
    state.applications.unshift(app);
    addActivity(`Added ${app.role} at ${app.company}`);
    persistAndRefresh("Application added successfully.");
    if (app.status === "Selected") launchConfetti();
    navigateTo("applications");
  }
}

function duplicateApplication(id) {
  const app = state.applications.find((item) => item.id === id);
  if (!app) return;
  const duplicate = {
    ...app,
    id: `app-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    company: app.company,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [{ status: app.status, time: new Date().toISOString() }],
    timeline: [{ title: "Application duplicated", date: new Date().toISOString(), description: "Copied from an existing application." }],
  };
  state.applications.unshift(duplicate);
  addActivity(`Duplicated ${duplicate.role} at ${duplicate.company}`);
  persistAndRefresh("Application duplicated successfully.");
}

function confirmDelete(id) {
  state.pendingDeleteId = id;
  dom.modalTitle.textContent = "Delete application";
  dom.modalMessage.textContent = "This action cannot be undone. Are you sure you want to remove this application?";
  dom.modalOverlay.classList.remove("hidden");
}

function deleteApplication() {
  const id = state.pendingDeleteId;
  if (!id) return;
  const app = state.applications.find((item) => item.id === id);
  state.applications = state.applications.filter((item) => item.id !== id);
  state.pendingDeleteId = null;
  addActivity(`Deleted ${app?.role || "application"}`);
  dom.modalOverlay.classList.add("hidden");
  persistAndRefresh("Application deleted.");
  navigateTo("applications");
}

function cancelDelete() {
  state.pendingDeleteId = null;
  dom.modalOverlay.classList.add("hidden");
}

function exportJson() {
  const blob = new Blob([JSON.stringify({ applications: state.applications, activity: state.activity, checklist: state.checklist }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "trackhire-backup.json";
  link.click();
  URL.revokeObjectURL(url);
  notify("JSON exported", "Your data was exported successfully.");
}

function exportCsv() {
  const headers = ["Company","Role","Location","Type","Status","Applied Date","Deadline","Salary/Stipend","URL","Notes"];
  const rows = state.applications.map((app) => [
    app.company,
    app.role,
    app.location,
    app.type,
    app.status,
    app.appliedDate,
    app.deadline,
    app.salary,
    app.url,
    app.notes,
  ]);
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "trackhire-applications.csv";
  link.click();
  URL.revokeObjectURL(url);
  notify("CSV exported", "CSV file downloaded to your device.");
}

function importJson() {
  dom.importFile.click();
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.applications)) throw new Error("Invalid import format");
      state.applications = data.applications;
      state.activity = Array.isArray(data.activity) ? data.activity : [];
      state.checklist = Array.isArray(data.checklist) ? data.checklist : state.checklist;
      saveState();
      renderCurrentView();
      notify("Data imported", "Your JSON import was successful.");
    } catch (error) {
      notify("Import failed", "Please use a valid TrackHire export file.", "danger");
      console.error(error);
    }
  };
  reader.readAsText(file);
}

function backupData() {
  exportJson();
}

function restoreData() {
  importJson();
}

function clearData() {
  state.applications = [];
  state.activity = [];
  state.checklist.forEach((item) => (item.done = false));
  saveState();
  renderCurrentView();
  notify("Cleared data", "All local data has been removed.");
}

function updateStorageInfo() {
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then((info) => {
      inputs.storageInfo.textContent = `Using ${Math.round((info.usage || 0) / 1024)} KB of browser storage`;
    });
  }
}

function renderLanding() {
  showView("landing");
}

function renderCurrentView() {
  const { route } = parseHash();
  if (route === "landing") {
    renderLanding();
    return;
  }
  dom.routeTitle.textContent = getRouteTitle(route);
  showView(route);
  renderNavigation();
  switch (route) {
    case "dashboard": renderDashboard(); break;
    case "applications": renderApplications(); break;
    case "add": renderAddForm(); break;
    case "details": renderDetails(); break;
    case "analytics": renderAnalytics(); break;
    case "settings": renderSettings(); break;
    default: navigateTo("dashboard"); break;
  }
  renderFilterControls();
  updateStorageInfo();
}

function handleRouteChange() {
  renderCurrentView();
}

function handleFilterClick(event) {
  const button = event.currentTarget;
  state.filters.status = button.dataset.filter;
  renderFilterControls();
  renderApplications();
}

function handleSortClick(event) {
  const button = event.currentTarget;
  state.filters.sort = button.dataset.sort;
  renderFilterControls();
  renderApplications();
}

function handleSearch(event) {
  state.filters.query = event.target.value;
  renderApplications();
}

function handleCommandToggle(event) {
  event.preventDefault();
  const isOpen = !dom.commandOverlay.classList.contains("hidden");
  dom.commandOverlay.classList.toggle("hidden", isOpen);
  if (!isOpen) {
    dom.commandSearch.value = "";
    renderCommandList();
    setTimeout(() => dom.commandSearch.focus(), 50);
  }
}

function toggleMobileNav() {
  const isOpen = !dom.mobileNav.classList.contains("hidden");
  dom.mobileNav.classList.toggle("hidden", isOpen);
}

function closeMobileNav() {
  dom.mobileNav?.classList.add("hidden");
}

function renderCommandList() {
  const filter = dom.commandSearch.value.trim().toLowerCase();
  dom.commandList.innerHTML = COMMANDS.filter((command) => command.label.toLowerCase().includes(filter)).map((command) => `
    <div class="command-item">
      <span>${command.label}</span>
      <button type="button" data-command="${command.id}">Go</button>
    </div>
  `).join("");
  dom.commandList.querySelectorAll("button[data-command]").forEach((button) => {
    button.addEventListener("click", () => {
      const command = COMMANDS.find((item) => item.id === button.dataset.command);
      if (command) command.action();
      dom.commandOverlay.classList.add("hidden");
    });
  });
}

const confettiCanvas = document.createElement("canvas");
let confettiAnimation;
function launchConfetti() {
  confettiCanvas.style.position = "fixed";
  confettiCanvas.style.left = "0";
  confettiCanvas.style.top = "0";
  confettiCanvas.style.width = "100%";
  confettiCanvas.style.height = "100%";
  confettiCanvas.style.pointerEvents = "none";
  confettiCanvas.style.zIndex = 100;
  document.body.appendChild(confettiCanvas);
  const ctx = confettiCanvas.getContext("2d");
  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight - window.innerHeight / 2,
    size: 6 + Math.random() * 6,
    color: ["#60a5fa", "#22c55e", "#a855f7", "#f97316", "#ec4899"][Math.floor(Math.random() * 5)],
    velocityX: -2 + Math.random() * 4,
    velocityY: 2 + Math.random() * 4,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.2,
  }));
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  function step() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    particles.forEach((particle) => {
      particle.x += particle.velocityX;
      particle.y += particle.velocityY;
      particle.rotation += particle.rotationSpeed;
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillStyle = particle.color;
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.6);
      ctx.restore();
    });
    if (particles.every((particle) => particle.y > window.innerHeight + 20)) {
      cancelAnimationFrame(confettiAnimation);
      confettiCanvas.remove();
      return;
    }
    confettiAnimation = requestAnimationFrame(step);
  }
  step();
  setTimeout(() => { cancelAnimationFrame(confettiAnimation); confettiCanvas.remove(); }, 2200);
}

function initializeApp() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      navigateTo(button.dataset.target);
      closeMobileNav();
    });
  });
  inputs.filterButtons.forEach((button) => button.addEventListener("click", handleFilterClick));
  inputs.sortButtons.forEach((button) => button.addEventListener("click", handleSortClick));
  inputs.searchInput.addEventListener("input", handleSearch);
  inputs.appForm.addEventListener("submit", addApplication);
  dom.openDashboardBtn.addEventListener("click", () => navigateTo("dashboard"));
  inputs.exportJson.addEventListener("click", exportJson);
  inputs.exportCsv.addEventListener("click", exportCsv);
  inputs.importJson.addEventListener("click", importJson);
  inputs.backupData.addEventListener("click", backupData);
  inputs.restoreData.addEventListener("click", restoreData);
  inputs.clearData.addEventListener("click", clearData);
  inputs.themeSelect.addEventListener("change", (event) => setTheme(event.target.value));
  dom.modalConfirm.addEventListener("click", deleteApplication);
  dom.modalCancel.addEventListener("click", cancelDelete);
  dom.importFile.addEventListener("change", handleImport);
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      dom.commandOverlay.classList.toggle("hidden");
      if (!dom.commandOverlay.classList.contains("hidden")) {
        dom.commandSearch.focus();
      }
    }
    if (event.key === "Escape") {
      dom.commandOverlay.classList.add("hidden");
      dom.modalOverlay.classList.add("hidden");
    }
    if (event.altKey && event.key.toLowerCase() === "d") navigateTo("dashboard");
    if (event.altKey && event.key.toLowerCase() === "a") navigateTo("applications");
    if (event.altKey && event.key.toLowerCase() === "n") navigateTo("add");
  });
  dom.commandSearch.addEventListener("input", renderCommandList);
  dom.commandOverlay.querySelectorAll(".command-overlay-close").forEach((button) => button.addEventListener("click", () => dom.commandOverlay.classList.add("hidden")));
  dom.mobileNavToggle?.addEventListener("click", toggleMobileNav);
  dom.mobileNav?.addEventListener("click", (event) => {
    if (event.target === dom.mobileNav) closeMobileNav();
  });
  dom.themeToggle?.addEventListener("click", toggleTheme);
  loadState();
  renderCurrentView();
  window.addEventListener("hashchange", handleRouteChange);
  window.addEventListener("resize", () => {
    if (getCurrentRoute() === "analytics") renderAnalytics();
  });
}

initializeApp();

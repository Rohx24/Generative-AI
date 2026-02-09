const STORAGE_KEY = 'novacraft_cms';
const CONTACT_KEY = 'novacraft_contacts';
const ADMIN_AUTH_KEY = 'novacraft_admin_auth';
const ADMIN_PASSWORD = 'novacraft2026';

const state = {
  data: null,
  editing: {}
};

async function loadData() {
  const res = await fetch('data.json', { cache: 'no-store' });
  const baseData = await res.json();
  const local = localStorage.getItem(STORAGE_KEY);
  state.data = local ? mergeData(baseData, JSON.parse(local)) : baseData;
}

function mergeData(baseData, overrideData) {
  if (!overrideData) return baseData;
  return { ...baseData, ...overrideData };
}

function applyTheme() {
  if (!state.data?.site) return;
  if (state.data.site.mode === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  if (state.data.site.accent) {
    document.documentElement.style.setProperty('--accent', state.data.site.accent);
  }
}

function showAdmin() {
  document.getElementById('loginPanel').style.display = 'none';
  document.getElementById('adminApp').style.display = 'block';
}

function bindNav() {
  document.querySelectorAll('.admin-nav button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const panelId = `panel-${btn.dataset.panel}`;
      document.querySelectorAll('.admin-panel').forEach((panel) => panel.classList.remove('active'));
      document.getElementById(panelId).classList.add('active');
    });
  });
}

function renderDashboard() {
  const stats = document.getElementById('dashboardStats');
  if (!stats) return;
  const sections = state.data.sections?.length || 0;
  const projects = state.data.projects?.length || 0;
  const services = state.data.services?.length || 0;
  const posts = state.data.posts?.length || 0;
  const testimonials = state.data.testimonials?.length || 0;
  const faqs = state.data.faqs?.length || 0;
  stats.innerHTML = `
    <div class="admin-item"><strong>${sections}</strong><span class="muted">Sections</span></div>
    <div class="admin-item"><strong>${projects}</strong><span class="muted">Projects</span></div>
    <div class="admin-item"><strong>${services}</strong><span class="muted">Services</span></div>
    <div class="admin-item"><strong>${posts}</strong><span class="muted">Posts</span></div>
    <div class="admin-item"><strong>${testimonials}</strong><span class="muted">Testimonials</span></div>
    <div class="admin-item"><strong>${faqs}</strong><span class="muted">FAQs</span></div>
  `;
}

function renderSections() {
  const list = document.getElementById('sectionsList');
  const form = document.getElementById('sectionForm');
  if (!list || !form) return;
  list.innerHTML = '';

  const ordered = state.data.sections.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  ordered.forEach((section) => {
    const item = document.createElement('div');
    item.className = 'admin-item';
    item.innerHTML = `
      <strong>${section.label}</strong>
      <span class="muted">ID: ${section.id}</span>
      <div class="admin-item-actions">
        <label class="admin-toggle">
          <input type="checkbox" ${section.enabled ? 'checked' : ''} data-toggle-section="${section.id}" />
          Enabled
        </label>
        <button class="btn btn-ghost" data-edit-section="${section.id}">Edit</button>
        <button class="btn btn-ghost" data-move-section="${section.id}" data-direction="up">Move up</button>
        <button class="btn btn-ghost" data-move-section="${section.id}" data-direction="down">Move down</button>
      </div>
    `;
    list.appendChild(item);
  });

  form.innerHTML = `<p class="muted">Select a section to edit its copy.</p>`;

  list.querySelectorAll('[data-edit-section]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const section = state.data.sections.find((s) => s.id === btn.dataset.editSection);
      state.editing.section = section.id;
      renderSectionForm(section);
    });
  });

  list.querySelectorAll('[data-toggle-section]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const section = state.data.sections.find((s) => s.id === checkbox.dataset.toggleSection);
      section.enabled = checkbox.checked;
      saveData();
    });
  });

  list.querySelectorAll('[data-move-section]').forEach((btn) => {
    btn.addEventListener('click', () => {
      moveSection(btn.dataset.moveSection, btn.dataset.direction);
    });
  });
}

function renderSectionForm(section) {
  const form = document.getElementById('sectionForm');
  if (!form) return;
  const fields = Object.entries(section.content || {}).map(([key, value]) => {
    if (Array.isArray(value)) {
      return `
        <label>${key}
          <textarea data-section-field="${key}" rows="3">${value.join('\n')}</textarea>
        </label>
      `;
    }
    return `
      <label>${key}
        <input type="text" data-section-field="${key}" value="${value}" />
      </label>
    `;
  });

  form.innerHTML = `
    <h3>Edit ${section.label}</h3>
    <div class="admin-inline">
      <label>Label
        <input type="text" id="sectionLabel" value="${section.label}" />
      </label>
      <label>Order
        <input type="number" id="sectionOrder" value="${section.order}" />
      </label>
    </div>
    ${fields.join('')}
    <div class="admin-actions">
      <button class="btn btn-primary" id="saveSection">Save section</button>
    </div>
  `;

  document.getElementById('saveSection').addEventListener('click', () => {
    section.label = document.getElementById('sectionLabel').value.trim();
    section.order = Number(document.getElementById('sectionOrder').value || section.order);
    const fieldEls = form.querySelectorAll('[data-section-field]');
    fieldEls.forEach((el) => {
      const key = el.dataset.sectionField;
      if (el.tagName.toLowerCase() === 'textarea') {
        section.content[key] = el.value.split('\n').map((v) => v.trim()).filter(Boolean);
      } else {
        section.content[key] = el.value;
      }
    });
    saveData();
    renderSections();
  });
}

function moveSection(id, direction) {
  const sections = state.data.sections;
  const index = sections.findIndex((s) => s.id === id);
  if (index < 0) return;
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= sections.length) return;
  const temp = sections[index];
  sections[index] = sections[swapWith];
  sections[swapWith] = temp;
  sections.forEach((s, idx) => (s.order = idx + 1));
  saveData();
  renderSections();
}

function renderProjects() {
  renderListAndForm({
    listId: 'projectsListAdmin',
    formId: 'projectForm',
    dataKey: 'projects',
    title: 'Project',
    fields: [
      { name: 'title', label: 'Title' },
      { name: 'client', label: 'Client' },
      { name: 'year', label: 'Year' },
      { name: 'image', label: 'Image URL' },
      { name: 'summary', label: 'Summary', type: 'textarea' },
      { name: 'challenge', label: 'Challenge', type: 'textarea' },
      { name: 'solution', label: 'Solution', type: 'textarea' },
      { name: 'results', label: 'Results', type: 'textarea' },
      { name: 'link', label: 'Live Link' },
      { name: 'tags', label: 'Tags (comma separated)' }
    ]
  });
}

function renderServices() {
  renderListAndForm({
    listId: 'servicesListAdmin',
    formId: 'serviceForm',
    dataKey: 'services',
    title: 'Service',
    fields: [
      { name: 'name', label: 'Name' },
      { name: 'price', label: 'Price' },
      { name: 'period', label: 'Period' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'features', label: 'Features (comma separated)' },
      { name: 'ctaText', label: 'CTA Text' }
    ]
  });
}

function renderTestimonials() {
  renderListAndForm({
    listId: 'testimonialsListAdmin',
    formId: 'testimonialForm',
    dataKey: 'testimonials',
    title: 'Testimonial',
    fields: [
      { name: 'name', label: 'Name' },
      { name: 'role', label: 'Role' },
      { name: 'company', label: 'Company' },
      { name: 'image', label: 'Image URL' },
      { name: 'quote', label: 'Quote', type: 'textarea' }
    ]
  });
}

function renderFaqs() {
  renderListAndForm({
    listId: 'faqsListAdmin',
    formId: 'faqForm',
    dataKey: 'faqs',
    title: 'FAQ',
    fields: [
      { name: 'q', label: 'Question' },
      { name: 'a', label: 'Answer', type: 'textarea' }
    ]
  });
}

function renderPosts() {
  renderListAndForm({
    listId: 'postsListAdmin',
    formId: 'postForm',
    dataKey: 'posts',
    title: 'Post',
    fields: [
      { name: 'title', label: 'Title' },
      { name: 'slug', label: 'Slug' },
      { name: 'date', label: 'Date' },
      { name: 'author', label: 'Author' },
      { name: 'cover', label: 'Cover Image URL' },
      { name: 'excerpt', label: 'Excerpt', type: 'textarea' },
      { name: 'content', label: 'Content', type: 'textarea' },
      { name: 'tags', label: 'Tags (comma separated)' }
    ]
  });
}

function renderListAndForm({ listId, formId, dataKey, title, fields }) {
  const list = document.getElementById(listId);
  const form = document.getElementById(formId);
  if (!list || !form) return;
  list.innerHTML = '';
  const items = state.data[dataKey] || [];

  items.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'admin-item';
    div.innerHTML = `
      <strong>${item.title || item.name || item.q}</strong>
      <span class="muted">ID: ${item.id}</span>
      <div class="admin-item-actions">
        <button class="btn btn-ghost" data-edit="${item.id}">Edit</button>
        <button class="btn btn-ghost" data-delete="${item.id}">Delete</button>
      </div>
    `;
    list.appendChild(div);
  });

  form.innerHTML = `
    <h3>${state.editing[dataKey] ? 'Edit' : 'Add'} ${title}</h3>
    ${fields.map((field) => renderField(field, getItemValue(dataKey, field.name))).join('')}
    <div class="admin-actions">
      <button class="btn btn-primary" id="save-${dataKey}">${state.editing[dataKey] ? 'Update' : 'Add'} ${title}</button>
      <button class="btn btn-ghost" id="clear-${dataKey}">Clear</button>
    </div>
  `;

  list.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.editing[dataKey] = btn.dataset.edit;
      renderListAndForm({ listId, formId, dataKey, title, fields });
    });
  });

  list.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.data[dataKey] = items.filter((i) => i.id !== btn.dataset.delete);
      state.editing[dataKey] = null;
      saveData();
      renderListAndForm({ listId, formId, dataKey, title, fields });
    });
  });

  document.getElementById(`save-${dataKey}`).addEventListener('click', () => {
    const payload = collectFormValues(form, fields);
    if (payload.tags) payload.tags = payload.tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (payload.features) payload.features = payload.features.split(',').map((t) => t.trim()).filter(Boolean);

    if (state.editing[dataKey]) {
      const idx = items.findIndex((i) => i.id === state.editing[dataKey]);
      items[idx] = { ...items[idx], ...payload };
    } else {
      items.push({ id: `${dataKey}-${Date.now()}`, ...payload });
    }
    state.data[dataKey] = items;
    state.editing[dataKey] = null;
    saveData();
    renderListAndForm({ listId, formId, dataKey, title, fields });
  });

  document.getElementById(`clear-${dataKey}`).addEventListener('click', () => {
    state.editing[dataKey] = null;
    renderListAndForm({ listId, formId, dataKey, title, fields });
  });
}

function renderField(field, value = '') {
  if (field.type === 'textarea') {
    return `
      <label>${field.label}
        <textarea data-field="${field.name}" rows="4">${escapeHtml(value)}</textarea>
      </label>
    `;
  }
  return `
    <label>${field.label}
      <input type="text" data-field="${field.name}" value="${escapeHtml(value)}" />
    </label>
  `;
}

function getItemValue(dataKey, fieldName) {
  if (!state.editing[dataKey]) return '';
  const item = state.data[dataKey].find((i) => i.id === state.editing[dataKey]);
  if (!item) return '';
  if (Array.isArray(item[fieldName])) return item[fieldName].join(', ');
  return item[fieldName] || '';
}

function collectFormValues(form, fields) {
  const payload = {};
  fields.forEach((field) => {
    const el = form.querySelector(`[data-field="${field.name}"]`);
    if (!el) return;
    payload[field.name] = el.value.trim();
  });
  return payload;
}

function renderSEO() {
  const form = document.getElementById('seoForm');
  if (!form) return;
  const pages = state.data.seo || {};
  form.innerHTML = Object.keys(pages)
    .map((key) => {
      const page = pages[key];
      return `
        <div class="admin-item">
          <strong>${key}</strong>
          <div class="admin-inline">
            <label>Title
              <input type="text" data-seo="${key}" data-field="title" value="${escapeHtml(page.title || '')}" />
            </label>
            <label>Slug
              <input type="text" data-seo="${key}" data-field="slug" value="${escapeHtml(page.slug || '')}" />
            </label>
          </div>
          <label>Description
            <textarea data-seo="${key}" data-field="description" rows="2">${escapeHtml(page.description || '')}</textarea>
          </label>
        </div>
      `;
    })
    .join('');

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = 'Save SEO';
  saveBtn.addEventListener('click', () => {
    form.querySelectorAll('[data-seo]').forEach((el) => {
      const pageKey = el.dataset.seo;
      const field = el.dataset.field;
      state.data.seo[pageKey][field] = el.value.trim();
    });
    saveData();
  });
  form.appendChild(saveBtn);
}

function renderTheme() {
  const form = document.getElementById('themeForm');
  if (!form) return;
  form.innerHTML = `
    <label>Site name
      <input type="text" id="siteName" value="${escapeHtml(state.data.site.name)}" />
    </label>
    <label>Tagline
      <input type="text" id="siteTagline" value="${escapeHtml(state.data.site.tagline)}" />
    </label>
    <div class="admin-inline">
      <label>Accent color
        <input type="color" id="accentColor" value="${state.data.site.accent}" />
      </label>
      <label>Theme mode
        <select id="themeMode">
          <option value="dark" ${state.data.site.mode === 'dark' ? 'selected' : ''}>Dark</option>
          <option value="light" ${state.data.site.mode === 'light' ? 'selected' : ''}>Light</option>
        </select>
      </label>
    </div>
    <div class="admin-inline">
      <label>Logo text
        <input type="text" id="logoText" value="${escapeHtml(state.data.site.logoText)}" />
      </label>
      <label>Location
        <input type="text" id="siteLocationInput" value="${escapeHtml(state.data.site.location)}" />
      </label>
    </div>
    <div class="admin-inline">
      <label>Email
        <input type="text" id="siteEmailInput" value="${escapeHtml(state.data.site.email)}" />
      </label>
      <label>Phone
        <input type="text" id="sitePhoneInput" value="${escapeHtml(state.data.site.phone)}" />
      </label>
    </div>
    <div class="admin-actions">
      <button class="btn btn-primary" id="saveTheme">Save theme</button>
    </div>
  `;

  document.getElementById('saveTheme').addEventListener('click', () => {
    state.data.site.name = document.getElementById('siteName').value.trim();
    state.data.site.tagline = document.getElementById('siteTagline').value.trim();
    state.data.site.accent = document.getElementById('accentColor').value;
    state.data.site.mode = document.getElementById('themeMode').value;
    state.data.site.logoText = document.getElementById('logoText').value.trim();
    state.data.site.location = document.getElementById('siteLocationInput').value.trim();
    state.data.site.email = document.getElementById('siteEmailInput').value.trim();
    state.data.site.phone = document.getElementById('sitePhoneInput').value.trim();
    saveData();
    applyTheme();
  });
}

function renderContacts() {
  const container = document.getElementById('contactsTable');
  if (!container) return;
  const contacts = loadContacts();
  if (!contacts.length) {
    container.innerHTML = '<p class="muted">No submissions yet.</p>';
    return;
  }
  const rows = contacts
    .map(
      (c) => `
      <tr>
        <td>${c.name}</td>
        <td>${c.email}</td>
        <td>${c.company || '-'}</td>
        <td>${c.budget}</td>
        <td>${c.timeline}</td>
        <td>${new Date(c.createdAt).toLocaleString()}</td>
      </tr>
    `
    )
    .join('');
  container.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Company</th>
          <th>Budget</th>
          <th>Timeline</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function loadContacts() {
  const stored = localStorage.getItem(CONTACT_KEY);
  return stored ? JSON.parse(stored) : [];
}

function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  renderDashboard();
  renderContacts();
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function bindActions() {
  document.getElementById('saveAll').addEventListener('click', saveData);
  document.getElementById('resetStorage').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  document.getElementById('downloadContacts').addEventListener('click', () => {
    const contacts = loadContacts();
    downloadJSON('novacraft-contacts.json', contacts);
  });

  document.getElementById('clearContacts').addEventListener('click', () => {
    localStorage.removeItem(CONTACT_KEY);
    renderContacts();
  });
}

function initLogin() {
  const note = document.getElementById('loginNote');
  const loginBtn = document.getElementById('loginBtn');
  const passwordInput = document.getElementById('adminPassword');

  if (localStorage.getItem(ADMIN_AUTH_KEY) === '1') {
    showAdmin();
    return;
  }

  loginBtn.addEventListener('click', () => {
    if (passwordInput.value === ADMIN_PASSWORD) {
      localStorage.setItem(ADMIN_AUTH_KEY, '1');
      showAdmin();
      initAdmin();
    } else {
      note.textContent = 'Incorrect password.';
    }
  });
}

async function initAdmin() {
  await loadData();
  applyTheme();
  bindNav();
  bindActions();
  renderDashboard();
  renderSections();
  renderProjects();
  renderServices();
  renderTestimonials();
  renderFaqs();
  renderPosts();
  renderSEO();
  renderTheme();
  renderContacts();
}

initLogin();
if (localStorage.getItem(ADMIN_AUTH_KEY) === '1') {
  showAdmin();
  initAdmin();
}

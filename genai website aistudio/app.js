const STORAGE_KEY = 'novacraft_cms';
const CONTACT_KEY = 'novacraft_contacts';

const state = {
  data: null
};

async function loadData() {
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    const baseData = await res.json();
    const local = localStorage.getItem(STORAGE_KEY);
    state.data = local ? mergeData(baseData, JSON.parse(local)) : baseData;
  } catch (err) {
    console.error('Failed to load data.json', err);
    const local = localStorage.getItem(STORAGE_KEY);
    state.data = local ? JSON.parse(local) : null;
  }

  if (!state.data) return;
  applySite(state.data);
  renderSections(state.data);
  bindEvents();
}

function mergeData(baseData, overrideData) {
  if (!overrideData) return baseData;
  return { ...baseData, ...overrideData };
}

function applySite(data) {
  document.title = data.seo?.home?.title || data.site?.name || 'NovaCraft';
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', data.seo?.home?.description || '');

  if (data.site?.accent) {
    document.documentElement.style.setProperty('--accent', data.site.accent);
  }

  if (data.site?.mode === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  const brandTexts = document.querySelectorAll('.brand-text');
  brandTexts.forEach((el) => (el.textContent = data.site?.name || 'NovaCraft'));
  const logos = document.querySelectorAll('.logo');
  logos.forEach((el) => (el.textContent = data.site?.logoText || 'NC'));

  const location = document.getElementById('siteLocation');
  if (location) location.textContent = data.site?.location || '';
  const email = document.getElementById('siteEmail');
  if (email) email.textContent = data.site?.email || '';
  const phone = document.getElementById('sitePhone');
  if (phone) phone.textContent = data.site?.phone || '';
}

function renderSections(data) {
  const main = document.querySelector('main');
  if (!main) return;

  const sectionOrder = (data.sections || [])
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  sectionOrder.forEach((section) => {
    const el = document.querySelector(`[data-section="${section.id}"]`);
    if (!el) return;
    el.style.display = section.enabled ? '' : 'none';
    main.appendChild(el);
    updateSectionContent(el, section.content || {});
  });

  renderTrust(data.sections?.find((s) => s.id === 'trust')?.content?.items || []);
  renderServices(data.services || []);
  renderProjects(data.projects || []);
  renderTestimonials(data.testimonials || []);
  renderFaqs(data.faqs || []);
  renderBlog(data.posts || []);
}

function updateSectionContent(sectionEl, content) {
  if (!content) return;
  const fields = sectionEl.querySelectorAll('[data-field]');
  fields.forEach((field) => {
    const key = field.getAttribute('data-field');
    if (!key || content[key] === undefined) return;
    if (field.tagName.toLowerCase() === 'a') {
      field.textContent = content[key];
      if (key.toLowerCase().includes('link')) {
        field.setAttribute('href', content[key]);
      }
    } else {
      field.textContent = content[key];
    }
  });
  const linkFields = sectionEl.querySelectorAll('[data-field-link]');
  linkFields.forEach((field) => {
    const key = field.getAttribute('data-field-link');
    if (content[key]) field.setAttribute('href', content[key]);
  });
}

function renderTrust(items) {
  const list = document.getElementById('trustList');
  if (!list) return;
  list.innerHTML = '';
  items.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'trust-item';
    div.textContent = item;
    list.appendChild(div);
  });
}

function renderServices(services) {
  const list = document.getElementById('servicesList');
  if (!list) return;
  list.innerHTML = '';
  services.forEach((service) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div>
        <h3>${service.name}</h3>
        <p class="muted">${service.description}</p>
      </div>
      <div>
        <h2>${service.price}</h2>
        <p class="muted">${service.period || ''}</p>
      </div>
      <ul>
        ${(service.features || []).map((f) => `<li>${f}</li>`).join('')}
      </ul>
      <button class="btn btn-ghost" data-service="${service.id}">${service.ctaText || 'Enquire'}</button>
    `;
    list.appendChild(card);
  });
}

function renderProjects(projects) {
  const list = document.getElementById('projectsList');
  if (!list) return;
  list.innerHTML = '';
  projects.forEach((project) => {
    const card = document.createElement('article');
    card.className = 'project-card';
    card.innerHTML = `
      <img src="${project.image}" alt="${project.title}" />
      <div class="project-card-body">
        <h3>${project.title}</h3>
        <p class="muted">${project.summary}</p>
        <div class="tag-list">
          ${(project.tags || []).map((t) => `<span class="tag">${t}</span>`).join('')}
        </div>
        <button class="btn btn-ghost" data-project="${project.id}">View case study</button>
      </div>
    `;
    list.appendChild(card);
  });
}

function renderTestimonials(testimonials) {
  const list = document.getElementById('testimonialsList');
  if (!list) return;
  list.innerHTML = '';
  testimonials.forEach((t) => {
    const card = document.createElement('div');
    card.className = 'testimonial';
    card.innerHTML = `
      <p>“${t.quote}”</p>
      <div class="person">
        <img src="${t.image}" alt="${t.name}" />
        <div>
          <strong>${t.name}</strong>
          <div class="muted">${t.role}, ${t.company}</div>
        </div>
      </div>
    `;
    list.appendChild(card);
  });
}

function renderFaqs(faqs) {
  const list = document.getElementById('faqList');
  if (!list) return;
  list.innerHTML = '';
  faqs.forEach((f) => {
    const item = document.createElement('div');
    item.className = 'faq-item';
    item.innerHTML = `
      <strong>${f.q}</strong>
      <p class="muted">${f.a}</p>
    `;
    list.appendChild(item);
  });
}

function renderBlog(posts) {
  const list = document.getElementById('blogList');
  if (!list) return;
  list.innerHTML = '';
  posts.forEach((post) => {
    const card = document.createElement('article');
    card.className = 'blog-card';
    card.innerHTML = `
      <img src="${post.cover}" alt="${post.title}" />
      <div class="blog-card-body">
        <p class="eyebrow">${post.date}</p>
        <h3>${post.title}</h3>
        <p class="muted">${post.excerpt}</p>
        <button class="btn btn-ghost" data-post="${post.id}">Read post</button>
      </div>
    `;
    list.appendChild(card);
  });
}

function bindEvents() {
  const navToggle = document.querySelector('.nav-toggle');
  const drawer = document.getElementById('navDrawer');
  if (navToggle && drawer) {
    navToggle.addEventListener('click', () => drawer.classList.toggle('show'));
  }

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target.matches('[data-project]')) {
      const id = target.getAttribute('data-project');
      openProject(id);
    }
    if (target.matches('[data-post]')) {
      const id = target.getAttribute('data-post');
      openPost(id);
    }
    if (target.matches('[data-close]')) {
      const modalId = target.getAttribute('data-close');
      closeModal(modalId);
    }
    if (target.matches('[data-service]')) {
      document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(contactForm);
      const payload = Object.fromEntries(formData.entries());
      if (!payload.name || !payload.email || !payload.message || !payload.budget || !payload.timeline) {
        setFormNote('Please complete all required fields.');
        return;
      }
      payload.id = `msg-${Date.now()}`;
      payload.createdAt = new Date().toISOString();
      const contacts = loadContacts();
      contacts.push(payload);
      localStorage.setItem(CONTACT_KEY, JSON.stringify(contacts));
      contactForm.reset();
      setFormNote('Thanks! Your inquiry has been saved.');
    });
  }

  const exportBtn = document.getElementById('exportContacts');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const contacts = loadContacts();
      if (!contacts.length) {
        setFormNote('No inquiries yet to export.');
        return;
      }
      downloadJSON('novacraft-contacts.json', contacts);
    });
  }
}

function setFormNote(text) {
  const note = document.getElementById('formNote');
  if (note) note.textContent = text;
}

function openProject(id) {
  const project = state.data?.projects?.find((p) => p.id === id);
  if (!project) return;
  const body = document.getElementById('projectModalBody');
  if (!body) return;
  body.innerHTML = `
    <img src="${project.image}" alt="${project.title}" />
    <h2>${project.title}</h2>
    <p class="muted">${project.client} • ${project.year}</p>
    <div class="tag-list">
      ${(project.tags || []).map((t) => `<span class="tag">${t}</span>`).join('')}
    </div>
    <p><strong>Summary:</strong> ${project.summary}</p>
    <p><strong>Challenge:</strong> ${project.challenge}</p>
    <p><strong>Solution:</strong> ${project.solution}</p>
    <p><strong>Results:</strong> ${project.results}</p>
    <a class="text-link" href="${project.link}" target="_blank" rel="noopener">View live →</a>
  `;
  openModal('projectModal');
}

function openPost(id) {
  const post = state.data?.posts?.find((p) => p.id === id);
  if (!post) return;
  const body = document.getElementById('blogModalBody');
  if (!body) return;
  body.innerHTML = `
    <img src="${post.cover}" alt="${post.title}" />
    <h2>${post.title}</h2>
    <p class="muted">${post.date} • ${post.author}</p>
    <p>${post.content}</p>
    <div class="tag-list">
      ${(post.tags || []).map((t) => `<span class="tag">${t}</span>`).join('')}
    </div>
  `;
  openModal('blogModal');
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('show');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('show');
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

loadData();

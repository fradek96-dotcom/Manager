const STORAGE_KEY = 'manager-v1';

const state = {
  currentTab: 'tasks',
  view: {
    tasks: 'active',
    projects: 'active'
  },
  filters: {
    taskPriority: 'all',
    taskQuery: '',
    projectQuery: ''
  },
  editing: {
    taskId: null,
    projectId: null
  },
  tasks: [],
  projects: []
};

const tabButtons = document.querySelectorAll('.tab-button');
const viewButtons = document.querySelectorAll('.view-button');
const taskForm = document.getElementById('task-form');
const projectForm = document.getElementById('project-form');
const taskList = document.getElementById('task-list');
const projectList = document.getElementById('project-list');
const taskPriorityFilter = document.getElementById('task-priority-filter');
const taskSearch = document.getElementById('task-search');
const projectSearch = document.getElementById('project-search');
const clearResolvedTasksButton = document.getElementById('clear-resolved-tasks');
const clearResolvedProjectsButton = document.getElementById('clear-resolved-projects');
const resetStorageButton = document.getElementById('reset-storage');
const activeTasksStat = document.getElementById('stat-active-tasks');
const activeProjectsStat = document.getElementById('stat-active-projects');
const panels = {
  tasks: document.getElementById('tasks-panel'),
  projects: document.getElementById('projects-panel')
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks: state.tasks, projects: state.projects }));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    state.projects = Array.isArray(parsed.projects) ? parsed.projects : [];
  } catch {
    state.tasks = [];
    state.projects = [];
  }
}

function formatDate(isoDate) {
  if (!isoDate) return 'Bez plánu';
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? 'Bez plánu' : date.toLocaleDateString('cs-CZ');
}

function renderStats() {
  activeTasksStat.textContent = String(state.tasks.filter((task) => !task.done).length);
  activeProjectsStat.textContent = String(state.projects.filter((project) => !project.done).length);
}

function renderTaskCard(task) {
  if (state.editing.taskId === task.id) {
    return `
      <li class="card">
        <form class="inline-edit-form" data-action="save-task-edit" data-id="${task.id}">
          <label>
            Název
            <input name="title" value="${escapeHtml(task.title)}" maxlength="120" required />
          </label>
          <label>
            Poznámky
            <textarea name="notes" rows="3" maxlength="500">${escapeHtml(task.notes)}</textarea>
          </label>
          <div class="card-actions">
            <button class="primary-button" type="submit">Uložit</button>
            <button class="secondary-button" type="button" data-action="cancel-task-edit">Zrušit</button>
          </div>
        </form>
      </li>
    `;
  }

  const doneLabel = task.done ? 'Vrátit' : 'Hotovo';
  return `
    <li class="card">
      <div class="card-header">
        <div>
          <strong>${escapeHtml(task.title)}</strong>
          <div class="card-meta">
            <span class="badge ${task.priority}">${task.priority.toUpperCase()}</span>
            <span class="badge">${formatDate(task.plannedDate)}</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="secondary-button" type="button" data-action="start-task-edit" data-id="${task.id}">Upravit</button>
          <button class="secondary-button" type="button" data-action="toggle-task" data-id="${task.id}">${doneLabel}</button>
          <button class="danger-button" type="button" data-action="delete-task" data-id="${task.id}">Smazat</button>
        </div>
      </div>
      ${task.notes ? `<p>${escapeHtml(task.notes)}</p>` : ''}
    </li>
  `;
}

function renderTasks() {
  const targetDone = state.view.tasks === 'resolved';

  const filtered = state.tasks.filter((task) => {
    const query = state.filters.taskQuery.trim().toLowerCase();
    const inText = !query || task.title.toLowerCase().includes(query) || task.notes.toLowerCase().includes(query);
    const matchesDone = task.done === targetDone;
    const matchesPriority = state.filters.taskPriority === 'all' || task.priority === state.filters.taskPriority;
    return matchesDone && matchesPriority && inText;
  });

  if (filtered.length === 0) {
    taskList.innerHTML = '<li class="empty">Žádné úkoly v této sekci.</li>';
    return;
  }

  taskList.innerHTML = filtered.map((task) => renderTaskCard(task)).join('');
}

function renderProjectCard(project) {
  if (state.editing.projectId === project.id) {
    return `
      <li class="card">
        <form class="inline-edit-form" data-action="save-project-edit" data-id="${project.id}">
          <label>
            Název projektu
            <input name="name" value="${escapeHtml(project.name)}" maxlength="120" required />
          </label>
          <label>
            Poznámky
            <textarea name="notes" rows="3" maxlength="700">${escapeHtml(project.notes)}</textarea>
          </label>
          <div class="card-actions">
            <button class="primary-button" type="submit">Uložit</button>
            <button class="secondary-button" type="button" data-action="cancel-project-edit">Zrušit</button>
          </div>
        </form>
      </li>
    `;
  }

  const doneLabel = project.done ? 'Vrátit' : 'Hotovo';
  const subtasks = (project.subtasks || [])
    .map(
      (subtask) => `
      <li class="subtask-item ${subtask.done ? 'done' : ''}">
        <span>${escapeHtml(subtask.title)}</span>
        <div class="card-actions">
          <button class="secondary-button" type="button" data-action="toggle-subtask" data-project-id="${project.id}" data-subtask-id="${subtask.id}">${subtask.done ? 'Vrátit' : 'Hotovo'}</button>
          <button class="danger-button" type="button" data-action="delete-subtask" data-project-id="${project.id}" data-subtask-id="${subtask.id}">Smazat</button>
        </div>
      </li>
    `
    )
    .join('');

  return `
    <li class="card">
      <div class="card-header">
        <div><strong>${escapeHtml(project.name)}</strong></div>
        <div class="card-actions">
          <button class="secondary-button" type="button" data-action="start-project-edit" data-id="${project.id}">Upravit</button>
          <button class="secondary-button" type="button" data-action="toggle-project" data-id="${project.id}">${doneLabel}</button>
          <button class="danger-button" type="button" data-action="delete-project" data-id="${project.id}">Smazat</button>
        </div>
      </div>
      ${project.notes ? `<p>${escapeHtml(project.notes)}</p>` : ''}

      <form class="subtask-form" data-project-id="${project.id}">
        <input name="subtaskTitle" type="text" maxlength="120" placeholder="Nový subúkol" required />
        <button class="primary-button" type="submit">Přidat</button>
      </form>

      <ul class="subtask-list">${subtasks || '<li class="empty">Zatím žádné subúkoly.</li>'}</ul>
    </li>
  `;
}

function renderProjects() {
  const targetDone = state.view.projects === 'resolved';
  const query = state.filters.projectQuery.trim().toLowerCase();
  const filtered = state.projects.filter((project) => {
    const inText = !query || project.name.toLowerCase().includes(query) || project.notes.toLowerCase().includes(query);
    return project.done === targetDone && inText;
  });

  if (filtered.length === 0) {
    projectList.innerHTML = '<li class="empty">Žádné projekty v této sekci.</li>';
    return;
  }

  projectList.innerHTML = filtered.map((project) => renderProjectCard(project)).join('');
}

function renderViews() {
  tabButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.tab === state.currentTab));
  Object.entries(panels).forEach(([key, panel]) => panel?.classList.toggle('is-visible', key === state.currentTab));

  viewButtons.forEach((button) => {
    const isActive = state.view[button.dataset.kind] === button.dataset.view;
    button.classList.toggle('is-active', isActive);
  });

  renderTasks();
  renderProjects();
  renderStats();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function wireEvents() {
  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.currentTab = button.dataset.tab;
      renderViews();
    });
  });

  viewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.view[button.dataset.kind] = button.dataset.view;
      renderViews();
    });
  });

  taskPriorityFilter.addEventListener('change', () => {
    state.filters.taskPriority = taskPriorityFilter.value;
    renderTasks();
  });

  taskSearch.addEventListener('input', () => {
    state.filters.taskQuery = taskSearch.value;
    renderTasks();
  });

  projectSearch.addEventListener('input', () => {
    state.filters.projectQuery = projectSearch.value;
    renderProjects();
  });

  clearResolvedTasksButton.addEventListener('click', () => {
    state.tasks = state.tasks.filter((task) => !task.done);
    if (!state.tasks.find((task) => task.id === state.editing.taskId)) state.editing.taskId = null;
    saveState();
    renderViews();
  });

  clearResolvedProjectsButton.addEventListener('click', () => {
    state.projects = state.projects.filter((project) => !project.done);
    if (!state.projects.find((project) => project.id === state.editing.projectId)) state.editing.projectId = null;
    saveState();
    renderViews();
  });

  resetStorageButton.addEventListener('click', () => {
    state.tasks = [];
    state.projects = [];
    state.editing.taskId = null;
    state.editing.projectId = null;
    saveState();
    renderViews();
  });

  taskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(taskForm);
    const title = String(data.get('title')).trim();
    if (!title) return;

    state.tasks.unshift({
      id: uid(),
      title,
      priority: String(data.get('priority')),
      plannedDate: String(data.get('plannedDate')),
      notes: String(data.get('notes')).trim(),
      done: false
    });

    taskForm.reset();
    saveState();
    renderViews();
  });

  projectForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(projectForm);
    const name = String(data.get('name')).trim();
    if (!name) return;

    state.projects.unshift({
      id: uid(),
      name,
      notes: String(data.get('notes')).trim(),
      done: false,
      subtasks: []
    });

    projectForm.reset();
    saveState();
    renderViews();
  });

  taskList.addEventListener('submit', (event) => {
    const form = event.target.closest('form[data-action="save-task-edit"]');
    if (!form) return;
    event.preventDefault();

    const task = state.tasks.find((item) => item.id === form.dataset.id);
    if (!task) return;

    const data = new FormData(form);
    const title = String(data.get('title')).trim();
    if (!title) return;

    task.title = title;
    task.notes = String(data.get('notes')).trim();
    state.editing.taskId = null;
    saveState();
    renderViews();
  });

  taskList.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;

    if (target.dataset.action === 'cancel-task-edit') {
      state.editing.taskId = null;
      renderTasks();
      return;
    }

    if (target.dataset.action === 'start-task-edit') {
      state.editing.taskId = target.dataset.id;
      renderTasks();
      return;
    }

    const task = state.tasks.find((item) => item.id === target.dataset.id);
    if (!task) return;

    if (target.dataset.action === 'toggle-task') task.done = !task.done;
    if (target.dataset.action === 'delete-task') state.tasks = state.tasks.filter((item) => item.id !== task.id);
    if (state.editing.taskId === task.id && target.dataset.action === 'delete-task') state.editing.taskId = null;

    saveState();
    renderViews();
  });

  projectList.addEventListener('submit', (event) => {
    const editForm = event.target.closest('form[data-action="save-project-edit"]');
    if (editForm) {
      event.preventDefault();
      const project = state.projects.find((item) => item.id === editForm.dataset.id);
      if (!project) return;
      const data = new FormData(editForm);
      const name = String(data.get('name')).trim();
      if (!name) return;
      project.name = name;
      project.notes = String(data.get('notes')).trim();
      state.editing.projectId = null;
      saveState();
      renderViews();
      return;
    }

    const form = event.target.closest('.subtask-form');
    if (!form) return;

    event.preventDefault();
    const project = state.projects.find((item) => item.id === form.dataset.projectId);
    if (!project) return;

    const data = new FormData(form);
    const title = String(data.get('subtaskTitle')).trim();
    if (!title) return;

    project.subtasks.unshift({ id: uid(), title, done: false });
    saveState();
    renderViews();
  });

  projectList.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;

    if (target.dataset.action === 'cancel-project-edit') {
      state.editing.projectId = null;
      renderProjects();
      return;
    }

    if (target.dataset.action === 'start-project-edit') {
      state.editing.projectId = target.dataset.id;
      renderProjects();
      return;
    }

    const project = state.projects.find((item) => item.id === target.dataset.id || item.id === target.dataset.projectId);
    if (!project) return;

    if (target.dataset.action === 'toggle-project') {
      project.done = !project.done;
    }

    if (target.dataset.action === 'delete-project') {
      state.projects = state.projects.filter((item) => item.id !== project.id);
      if (state.editing.projectId === project.id) state.editing.projectId = null;
    }

    if (target.dataset.action === 'toggle-subtask') {
      const subtask = project.subtasks.find((item) => item.id === target.dataset.subtaskId);
      if (subtask) subtask.done = !subtask.done;
    }

    if (target.dataset.action === 'delete-subtask') {
      project.subtasks = project.subtasks.filter((item) => item.id !== target.dataset.subtaskId);
    }

    saveState();
    renderViews();
  });
}

loadState();
wireEvents();
renderViews();

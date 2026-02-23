const tabButtons = document.querySelectorAll('.tab-button');
const panels = {
  tasks: document.getElementById('tasks-panel'),
  projects: document.getElementById('projects-panel')
};

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    tabButtons.forEach((item) => item.classList.remove('is-active'));
    button.classList.add('is-active');

    Object.entries(panels).forEach(([key, panel]) => {
      panel?.classList.toggle('is-visible', key === button.dataset.tab);
    });
  });
});

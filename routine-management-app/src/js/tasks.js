(function () {
  'use strict';

  const taskList = document.getElementById('taskList');
  const taskInput = document.getElementById('taskInput');
  const addTaskButton = document.getElementById('addTaskButton');

  let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

  function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach((task, index) => {
      const li = document.createElement('li');
      li.textContent = task.name;
      li.className = task.completed ? 'completed' : '';

      const checkButton = document.createElement('button');
      checkButton.textContent = task.completed ? 'Undo' : 'Complete';
      checkButton.onclick = () => toggleTaskCompletion(index);

      const editButton = document.createElement('button');
      editButton.textContent = 'Edit';
      editButton.onclick = () => editTask(index);

      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.onclick = () => deleteTask(index);

      li.appendChild(checkButton);
      li.appendChild(editButton);
      li.appendChild(deleteButton);
      taskList.appendChild(li);
    });
  }

  function addTask() {
    const taskName = taskInput.value.trim();
    if (taskName) {
      tasks.push({ name: taskName, completed: false });
      taskInput.value = '';
      saveTasks();
      renderTasks();
    }
  }

  function toggleTaskCompletion(index) {
    tasks[index].completed = !tasks[index].completed;
    saveTasks();
    renderTasks();
  }

  function editTask(index) {
    const newTaskName = prompt('Edit task:', tasks[index].name);
    if (newTaskName !== null) {
      tasks[index].name = newTaskName.trim();
      saveTasks();
      renderTasks();
    }
  }

  function deleteTask(index) {
    tasks.splice(index, 1);
    saveTasks();
    renderTasks();
  }

  function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  addTaskButton.addEventListener('click', addTask);

  renderTasks();
})();
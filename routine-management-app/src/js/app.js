(function () {
  'use strict';

  // --- DOM Elements ---
  const routineList = document.getElementById('routineList');
  const addRoutineForm = document.getElementById('addRoutineForm');
  const routineInput = document.getElementById('routineInput');
  const viewContainer = document.getElementById('viewContainer');

  // --- State ---
  let routines = [];

  // --- Load routines from local storage ---
  function loadRoutines() {
    const storedRoutines = JSON.parse(localStorage.getItem('routines')) || [];
    routines = storedRoutines;
    renderRoutines();
  }

  // --- Save routines to local storage ---
  function saveRoutines() {
    localStorage.setItem('routines', JSON.stringify(routines));
  }

  // --- Render routines ---
  function renderRoutines() {
    routineList.innerHTML = '';
    routines.forEach((routine, index) => {
      const routineItem = document.createElement('li');
      routineItem.textContent = routine.name;
      routineItem.className = routine.completed ? 'completed' : '';
      routineItem.addEventListener('click', () => toggleRoutineCompletion(index));
      routineList.appendChild(routineItem);
    });
  }

  // --- Toggle routine completion ---
  function toggleRoutineCompletion(index) {
    routines[index].completed = !routines[index].completed;
    saveRoutines();
    renderRoutines();
  }

  // --- Add new routine ---
  function addRoutine(event) {
    event.preventDefault();
    const routineName = routineInput.value.trim();
    if (routineName) {
      routines.push({ name: routineName, completed: false });
      routineInput.value = '';
      saveRoutines();
      renderRoutines();
    }
  }

  // --- Show specific view ---
  function show(viewId) {
    const views = document.querySelectorAll('.view');
    views.forEach(view => view.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
  }

  // --- Event Listeners ---
  addRoutineForm.addEventListener('submit', addRoutine);

  // --- Initialization ---
  document.addEventListener('DOMContentLoaded', () => {
    loadRoutines();
    show('homeView'); // Show the home view on load
  });

})();
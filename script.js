// --- todo-app ---
const TodoApp = (function () {
  // --- STATE MANAGEMENT ---
  const state = {
    currentView: {
      type: "today", // Options: "today", "tasks", "list"
      listId: null, // Only used when type is "list"
    },
    currentModalMode: "add", // "add", "edit", "details"
    currentEditingTaskId: null,
  };

  function setSelectedTab(selectedBtn, otherBtn) {
    selectedBtn.classList.add("selected");
    otherBtn.classList.remove("selected");
  }

  // --- DOM ELEMENTS ---
  const DOM = {
    modal: null,
    addBtn: null,
    cancelBtns: null,
    taskListContainer: null,
    sidebarListContainer: null,
    formElements: {
      taskTitle: null,
      taskDetails: null,
      dueDate: null,
      listTitle: null,
      addTaskSubmitBtn: null,
      createListSubmitBtn: null,
      priorityBtns: null,
    },
    tabs: {
      todayBtn: null,
      tasksBtn: null,
      addTaskBtn: null,
      createListBtn: null,
    },
    forms: {
      addTaskForm: null,
      createListForm: null,
    },
  };

  // --- API SERVICE ---
  const apiService = {
    baseUrl: "http://localhost:3000",

    async getTasks() {
      try {
        const response = await fetch(`${this.baseUrl}/tasks`);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
        return [];
      }
    },

    async getTaskById(taskId) {
      try {
        const response = await fetch(`${this.baseUrl}/tasks/${taskId}`);
        if (!response.ok)
          throw new Error(`Failed to fetch task: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error("Error fetching task:", error);
        return null;
      }
    },

    async createTask(taskData) {
      try {
        const response = await fetch(`${this.baseUrl}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error("Error creating task:", error);
        return null;
      }
    },

    async updateTask(taskId, taskData) {
      try {
        const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error("Error updating task:", error);
        return null;
      }
    },

    async deleteTask(taskId) {
      try {
        const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
        return true;
      } catch (error) {
        console.error("Error deleting task:", error);
        return false;
      }
    },

    async getLists() {
      try {
        const response = await fetch(`${this.baseUrl}/lists`);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error("Failed to fetch lists:", error);
        return [];
      }
    },

    async createList(listData) {
      try {
        const response = await fetch(`${this.baseUrl}/lists`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(listData),
        });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error("Error creating list:", error);
        return null;
      }
    },

    async deleteList(listId) {
      try {
        const response = await fetch(`${this.baseUrl}/lists/${listId}`, {
          method: "DELETE",
        });
        if (!response.ok)
          throw new Error(`Failed to delete list: ${response.status}`);
        return true;
      } catch (error) {
        console.error("Error deleting list:", error);
        return false;
      }
    },
  };

  // --- UI RENDERING ---
  const ui = {
    renderTasks(tasks) {
      const sorted = this.sortTasksByDate(tasks);
      DOM.taskListContainer.innerHTML = "";
      sorted.forEach((task) => {
        const taskItem = this.createTaskItem(task);
        DOM.taskListContainer.appendChild(taskItem);
      });
    },

    sortTasksByDate(tasks) {
      return tasks.slice().sort((a, b) => {
        if (a.date && b.date) {
          return new Date(a.date) - new Date(b.date);
        } else if (a.date && !b.date) {
          return -1;
        } else if (!a.date && b.date) {
          return 1;
        } else {
          return 0;
        }
      });
    },

    renderLists(lists) {
      DOM.sidebarListContainer.innerHTML = "";

      lists.forEach((list) => {
        const clone = document
          .getElementById("listItemTemplate")
          .content.cloneNode(true);

        const listItem = clone.querySelector(".list-item-container");
        const listBtn = clone.querySelector(".list-btn");
        const title = clone.querySelector(".list-title");
        const deleteBtn = clone.querySelector(".delete-list-btn");

        // Treat list IDs as strings (no Number conversion)
        listItem.dataset.listId = list.id;
        listBtn.dataset.listId = list.id;
        title.textContent = list.title;

        listBtn.addEventListener("click", () => {
          state.currentView = { type: "list", listId: list.id };
          this.updateSidebarSelection();
          taskController.fetchTasksFromList(list.id);
        });

        deleteBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (
            confirm(
              `Are you sure you want to delete the list "${list.title}" and all its tasks?`
            )
          ) {
            await taskController.deleteList(list.id);
          }
        });

        // Apply 'selected' class if this list is the current view
        if (
          state.currentView.type === "list" &&
          state.currentView.listId === list.id
        ) {
          listItem.classList.add("selected");
          listBtn.classList.add("selected");
        }

        DOM.sidebarListContainer.appendChild(clone);
      });
    },

    createTaskItem(task) {
      const clone = document
        .getElementById("taskItemTemplate")
        .content.cloneNode(true);
      const taskItem = clone.querySelector(".task-item-container");
      taskItem.classList.add(`priority-${task.priority}`);

      if (task.complete) {
        taskItem.classList.add("completed");
      }

      const checkbox = clone.querySelector(".checkbox");
      checkbox.checked = task.complete;
      checkbox.dataset.taskId = task.id;

      checkbox.addEventListener("change", async () => {
        await taskController.toggleTaskCompletion(task.id, checkbox.checked);
      });

      clone.querySelector(".task-text").textContent = task.title;
      clone.querySelector(".task-date").textContent = this.formatTaskDate(
        task.date
      );

      clone.querySelector(".details-btn").addEventListener("click", () => {
        modalController.viewTaskDetails(task.id);
      });

      const deleteBtn = clone.querySelector(".delete-btn");
      deleteBtn.addEventListener("click", async () => {
        await taskController.deleteTask(task.id);
      });

      return taskItem;
    },

    updateSidebarSelection() {
      document.querySelectorAll(".sidebar-btn").forEach((btn) => {
        btn.classList.remove("selected");
      });
      document.querySelectorAll(".list-item-container").forEach((li) => {
        li.classList.remove("selected");
      });

      if (state.currentView.type === "today") {
        DOM.tabs.todayBtn.classList.add("selected");
      } else if (state.currentView.type === "tasks") {
        DOM.tabs.tasksBtn.classList.add("selected");
      } else if (
        state.currentView.type === "list" &&
        state.currentView.listId
      ) {
        const listBtn = document.querySelector(
          `.list-btn[data-list-id="${state.currentView.listId}"]`
        );
        if (listBtn) {
          listBtn.classList.add("selected");
          const listItem = listBtn.closest(".list-item-container");
          if (listItem) listItem.classList.add("selected");
        }
      }
    },

    formatTaskDate(dateString) {
      if (!dateString) return "";
      const date = new Date(dateString);
      return date.toLocaleDateString("sv-SE", {
        day: "2-digit",
        month: "2-digit",
      });
    },
  };

  // --- TASK CONTROLLER ---
  const taskController = {
    async fetchTasks() {
      const tasks = await apiService.getTasks();
      ui.renderTasks(tasks);
    },

    async fetchTasksToday() {
      const allTasks = await apiService.getTasks();
      const today = new Date().toISOString().split("T")[0];
      const todaysTasks = allTasks.filter((task) => {
        if (!task.date) return false;
        const taskDate = new Date(task.date).toISOString().split("T")[0];
        return taskDate === today;
      });
      ui.renderTasks(todaysTasks);
    },

    async fetchTasksFromList(listId) {
      const allTasks = await apiService.getTasks();
      // Compare list IDs as strings
      const filteredTasks = allTasks.filter((task) => task.listId === listId);
      ui.renderTasks(filteredTasks);
    },

    async toggleTaskCompletion(taskId, isComplete) {
      const result = await apiService.updateTask(taskId, {
        complete: isComplete,
      });
      if (result) {
        const taskItem = document
          .querySelector(`.checkbox[data-task-id="${taskId}"]`)
          .closest(".task-item-container");
        taskItem.classList.toggle("completed", isComplete);
      } else {
        const checkbox = document.querySelector(
          `.checkbox[data-task-id="${taskId}"]`
        );
        if (checkbox) checkbox.checked = !isComplete;
      }
      return result;
    },

    async addTask() {
      const taskTitle = DOM.formElements.taskTitle.value.trim();
      const taskDate = DOM.formElements.dueDate.value || null;
      const taskDetails = DOM.formElements.taskDetails.value.trim() || null;
      const taskListId =
        state.currentView.type === "list" ? state.currentView.listId : null;
      const selectedPriorityBtn = document.querySelector(
        ".priority-btn.selected"
      );
      if (!taskTitle) return alert("Please enter a task title");
      if (!selectedPriorityBtn) return alert("Please select a priority");
      const taskPriority = selectedPriorityBtn.dataset.priority;

      const newTask = {
        title: taskTitle,
        details: taskDetails,
        date: taskDate,
        priority: taskPriority,
        complete: false,
        listId: taskListId,
      };

      const result = await apiService.createTask(newTask);
      if (result) {
        modalController.closeModal();
        modalController.resetAddModal();
        await this.refreshCurrentView();
      }
    },

    async updateTask(taskId) {
      const currentTask = await apiService.getTaskById(taskId);
      if (!currentTask) return;

      const taskTitle = DOM.formElements.taskTitle.value.trim();
      const taskDate = DOM.formElements.dueDate.value || null;
      const taskDetails = DOM.formElements.taskDetails.value.trim() || null;
      const selectedPriorityBtn = document.querySelector(
        ".priority-btn.selected"
      );
      if (!taskTitle) return alert("Please enter a task title");
      if (!selectedPriorityBtn) return alert("Please select a priority");
      const taskPriority = selectedPriorityBtn.dataset.priority;

      const updatedTask = {
        title: taskTitle,
        details: taskDetails,
        date: taskDate,
        priority: taskPriority,
        listId: currentTask.listId,
      };

      const result = await apiService.updateTask(taskId, updatedTask);
      if (result) {
        modalController.resetModalToAddMode();
        modalController.closeModal();
        await this.refreshCurrentView();
      }
    },

    async deleteTask(taskId) {
      const result = await apiService.deleteTask(taskId);
      if (result) {
        await this.refreshCurrentView();
      }
    },

    async createList() {
      const listTitle = DOM.formElements.listTitle.value.trim();
      if (!listTitle) return alert("Please enter a list title");

      const newList = { title: listTitle };
      const createdList = await apiService.createList(newList);
      if (!createdList) return;

      modalController.closeModal();

      // Treat ID as string, no Number conversion
      state.currentView = { type: "list", listId: createdList.id };

      await this.fetchLists();
      ui.updateSidebarSelection();
      await this.fetchTasksFromList(createdList.id);
    },

    async deleteList(listId) {
      try {
        const allTasks = await apiService.getTasks();
        const tasksToDelete = allTasks.filter((task) => task.listId === listId);

        const listDeleted = await apiService.deleteList(listId);
        if (!listDeleted) return;

        const deletePromises = tasksToDelete.map((task) =>
          apiService.deleteTask(task.id)
        );
        await Promise.all(deletePromises);

        const listItem = document.querySelector(
          `.list-item-container[data-list-id="${listId}"]`
        );
        if (listItem) listItem.remove();

        if (
          state.currentView.type === "list" &&
          state.currentView.listId === listId
        ) {
          DOM.tabs.todayBtn.click();
        }

        console.log(
          `List ${listId} and ${tasksToDelete.length} associated tasks deleted successfully`
        );
      } catch (error) {
        console.error("Error deleting list and its tasks:", error);
      }
    },
    async fetchLists() {
      const lists = await apiService.getLists();
      ui.renderLists(lists);
    },

    async refreshCurrentView() {
      if (state.currentView.type === "today") {
        await this.fetchTasksToday();
      } else if (state.currentView.type === "tasks") {
        await this.fetchTasks();
      } else if (
        state.currentView.type === "list" &&
        state.currentView.listId
      ) {
        await this.fetchTasksFromList(state.currentView.listId);
      } else {
        await this.fetchTasksToday();
      }
      ui.updateSidebarSelection();
    },
  };

  // --- MODAL CONTROLLER ---
  const modalController = {
    showModal() {
      DOM.modal.classList.add("active");
      this.resetAddModal();
    },

    closeModal() {
      DOM.modal.classList.remove("active");
      this.resetModalToAddMode();
      DOM.tabs.addTaskBtn.classList.add("selected");
      DOM.tabs.createListBtn.classList.remove("selected");
      DOM.forms.addTaskForm.classList.remove("hidden");
      DOM.forms.createListForm.classList.add("hidden");
    },

    resetAddModal() {
      DOM.formElements.priorityBtns.forEach((btn) =>
        btn.classList.remove("selected")
      );
      DOM.formElements.taskTitle.value = "";
      DOM.formElements.taskDetails.value = "";
      DOM.formElements.dueDate.value = "";
      DOM.formElements.listTitle.value = "";
    },

    resetModalToAddMode() {
      state.currentModalMode = "add";
      DOM.formElements.taskTitle.readOnly = false;
      DOM.formElements.taskDetails.readOnly = false;
      DOM.formElements.dueDate.readOnly = false;
      DOM.formElements.priorityBtns.forEach((btn) => (btn.disabled = false));
      DOM.tabs.addTaskBtn.textContent = "ADD TASK";
      DOM.tabs.createListBtn.style.display = "";
      const submitBtn = DOM.formElements.addTaskSubmitBtn;
      submitBtn.textContent = "ADD TASK";
      submitBtn.removeEventListener("click", this.handleUpdateTaskSubmit);
      submitBtn.removeEventListener("click", this.handleEditButtonClick);
      submitBtn.addEventListener("click", this.handleAddTaskSubmit);
      state.currentEditingTaskId = null;
    },

    async viewTaskDetails(taskId) {
      const task = await apiService.getTaskById(taskId);
      if (!task) return;
      state.currentEditingTaskId = taskId;
      state.currentModalMode = "details";
      DOM.formElements.taskTitle.value = task.title;
      DOM.formElements.taskDetails.value = task.details || "";
      DOM.formElements.dueDate.value = task.date || "";
      DOM.formElements.taskTitle.readOnly = true;
      DOM.formElements.taskDetails.readOnly = true;
      DOM.formElements.dueDate.readOnly = true;
      DOM.formElements.priorityBtns.forEach((btn) => {
        btn.classList.remove("selected");
        if (btn.dataset.priority === task.priority) {
          btn.classList.add("selected");
        }
        btn.disabled = true;
      });
      DOM.tabs.addTaskBtn.textContent = "TASK DETAILS";
      DOM.tabs.createListBtn.style.display = "none";
      const submitBtn = DOM.formElements.addTaskSubmitBtn;
      submitBtn.textContent = "EDIT";
      submitBtn.removeEventListener("click", this.handleAddTaskSubmit);
      submitBtn.removeEventListener("click", this.handleUpdateTaskSubmit);
      submitBtn.addEventListener("click", this.handleEditButtonClick);
      DOM.modal.classList.add("active");
    },

    async editTask(taskId) {
      const task = await apiService.getTaskById(taskId);
      if (!task) return;
      state.currentEditingTaskId = taskId;
      state.currentModalMode = "edit";
      DOM.formElements.taskTitle.value = task.title;
      DOM.formElements.taskDetails.value = task.details || "";
      DOM.formElements.dueDate.value = task.date || "";
      DOM.formElements.taskTitle.readOnly = false;
      DOM.formElements.taskDetails.readOnly = false;
      DOM.formElements.dueDate.readOnly = false;
      DOM.formElements.priorityBtns.forEach((btn) => {
        btn.classList.remove("selected");
        if (btn.dataset.priority === task.priority) {
          btn.classList.add("selected");
        }
        btn.disabled = false;
      });
      DOM.tabs.addTaskBtn.textContent = "EDIT TASK";
      DOM.tabs.createListBtn.style.display = "none";
      const submitBtn = DOM.formElements.addTaskSubmitBtn;
      submitBtn.textContent = "UPDATE TASK";
      submitBtn.removeEventListener("click", this.handleAddTaskSubmit);
      submitBtn.removeEventListener("click", this.handleEditButtonClick);
      submitBtn.addEventListener("click", this.handleUpdateTaskSubmit);
      DOM.modal.classList.add("active");
    },

    handleAddTaskSubmit(e) {
      e.preventDefault();
      taskController.addTask();
    },

    handleUpdateTaskSubmit(e) {
      e.preventDefault();
      taskController.updateTask(state.currentEditingTaskId);
    },

    handleEditButtonClick(e) {
      e.preventDefault();
      modalController.editTask(state.currentEditingTaskId);
    },
  };

  // --- EVENT SETUP ---
  function setupEventListeners() {
    DOM.addBtn.addEventListener("click", () => modalController.showModal());
    DOM.cancelBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        modalController.closeModal();
      });
    });
    DOM.formElements.addTaskSubmitBtn.addEventListener(
      "click",
      modalController.handleAddTaskSubmit
    );
    DOM.formElements.createListSubmitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      taskController.createList();
    });
    DOM.formElements.priorityBtns.forEach((button) => {
      button.addEventListener("click", () => {
        if (state.currentModalMode !== "details") {
          DOM.formElements.priorityBtns.forEach((btn) =>
            btn.classList.remove("selected")
          );
          button.classList.add("selected");
        }
      });
    });
    DOM.tabs.addTaskBtn.addEventListener("click", () => {
      if (state.currentModalMode === "add") {
        setSelectedTab(DOM.tabs.addTaskBtn, DOM.tabs.createListBtn);
        DOM.forms.addTaskForm.classList.remove("hidden");
        DOM.forms.createListForm.classList.add("hidden");
      }
    });
    DOM.tabs.createListBtn.addEventListener("click", () => {
      if (state.currentModalMode === "add") {
        setSelectedTab(DOM.tabs.createListBtn, DOM.tabs.addTaskBtn);
        DOM.forms.createListForm.classList.remove("hidden");
        DOM.forms.addTaskForm.classList.add("hidden");
      }
    });
    DOM.tabs.todayBtn.addEventListener("click", async () => {
      state.currentView = { type: "today", listId: null };
      ui.updateSidebarSelection();
      await taskController.refreshCurrentView();
    });
    DOM.tabs.tasksBtn.addEventListener("click", async () => {
      state.currentView = { type: "tasks", listId: null };
      ui.updateSidebarSelection();
      await taskController.refreshCurrentView();
    });
  }

  // --- INITIALIZATION ---
  async function init() {
    DOM.modal = document.getElementById("modal");
    DOM.modal.addEventListener("click", (e) => {
      if (e.target === DOM.modal) modalController.closeModal();
    });
    DOM.addBtn = document.getElementById("add-btn");
    DOM.cancelBtns = document.querySelectorAll(".cancel-btn");
    DOM.taskListContainer = document.getElementById("task-list-container");
    DOM.sidebarListContainer = document.querySelector(".list-btn-container");

    DOM.formElements = {
      taskTitle: document.getElementById("task-title"),
      taskDetails: document.getElementById("task-details"),
      dueDate: document.getElementById("due-date"),
      listTitle: document.getElementById("list-title"),
      addTaskSubmitBtn: document.getElementById("add-task-submit-btn"),
      createListSubmitBtn: document.getElementById("create-list-submit-btn"),
      priorityBtns: document.querySelectorAll(".priority-btn"),
    };

    DOM.tabs = {
      todayBtn: document.getElementById("today-btn"),
      tasksBtn: document.getElementById("tasks-btn"),
      addTaskBtn: document.getElementById("add-task-btn"),
      createListBtn: document.getElementById("create-list-btn"),
    };

    DOM.forms = {
      addTaskForm: document.getElementById("add-task-form"),
      createListForm: document.getElementById("create-list-form"),
    };

    setupEventListeners();
    // Initialize with add task form visible
    setSelectedTab(DOM.tabs.addTaskBtn, DOM.tabs.createListBtn);
    DOM.forms.addTaskForm.classList.remove("hidden");
    DOM.forms.createListForm.classList.add("hidden");

    await taskController.fetchLists();
    DOM.tabs.todayBtn.click();
  }

  // --- PUBLIC API ---
  return {
    init,
  };
})();

// Initialize the app when DOM is ready
document.addEventListener("DOMContentLoaded", TodoApp.init);

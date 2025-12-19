// ==================================================
// To-Do List Application with Notification System
// ==================================================

// Application State
let tasks = [];
let currentFilter = 'all';
let currentPriorityFilter = 'all';
let searchTerm = '';
let currentEditId = null;
let notificationsEnabled = true;
let notificationCheckInterval = null;
let lastNotificationCheck = null;

// DOM Elements
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const prioritySelect = document.getElementById('prioritySelect');
const dueDate = document.getElementById('dueDate');
const tasksList = document.getElementById('tasksList');
const emptyState = document.getElementById('emptyState');
const totalTasksEl = document.getElementById('totalTasks');
const completedTasksEl = document.getElementById('completedTasks');
const pendingTasksEl = document.getElementById('pendingTasks');
const dueSoonTasksEl = document.getElementById('dueSoonTasks');
const progressFill = document.getElementById('progressFill');
const progressPercentage = document.getElementById('progressPercentage');
const themeToggle = document.getElementById('themeToggle');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const editModal = document.getElementById('editModal');
const editTaskForm = document.getElementById('editTaskForm');
const editTaskInput = document.getElementById('editTaskInput');
const editPrioritySelect = document.getElementById('editPrioritySelect');
const editDueDate = document.getElementById('editDueDate');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const focusTasks = document.getElementById('focusTasks');
const focusInfoBtn = document.getElementById('focusInfoBtn');
const focusSection = document.getElementById('focusSection');
const infoModal = document.getElementById('infoModal');
const closeInfoModalBtn = document.getElementById('closeInfoModalBtn');
const formValidation = document.getElementById('formValidation');
const notificationBtn = document.getElementById('notificationBtn');
const notificationBadge = document.getElementById('notificationBadge');
const notificationsPanel = document.getElementById('notificationsPanel');
const closeNotificationsBtn = document.getElementById('closeNotificationsBtn');
const notificationsList = document.getElementById('notificationsList');
const notificationToggle = document.getElementById('notificationToggle');
const testNotificationBtn = document.getElementById('testNotificationBtn');
const notificationAlert = document.getElementById('notificationAlert');
const alertCount = document.getElementById('alertCount');
const dueSoonBtn = document.getElementById('dueSoonBtn');
const notificationSound = document.getElementById('notificationSound');

// ==================================================
// UTILITY FUNCTIONS
// ==================================================

// Generate unique ID for tasks
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format date to readable string
function formatDate(dateString) {
    if (!dateString) return 'No due date';
    
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Reset time for comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    if (date.getTime() === today.getTime()) {
        return 'Today';
    } else if (date.getTime() === tomorrow.getTime()) {
        return 'Tomorrow';
    } else {
        const options = { month: 'short', day: 'numeric' };
        if (date.getFullYear() !== today.getFullYear()) {
            options.year = 'numeric';
        }
        return date.toLocaleDateString('en-US', options);
    }
}

// Check if task is overdue
function isOverdue(dueDateString) {
    if (!dueDateString) return false;
    
    const dueDate = new Date(dueDateString);
    const today = new Date();
    
    // Reset time for comparison
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    return dueDate < today;
}

// Check if task is due soon (within 24 hours)
function isDueSoon(dueDateString) {
    if (!dueDateString) return false;
    
    const dueDate = new Date(dueDateString);
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    
    // Due within 24 hours and not overdue
    return timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000;
}

// Get priority color class
function getPriorityClass(priority) {
    return priority === 'high' ? 'high' : 
           priority === 'medium' ? 'medium' : 'low';
}

// Get priority text
function getPriorityText(priority) {
    return priority === 'high' ? 'High' : 
           priority === 'medium' ? 'Medium' : 'Low';
}

// Show validation message
function showValidation(message, isError = true) {
    formValidation.textContent = message;
    formValidation.style.color = isError ? 'var(--danger-color)' : 'var(--success-color)';
    formValidation.style.opacity = '1';
    
    if (isError) {
        setTimeout(() => {
            formValidation.style.opacity = '0';
        }, 3000);
    }
}

// ==================================================
// NOTIFICATION SYSTEM
// ==================================================

// Check for upcoming deadlines
function checkUpcomingDeadlines() {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const dueSoonTasks = tasks.filter(task => {
        if (!task.dueDate || task.completed) return false;
        
        const taskDueDate = new Date(task.dueDate);
        const timeUntilDue = taskDueDate.getTime() - now.getTime();
        
        // Tasks due within 1 hour (critical)
        if (timeUntilDue > 0 && timeUntilDue <= 60 * 60 * 1000) {
            task.notificationLevel = 'critical';
            return true;
        }
        
        // Tasks due within 24 hours (warning)
        if (timeUntilDue > 0 && timeUntilDue <= 24 * 60 * 60 * 1000) {
            task.notificationLevel = 'warning';
            return true;
        }
        
        // Overdue tasks (up to 24 hours overdue)
        if (timeUntilDue < 0 && Math.abs(timeUntilDue) <= 24 * 60 * 60 * 1000) {
            task.notificationLevel = 'critical';
            return true;
        }
        
        return false;
    });
    
    return dueSoonTasks;
}

// Show desktop notification
function showDesktopNotification(task, level = 'warning') {
    if (!notificationsEnabled || !("Notification" in window)) return;
    
    if (Notification.permission === "granted") {
        const notification = new Notification(`Task Deadline: ${task.text}`, {
            body: getNotificationMessage(task, level),
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📋</text></svg>',
            tag: `task-${task.id}`,
            requireInteraction: level === 'critical'
        });
        
        // Play notification sound
        if (notificationSound) {
            notificationSound.currentTime = 0;
            notificationSound.play().catch(e => console.log("Audio play failed:", e));
        }
        
        // Close notification after 10 seconds (except critical)
        if (level !== 'critical') {
            setTimeout(() => notification.close(), 10000);
        }
        
        // Handle notification click
        notification.onclick = () => {
            window.focus();
            notification.close();
            // Focus on the task in the list
            const taskElement = document.querySelector(`[data-id="${task.id}"]`);
            if (taskElement) {
                taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                taskElement.classList.add('highlight');
                setTimeout(() => taskElement.classList.remove('highlight'), 2000);
            }
        };
        
        return true;
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                showDesktopNotification(task, level);
            }
        });
    }
    return false;
}

// Get notification message based on task status
function getNotificationMessage(task, level) {
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    
    if (timeDiff < 0) {
        const hoursOverdue = Math.abs(Math.floor(timeDiff / (1000 * 60 * 60)));
        return `Overdue by ${hoursOverdue} hour${hoursOverdue !== 1 ? 's' : ''}! Priority: ${getPriorityText(task.priority)}`;
    } else if (timeDiff <= 60 * 60 * 1000) {
        return `Due in less than 1 hour! Priority: ${getPriorityText(task.priority)}`;
    } else if (timeDiff <= 24 * 60 * 60 * 1000) {
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        return `Due in ${hours} hour${hours !== 1 ? 's' : ''}. Priority: ${getPriorityText(task.priority)}`;
    }
    
    return `Due ${formatDate(task.dueDate)}. Priority: ${getPriorityText(task.priority)}`;
}

// Show toast notification
function showToastNotification(title, message, level = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification ${level}`;
    
    const icon = level === 'critical' ? 'fa-exclamation-triangle' : 
                 level === 'warning' ? 'fa-exclamation-circle' : 'fa-info-circle';
    
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="toast-text">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Close notification">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Add event listener to close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    });
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }, 8000);
}

// Update notifications panel
function updateNotificationsPanel() {
    const dueSoonTasks = checkUpcomingDeadlines();
    
    // Update badge
    if (dueSoonTasks.length > 0) {
        notificationBadge.textContent = dueSoonTasks.length;
        notificationBadge.classList.remove('hidden');
    } else {
        notificationBadge.classList.add('hidden');
    }
    
    // Update alert
    if (dueSoonTasks.length > 0) {
        alertCount.textContent = dueSoonTasks.length;
        notificationAlert.classList.remove('hidden');
    } else {
        notificationAlert.classList.add('hidden');
    }
    
    // Update due soon counter
    dueSoonTasksEl.textContent = dueSoonTasks.length;
    
    // Update notifications list
    notificationsList.innerHTML = '';
    
    if (dueSoonTasks.length === 0) {
        notificationsList.innerHTML = `
            <div class="empty-notifications">
                <i class="fas fa-bell-slash"></i>
                <p>No upcoming deadlines</p>
            </div>
        `;
    } else {
        dueSoonTasks.forEach(task => {
            const notificationItem = document.createElement('div');
            notificationItem.className = `notification-item ${task.notificationLevel || 'warning'}`;
            
            const dueDate = new Date(task.dueDate);
            const now = new Date();
            const timeDiff = dueDate.getTime() - now.getTime();
            let timeText = '';
            
            if (timeDiff < 0) {
                const hoursOverdue = Math.abs(Math.floor(timeDiff / (1000 * 60 * 60)));
                timeText = `${hoursOverdue} hour${hoursOverdue !== 1 ? 's' : ''} overdue`;
            } else if (timeDiff <= 60 * 60 * 1000) {
                timeText = 'Due in less than 1 hour';
            } else {
                const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60));
                timeText = `Due in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`;
            }
            
            notificationItem.innerHTML = `
                <div class="notification-header">
                    <div class="notification-title">${task.text}</div>
                    <div class="notification-time">${timeText}</div>
                </div>
                <div class="notification-message">
                    Priority: ${getPriorityText(task.priority)}
                </div>
                <div class="notification-actions">
                    <button class="btn-primary btn-sm complete-notification-btn">
                        <i class="fas fa-check"></i> Mark Complete
                    </button>
                    <button class="btn-secondary btn-sm view-task-btn">
                        <i class="fas fa-eye"></i> View Task
                    </button>
                </div>
            `;
            
            // Add event listeners
            notificationItem.querySelector('.complete-notification-btn').addEventListener('click', () => {
                toggleTaskCompletion(task.id);
                updateNotificationsPanel();
                showToastNotification('Task Completed', `${task.text} marked as complete`, 'info');
            });
            
            notificationItem.querySelector('.view-task-btn').addEventListener('click', () => {
                closeNotificationsPanel();
                // Scroll to task
                const taskElement = document.querySelector(`[data-id="${task.id}"]`);
                if (taskElement) {
                    taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    taskElement.classList.add('highlight');
                    setTimeout(() => taskElement.classList.remove('highlight'), 2000);
                }
            });
            
            notificationsList.appendChild(notificationItem);
        });
    }
    
    // Show desktop notifications for new critical/warning tasks
    const now = new Date();
    dueSoonTasks.forEach(task => {
        if (task.lastNotified && (now - new Date(task.lastNotified)) < 30 * 60 * 1000) {
            return; // Already notified in last 30 minutes
        }
        
        const notificationSent = showDesktopNotification(task, task.notificationLevel || 'warning');
        if (notificationSent) {
            task.lastNotified = now.toISOString();
            saveTasks();
        }
    });
}

// Show notifications panel
function showNotificationsPanel() {
    updateNotificationsPanel();
    notificationsPanel.classList.add('show');
}

// Close notifications panel
function closeNotificationsPanel() {
    notificationsPanel.classList.remove('show');
}

// Test notification
function testNotification() {
    if (notificationsEnabled) {
        const testTask = {
            id: 'test',
            text: 'Test Notification Task',
            dueDate: new Date(Date.now() + 30 * 60 * 1000).toISOString().split('T')[0],
            priority: 'high',
            notificationLevel: 'warning'
        };
        
        const notificationSent = showDesktopNotification(testTask, 'warning');
        if (notificationSent) {
            showToastNotification('Test Notification', 'Desktop notification sent successfully', 'info');
        } else {
            showToastNotification('Test Notification', 'Browser notification sent', 'info');
        }
    } else {
        showToastNotification('Notifications Disabled', 'Enable notifications in settings to receive alerts', 'warning');
    }
}

// ==================================================
// TASK MANAGEMENT FUNCTIONS
// ==================================================

// Create task object
function createTask(text, priority, dueDate) {
    return {
        id: generateId(),
        text: text.trim(),
        priority: priority,
        dueDate: dueDate || null,
        completed: false,
        createdAt: new Date().toISOString(),
        lastNotified: null
    };
}

// Add new task
function addTask(text, priority, dueDate) {
    // Validation
    if (!text.trim()) {
        showValidation('Task cannot be empty!');
        taskInput.focus();
        return false;
    }
    
    // Check for duplicates
    const isDuplicate = tasks.some(task => 
        task.text.toLowerCase() === text.toLowerCase().trim() && !task.completed
    );
    
    if (isDuplicate) {
        showValidation('This task already exists!');
        taskInput.focus();
        return false;
    }
    
    // Create and add task
    const task = createTask(text, priority, dueDate);
    tasks.unshift(task); // Add to beginning
    saveTasks();
    renderTasks();
    
    // Check if this new task is due soon
    if (task.dueDate && isDueSoon(task.dueDate)) {
        setTimeout(() => {
            updateNotificationsPanel();
            showToastNotification('New Task Added', `${task.text} is due soon!`, 'warning');
        }, 500);
    } else {
        showValidation('Task added successfully!', false);
    }
    
    // Reset form
    taskInput.value = '';
    dueDate.value = '';
    prioritySelect.value = 'medium';
    
    return true;
}

// Update task
function updateTask(id, text, priority, dueDate) {
    const taskIndex = tasks.findIndex(task => task.id === id);
    
    if (taskIndex !== -1) {
        tasks[taskIndex].text = text.trim();
        tasks[taskIndex].priority = priority;
        tasks[taskIndex].dueDate = dueDate || null;
        tasks[taskIndex].lastNotified = null; // Reset notification timer
        saveTasks();
        renderTasks();
        updateNotificationsPanel();
        return true;
    }
    
    return false;
}

// Delete task
function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks();
        updateNotificationsPanel();
    }
}

// Toggle task completion
function toggleTaskCompletion(id) {
    const taskIndex = tasks.findIndex(task => task.id === id);
    
    if (taskIndex !== -1) {
        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        saveTasks();
        renderTasks();
        updateNotificationsPanel();
        
        // Show completion toast
        const task = tasks[taskIndex];
        const message = task.completed ? 
            `"${task.text}" marked as completed!` : 
            `"${task.text}" marked as pending`;
        showToastNotification(task.completed ? 'Task Completed' : 'Task Reopened', message, 'info');
    }
}

// Clear all completed tasks
function clearCompletedTasks() {
    const completedCount = tasks.filter(task => task.completed).length;
    
    if (completedCount > 0) {
        if (confirm(`Are you sure you want to clear ${completedCount} completed task${completedCount !== 1 ? 's' : ''}?`)) {
            tasks = tasks.filter(task => !task.completed);
            saveTasks();
            renderTasks();
            updateNotificationsPanel();
            showToastNotification('Tasks Cleared', `${completedCount} completed task${completedCount !== 1 ? 's' : ''} removed`, 'info');
        }
    } else {
        showValidation('No completed tasks to clear!');
    }
}

// ==================================================
// FILTERING AND SEARCH FUNCTIONS
// ==================================================

// Get filtered tasks based on current filters
function getFilteredTasks() {
    return tasks.filter(task => {
        // Apply status filter
        const statusMatch = 
            currentFilter === 'all' ||
            (currentFilter === 'completed' && task.completed) ||
            (currentFilter === 'pending' && !task.completed);
        
        // Apply priority filter
        const priorityMatch = 
            currentPriorityFilter === 'all' ||
            task.priority === currentPriorityFilter;
        
        // Apply search filter
        const searchMatch = 
            searchTerm === '' ||
            task.text.toLowerCase().includes(searchTerm.toLowerCase());
        
        return statusMatch && priorityMatch && searchMatch;
    });
}

// Update filter buttons
function updateFilterButtons() {
    filterButtons.forEach(button => {
        const filter = button.dataset.filter;
        const priority = button.dataset.priority;
        
        if (filter) {
            button.classList.toggle('active', filter === currentFilter);
        } else if (priority) {
            button.classList.toggle('active', priority === currentPriorityFilter);
        }
    });
}

// Filter to show due soon tasks
function showDueSoonTasks() {
    currentFilter = 'pending';
    currentPriorityFilter = 'all';
    searchTerm = '';
    searchInput.value = '';
    updateFilterButtons();
    renderTasks();
    showToastNotification('Due Soon Filter', 'Showing tasks due within 24 hours', 'info');
}

// ==================================================
// RENDERING FUNCTIONS
// ==================================================

// Render individual task
function renderTask(task) {
    const isOverdueTask = isOverdue(task.dueDate) && !task.completed;
    const isDueSoonTask = isDueSoon(task.dueDate) && !task.completed && !isOverdueTask;
    const priorityClass = getPriorityClass(task.priority);
    const priorityText = getPriorityText(task.priority);
    
    const taskElement = document.createElement('div');
    taskElement.className = `task-item ${priorityClass}-priority ${task.completed ? 'completed' : ''} ${isOverdueTask ? 'overdue' : ''} ${isDueSoonTask ? 'due-soon' : ''}`;
    taskElement.dataset.id = task.id;
    
    taskElement.innerHTML = `
        <div class="task-checkbox">
            <input type="checkbox" ${task.completed ? 'checked' : ''} 
                   aria-label="Mark task as ${task.completed ? 'pending' : 'completed'}">
        </div>
        <div class="task-content">
            <div class="task-header">
                <div class="task-title">${task.text}</div>
                <div class="task-priority ${priorityClass}">${priorityText}</div>
            </div>
            <div class="task-footer">
                <div class="task-due ${isOverdueTask ? 'overdue' : ''} ${isDueSoonTask ? 'due-soon' : ''}">
                    <i class="fas fa-calendar-day"></i>
                    ${formatDate(task.dueDate)}
                    ${isOverdueTask ? ' (Overdue!)' : ''}
                    ${isDueSoonTask ? ' (Due Soon!)' : ''}
                </div>
                <div class="task-actions">
                    <button class="btn-edit" aria-label="Edit task">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-delete" aria-label="Delete task">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners
    const checkbox = taskElement.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));
    
    const editBtn = taskElement.querySelector('.btn-edit');
    editBtn.addEventListener('click', () => openEditModal(task));
    
    const deleteBtn = taskElement.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    
    return taskElement;
}

// Render all tasks
function renderTasks() {
    const filteredTasks = getFilteredTasks();
    
    // Show/hide empty state
    if (filteredTasks.length === 0) {
        emptyState.style.display = 'block';
        tasksList.innerHTML = '';
        tasksList.appendChild(emptyState);
    } else {
        emptyState.style.display = 'none';
        tasksList.innerHTML = '';
        filteredTasks.forEach(task => {
            tasksList.appendChild(renderTask(task));
        });
    }
    
    // Update stats
    updateStats();
    
    // Update focus mode
    updateFocusMode();
}

// Update statistics
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const dueSoon = checkUpcomingDeadlines().length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    totalTasksEl.textContent = total;
    completedTasksEl.textContent = completed;
    pendingTasksEl.textContent = pending;
    dueSoonTasksEl.textContent = dueSoon;
    progressPercentage.textContent = `${percentage}%`;
    progressFill.style.width = `${percentage}%`;
}

// Update focus mode (top 3 high priority tasks)
function updateFocusMode() {
    // Get top 3 high priority pending tasks, sorted by due date
    const highPriorityTasks = tasks
        .filter(task => task.priority === 'high' && !task.completed)
        .sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        })
        .slice(0, 3);
    
    // Update focus section visibility
    if (highPriorityTasks.length > 0) {
        focusSection.style.display = 'block';
        focusTasks.innerHTML = '';
        
        highPriorityTasks.forEach(task => {
            const isOverdueTask = isOverdue(task.dueDate);
            const isDueSoonTask = isDueSoon(task.dueDate) && !isOverdueTask;
            
            const focusTaskElement = document.createElement('div');
            focusTaskElement.className = 'focus-task';
            focusTaskElement.innerHTML = `
                <div class="focus-task-header">
                    <div class="focus-task-title">${task.text}</div>
                    <button class="btn-edit" aria-label="Edit task">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
                <div class="focus-task-due ${isOverdueTask ? 'overdue' : ''} ${isDueSoonTask ? 'due-soon' : ''}">
                    <i class="fas fa-clock"></i>
                    ${formatDate(task.dueDate)}
                    ${isOverdueTask ? ' - OVERDUE!' : ''}
                    ${isDueSoonTask ? ' - DUE SOON!' : ''}
                </div>
                <div class="focus-task-actions">
                    <button class="btn-primary complete-focus-btn" aria-label="Mark as completed">
                        <i class="fas fa-check"></i> Mark Complete
                    </button>
                </div>
            `;
            
            // Add event listeners for focus task
            const editBtn = focusTaskElement.querySelector('.btn-edit');
            editBtn.addEventListener('click', () => openEditModal(task));
            
            const completeBtn = focusTaskElement.querySelector('.complete-focus-btn');
            completeBtn.addEventListener('click', () => toggleTaskCompletion(task.id));
            
            focusTasks.appendChild(focusTaskElement);
        });
    } else {
        focusSection.style.display = 'none';
    }
}

// ==================================================
// MODAL FUNCTIONS
// ==================================================

// Open edit modal
function openEditModal(task) {
    currentEditId = task.id;
    editTaskInput.value = task.text;
    editPrioritySelect.value = task.priority;
    editDueDate.value = task.dueDate || '';
    editModal.classList.add('active');
    editTaskInput.focus();
}

// Close edit modal
function closeEditModal() {
    currentEditId = null;
    editModal.classList.remove('active');
    editTaskForm.reset();
}

// ==================================================
// STORAGE FUNCTIONS
// ==================================================

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('productivityProTasks', JSON.stringify(tasks));
}

// Load tasks from localStorage
function loadTasks() {
    const savedTasks = localStorage.getItem('productivityProTasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        renderTasks();
        updateNotificationsPanel();
    }
}

// Save theme preference
function saveTheme(theme) {
    localStorage.setItem('productivityProTheme', theme);
}

// Load theme preference
function loadTheme() {
    const savedTheme = localStorage.getItem('productivityProTheme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Update toggle button position
    const sunIcon = themeToggle.querySelector('.fa-sun');
    const moonIcon = themeToggle.querySelector('.fa-moon');
    
    if (savedTheme === 'dark') {
        sunIcon.style.left = '-30px';
        moonIcon.style.right = '10px';
    } else {
        sunIcon.style.left = '10px';
        moonIcon.style.right = '-30px';
    }
}

// Save notification settings
function saveNotificationSettings() {
    localStorage.setItem('productivityProNotifications', notificationsEnabled.toString());
}

// Load notification settings
function loadNotificationSettings() {
    const savedSetting = localStorage.getItem('productivityProNotifications');
    if (savedSetting !== null) {
        notificationsEnabled = savedSetting === 'true';
        notificationToggle.checked = notificationsEnabled;
    }
}

// ==================================================
// EVENT LISTENERS
// ==================================================

// Form submission for new task
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addTask(taskInput.value, prioritySelect.value, dueDate.value);
});

// Form submission for editing task
editTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (currentEditId && editTaskInput.value.trim()) {
        updateTask(
            currentEditId,
            editTaskInput.value,
            editPrioritySelect.value,
            editDueDate.value
        );
        closeEditModal();
        showToastNotification('Task Updated', 'Task has been successfully updated', 'info');
    }
});

// Theme toggle
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    saveTheme(newTheme);
    
    // Animate toggle icons
    const sunIcon = themeToggle.querySelector('.fa-sun');
    const moonIcon = themeToggle.querySelector('.fa-moon');
    
    if (newTheme === 'dark') {
        sunIcon.style.left = '-30px';
        moonIcon.style.right = '10px';
    } else {
        sunIcon.style.left = '10px';
        moonIcon.style.right = '-30px';
    }
    
    showToastNotification('Theme Changed', `Switched to ${newTheme} theme`, 'info');
});

// Search input
searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value.trim();
    renderTasks();
});

// Filter buttons
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        const priority = button.dataset.priority;
        
        if (filter) {
            currentFilter = filter;
        } else if (priority) {
            currentPriorityFilter = priority;
        }
        
        updateFilterButtons();
        renderTasks();
    });
});

// Clear completed tasks
clearCompletedBtn.addEventListener('click', clearCompletedTasks);

// Due soon button
dueSoonBtn.addEventListener('click', showDueSoonTasks);

// Modal controls
closeModalBtn.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);

// Close modal when clicking outside
editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
        closeEditModal();
    }
});

// Focus mode info
focusInfoBtn.addEventListener('click', () => {
    infoModal.classList.add('active');
});

closeInfoModalBtn.addEventListener('click', () => {
    infoModal.classList.remove('active');
});

infoModal.addEventListener('click', (e) => {
    if (e.target === infoModal) {
        infoModal.classList.remove('active');
    }
});

// Notification controls
notificationBtn.addEventListener('click', showNotificationsPanel);

closeNotificationsBtn.addEventListener('click', closeNotificationsPanel);

// Close notifications panel when clicking outside
notificationsPanel.addEventListener('click', (e) => {
    if (e.target === notificationsPanel) {
        closeNotificationsPanel();
    }
});

// Notification toggle
notificationToggle.addEventListener('change', (e) => {
    notificationsEnabled = e.target.checked;
    saveNotificationSettings();
    
    if (notificationsEnabled && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    showToastNotification(
        notificationsEnabled ? 'Notifications Enabled' : 'Notifications Disabled',
        notificationsEnabled ? 'You will receive deadline reminders' : 'You will not receive deadline reminders',
        notificationsEnabled ? 'info' : 'warning'
    );
});

// Test notification button
testNotificationBtn.addEventListener('click', testNotification);

// Set minimum date for due date inputs (today)
window.addEventListener('load', () => {
    const today = new Date().toISOString().split('T')[0];
    dueDate.min = today;
    editDueDate.min = today;
    
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
});

// Initialize notification permission
if ("Notification" in window && Notification.permission === "default") {
    setTimeout(() => {
        showToastNotification('Enable Notifications', 
            'Allow notifications to get deadline reminders for your tasks', 
            'info');
    }, 2000);
}

// ==================================================
// INITIALIZATION
// ==================================================

// Initialize application
function init() {
    loadTheme();
    loadNotificationSettings();
    loadTasks();
    
    // Start notification check interval (every 5 minutes)
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
    }
    
    notificationCheckInterval = setInterval(() => {
        updateNotificationsPanel();
    }, 5 * 60 * 1000); // 5 minutes
    
    // Set focus to input on page load
    taskInput.focus();
    
    // Initial notification check after 2 seconds
    setTimeout(() => {
        updateNotificationsPanel();
    }, 2000);
}

// Start the application
document.addEventListener('DOMContentLoaded', init);

// ==================================================
// KEYBOARD SHORTCUTS
// ==================================================

document.addEventListener('keydown', (e) => {
    // Focus search with Ctrl/Cmd + K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
    
    // Add task with Enter in input (if not empty)
    if (e.key === 'Enter' && document.activeElement === taskInput && taskInput.value.trim()) {
        addTask(taskInput.value, prioritySelect.value, dueDate.value);
    }
    
    // Close modal with Escape
    if (e.key === 'Escape') {
        closeEditModal();
        infoModal.classList.remove('active');
        closeNotificationsPanel();
    }
    
    // Open notifications with Ctrl/Cmd + N
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (notificationsPanel.classList.contains('show')) {
            closeNotificationsPanel();
        } else {
            showNotificationsPanel();
        }
    }
});

// ==================================================
// SERVICE WORKER FOR BACKGROUND NOTIFICATIONS
// ==================================================

// Check if service workers are supported
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Register service worker
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}
// Конфигурация API
const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || 'http://localhost:8000';
const API_VERSION = '/v1';

// Глобальные переменные
let currentUser = null;
let authToken = null;
let familyData = null;

// Утилиты для работы с API
class ApiClient {
    static async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${API_VERSION}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                // Специальная обработка ошибок аутентификации
                if (response.status === 401) {
                    // Очищаем локальные данные и показываем сообщение
                    authToken = null;
                    currentUser = null;
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('currentUser');
                    
                    throw new Error('Not authenticated');
                }
                
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    static async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    static async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// Утилиты для UI
class UI {
    static showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    static showSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionId}-section`).classList.add('active');

        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
    }

    static showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        const container = document.getElementById('toast-container');
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    static formatDate(dateString) {
        if (!dateString) return 'Не указано';
        return new Date(dateString).toLocaleDateString('ru-RU');
    }

    static formatDateTime(dateString) {
        if (!dateString) return 'Не указано';
        return new Date(dateString).toLocaleString('ru-RU');
    }

    static updateRoleVisibility(userRole) {
        const parentElements = document.querySelectorAll('.parent-only');
        const childElements = document.querySelectorAll('.child-only');

        parentElements.forEach(el => {
            if (userRole !== 'parent') {
                el.classList.add('hidden');
            } else {
                el.classList.remove('hidden');
            }
        });

        childElements.forEach(el => {
            if (userRole !== 'child') {
                el.classList.add('hidden');
            } else {
                el.classList.remove('hidden');
            }
        });
    }
}

// Управление аутентификацией
class Auth {
    static async createFamily(formData) {
        try {
            const response = await ApiClient.post('/auth/family/create', {
                name: formData.name,
                parent_name: formData.parent_name,
                parent_username: formData.parent_username,
                parent_password: formData.parent_password
            });

            authToken = response.access_token;
            currentUser = response.user;
            familyData = { id: response.family_id, passcode: response.passcode };

            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            localStorage.setItem('familyData', JSON.stringify(familyData));

            UI.showToast('Семья успешно создана!', 'success');
            // Перенаправляем на dashboard
            window.location.href = 'dashboard.html';
        } catch (error) {
            UI.showToast(`Ошибка создания семьи: ${error.message}`, 'error');
        }
    }

    static async joinFamily(formData) {
        try {
            const response = await ApiClient.post('/auth/family/join', {
                user_name: formData.name,
                username: formData.username,
                password: formData.password,
                passcode: formData.passcode,
                role: formData.role
            });

            authToken = response.access_token;
            currentUser = response.user;

            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            UI.showToast('Успешно присоединились к семье!', 'success');
            // Перенаправляем на dashboard
            window.location.href = 'dashboard.html';
        } catch (error) {
            UI.showToast(`Ошибка присоединения: ${error.message}`, 'error');
        }
    }

    static async login(formData) {
        try {
            const response = await ApiClient.post('/auth/login', {
                username: formData.username,
                password: formData.password
            });

            authToken = response.access_token;
            currentUser = response.user;

            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            UI.showToast('Добро пожаловать!', 'success');
            // Перенаправляем на dashboard
            window.location.href = 'dashboard.html';
        } catch (error) {
            UI.showToast(`Ошибка входа: ${error.message}`, 'error');
        }
    }

    static loadFromStorage() {
        authToken = localStorage.getItem('authToken');
        const userStr = localStorage.getItem('currentUser');
        const familyStr = localStorage.getItem('familyData');

        if (userStr) currentUser = JSON.parse(userStr);
        if (familyStr) familyData = JSON.parse(familyStr);

        return authToken && currentUser;
    }

    static initMainScreen() {
        // Если мы на странице login.html, перенаправляем на dashboard.html
        if (window.location.pathname.includes('login.html') || window.location.pathname === '/') {
            window.location.href = 'dashboard.html';
            return;
        }
        
        // Обновляем информацию о пользователе
        document.querySelector('.user-name').textContent = currentUser.name;
        document.querySelector('.user-role').textContent = currentUser.role === 'parent' ? 'Родитель' : 'Ребенок';
        document.querySelector('.user-username').textContent = `@${currentUser.username}`;
        
        // Настраиваем видимость элементов по роли
        UI.updateRoleVisibility(currentUser.role);
        
        // Загружаем данные
        this.loadDashboard();
        this.loadFamilyData();
    }

    static async loadDashboard() {
        try {
            // Загружаем баланс монет
            const balance = await ApiClient.get('/coins/balance');
            document.getElementById('coin-count').textContent = balance.balance;
            document.getElementById('dashboard-coins').textContent = balance.balance;

            if (currentUser.role === 'child') {
                // Для детей - простая статистика
                const tasks = await ApiClient.get('/tasks/my');
                const activeTasks = tasks.assignments.filter(a => a.status === 'assigned' || a.status === 'completed').length;
                document.getElementById('dashboard-total-tasks').textContent = activeTasks;
            } else {
                // Для родителей - расширенная статистика
                await this.loadParentStatistics();
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    static async loadParentStatistics() {
        try {
            // Загружаем статистику заданий
            const stats = await ApiClient.get('/tasks/statistics');
            
            // Обновляем общую статистику
            document.getElementById('dashboard-total-tasks').textContent = stats.total_tasks;
            document.getElementById('tasks-in-progress').textContent = stats.in_progress;
            document.getElementById('tasks-pending').textContent = stats.pending_approval;
            document.getElementById('tasks-completed').textContent = stats.completed;
            
            // Отображаем статистику по детям
            this.renderChildrenStatistics(stats.children);
            
        } catch (error) {
            console.error('Error loading parent statistics:', error);
        }
    }

    static renderChildrenStatistics(childrenStats) {
        const container = document.getElementById('children-stats');
        
        if (!childrenStats || childrenStats.length === 0) {
            container.innerHTML = '<p class="no-data">Нет данных по детям</p>';
            return;
        }
        
        container.innerHTML = childrenStats.map(child => `
            <div class="child-stat-card">
                <div class="child-header">
                    <div class="child-avatar">
                        ${child.child_name.charAt(0).toUpperCase()}
                    </div>
                    <div class="child-name">${child.child_name}</div>
                </div>
                <div class="child-task-stats">
                    <div class="child-task-stat">
                        <span class="stat-value">${child.assigned}</span>
                        <span class="stat-label">В работе</span>
                    </div>
                    <div class="child-task-stat">
                        <span class="stat-value">${child.completed}</span>
                        <span class="stat-label">На проверке</span>
                    </div>
                    <div class="child-task-stat">
                        <span class="stat-value">${child.approved}</span>
                        <span class="stat-label">Выполнено</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    static async loadFamilyData() {
        try {
            const familyInfo = await ApiClient.get('/auth/family/members');
            familyData = familyInfo.family;
            
            // Обновляем информацию о семье
            document.getElementById('family-name-display').textContent = familyInfo.family.name;
            document.getElementById('family-id').textContent = familyInfo.family.id;
            document.getElementById('family-passcode').textContent = familyInfo.family.passcode;
            
            // Отображаем членов семьи с детальной информацией
            const membersContainer = document.getElementById('family-members');
            membersContainer.innerHTML = familyInfo.members.map(member => `
                <div class="member-card ${member.role}" ${member.role === 'child' && currentUser.role === 'parent' ? `onclick="showChildProfile('${member.id}')"` : ''}>
                    <div class="member-header">
                        <div class="member-avatar ${member.role}">
                            <i class="fas ${member.role === 'parent' ? 'fa-crown' : 'fa-child'}"></i>
                            ${member.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="member-main-info">
                            <div class="member-name">${member.name}</div>
                            <div class="member-role">
                                ${member.role === 'parent' ? 'Родитель' : 'Ребенок'}
                                ${member.role === 'child' && currentUser.role === 'parent' ? '<span class="clickable-hint">Нажмите для просмотра профиля</span>' : ''}
                            </div>
                        </div>
                        <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); copyMemberId('${member.id}')" title="Копировать ID">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    
                    <div class="member-details">
                        <div class="detail-item">
                            <label>ID пользователя:</label>
                            <code class="member-id">${member.id}</code>
                        </div>
                        <div class="detail-item">
                            <label>Дата присоединения:</label>
                            <span>${UI.formatDate(member.created_at)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading family data:', error);
            UI.showToast('Ошибка загрузки данных семьи', 'error');
        }
    }

    static logout() {
        authToken = null;
        currentUser = null;
        familyData = null;
        localStorage.clear();
        UI.showScreen('auth-screen');
        UI.showToast('Вы вышли из системы', 'info');
    }
}

// Управление заданиями
class Tasks {
    static async loadTemplates() {
        try {
            console.log('Loading task templates...');
            const response = await ApiClient.get('/tasks/templates');
            console.log('Templates response:', response);
            
            const select = document.getElementById('task-template');
            if (!select) {
                console.error('Task template select element not found');
                return;
            }
            
            if (!response.templates || response.templates.length === 0) {
                select.innerHTML = '<option value="">Нет доступных шаблонов</option>';
                console.warn('No templates found in response');
                return;
            }
            
            select.innerHTML = response.templates.map(template => 
                `<option value="${template.id}">${template.title} (${template.default_reward_coins} монет)</option>`
            ).join('');
            
            console.log(`Loaded ${response.templates.length} templates`);
        } catch (error) {
            console.error('Error loading templates:', error);
            UI.showToast(`Ошибка загрузки шаблонов: ${error.message}`, 'error');
            
            // Показываем ошибку в селекте
            const select = document.getElementById('task-template');
            if (select) {
                select.innerHTML = '<option value="">Ошибка загрузки шаблонов</option>';
            }
        }
    }

    static async loadMyTasks() {
        try {
            const container = document.getElementById(currentUser.role === 'child' ? 'child-tasks' : 'parent-tasks');
            
            if (!container) {
                console.error('Container not found!');
                return;
            }
            
            if (currentUser.role === 'child') {
                const tasks = await ApiClient.get('/tasks/my');
                const renderedTasks = tasks.assignments.map(assignment => this.renderTaskCard(assignment));
                container.innerHTML = renderedTasks.join('');
            } else {
                const activeTab = document.querySelector('.tasks-tabs .tab-btn.active')?.dataset.tab || 'active';
                await this.loadParentTasks(activeTab, container);
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    static async loadParentTasks(tab, container) {
        try {
            if (tab === 'active') {
                // Активные задания
                const tasks = await ApiClient.get('/tasks/my');
                container.innerHTML = tasks.created_tasks.map(task => this.renderParentTaskCard(task)).join('');
                this.hideFilters();
            } else if (tab === 'pending') {
                // Ожидают проверки
                const tasks = await ApiClient.get('/tasks/my');
                const renderedApprovals = tasks.pending_approvals.map(assignment => this.renderApprovalCard(assignment));
                container.innerHTML = renderedApprovals.join('');
                this.hideFilters();
            } else if (tab === 'history') {
                // История заданий
                await this.loadTaskHistory();
                this.showFilters();
            }
        } catch (error) {
            console.error('Error loading parent tasks:', error);
        }
    }

    static async loadTaskHistory() {
        try {
            // Получаем значения фильтров
            const statusFilter = document.getElementById('status-filter')?.value || 'all';
            const childFilter = document.getElementById('child-filter')?.value || 'all';
            const periodFilter = document.getElementById('period-filter')?.value || 'month';
            
            // Формируем параметры запроса
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status_filter', statusFilter);
            if (childFilter !== 'all') params.append('child_filter', childFilter);
            if (periodFilter !== 'all') params.append('period_filter', periodFilter);
            
            const response = await ApiClient.get(`/tasks/history?${params}`);
            const container = document.getElementById('parent-tasks');
            
            if (!response.history || response.history.length === 0) {
                container.innerHTML = '<div class="no-tasks">Нет заданий для отображения</div>';
                return;
            }
            
            container.innerHTML = response.history.map(assignment => this.renderHistoryCard(assignment)).join('');
            
        } catch (error) {
            console.error('Error loading task history:', error);
        }
    }

    static showFilters() {
        const filters = document.getElementById('task-filters');
        if (filters) {
            filters.style.display = 'flex';
            this.loadChildrenForFilter();
        }
    }

    static hideFilters() {
        const filters = document.getElementById('task-filters');
        if (filters) {
            filters.style.display = 'none';
        }
    }

    static async loadChildrenForFilter() {
        try {
            const familyInfo = await ApiClient.get('/auth/family/members');
            const children = familyInfo.members.filter(m => m.role === 'child');
            
            const select = document.getElementById('child-filter');
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="all">Все дети</option>' +
                    children.map(child => 
                        `<option value="${child.id}" ${currentValue === child.id ? 'selected' : ''}>${child.name}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Error loading children for filter:', error);
        }
    }

    static async applyFilters() {
        await this.loadTaskHistory();
    }

    static initTaskTabs() {
        // Теперь не нужна, так как используем onclick в HTML
    }

    static switchTab(tab) {
        // Переключаем активную вкладку
        document.querySelectorAll('.tasks-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            }
        });
        
        // Перезагружаем задания
        this.loadMyTasks();
    }

    static renderTaskCard(assignment) {
        const statusText = {
            'assigned': 'Ожидает выполнения',
            'completed': 'На проверке',
            'approved': 'Одобрено',
            'rejected': 'Отклонено'
        };

        return `
            <div class="task-card">
                <div class="task-header">
                    <div class="task-title">${assignment.task.title}</div>
                    <div class="task-status ${assignment.status}">${statusText[assignment.status] || assignment.status}</div>
                </div>
                <div class="task-details">${assignment.task.description || ''}</div>
                <div class="task-meta">
                    <div class="task-coins">
                        <i class="fas fa-coins"></i>
                        ${assignment.task.reward_coins}
                    </div>
                    <div class="task-due">До: ${assignment.due_date ? UI.formatDate(assignment.due_date) : 'Не установлено'}</div>
                </div>
                ${assignment.status === 'assigned' ? `
                    <div class="task-actions">
                        <button class="btn btn-primary" onclick="Tasks.completeTask('${assignment.id}')">
                            <i class="fas fa-check"></i>
                            Выполнить
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    static renderParentTaskCard(task) {
        return `
            <div class="task-card">
                <div class="task-header">
                    <div class="task-title">${task.title}</div>
                </div>
                <div class="task-details">${task.description}</div>
                <div class="task-meta">
                    <div class="task-coins">
                        <i class="fas fa-coins"></i>
                        ${task.coins}
                    </div>
                    <div class="task-due">Создано: ${UI.formatDate(task.created_at)}</div>
                </div>
                <div class="task-assignments">
                    ${task.assignments.map(assignment => `
                        <div class="assignment-item">
                            <span>${assignment.child_name}</span>
                            <span class="task-status ${assignment.status}">${assignment.status}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    static renderApprovalCard(assignment) {
        return `
            <div class="task-card">
                <div class="task-header">
                    <div class="task-title">${assignment.task_title}</div>
                    <div class="task-status waiting_approval">На проверке</div>
                </div>
                <div class="task-meta">
                    <div>Ребенок: ${assignment.child_name}</div>
                    <div>Выполнено: ${UI.formatDate(assignment.completed_at)}</div>
                </div>
                ${assignment.proof_text ? `
                    <div class="task-proof">
                        <strong>Подтверждение:</strong> ${assignment.proof_text}
                    </div>
                ` : ''}
                <div class="task-actions">
                    <button class="btn btn-primary" onclick="Tasks.approveTask('${assignment.assignment_id}', true)">
                        <i class="fas fa-check"></i>
                        Одобрить
                    </button>
                    <button class="btn btn-secondary" onclick="Tasks.approveTask('${assignment.assignment_id}', false)">
                        <i class="fas fa-times"></i>
                        Отклонить
                    </button>
                </div>
            </div>
        `;
    }

    static renderHistoryCard(assignment) {
        const statusText = {
            'assigned': 'В работе',
            'completed': 'На проверке',
            'approved': 'Одобрено',
            'rejected': 'Отклонено'
        };

        const statusIcon = {
            'assigned': 'fas fa-play-circle',
            'completed': 'fas fa-clock',
            'approved': 'fas fa-check-circle',
            'rejected': 'fas fa-times-circle'
        };

        return `
            <div class="task-card history-card">
                <div class="task-header">
                    <div class="task-title">${assignment.task_title}</div>
                    <div class="task-status ${assignment.status}">
                        <i class="${statusIcon[assignment.status]}"></i>
                        ${statusText[assignment.status] || assignment.status}
                    </div>
                </div>
                ${assignment.task_description ? `
                    <div class="task-details">${assignment.task_description}</div>
                ` : ''}
                <div class="task-meta">
                    <div class="task-coins">
                        <i class="fas fa-coins"></i>
                        ${assignment.reward_coins}
                        ${assignment.coins_earned > 0 ? ` (заработано: ${assignment.coins_earned})` : ''}
                    </div>
                    <div>Ребенок: <strong>${assignment.child_name}</strong></div>
                </div>
                <div class="task-timeline">
                    <div class="timeline-item">
                        <span class="timeline-label">Создано:</span>
                        <span class="timeline-date">${UI.formatDateTime(assignment.created_at)}</span>
                    </div>
                    ${assignment.completed_at ? `
                        <div class="timeline-item">
                            <span class="timeline-label">Выполнено:</span>
                            <span class="timeline-date">${UI.formatDateTime(assignment.completed_at)}</span>
                        </div>
                    ` : ''}
                    ${assignment.approved_at ? `
                        <div class="timeline-item">
                            <span class="timeline-label">${assignment.status === 'approved' ? 'Одобрено' : 'Отклонено'}:</span>
                            <span class="timeline-date">${UI.formatDateTime(assignment.approved_at)}</span>
                        </div>
                    ` : ''}
                </div>
                ${assignment.proof_text ? `
                    <div class="task-proof">
                        <strong>Подтверждение ребенка:</strong> ${assignment.proof_text}
                    </div>
                ` : ''}
            </div>
        `;
    }

    static async completeTask(assignmentId) {
        const proofText = prompt('Опишите, как вы выполнили задание:');
        if (!proofText) return;

        try {
            await ApiClient.put(`/tasks/assignments/${assignmentId}/complete`, {
                proof_text: proofText
            });
            UI.showToast('Задание отправлено на проверку!', 'success');
            this.loadMyTasks();
        } catch (error) {
            UI.showToast(`Ошибка: ${error.message}`, 'error');
        }
    }

    static async approveTask(assignmentId, approved) {
        const feedback = approved ? 
            prompt('Комментарий (необязательно):') : 
            prompt('Причина отклонения:', '');

        try {
            await ApiClient.put(`/tasks/assignments/${assignmentId}/approve`, {
                approved,
                feedback: feedback || ''
            });
            UI.showToast(approved ? 'Задание одобрено!' : 'Задание отклонено', 'success');
            this.loadMyTasks();
            Auth.loadDashboard(); // Обновляем баланс и статистику
        } catch (error) {
            UI.showToast(`Ошибка: ${error.message}`, 'error');
        }
    }

    static async createTask() {
        const form = document.getElementById('create-task-form');
        const formData = new FormData(form);
        
        const selectedChildren = Array.from(document.querySelectorAll('#task-children input:checked'))
            .map(cb => cb.value);

        if (selectedChildren.length === 0) {
            UI.showToast('Выберите хотя бы одного ребенка', 'error');
            return;
        }

        try {
            const taskData = {
                template_id: formData.get('template_id'),
                assigned_to: selectedChildren,
                due_date: formData.get('due_date') || null,
                reward_coins: parseInt(formData.get('coins'))
            };

            await ApiClient.post('/tasks', taskData);
            UI.showToast('Задание создано!', 'success');
            closeModal();
            this.loadMyTasks();
            Auth.loadDashboard(); // Обновляем статистику
        } catch (error) {
            UI.showToast(`Ошибка создания задания: ${error.message}`, 'error');
        }
    }
}

// Управление профилем ребенка
class ChildProfile {
    static currentChildId = null;
    static currentChildData = null;

    static async show(childId) {
        try {
            this.currentChildId = childId;
            
            // Загружаем данные ребенка
            await this.loadChildData();
            
            // Показываем модальное окно
            showModal('child-profile-modal');
            
        } catch (error) {
            console.error('Error showing child profile:', error);
            UI.showToast(`Ошибка загрузки профиля: ${error.message}`, 'error');
        }
    }

    static async loadChildData() {
        try {
            // Загружаем информацию о ребенке
            const familyInfo = await ApiClient.get('/auth/family/members');
            this.currentChildData = familyInfo.members.find(m => m.id === this.currentChildId);
            
            if (!this.currentChildData) {
                throw new Error('Ребенок не найден');
            }

            // Обновляем заголовок и базовую информацию
            document.getElementById('child-profile-name').textContent = this.currentChildData.name;
            document.getElementById('child-name-display').textContent = this.currentChildData.name;
            document.getElementById('child-username-display').textContent = `@${this.currentChildData.username}`;
            document.getElementById('child-avatar-letter').textContent = this.currentChildData.name.charAt(0).toUpperCase();

            // Загружаем данные для всех вкладок
            await this.loadChildStatistics();
            await this.loadChildTasks();
            await this.loadChildCoins();
            await this.loadChildGoals();

        } catch (error) {
            console.error('Error loading child data:', error);
            throw error;
        }
    }

    static async loadChildStatistics() {
        try {
            // Загружаем статистику заданий ребенка
            const params = new URLSearchParams({
                child_filter: this.currentChildId,
                period_filter: 'all'
            });
            
            const response = await ApiClient.get(`/tasks/history?${params}`);
            const tasks = response.history || [];

            // Подсчитываем статистику
            const stats = {
                assigned: tasks.filter(t => t.status === 'assigned').length,
                completed: tasks.filter(t => t.status === 'completed').length,
                approved: tasks.filter(t => t.status === 'approved').length,
                rejected: tasks.filter(t => t.status === 'rejected').length,
                total: tasks.length,
                totalCoinsEarned: tasks.reduce((sum, t) => sum + (t.coins_earned || 0), 0)
            };

            // Обновляем UI
            document.getElementById('child-total-tasks').textContent = stats.total;
            document.getElementById('child-completed-tasks').textContent = stats.approved;
            document.getElementById('child-assigned-count').textContent = stats.assigned;
            document.getElementById('child-completed-count').textContent = stats.completed;
            document.getElementById('child-approved-count').textContent = stats.approved;
            document.getElementById('child-rejected-count').textContent = stats.rejected;

        } catch (error) {
            console.error('Error loading child statistics:', error);
        }
    }

    static async loadChildTasks() {
        try {
            // Получаем значения фильтров
            const periodFilter = document.getElementById('child-period-filter')?.value || 'month';
            const statusFilter = document.getElementById('child-status-filter')?.value || 'all';
            
            // Формируем параметры запроса
            const params = new URLSearchParams({
                child_filter: this.currentChildId,
                period_filter: periodFilter
            });
            
            if (statusFilter !== 'all') {
                params.append('status_filter', statusFilter);
            }
            
            const response = await ApiClient.get(`/tasks/history?${params}`);
            const tasks = response.history || [];
            
            // Отображаем задания
            const container = document.getElementById('child-tasks-list');
            if (tasks.length === 0) {
                container.innerHTML = '<div class="no-tasks">Нет заданий для отображения</div>';
                return;
            }
            
            container.innerHTML = tasks.map(task => this.renderChildTaskCard(task)).join('');
            
        } catch (error) {
            console.error('Error loading child tasks:', error);
        }
    }

    static async loadChildCoins() {
        try {
            // Загружаем данные о монетах ребенка
            const params = new URLSearchParams({
                user_id: this.currentChildId
            });
            
            // Пока используем базовый API, позже можно создать специальный endpoint
            const balance = await ApiClient.get(`/coins/balance?${params}`);
            
            // Обновляем отображение
            document.getElementById('child-coin-balance').textContent = balance.balance || 0;
            document.getElementById('child-current-balance').textContent = balance.balance || 0;
            document.getElementById('child-total-earned').textContent = balance.total_earned || 0;
            document.getElementById('child-total-spent').textContent = balance.total_spent || 0;
            
            // Загружаем транзакции
            const transactions = await ApiClient.get(`/coins/transactions?${params}`);
            this.renderChildTransactions(transactions.transactions || []);
            
        } catch (error) {
            console.error('Error loading child coins:', error);
            // Устанавливаем значения по умолчанию
            document.getElementById('child-coin-balance').textContent = '0';
            document.getElementById('child-current-balance').textContent = '0';
            document.getElementById('child-total-earned').textContent = '0';
            document.getElementById('child-total-spent').textContent = '0';
        }
    }

    static async loadChildGoals() {
        try {
            const params = new URLSearchParams({
                child_filter: this.currentChildId
            });
            
            const response = await ApiClient.get(`/goals?${params}`);
            const goals = response.goals || [];
            
            const goalsContainer = document.getElementById('child-goals-list');
            
            if (goals.length === 0) {
                goalsContainer.innerHTML = `
                    <div class="no-data">
                        <i class="fas fa-bullseye" style="font-size: 3rem; color: #d1d5db; margin-bottom: 1rem;"></i>
                        <p>У ребенка пока нет целей</p>
                    </div>
                `;
                return;
            }
            
            goalsContainer.innerHTML = goals.map(goal => this.renderChildGoalCard(goal)).join('');
            
        } catch (error) {
            console.error('Error loading child goals:', error);
            const goalsContainer = document.getElementById('child-goals-list');
            goalsContainer.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                    <p>Ошибка загрузки целей</p>
                </div>
            `;
        }
    }

    static renderChildGoalCard(goal) {
        const progressPercent = Goals.calculateProgressPercent ? Goals.calculateProgressPercent(goal) : 0;
        const statusClass = goal.status.toLowerCase();
        const statusText = Goals.getStatusText ? Goals.getStatusText(goal.status) : goal.status;
        
        return `
            <div class="goal-card child-goal-card ${statusClass}">
                <div class="goal-header">
                    <div class="goal-title">${goal.title}</div>
                    <div class="goal-status ${statusClass}">${statusText}</div>
                </div>
                
                <div class="goal-type">
                    <i class="fas ${Goals.getGoalTypeIcon ? Goals.getGoalTypeIcon(goal.goal_type) : 'fa-bullseye'}"></i>
                    ${Goals.getGoalTypeText ? Goals.getGoalTypeText(goal.goal_type) : goal.goal_type}
                </div>
                
                ${goal.description ? `<div class="goal-description">${goal.description}</div>` : ''}
                
                <div class="goal-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="progress-text">${Math.round(progressPercent)}% выполнено</div>
                </div>
                
                <div class="goal-meta">
                    ${goal.deadline ? `
                        <div class="goal-deadline">
                            <i class="fas fa-calendar"></i>
                            До: ${UI.formatDate(goal.deadline)}
                        </div>
                    ` : ''}
                    ${goal.reward_coins > 0 ? `
                        <div class="goal-reward">
                            <i class="fas fa-coins"></i>
                            +${goal.reward_coins} за достижение
                        </div>
                    ` : ''}
                    <div class="goal-created">
                        <i class="fas fa-clock"></i>
                        Создана: ${UI.formatDate(goal.created_at)}
                    </div>
                </div>
            </div>
        `;
    }

    static renderChildTaskCard(task) {
        const statusText = {
            'assigned': 'В работе',
            'completed': 'На проверке',
            'approved': 'Выполнено',
            'rejected': 'Отклонено'
        };

        const statusIcon = {
            'assigned': 'fas fa-play-circle',
            'completed': 'fas fa-clock',
            'approved': 'fas fa-check-circle',
            'rejected': 'fas fa-times-circle'
        };

        return `
            <div class="task-card child-task-card">
                <div class="task-header">
                    <div class="task-title">${task.task_title}</div>
                    <div class="task-status ${task.status}">
                        <i class="${statusIcon[task.status]}"></i>
                        ${statusText[task.status]}
                    </div>
                </div>
                ${task.task_description ? `
                    <div class="task-details">${task.task_description}</div>
                ` : ''}
                <div class="task-meta">
                    <div class="task-coins">
                        <i class="fas fa-coins"></i>
                        ${task.reward_coins}
                        ${task.coins_earned > 0 ? ` (заработано: ${task.coins_earned})` : ''}
                    </div>
                    <div>Создано: ${UI.formatDate(task.created_at)}</div>
                </div>
                ${task.completed_at ? `
                    <div class="task-timeline">
                        <div class="timeline-item">
                            <span class="timeline-label">Выполнено:</span>
                            <span class="timeline-date">${UI.formatDateTime(task.completed_at)}</span>
                        </div>
                        ${task.approved_at ? `
                            <div class="timeline-item">
                                <span class="timeline-label">${task.status === 'approved' ? 'Одобрено' : 'Отклонено'}:</span>
                                <span class="timeline-date">${UI.formatDateTime(task.approved_at)}</span>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                ${task.proof_text ? `
                    <div class="task-proof">
                        <strong>Подтверждение:</strong> ${task.proof_text}
                    </div>
                ` : ''}
            </div>
        `;
    }

    static renderChildTransactions(transactions) {
        const container = document.getElementById('child-transactions-list');
        
        if (!transactions || transactions.length === 0) {
            container.innerHTML = '<div class="no-data">Нет транзакций</div>';
            return;
        }
        
        container.innerHTML = transactions.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-type">${this.getTransactionTypeText(transaction.type)}</div>
                    <div class="transaction-reason">${transaction.reason}</div>
                </div>
                <div class="transaction-amount ${transaction.amount > 0 ? 'positive' : 'negative'}">
                    ${transaction.amount > 0 ? '+' : ''}${transaction.amount}
                </div>
                <div class="transaction-date">${UI.formatDateTime(transaction.created_at)}</div>
            </div>
        `).join('');
    }

    static getTransactionTypeText(type) {
        const types = {
            'earned': 'Заработано',
            'spent': 'Потрачено',
            'bonus': 'Бонус',
            'penalty': 'Штраф'
        };
        return types[type] || type;
    }

    static switchTab(tab) {
        // Переключаем активную вкладку
        document.querySelectorAll('.profile-tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            }
        });

        // Переключаем содержимое
        document.querySelectorAll('.profile-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`profile-${tab}-tab`).classList.add('active');

        // Перезагружаем данные при необходимости
        if (tab === 'tasks') {
            this.loadChildTasks();
        } else if (tab === 'coins') {
            this.loadChildCoins();
        } else if (tab === 'goals') {
            this.loadChildGoals();
        }
    }

    static async applyFilters() {
        await this.loadChildTasks();
        await this.loadChildStatistics();
    }
}

// Управление магазином
class Store {
    static async loadItems() {
        try {
            const response = await ApiClient.get('/store/items');
            const container = document.getElementById('store-container');
            container.innerHTML = response.items.map(item => this.renderStoreItem(item)).join('');
        } catch (error) {
            console.error('Error loading store items:', error);
            const container = document.getElementById('store-container');
            container.innerHTML = '<div class="empty-state">Ошибка загрузки товаров. Попробуйте обновить страницу.</div>';
        }
    }

    static renderStoreItem(item) {
        const canBuy = currentUser.role === 'child';
        const canCreateGoal = currentUser.role === 'child' || currentUser.role === 'parent';
        
        return `
            <div class="store-item">
                <div class="item-header">
                    <div class="item-name">${item.name}</div>
                    <div class="item-price">
                        <i class="fas fa-coins"></i>
                        ${item.price_coins || item.price}
                    </div>
                </div>
                <div class="item-description">${item.description}</div>
                <div class="item-category">${item.category}</div>
                <div class="item-actions">
                    ${canBuy ? `
                        <button class="btn btn-primary" onclick="Store.purchaseItem('${item.id}', ${item.price_coins || item.price})">
                            <i class="fas fa-shopping-cart"></i>
                            Купить
                        </button>
                    ` : ''}
                    ${canCreateGoal ? `
                        <button class="btn btn-secondary" onclick="Store.createGoalForItem('${item.id}')">
                            <i class="fas fa-bullseye"></i>
                            Цель
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    static async purchaseItem(itemId, price) {
        if (!confirm(`Купить этот товар за ${price} монет?`)) return;

        try {
            const response = await ApiClient.post('/store/purchase', {
                item_id: itemId
            });
            UI.showToast(`Товар куплен! Новый баланс: ${response.new_balance}`, 'success');
            Auth.loadDashboard(); // Обновляем баланс
        } catch (error) {
            UI.showToast(`Ошибка покупки: ${error.message}`, 'error');
        }
    }

    static async createItem() {
        const form = document.getElementById('create-item-form');
        const formData = new FormData(form);

        try {
            const itemData = {
                name: formData.get('title'),
                description: formData.get('description'),
                price_coins: parseInt(formData.get('cost')),
                category: formData.get('category')
            };

            await ApiClient.post('/store/items', itemData);
            UI.showToast('Товар добавлен!', 'success');
            closeModal();
            this.loadItems();
        } catch (error) {
            console.error('Error creating store item:', error);
            let errorMessage = 'Неизвестная ошибка';
            
            if (error.message) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error.detail) {
                errorMessage = error.detail;
            }
            
            UI.showToast(`Ошибка создания товара: ${errorMessage}`, 'error');
        }
    }

    static async createGoalForItem(itemId) {
        try {
            const goalData = {
                deadline: null,
                reward_coins: 50
            };

            // Для родителей нужно выбрать ребенка
            if (currentUser.role === 'parent') {
                const familyInfo = await ApiClient.get('/auth/family/members');
                const children = familyInfo.members.filter(m => m.role === 'child');
                
                if (children.length === 0) {
                    UI.showToast('В семье нет детей для создания цели', 'error');
                    return;
                }
                
                if (children.length === 1) {
                    goalData.child_id = children[0].id;
                } else {
                    // Простой выбор через prompt для демонстрации
                    const childNames = children.map((child, index) => `${index + 1}. ${child.name}`).join('\n');
                    const choice = prompt(`Выберите ребенка (введите номер):\n${childNames}`);
                    const childIndex = parseInt(choice) - 1;
                    
                    if (childIndex >= 0 && childIndex < children.length) {
                        goalData.child_id = children[childIndex].id;
                    } else {
                        UI.showToast('Неверный выбор ребенка', 'error');
                        return;
                    }
                }
            }

            const response = await ApiClient.post(`/store/items/${itemId}/create-goal`, goalData);
            UI.showToast('Цель для товара создана!', 'success');
        } catch (error) {
            UI.showToast(`Ошибка создания цели: ${error.message}`, 'error');
        }
    }
}

// Управление монетами
class Coins {
    static async loadBalance() {
        try {
            const balance = await ApiClient.get('/coins/balance');
            document.getElementById('current-balance').textContent = balance.balance;
            document.getElementById('total-earned').textContent = balance.total_earned;
            document.getElementById('total-spent').textContent = balance.total_spent;
        } catch (error) {
            console.error('Error loading balance:', error);
        }
    }

    static async loadTransactions() {
        try {
            const typeFilter = document.getElementById('transaction-type-filter').value;
            const params = new URLSearchParams();
            if (typeFilter) params.append('transaction_type', typeFilter);

            const response = await ApiClient.get(`/coins/transactions?${params}`);
            const container = document.getElementById('transactions-list');
            
            container.innerHTML = response.transactions.map(transaction => `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <div class="transaction-type">${this.getTransactionTypeText(transaction.type)}</div>
                        <div class="transaction-reason">${transaction.reason}</div>
                    </div>
                    <div class="transaction-amount ${transaction.amount > 0 ? 'positive' : 'negative'}">
                        ${transaction.amount > 0 ? '+' : ''}${transaction.amount}
                    </div>
                    <div class="transaction-date">${UI.formatDateTime(transaction.created_at)}</div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }

    static getTransactionTypeText(type) {
        const types = {
            'earned': 'Заработано',
            'spent': 'Потрачено',
            'bonus': 'Бонус',
            'penalty': 'Штраф'
        };
        return types[type] || type;
    }

    static async adjustCoins() {
        const form = document.getElementById('adjust-coins-form');
        const formData = new FormData(form);

        try {
            const adjustmentData = {
                child_id: formData.get('child_id'),
                amount: parseInt(formData.get('amount')),
                reason: formData.get('reason')
            };

            const response = await ApiClient.post('/coins/adjust', adjustmentData);
            UI.showToast(`Монеты откорректированы! Новый баланс: ${response.new_balance}`, 'success');
            closeModal();
            this.loadBalance();
            this.loadTransactions();
        } catch (error) {
            UI.showToast(`Ошибка корректировки: ${error.message}`, 'error');
        }
    }
}

// Управление целями
class Goals {
    static currentTab = 'family-goals';
    static storeItems = [];
    static taskTemplates = [];
    static familyTasks = [];

    static async loadMyGoals() {
        try {
            if (currentUser.role === 'child') {
                await this.loadChildGoals();
            } else {
                await this.loadFamilyGoals();
            }
        } catch (error) {
            console.error('Error loading goals:', error);
            UI.showToast('Ошибка загрузки целей', 'error');
        }
    }

    static async loadChildGoals() {
        try {
            const response = await ApiClient.get('/goals');
            const container = document.getElementById('child-goals');
            
            if (!response.goals || response.goals.length === 0) {
                container.innerHTML = this.renderNoGoals();
                return;
            }

            container.innerHTML = response.goals.map(goal => this.renderGoalCard(goal)).join('');
        } catch (error) {
            console.error('Error loading child goals:', error);
        }
    }

    static async loadFamilyGoals() {
        try {
            const response = await ApiClient.get('/goals');
            const container = document.getElementById('parent-goals');
            
            if (!response.goals || response.goals.length === 0) {
                container.innerHTML = this.renderNoGoals();
                return;
            }

            // Группируем цели по детям
            const goalsByChild = {};
            response.goals.forEach(goal => {
                if (!goalsByChild[goal.child_name]) {
                    goalsByChild[goal.child_name] = [];
                }
                goalsByChild[goal.child_name].push(goal);
            });

            container.innerHTML = Object.entries(goalsByChild)
                .map(([childName, goals]) => this.renderChildGoalsSection(childName, goals))
                .join('');
        } catch (error) {
            console.error('Error loading family goals:', error);
        }
    }

    static renderNoGoals() {
        return `
            <div class="no-goals">
                <div class="no-goals-icon">
                    <i class="fas fa-bullseye"></i>
                </div>
                <h3>Пока нет целей</h3>
                <p>Создайте свою первую цель, чтобы начать достигать результатов!</p>
            </div>
        `;
    }

    static renderChildGoalsSection(childName, goals) {
        return `
            <div class="child-goals-section">
                <h3 class="child-section-title">
                    <i class="fas fa-child"></i>
                    Цели ребенка: ${childName}
                </h3>
                <div class="goals-grid">
                    ${goals.map(goal => this.renderGoalCard(goal)).join('')}
                </div>
            </div>
        `;
    }

    static renderGoalCard(goal) {
        const progressPercent = this.calculateProgressPercent(goal);
        const statusClass = goal.status.toLowerCase();
        const statusText = this.getStatusText(goal.status);
        
        return `
            <div class="goal-card ${statusClass}" onclick="Goals.showGoalDetails('${goal.id}')">
                <div class="goal-header">
                    <div class="goal-title">${goal.title}</div>
                    <div class="goal-status ${statusClass}">${statusText}</div>
                </div>
                
                <div class="goal-type">
                    <i class="fas ${this.getGoalTypeIcon(goal.goal_type)}"></i>
                    ${this.getGoalTypeText(goal.goal_type)}
                </div>
                
                ${goal.description ? `<div class="goal-description">${goal.description}</div>` : ''}
                
                <div class="goal-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="progress-text">${Math.round(progressPercent)}% выполнено</div>
                </div>
                
                <div class="goal-meta">
                    ${goal.deadline ? `
                        <div class="goal-deadline">
                            <i class="fas fa-calendar"></i>
                            До: ${UI.formatDate(goal.deadline)}
                        </div>
                    ` : ''}
                    ${goal.reward_coins > 0 ? `
                        <div class="goal-reward">
                            <i class="fas fa-coins"></i>
                            +${goal.reward_coins} за достижение
                        </div>
                    ` : ''}
                </div>
                
                ${currentUser.role === 'parent' ? `
                    <div class="goal-actions">
                        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); Goals.pauseGoal('${goal.id}')" ${goal.status === 'paused' ? 'style="display:none"' : ''}>
                            <i class="fas fa-pause"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); Goals.resumeGoal('${goal.id}')" ${goal.status !== 'paused' ? 'style="display:none"' : ''}>
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); Goals.deleteGoal('${goal.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    static calculateProgressPercent(goal) {
        if (!goal.progress_summary) return 0;
        
        const { total_progress, total_conditions } = goal.progress_summary;
        return total_conditions > 0 ? (total_progress / total_conditions) * 100 : 0;
    }

    static getStatusText(status) {
        const statusTexts = {
            'active': 'Активная',
            'completed': 'Завершена',
            'paused': 'Приостановлена',
            'cancelled': 'Отменена'
        };
        return statusTexts[status] || status;
    }

    static getGoalTypeIcon(type) {
        const icons = {
            'coin_saving': 'fa-coins',
            'store_item': 'fa-shopping-cart',
            'habit_building': 'fa-repeat',
            'mixed': 'fa-layer-group'
        };
        return icons[type] || 'fa-bullseye';
    }

    static getGoalTypeText(type) {
        const texts = {
            'coin_saving': 'Накопление монет',
            'store_item': 'Товар из магазина',
            'habit_building': 'Выработка привычки',
            'mixed': 'Смешанная цель'
        };
        return texts[type] || type;
    }

    static switchTab(tab) {
        this.currentTab = tab;
        
        // Переключаем активную вкладку
        document.querySelectorAll('.goals-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            }
        });
        
        // Перезагружаем данные
        this.loadMyGoals();
    }

    static async onGoalTypeChange() {
        const goalType = document.getElementById('goal-type').value;
        const conditionsContainer = document.getElementById('goal-conditions');
        
        if (!goalType) {
            conditionsContainer.innerHTML = '';
            return;
        }

        // Загружаем необходимые данные
        await this.loadRequiredData(goalType);
        
        // Генерируем интерфейс условий
        conditionsContainer.innerHTML = this.generateConditionsForm(goalType);
    }

    static async loadRequiredData(goalType) {
        try {
            if (goalType === 'store_item' && this.storeItems.length === 0) {
                const response = await ApiClient.get('/store/items');
                this.storeItems = response.items || [];
            }
            
            if (goalType === 'habit_building') {
                // Для привычек нужны активные задания семьи, а не шаблоны
                if (currentUser.role === 'parent') {
                    const response = await ApiClient.get('/tasks/my');
                    this.familyTasks = response.created_tasks || [];
                } else {
                    const response = await ApiClient.get('/tasks/my');
                    this.familyTasks = response.assignments.map(a => ({
                        id: a.task.id,
                        title: a.task.title,
                        description: a.task.description
                    })) || [];
                }
            }
        } catch (error) {
            console.error('Error loading required data:', error);
        }
    }

    static generateConditionsForm(goalType) {
        switch (goalType) {
            case 'coin_saving':
                return `
                    <div class="condition-group">
                        <h4>Условие: Накопить монеты</h4>
                        <div class="form-group">
                            <label for="coin-target">Сколько монет нужно накопить?</label>
                            <input type="number" id="coin-target" name="coin_target" min="1" required>
                        </div>
                    </div>
                `;
                
            case 'store_item':
                const storeOptions = this.storeItems.map(item => 
                    `<option value="${item.id}">${item.name} (${item.price_coins} монет)</option>`
                ).join('');
                
                return `
                    <div class="condition-group">
                        <h4>Условие: Накопить на товар</h4>
                        <div class="form-group">
                            <label for="store-item">Выберите товар</label>
                            <select id="store-item" name="store_item_id" required>
                                <option value="">Выберите товар</option>
                                ${storeOptions}
                            </select>
                        </div>
                    </div>
                `;
                
            case 'habit_building':
                const taskOptions = (this.familyTasks || []).map(task => 
                    `<option value="${task.id}">${task.title}</option>`
                ).join('');
                
                if (!taskOptions) {
                    return `
                        <div class="condition-group">
                            <h4>Условие: Выработать привычку</h4>
                            <div class="no-tasks-notice">
                                <p style="color: #f59e0b; font-size: 0.875rem;">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    Нет доступных заданий для создания цели-привычки. 
                                    Сначала создайте задания в разделе "Задания".
                                </p>
                            </div>
                        </div>
                    `;
                }
                
                return `
                    <div class="condition-group">
                        <h4>Условие: Выработать привычку</h4>
                        <div class="form-group">
                            <label for="habit-task">Связанное задание</label>
                            <select id="habit-task" name="habit_task_id" required>
                                <option value="">Выберите задание</option>
                                ${taskOptions}
                            </select>
                            <small style="color: #6b7280;">Выберите активное задание, которое нужно выполнять регулярно</small>
                        </div>
                        <div class="form-group">
                            <label for="habit-days">Количество дней подряд</label>
                            <input type="number" id="habit-days" name="habit_days" min="1" max="365" value="7" required>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="streak-required" name="streak_required" checked>
                                Требуется выполнение подряд (без пропусков)
                            </label>
                        </div>
                    </div>
                `;
                
            case 'mixed':
                return `
                    <div class="condition-group">
                        <h4>Смешанная цель</h4>
                        <p>Для создания смешанной цели используйте API напрямую или создайте несколько простых целей.</p>
                    </div>
                `;
                
            default:
                return '';
        }
    }

    static async createGoal() {
        const form = document.getElementById('create-goal-form');
        const formData = new FormData(form);
        
        try {
            const goalData = this.buildGoalData(formData);
            
            await ApiClient.post('/goals', goalData);
            UI.showToast('Цель успешно создана!', 'success');
            closeModal();
            this.loadMyGoals();
            
        } catch (error) {
            console.error('Error creating goal:', error);
            UI.showToast(`Ошибка создания цели: ${error.message}`, 'error');
        }
    }

    static buildGoalData(formData) {
        const goalType = formData.get('goal_type');
        
        const goalData = {
            title: formData.get('title'),
            description: formData.get('description') || '',
            goal_type: goalType,
            deadline: formData.get('deadline') || null,
            reward_coins: parseInt(formData.get('reward_coins')) || 0,
            conditions: []
        };

        // Добавляем child_id для родителей
        if (currentUser.role === 'parent') {
            const childId = formData.get('child_id');
            if (childId) {
                goalData.child_id = childId;
            }
        }

        // Добавляем условия в зависимости от типа цели
        switch (goalType) {
            case 'coin_saving':
                const coinTarget = formData.get('coin_target');
                if (coinTarget) {
                    goalData.conditions.push({
                        condition_type: 'coin_amount',
                        target_value: parseInt(coinTarget),
                        description: `Накопить ${coinTarget} монет`,
                        weight: 1.0
                    });
                }
                break;
                
            case 'store_item':
                const storeItemId = formData.get('store_item_id');
                if (storeItemId) {
                    goalData.target_store_item_id = storeItemId;
                    // Условие будет создано автоматически на backend
                }
                break;
                
            case 'habit_building':
                const habitTaskId = formData.get('habit_task_id');
                const habitDays = formData.get('habit_days');
                const streakRequired = formData.get('streak_required') === 'on';
                
                if (habitTaskId && habitDays) {
                    goalData.conditions.push({
                        condition_type: 'habit_streak',
                        target_value: parseInt(habitDays),
                        target_reference_id: habitTaskId,
                        description: `Выполнять задание ${habitDays} дней подряд`,
                        weight: 1.0,
                        is_streak_required: streakRequired
                    });
                }
                break;
        }

        return goalData;
    }

    static async showGoalDetails(goalId) {
        try {
            const response = await ApiClient.get(`/goals/${goalId}`);
            const goal = response.goal;
            
            const content = document.getElementById('goal-details-content');
            content.innerHTML = this.renderGoalDetails(goal);
            
            const actionButtons = document.getElementById('goal-action-buttons');
            actionButtons.innerHTML = this.renderGoalActionButtons(goal);
            
            showModal('goal-details-modal');
            
        } catch (error) {
            console.error('Error loading goal details:', error);
            UI.showToast('Ошибка загрузки деталей цели', 'error');
        }
    }

    static renderGoalDetails(goal) {
        const progressPercent = this.calculateProgressPercent(goal);
        
        return `
            <div class="goal-details">
                <div class="goal-overview">
                    <h3>${goal.title}</h3>
                    <div class="goal-status ${goal.status.toLowerCase()}">${this.getStatusText(goal.status)}</div>
                </div>
                
                ${goal.description ? `<p class="goal-description">${goal.description}</p>` : ''}
                
                <div class="goal-info-grid">
                    <div class="info-item">
                        <label>Тип цели:</label>
                        <span>${this.getGoalTypeText(goal.goal_type)}</span>
                    </div>
                    <div class="info-item">
                        <label>Создана:</label>
                        <span>${UI.formatDate(goal.created_at)}</span>
                    </div>
                    ${goal.deadline ? `
                        <div class="info-item">
                            <label>Срок выполнения:</label>
                            <span>${UI.formatDate(goal.deadline)}</span>
                        </div>
                    ` : ''}
                    ${goal.reward_coins > 0 ? `
                        <div class="info-item">
                            <label>Бонус за достижение:</label>
                            <span>${goal.reward_coins} монет</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="goal-progress-detailed">
                    <h4>Прогресс выполнения</h4>
                    <div class="progress-bar large">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="progress-text">${Math.round(progressPercent)}% выполнено</div>
                </div>
                
                ${goal.conditions ? this.renderGoalConditions(goal.conditions) : ''}
            </div>
        `;
    }

    static renderGoalConditions(conditions) {
        if (!conditions || conditions.length === 0) return '';
        
        return `
            <div class="goal-conditions-details">
                <h4>Условия цели</h4>
                ${conditions.map(condition => `
                    <div class="condition-item">
                        <div class="condition-description">${condition.description}</div>
                        <div class="condition-progress">
                            <span>${condition.current_progress || 0} / ${condition.target_value}</span>
                            <div class="condition-progress-bar">
                                <div class="progress-fill" style="width: ${Math.min((condition.current_progress || 0) / condition.target_value * 100, 100)}%"></div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    static renderGoalActionButtons(goal) {
        if (currentUser.role !== 'parent' && goal.child_id !== currentUser.id) return '';
        
        const buttons = [];
        
        if (goal.status === 'active') {
            buttons.push(`
                <button class="btn btn-warning" onclick="Goals.pauseGoal('${goal.id}')">
                    <i class="fas fa-pause"></i>
                    Приостановить
                </button>
            `);
        }
        
        if (goal.status === 'paused') {
            buttons.push(`
                <button class="btn btn-success" onclick="Goals.resumeGoal('${goal.id}')">
                    <i class="fas fa-play"></i>
                    Возобновить
                </button>
            `);
        }
        
        if (currentUser.role === 'parent' || goal.status === 'paused') {
            buttons.push(`
                <button class="btn btn-danger" onclick="Goals.deleteGoal('${goal.id}')">
                    <i class="fas fa-trash"></i>
                    Удалить
                </button>
            `);
        }
        
        return buttons.join('');
    }

    static async pauseGoal(goalId) {
        try {
            await ApiClient.post(`/goals/${goalId}/pause`);
            UI.showToast('Цель приостановлена', 'success');
            closeModal();
            this.loadMyGoals();
        } catch (error) {
            UI.showToast(`Ошибка: ${error.message}`, 'error');
        }
    }

    static async resumeGoal(goalId) {
        try {
            await ApiClient.post(`/goals/${goalId}/resume`);
            UI.showToast('Цель возобновлена', 'success');
            closeModal();
            this.loadMyGoals();
        } catch (error) {
            UI.showToast(`Ошибка: ${error.message}`, 'error');
        }
    }

    static async deleteGoal(goalId) {
        if (!confirm('Вы уверены, что хотите удалить эту цель?')) return;
        
        try {
            await ApiClient.delete(`/goals/${goalId}`);
            UI.showToast('Цель удалена', 'success');
            closeModal();
            this.loadMyGoals();
        } catch (error) {
            UI.showToast(`Ошибка: ${error.message}`, 'error');
        }
    }
}

// Управление статистикой
class Stats {
    static async loadStats() {
        if (currentUser.role !== 'parent') return;

        try {
            const period = document.getElementById('stats-period').value;
            const response = await ApiClient.get(`/stats/family?period=${period}`);
            
            const container = document.getElementById('stats-container');
            container.innerHTML = `
                <div class="stats-card">
                    <h3>Общая статистика семьи</h3>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span>Всего заданий выполнено:</span>
                            <span>${response.total_completed_tasks || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span>Всего монет заработано:</span>
                            <span>${response.total_coins_earned || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span>Активных заданий:</span>
                            <span>${response.active_tasks || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
}

// Модальные окна
function showModal(modalId) {
    console.log('showModal called with:', modalId);
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById(modalId);
    
    if (!overlay) {
        console.error('modal-overlay not found');
        return;
    }
    
    if (!modal) {
        console.error('modal not found:', modalId);
        return;
    }
    
    overlay.classList.add('active');
    modal.classList.add('active');
    console.log('Modal shown successfully');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

function showCreateTaskModal() {
    Tasks.loadTemplates();
    loadChildrenForTask();
    showModal('create-task-modal');
}

function showCreateItemModal() {
    showModal('create-item-modal');
}

function showAdjustCoinsModal() {
    loadChildrenForAdjustment();
    showModal('adjust-coins-modal');
}



async function loadChildrenForTask() {
    try {
        const familyInfo = await ApiClient.get('/auth/family/members');
        const children = familyInfo.members.filter(m => m.role === 'child');
        
        const container = document.getElementById('task-children');
        container.innerHTML = children.map(child => `
            <div class="checkbox-item">
                <input type="checkbox" id="child-${child.id}" value="${child.id}">
                <label for="child-${child.id}">${child.name}</label>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading children:', error);
    }
}

async function loadChildrenForAdjustment() {
    try {
        const familyInfo = await ApiClient.get('/auth/family/members');
        const children = familyInfo.members.filter(m => m.role === 'child');
        
        const select = document.getElementById('adjust-child');
        select.innerHTML = children.map(child => 
            `<option value="${child.id}">${child.name}</option>`
        ).join('');
    } catch (error) {
        console.error('Error loading children:', error);
    }
}

async function loadChildrenForGoals() {
    try {
        const familyInfo = await ApiClient.get('/auth/family/members');
        const children = familyInfo.members.filter(m => m.role === 'child');
        
        const select = document.getElementById('goal-child');
        select.innerHTML = '<option value="">Выберите ребенка</option>' + 
            children.map(child => 
                `<option value="${child.id}">${child.name}</option>`
            ).join('');
    } catch (error) {
        console.error('Error loading children for goals:', error);
    }
}

function createTask() {
    Tasks.createTask();
}

function createStoreItem() {
    Store.createItem();
}

function adjustCoins() {
    Coins.adjustCoins();
}

function logout() {
    Auth.logout();
}

function copyPasscode() {
    const passcode = document.getElementById('family-passcode').textContent;
    navigator.clipboard.writeText(passcode).then(() => {
        UI.showToast('Код семьи скопирован в буфер обмена!', 'success');
    }).catch(() => {
        UI.showToast('Ошибка копирования', 'error');
    });
}

function copyMemberId(memberId) {
    navigator.clipboard.writeText(memberId).then(() => {
        UI.showToast('ID пользователя скопирован в буфер обмена!', 'success');
    }).catch(() => {
        UI.showToast('Ошибка копирования', 'error');
    });
}

function copyFamilyId() {
    const familyId = document.getElementById('family-id').textContent;
    navigator.clipboard.writeText(familyId).then(() => {
        UI.showToast('ID семьи скопирован в буфер обмена!', 'success');
    }).catch(() => {
        UI.showToast('Ошибка копирования', 'error');
    });
}

function showChildProfile(childId) {
    ChildProfile.show(childId);
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем сохраненную авторизацию
    if (Auth.loadFromStorage()) {
        Auth.initMainScreen();
    }

    // Обработчики форм авторизации
    document.getElementById('login-user-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        Auth.login(Object.fromEntries(formData));
    });

    document.getElementById('create-family-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        Auth.createFamily(Object.fromEntries(formData));
    });

    document.getElementById('join-family-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        Auth.joinFamily(Object.fromEntries(formData));
    });

    // Переключение вкладок авторизации
    document.querySelectorAll('.auth-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            
            // Переключаем активную вкладку
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Переключаем формы
            document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
            if (tab === 'login') {
                document.getElementById('login-form').classList.add('active');
            } else {
                document.getElementById(`${tab}-family`).classList.add('active');
            }
        });
    });

    // Переключение секций в главном экране
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const section = this.dataset.section;
            UI.showSection(section);
            
            // Загружаем данные для секции
            switch(section) {
                case 'dashboard':
                    Auth.loadDashboard();
                    break;
                case 'tasks':
                    Tasks.loadMyTasks();
                    Tasks.initTaskTabs();
                    break;
                case 'store':
                    Store.loadItems();
                    break;
                case 'coins':
                    Coins.loadBalance();
                    Coins.loadTransactions();
                    break;
                case 'goals':
                    Goals.loadMyGoals();
                    break;
                case 'stats':
                    Stats.loadStats();
                    break;
                case 'family':
                    Auth.loadFamilyData();
                    break;
            }
        });
    });

    // Обработчики вкладок заданий инициализируются динамически в Tasks.initTaskTabs()

    // Фильтр транзакций
    document.getElementById('transaction-type-filter').addEventListener('change', function() {
        Coins.loadTransactions();
    });

    // Период статистики
    document.getElementById('stats-period').addEventListener('change', function() {
        Stats.loadStats();
    });

    // Закрытие модальных окон
    document.getElementById('modal-overlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });

    // Чекбоксы в модальных окнах
    document.addEventListener('change', function(e) {
        if (e.target.type === 'checkbox' && e.target.closest('.checkbox-item')) {
            const item = e.target.closest('.checkbox-item');
            if (e.target.checked) {
                item.classList.add('checked');
            } else {
                item.classList.remove('checked');
            }
        }
    });
});

// Класс для управления пошаговой формой создания цели
class GoalForm {
    static currentStep = 1;
    static formData = {
        executor: null,
        goalType: null,
        title: '',
        description: '',
        deadline: null,
        rewardCoins: 50,
        storeItemData: null,
        habitData: null,
        coinTarget: null
    };

    static init() {
        // Проверяем авторизацию в самом начале
        if (!authToken || !currentUser) {
            UI.showToast('Необходимо войти в систему для создания целей', 'error');
            closeModal();
            return;
        }

        this.currentStep = 1;
        this.formData = {
            executor: null,
            goalType: null,
            title: '',
            description: '',
            deadline: null,
            rewardCoins: 50,
            storeItemData: null,
            habitData: null,
            coinTarget: null
        };
        
        this.updateStepIndicator();
        this.updateProgress();
        this.updateButtons();
        
        // Загружаем данные для первого шага
        this.loadExecutorsData();
    }

    static async loadExecutorsData() {
        try {
            // Проверяем авторизацию перед загрузкой
            if (!authToken || !currentUser) {
                UI.showToast('Необходимо войти в систему для создания целей', 'error');
                window.location.href = 'login.html';
                return;
            }

            const data = await ApiClient.get('/goals/form-data/executors');
            this.renderExecutors(data.executors);
        } catch (error) {
            console.error('Error loading executors:', error);
            if (error.message.includes('Not authenticated')) {
                UI.showToast('Сессия истекла. Необходимо войти заново', 'error');
                localStorage.clear();
                window.location.href = 'login.html';
            } else {
                UI.showToast('Ошибка загрузки исполнителей', 'error');
            }
        }
    }

    static renderExecutors(executors) {
        const container = document.getElementById('executor-options');
        container.innerHTML = '';

        executors.forEach(executor => {
            const card = document.createElement('div');
            card.className = 'executor-card';
            card.dataset.executorType = executor.type;
            card.dataset.executorId = executor.id;

            let avatarClass = 'executor-avatar';
            let avatarContent = '';

            if (executor.type === 'individual') {
                avatarClass += ` ${executor.role}`;
                avatarContent = executor.avatar_letter;
            } else {
                avatarClass += ' group';
                avatarContent = `<i class="${executor.icon}"></i>`;
            }

            let membersHtml = '';
            if (executor.members && executor.members.length > 0) {
                membersHtml = `
                    <div class="executor-members">
                        <h6>Участники:</h6>
                        <div class="executor-member-list">
                            ${executor.members.map(member => `
                                <span class="executor-member">
                                    ${member.role ? `<i class="fas fa-${member.role === 'child' ? 'child' : 'user'}"></i>` : ''}
                                    ${member.name}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="executor-header">
                    <div class="${avatarClass}">${avatarContent}</div>
                    <div class="executor-info">
                        <h5>${executor.name}</h5>
                        <p>${executor.description}</p>
                    </div>
                </div>
                ${membersHtml}
            `;

            card.addEventListener('click', () => this.selectExecutor(executor, card));
            container.appendChild(card);
        });
    }

    static selectExecutor(executor, cardElement) {
        // Убираем выделение с других карточек
        document.querySelectorAll('.executor-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Выделяем выбранную карточку
        cardElement.classList.add('selected');
        
        // Сохраняем данные исполнителя
        this.formData.executor = {
            type: executor.type,
            id: executor.id,
            data: executor
        };

        // Активируем кнопку "Далее"
        this.updateButtons();
    }

    static async loadGoalTypesData() {
        try {
            const data = await ApiClient.get('/goals/form-data/goal-types');
            this.renderGoalTypes(data.goal_types);
        } catch (error) {
            console.error('Error loading goal types:', error);
            UI.showToast('Ошибка загрузки типов целей', 'error');
        }
    }

    static renderGoalTypes(goalTypes) {
        const container = document.getElementById('goal-type-options');
        container.innerHTML = '';

        goalTypes.forEach(type => {
            const card = document.createElement('div');
            card.className = 'goal-type-card';
            card.dataset.goalType = type.type;

            card.innerHTML = `
                <div class="goal-type-icon">
                    <i class="${type.icon}"></i>
                </div>
                <h5>${type.name}</h5>
                <p>${type.description}</p>
            `;

            card.addEventListener('click', () => this.selectGoalType(type, card));
            container.appendChild(card);
        });
    }

    static selectGoalType(goalType, cardElement) {
        // Убираем выделение с других карточек
        document.querySelectorAll('.goal-type-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Выделяем выбранную карточку
        cardElement.classList.add('selected');
        
        // Сохраняем тип цели
        this.formData.goalType = goalType.type;

        // Обновляем заголовок третьего шага
        const title = document.getElementById('goal-step-3-title');
        title.textContent = `Настройте параметры: ${goalType.name}`;

        // Активируем кнопку "Далее"
        this.updateButtons();
    }

    static async loadStoreItems() {
        try {
            const items = await ApiClient.get('/store');
            this.renderStoreItems(items.items);
        } catch (error) {
            console.error('Error loading store items:', error);
            UI.showToast('Ошибка загрузки товаров', 'error');
        }
    }

    static renderStoreItems(items) {
        const container = document.getElementById('store-items-grid');
        container.innerHTML = '';

        items.forEach(item => {
            const option = document.createElement('div');
            option.className = 'store-item-option';
            option.dataset.itemId = item.id;

            option.innerHTML = `
                <div class="item-name">${item.title}</div>
                <div class="item-cost">
                    <i class="fas fa-coins"></i>
                    ${item.cost}
                </div>
            `;

            option.addEventListener('click', () => this.selectStoreItem(item, option));
            container.appendChild(option);
        });
    }

    static selectStoreItem(item, optionElement) {
        // Убираем выделение с других опций
        document.querySelectorAll('.store-item-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Выделяем выбранную опцию
        optionElement.classList.add('selected');
        
        // Сохраняем данные товара
        this.formData.storeItemData = {
            store_item_id: item.id,
            store_item_name: item.title,
            store_item_cost: item.cost,
            store_item_image_url: item.image_url,
            availability_deadline: item.availability_end_date
        };

        // Автоматически заполняем название цели
        const titleInput = document.getElementById('goal-title');
        if (!titleInput.value) {
            titleInput.value = `Накопить на ${item.title}`;
            this.formData.title = titleInput.value;
        }
    }

    static onHabitRewardTypeChange() {
        const rewardType = document.getElementById('habit-reward-type').value;
        const coinsReward = document.getElementById('habit-coins-reward');
        const itemReward = document.getElementById('habit-item-reward');

        if (rewardType === 'coins') {
            coinsReward.style.display = 'block';
            itemReward.style.display = 'none';
        } else if (rewardType === 'store_item') {
            coinsReward.style.display = 'none';
            itemReward.style.display = 'block';
            
            // Загружаем товары для награды
            this.loadStoreItemsForReward();
        }
    }

    static async loadStoreItemsForReward() {
        try {
            const items = await ApiClient.get('/store');
            const select = document.getElementById('habit-reward-item');
            select.innerHTML = '<option value="">Выберите товар</option>';
            
            items.items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = `${item.title} (${item.cost} монет)`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading store items for reward:', error);
        }
    }

    static nextStep() {
        if (this.currentStep === 1) {
            if (!this.formData.executor) {
                UI.showToast('Выберите исполнителя цели', 'warning');
                return;
            }
            this.currentStep = 2;
            this.loadGoalTypesData();
        } else if (this.currentStep === 2) {
            if (!this.formData.goalType) {
                UI.showToast('Выберите тип цели', 'warning');
                return;
            }
            this.currentStep = 3;
            this.prepareStep3();
        }

        this.showCurrentStep();
        this.updateStepIndicator();
        this.updateProgress();
        this.updateButtons();
    }

    static prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.showCurrentStep();
            this.updateStepIndicator();
            this.updateProgress();
            this.updateButtons();
        }
    }

    static prepareStep3() {
        // Скрываем все параметры
        document.querySelectorAll('.goal-type-params').forEach(param => {
            param.style.display = 'none';
        });

        // Показываем нужные параметры в зависимости от типа цели
        if (this.formData.goalType === 'store_item') {
            document.getElementById('store-item-params').style.display = 'block';
            this.loadStoreItems();
        } else if (this.formData.goalType === 'habit_building') {
            document.getElementById('habit-params').style.display = 'block';
        } else if (this.formData.goalType === 'coin_saving') {
            document.getElementById('coin-saving-params').style.display = 'block';
        }
    }

    static showCurrentStep() {
        document.querySelectorAll('.goal-step').forEach(step => {
            step.classList.remove('active');
        });
        
        document.getElementById(`goal-step-${this.currentStep}`).classList.add('active');
    }

    static updateStepIndicator() {
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            } else if (stepNumber === this.currentStep) {
                step.classList.add('active');
            }
        });

        // Обновляем прогресс-лейблы
        document.querySelectorAll('.progress-labels span').forEach((label, index) => {
            label.classList.remove('active');
            if (index + 1 === this.currentStep) {
                label.classList.add('active');
            }
        });
    }

    static updateProgress() {
        const progressFill = document.getElementById('goal-progress-fill');
        const percentage = (this.currentStep / 3) * 100;
        progressFill.style.width = `${percentage}%`;
    }

    static updateButtons() {
        const prevBtn = document.getElementById('goal-prev-btn');
        const nextBtn = document.getElementById('goal-next-btn');
        const createBtn = document.getElementById('goal-create-btn');

        // Кнопка "Назад"
        prevBtn.style.display = this.currentStep > 1 ? 'inline-flex' : 'none';

        // Кнопка "Далее" / "Создать"
        if (this.currentStep < 3) {
            nextBtn.style.display = 'inline-flex';
            createBtn.style.display = 'none';
            
            // Активность кнопки "Далее"
            const canProceed = (this.currentStep === 1 && this.formData.executor) || 
                               (this.currentStep === 2 && this.formData.goalType);
            nextBtn.disabled = !canProceed;
        } else {
            nextBtn.style.display = 'none';
            createBtn.style.display = 'inline-flex';
        }
    }

    static collectFormData() {
        // Собираем базовые данные
        this.formData.title = document.getElementById('goal-title').value;
        this.formData.description = document.getElementById('goal-description').value;
        this.formData.deadline = document.getElementById('goal-deadline').value || null;
        this.formData.rewardCoins = parseInt(document.getElementById('goal-reward').value) || 0;

        // Собираем данные в зависимости от типа цели
        if (this.formData.goalType === 'habit_building') {
            this.formData.habitData = {
                habit_name: this.formData.title,
                habit_description: this.formData.description,
                actions_count: parseInt(document.getElementById('habit-actions').value) || 10,
                period_value: parseInt(document.getElementById('habit-period-value').value) || 30,
                period_type: document.getElementById('habit-period-type').value,
                reward_type: document.getElementById('habit-reward-type').value,
                reward_value: this.formData.rewardCoins,
                is_streak_required: document.getElementById('habit-streak').checked
            };

            if (this.formData.habitData.reward_type === 'coins') {
                this.formData.habitData.reward_value = parseInt(document.getElementById('habit-reward-coins').value) || 100;
            } else if (this.formData.habitData.reward_type === 'store_item') {
                const itemId = document.getElementById('habit-reward-item').value;
                if (itemId) {
                    this.formData.habitData.reward_reference_id = itemId;
                }
            }
        } else if (this.formData.goalType === 'coin_saving') {
            this.formData.coinTarget = parseInt(document.getElementById('coin-target').value) || 500;
        }
    }

    static buildApiData() {
        this.collectFormData();

        // Строим executor данные
        let executorData = {
            executor_type: this.formData.executor.type
        };

        if (this.formData.executor.type === 'individual') {
            executorData.user_ids = [this.formData.executor.data.id];
        } else if (this.formData.executor.type === 'multiple_children') {
            // Для множественного выбора детей (пока не реализован в UI)
            executorData.user_ids = [this.formData.executor.data.id];
        }

        // Строим условия цели
        let conditions = [];
        
        if (this.formData.goalType === 'coin_saving') {
            conditions.push({
                condition_type: 'coin_amount',
                target_value: this.formData.coinTarget,
                description: `Накопить ${this.formData.coinTarget} монет`,
                weight: 1.0
            });
        } else if (this.formData.goalType === 'store_item') {
            conditions.push({
                condition_type: 'coin_amount',
                target_value: this.formData.storeItemData.store_item_cost,
                description: `Накопить ${this.formData.storeItemData.store_item_cost} монет на ${this.formData.storeItemData.store_item_name}`,
                weight: 1.0
            });
        } else if (this.formData.goalType === 'habit_building') {
            conditions.push({
                condition_type: 'habit_actions',
                target_value: this.formData.habitData.actions_count,
                description: `Выполнить ${this.formData.habitData.actions_count} действий за ${this.formData.habitData.period_value} ${this.formData.habitData.period_type}`,
                weight: 1.0,
                is_streak_required: this.formData.habitData.is_streak_required
            });
        }

        const goalData = {
            title: this.formData.title,
            description: this.formData.description,
            goal_type: this.formData.goalType,
            executor: executorData,
            conditions: conditions,
            deadline: this.formData.deadline,
            reward_coins: this.formData.rewardCoins
        };

        // Добавляем специфичные данные
        if (this.formData.goalType === 'habit_building' && this.formData.habitData) {
            goalData.habit_data = this.formData.habitData;
        }

        if (this.formData.goalType === 'store_item' && this.formData.storeItemData) {
            goalData.store_item_data = this.formData.storeItemData;
            goalData.target_store_item_id = this.formData.storeItemData.store_item_id;
        }

        return goalData;
    }

    static async createGoal() {
        try {
            if (!this.formData.title) {
                UI.showToast('Введите название цели', 'warning');
                return;
            }

            if (this.formData.goalType === 'store_item' && !this.formData.storeItemData) {
                UI.showToast('Выберите товар из магазина', 'warning');
                return;
            }

            const goalData = this.buildApiData();
            
            await ApiClient.post('/goals/enhanced', goalData);
            UI.showToast('Цель успешно создана!', 'success');
            closeModal();
            Goals.loadMyGoals();
            
        } catch (error) {
            console.error('Error creating goal:', error);
            let errorMessage = 'Неизвестная ошибка';
            
            if (error.message) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error.detail) {
                errorMessage = error.detail;
            }
            
            UI.showToast(`Ошибка создания цели: ${errorMessage}`, 'error');
        }
    }
}

// Обновляем функцию showCreateGoalModal
function showCreateGoalModal() {
    console.log('showCreateGoalModal called - using new step form');
    GoalForm.init();
    showModal('create-goal-modal');
}
import { DataEngine } from './storage.js';

export const UIManager = {
    init() {
        const path = window.location.pathname;
        if (path.includes('goals.html')) {
            this.setupCanvasWorkspace();
        } else if (path.includes('reflection.html')) {
            this.setupReflectionPage();
        } else {
            this.setupDashboardPage();
        }
    },

    // --- DASHBOARD APP MODULE ---
    setupDashboardPage() {
        const container = document.getElementById('dashboard-metrics-container');
        if (!container) return;
        container.innerHTML = '';

        const goals = DataEngine.getGoals();
        const log = DataEngine.getReflectionLog();

        goals.forEach(goal => {
            const count = log.filter(l => l.goalTitle === goal.title).length;
            const column = document.createElement('div');
            column.className = 'dashboard-column animate-depth-pop';
            column.innerHTML = `
                <h3>${goal.title}</h3>
                <div class="dashboard-counter-hero">${count}</div>
                <p style="color: var(--text-secondary)">Completed Targets</p>
            `;
            container.appendChild(column);
        });
    },

    // --- CANVAS SPATIAL MODULE ---
    setupCanvasWorkspace() {
        const canvas = document.getElementById('spatial-canvas-root');
        const utilityTab = document.getElementById('canvas-dropdown-tab');
        const dock = document.getElementById('global-navigation-dock');

        // Handle Canvas Intro Layer Animations
        setTimeout(() => {
            dock.className = "bottom-dock animate-dock-out";
            utilityTab.classList.add('animate-depth-pop');
        }, 300);

        // Utility Dropdown Expand Interaction
        utilityTab.addEventListener('click', (e) => {
            if(e.target.id === 'canvas-dropdown-tab' || e.target.id === 'tab-label-text') {
                utilityTab.classList.toggle('expanded');
            }
        });

        // Initialize Structural Elements Placement
        this.renderCanvasElements();

        // Canvas Object Creation Actions Wiring
        document.getElementById('action-trigger-make-goal').addEventListener('click', () => {
            const goals = DataEngine.getGoals();
            goals.push({ id: 'g_' + Date.now(), title: 'New Structural Goal', x: 250, y: 200 });
            DataEngine.saveGoals(goals);
            this.renderCanvasElements();
        });

        document.getElementById('action-trigger-make-task').addEventListener('click', () => {
            this.openTaskModal((title, timeRange) => {
                const tasks = DataEngine.getTasks();
                tasks.push({ id: 't_' + Date.now(), goalId: null, title, timeRange, x: 400, y: 300 });
                DataEngine.saveTasks(tasks);
                this.renderCanvasElements();
            });
        });
    },

    renderCanvasElements() {
        const canvas = document.getElementById('spatial-canvas-root');
        // Clear past dynamic layouts safely preserving the utility tab
        const utility = document.getElementById('canvas-dropdown-tab');
        canvas.innerHTML = '';
        canvas.appendChild(utility);

        const goals = DataEngine.getGoals();
        const tasks = DataEngine.getTasks();

        // Render Structural Goal Modules Blocks
        goals.forEach(goal => {
            const block = document.createElement('div');
            block.className = 'spatial-block goal-block animate-depth-pop';
            block.style.left = `${goal.x}px`;
            block.style.top = `${goal.y}px`;
            block.dataset.id = goal.id;

            let innerTasksHTML = '';
            tasks.filter(t => t.goalId === goal.id).forEach(task => {
                innerTasksHTML += `
                    <div class="canvas-task-item" data-id="${task.id}">
                        <span>${task.title}</span>
                        <span class="time-range-indicator">${task.timeRange}</span>
                    </div>
                `;
            });

            block.innerHTML = `
                <div class="block-header">
                    <button class="block-btn delete-goal-trigger">-</button>
                    <input type="text" class="block-input goal-title-input" value="${goal.title}">
                    <button class="block-btn add-task-to-goal-trigger">+</button>
                </div>
                <div class="block-task-container-list">${innerTasksHTML}</div>
            `;

            this.wireDragMechanics(block, (x, y) => {
                const currentGoals = DataEngine.getGoals();
                const match = currentGoals.find(g => g.id === goal.id);
                if(match) { match.x = x; match.y = y; DataEngine.saveGoals(currentGoals); }
            });

            // Inline actions verification wiring
            block.querySelector('.delete-goal-trigger').addEventListener('click', (e) => {
                e.stopPropagation();
                DataEngine.saveGoals(DataEngine.getGoals().filter(g => g.id !== goal.id));
                DataEngine.saveTasks(DataEngine.getTasks().filter(t => t.goalId !== goal.id));
                this.renderCanvasElements();
            });

            block.querySelector('.goal-title-input').addEventListener('change', (e) => {
                const currentGoals = DataEngine.getGoals();
                const match = currentGoals.find(g => g.id === goal.id);
                if(match) { match.title = e.target.value; DataEngine.saveGoals(currentGoals); }
            });

            block.querySelector('.add-task-to-goal-trigger').addEventListener('click', (e) => {
                e.stopPropagation();
                this.openTaskModal((title, timeRange) => {
                    const currentTasks = DataEngine.getTasks();
                    currentTasks.push({ id: 't_' + Date.now(), goalId: goal.id, title, timeRange, x: 0, y: 0 });
                    DataEngine.saveTasks(currentTasks);
                    this.renderCanvasElements();
                });
            });

            // Task Dismiss Execution Logic
            block.querySelectorAll('.canvas-task-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    item.className = "canvas-task-item animate-task-dismiss";
                    setTimeout(() => {
                        const targetTask = DataEngine.getTasks().find(t => t.id === item.dataset.id);
                        if(targetTask) DataEngine.addCompletedLog(targetTask, goal.title);
                        DataEngine.saveTasks(DataEngine.getTasks().filter(t => t.id !== item.dataset.id));
                        this.renderCanvasElements();
                    }, 400);
                });
            });

            canvas.appendChild(block);
        });

        // Render Rogue Independent Functional Tasks Blocks
        tasks.filter(t => t.goalId === null).forEach(task => {
            const rogueBlock = document.createElement('div');
            rogueBlock.className = 'spatial-block rogue-task-block animate-depth-pop';
            rogueBlock.style.left = `${task.x}px`;
            rogueBlock.style.top = `${task.y}px`;
            rogueBlock.dataset.id = task.id;

            rogueBlock.innerHTML = `
                <div class="canvas-task-item" style="margin:0;">
                    <div style="display:flex; flex-direction:column;">
                        <strong>${task.title}</strong>
                        <span class="time-range-indicator">${task.timeRange}</span>
                    </div>
                </div>
            `;

            this.wireDragMechanics(rogueBlock, (x, y) => {
                // Check Collision Overlap with Existing Goal Blocks
                const currentGoals = DataEngine.getGoals();
                let droppedInsideGoal = null;

                currentGoals.forEach(g => {
                    if (x > g.x && x < g.x + 320 && y > g.y && y < g.y + 240) {
                        droppedInsideGoal = g;
                    }
                });

                const currentTasks = DataEngine.getTasks();
                const match = currentTasks.find(t => t.id === task.id);

                if (droppedInsideGoal && match) {
                    // Inject Into Goal Container Array with Impact Fluid Transition
                    match.goalId = droppedInsideGoal.id;
                    DataEngine.saveTasks(currentTasks);
                    this.renderCanvasElements();
                } else if (match) {
                    match.x = x; match.y = y;
                    DataEngine.saveTasks(currentTasks);
                }
            });

            // Action verification interaction for checking off rogue items
            rogueBlock.addEventListener('click', () => {
                rogueBlock.className = "spatial-block rogue-task-block animate-task-dismiss";
                setTimeout(() => {
                    const targetTask = DataEngine.getTasks().find(t => t.id === task.id);
                    if(targetTask) DataEngine.addCompletedLog(targetTask, 'Rogue Project');
                    DataEngine.saveTasks(DataEngine.getTasks().filter(t => t.id !== task.id));
                    this.renderCanvasElements();
                }, 400);
            });

            canvas.appendChild(rogueBlock);
        });
    },

    wireDragMechanics(element, callback) {
        let offsetX = 0, offsetY = 0, initialX = 0, initialY = 0;

        element.addEventListener('mousedown', (e) => {
            if(e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
            e.preventDefault();
            element.classList.add('dragging');

            initialX = e.clientX;
            initialY = e.clientY;
            offsetX = element.offsetLeft;
            offsetY = element.offsetTop;

            const onMouseMove = (moveEvent) => {
                const dx = moveEvent.clientX - initialX;
                const dy = moveEvent.clientY - initialY;
                element.style.left = `${offsetX + dx}px`;
                element.style.top = `${offsetY + dy}px`;
            };

            const onMouseUp = (upEvent) => {
                element.classList.remove('dragging');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                
                const finalX = parseInt(element.style.left, 10);
                const finalY = parseInt(element.style.top, 10);
                callback(finalX, finalY);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    },

    openTaskModal(callback) {
        const modal = document.getElementById('task-creation-modal');
        modal.classList.remove('hidden');
        
        const saveBtn = document.getElementById('modal-save');
        const cancelBtn = document.getElementById('modal-cancel');

        const cleanUp = () => {
            modal.classList.add('hidden');
            document.getElementById('modal-task-title').value = '';
            document.getElementById('modal-task-time').value = '';
        };

        saveBtn.onclick = () => {
            const title = document.getElementById('modal-task-title').value || 'Unspecified Target';
            const time = document.getElementById('modal-task-time').value || 'All-Day';
            callback(title, time);
            cleanUp();
        };
        cancelBtn.onclick = cleanUp;
    },

    // --- MONTHLY HISTORICAL REFLECTION LOG MODULE ---
    setupReflectionPage() {
        const logContainer = document.getElementById('reflection-log-canvas');
        const tallyHero = document.getElementById('reflection-tally-hero');
        if (!logContainer) return;

        const historicalLog = DataEngine.getReflectionLog();
        tallyHero.textContent = `Total monthly operations completed: ${historicalLog.length}`;

        if(historicalLog.length === 0) {
            logContainer.innerHTML = `<p style="color: var(--text-secondary); text-align:center; padding: 40px;">No historical verifications archived inside this logging sequence yet.</p>`;
            return;
        }

        logContainer.innerHTML = '';
        historicalLog.reverse().forEach(item => {
            const el = document.createElement('div');
            el.className = 'ledger-item animate-depth-pop';
            el.innerHTML = `
                <div>
                    <strong>${item.title}</strong>
                    <p style="font-size:0.8rem; color: var(--text-secondary); margin-top:2px;">Goal Block Tracked: ${item.goalTitle}</p>
                </div>
                <div style="text-align:right;">
                    <span>${item.timeRange}</span>
                    <p style="font-size:0.8rem; color: var(--text-secondary); margin-top:2px;">${item.completedAt}</p>
                </div>
            `;
            logContainer.appendChild(el);
        });
    }
};
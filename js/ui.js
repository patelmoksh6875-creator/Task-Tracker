import { DataEngine } from './storage.js';
import { generateId } from './utils.js';
import { ConfettiEngine } from './confetti.js';

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

        // Confetti layer — draws on its own full-screen canvas above everything
        ConfettiEngine.init('#confetti-canvas');

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
            goals.push({ id: generateId(), title: 'New Structural Goal', x: 250, y: 200 });
            DataEngine.saveGoals(goals);
            this.renderCanvasElements();
        });

        document.getElementById('action-trigger-make-task').addEventListener('click', () => {
            this.openTaskModal((title, timeRange) => {
                const tasks = DataEngine.getTasks();
                tasks.push({ id: generateId(), goalId: null, title, timeRange, x: 400, y: 300 });
                DataEngine.saveTasks(tasks);
                this.renderCanvasElements();
            });
        });
    },

    // Completes a task: confetti from the exact click point, dismiss animation, then remove + log
    completeTask(taskId, blockOrItem, goalTitleForLog, clickEvent) {
        blockOrItem.classList.remove('expanded');
        blockOrItem.classList.add('animate-task-dismiss');
        ConfettiEngine.burst({ x: clickEvent.clientX, y: clickEvent.clientY });
        setTimeout(() => {
            const targetTask = DataEngine.getTasks().find(t => t.id === taskId);
            if (targetTask) DataEngine.addCompletedLog(targetTask, goalTitleForLog);
            DataEngine.saveTasks(DataEngine.getTasks().filter(t => t.id !== taskId));
            this.renderCanvasElements();
        }, 400);
    },

    renderCanvasElements() {
        const canvas = document.getElementById('spatial-canvas-root');
        // Clear past dynamic layouts safely preserving the utility tab + confetti canvas
        const utility = document.getElementById('canvas-dropdown-tab');
        const confettiCanvas = document.getElementById('confetti-canvas');
        canvas.innerHTML = '';
        canvas.appendChild(utility);
        if (confettiCanvas) canvas.appendChild(confettiCanvas);

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
                        <div class="task-item-summary">
                            <span class="task-item-title">${task.title}</span>
                            <span class="time-range-indicator">${task.timeRange}</span>
                        </div>
                        <div class="task-item-confirm-row">
                            <span class="task-confirm-hint">Tap to confirm</span>
                            <button type="button" class="complete-check-btn" aria-label="Mark task complete">✓</button>
                        </div>
                    </div>
                `;
            });

            block.innerHTML = `
                <div class="resize-handle" title="Drag to resize"></div>
                <div class="block-header">
                    <button class="block-btn delete-goal-trigger">-</button>
                    <input type="text" class="block-input goal-title-input" value="${goal.title}">
                    <button class="block-btn add-task-to-goal-trigger">+</button>
                </div>
                <div class="block-task-container-list">${innerTasksHTML}</div>
            `;

            // Apply saved size, if this goal has been resized before.
            // Goals created before this feature have no width/height —
            // they fall back to the .goal-block CSS defaults.
            if (goal.width)  block.style.width  = `${goal.width}px`;
            if (goal.height) block.style.height = `${goal.height}px`;

            this.wireDragMechanics(block, (x, y) => {
                const currentGoals = DataEngine.getGoals();
                const match = currentGoals.find(g => g.id === goal.id);
                if(match) { match.x = x; match.y = y; DataEngine.saveGoals(currentGoals); }
            });

            this.wireResizeHandle(block, block.querySelector('.resize-handle'), 240, 140, (dims) => {
                const currentGoals = DataEngine.getGoals();
                const match = currentGoals.find(g => g.id === goal.id);
                if (match) {
                    match.width  = dims.width;
                    match.height = dims.height;
                    match.x = dims.x;
                    match.y = dims.y;
                    DataEngine.saveGoals(currentGoals);
                }
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
                    currentTasks.push({ id: generateId(), goalId: goal.id, title, timeRange, x: 0, y: 0 });
                    DataEngine.saveTasks(currentTasks);
                    this.renderCanvasElements();
                });
            });

            // Two-click task confirmation: click 1 expands, click 2 (checkmark only) completes
            block.querySelectorAll('.canvas-task-item').forEach(item => {
                const checkBtn = item.querySelector('.complete-check-btn');

                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (e.target === checkBtn) return; // handled below
                    item.classList.toggle('expanded');
                });

                checkBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.completeTask(item.dataset.id, item, goal.title, e);
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
                <div class="resize-handle" title="Drag to resize"></div>
                <div class="canvas-task-item" style="margin:0;">
                    <div class="task-item-summary" style="flex-direction:column; align-items:flex-start; gap:2px;">
                        <strong>${task.title}</strong>
                        <span class="time-range-indicator">${task.timeRange}</span>
                    </div>
                    <div class="task-item-confirm-row">
                        <span class="task-confirm-hint">Tap to confirm</span>
                        <button type="button" class="complete-check-btn" aria-label="Mark task complete">✓</button>
                    </div>
                </div>
            `;

            // Apply saved size, if this task has been resized before.
            if (task.width)  rogueBlock.style.width  = `${task.width}px`;
            if (task.height) rogueBlock.style.height = `${task.height}px`;

            this.wireResizeHandle(rogueBlock, rogueBlock.querySelector('.resize-handle'), 160, 70, (dims) => {
                const currentTasks = DataEngine.getTasks();
                const match = currentTasks.find(t => t.id === task.id);
                if (match) {
                    match.width  = dims.width;
                    match.height = dims.height;
                    match.x = dims.x;
                    match.y = dims.y;
                    DataEngine.saveTasks(currentTasks);
                }
            });

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

            // Two-click confirmation on the rogue block itself
            const rogueCheckBtn = rogueBlock.querySelector('.complete-check-btn');

            rogueBlock.addEventListener('click', (e) => {
                if (e.target === rogueCheckBtn) return; // handled below
                rogueBlock.classList.toggle('expanded');
            });

            rogueCheckBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.completeTask(task.id, rogueBlock, 'Rogue Project', e);
            });

            canvas.appendChild(rogueBlock);
        });
    },

    // Wires a top-left "slit" handle to resize `element`. Because the handle
    // sits at the top-left corner, the bottom-right corner must stay put —
    // so as width/height shrink, left/top have to move to compensate, and
    // vice versa. Clamped to minWidth/minHeight so it can't collapse away.
    wireResizeHandle(element, handle, minWidth, minHeight, callback) {
        handle.addEventListener('click', (e) => e.stopPropagation());

        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();

            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = element.offsetWidth;
            const startHeight = element.offsetHeight;
            const startLeft = element.offsetLeft;
            const startTop = element.offsetTop;

            element.classList.add('resizing');

            const onMouseMove = (moveEvent) => {
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;

                const newWidth = Math.max(minWidth, startWidth - dx);
                const newHeight = Math.max(minHeight, startHeight - dy);

                // Anchor the bottom-right corner: shrinking/growing width
                // shifts left by exactly the amount width changed, same for height/top.
                element.style.width = `${newWidth}px`;
                element.style.height = `${newHeight}px`;
                element.style.left = `${startLeft + (startWidth - newWidth)}px`;
                element.style.top = `${startTop + (startHeight - newHeight)}px`;
            };

            const onMouseUp = () => {
                element.classList.remove('resizing');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                callback({
                    width: element.offsetWidth,
                    height: element.offsetHeight,
                    x: element.offsetLeft,
                    y: element.offsetTop
                });
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
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
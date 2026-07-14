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
        const actionDrawer = document.getElementById('action-drawer');
        const featureDrawer = document.getElementById('feature-drawer');
        const dock = document.getElementById('global-navigation-dock');

        // Confetti layer — draws on its own full-screen canvas above everything
        ConfettiEngine.init('#confetti-canvas');

        // Adaptive Navigation Dock: after 5s of inactivity on the Canvas view,
        // morph the dock down into a thin accent line. It should stay hidden
        // until the mouse genuinely approaches it (not just moves anywhere on
        // the canvas), and settle back into the line once the mouse moves away.
        let idleTimer = null;
        const armIdleTimer = () => {
            clearTimeout(idleTimer);
            dock.classList.remove('dock-idle');
            idleTimer = setTimeout(() => dock.classList.add('dock-idle'), 5000);
        };
        armIdleTimer();
        // Only genuine actions reset the countdown — not raw mouse movement,
        // which would otherwise keep the dock permanently expanded.
        ['mousedown', 'keydown'].forEach(evt => {
            canvas.addEventListener(evt, armIdleTimer);
        });

        // Proximity detection: expand the dock once the pointer comes near it,
        // even without touching it directly; collapse it back to the thin
        // line once the pointer moves far away again.
        const PROXIMITY_PX = 90;
        document.addEventListener('mousemove', (e) => {
            const rect = dock.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
            dock.classList.toggle('dock-proximity', dist <= PROXIMITY_PX);
        });

        // Initialize Structural Elements Placement
        this.renderCanvasElements();

        // Action Drawer Wiring
        document.getElementById('action-trigger-make-goal').addEventListener('click', () => {
            armIdleTimer();
            const goals = DataEngine.getGoals();
            goals.push({ id: generateId(), title: 'New Structural Goal', x: 250, y: 200 });
            DataEngine.saveGoals(goals);
            this.renderCanvasElements();
        });

        document.getElementById('action-trigger-make-task').addEventListener('click', () => {
            armIdleTimer();
            this.openTaskModal((title, timeRange) => {
                const tasks = DataEngine.getTasks();
                tasks.push({ id: generateId(), goalId: null, title, timeRange, x: 400, y: 300, createdAt: DataEngine.todayKey() });
                DataEngine.saveTasks(tasks);
                this.renderCanvasElements();
            });
        });

        // Feature Drawer Wiring
        document.getElementById('feature-align-grid').addEventListener('click', () => {
            armIdleTimer();
            this.alignGridLayout();
        });

        document.getElementById('feature-purge-tasks').addEventListener('click', () => {
            const remaining = DataEngine.getTasks().filter(t => t.goalId !== null);
            DataEngine.saveTasks(remaining);
            this.renderCanvasElements();
        });

        document.getElementById('feature-focus-mode').addEventListener('click', (e) => {
            canvas.classList.toggle('focus-mode-active');
            e.currentTarget.classList.toggle('active-toggle');
        });
    },

    // Renders a small badge once a task has sat uncompleted past the day it
    // was created on, so tasks that roll forward day to day stay visible.
    carryOverBadge(task) {
        if (!task.createdAt) return '';
        const created = new Date(task.createdAt + 'T00:00:00');
        const today = new Date(DataEngine.todayKey() + 'T00:00:00');
        const days = Math.round((today - created) / 86400000);
        if (days <= 0) return '';
        const label = days === 1 ? 'Carried over 1 day' : `Carried over ${days} days`;
        return `<span class="carry-over-badge">${label}</span>`;
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
        // Clear past dynamic layouts safely preserving the utility bars + confetti canvas
        const utilityStack = document.getElementById('utility-stack');
        const confettiCanvas = document.getElementById('confetti-canvas');
        canvas.innerHTML = '';
        canvas.appendChild(utilityStack);
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
                        ${this.carryOverBadge(task)}
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
                    currentTasks.push({ id: generateId(), goalId: goal.id, title, timeRange, x: 0, y: 0, createdAt: DataEngine.todayKey() });
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
                    ${this.carryOverBadge(task)}
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

            // Two-click confirmation — wired on the inner .canvas-task-item, same
            // element the CSS ".expanded" rule targets, so it actually opens.
            // The outer rogueBlock keeps drag/resize; this only handles tap-to-confirm.
            const rogueItem = rogueBlock.querySelector('.canvas-task-item');
            const rogueCheckBtn = rogueItem.querySelector('.complete-check-btn');

            rogueItem.addEventListener('click', (e) => {
                e.stopPropagation();
                if (e.target === rogueCheckBtn) return; // handled below
                rogueItem.classList.toggle('expanded');
            });

            rogueCheckBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.completeTask(task.id, rogueItem, 'Rogue Project', e);
            });

            canvas.appendChild(rogueBlock);
        });
    },

    // Auto-arranges the whole board: goal blocks in rows across the top,
    // rogue task blocks in a grid underneath, wrapping into new rows/columns
    // to fit the viewport width. Existing custom sizes are kept; only x/y move.
    alignGridLayout() {
        const MARGIN = 40;
        const GAP = 24;
        const GOAL_CELL_W = 340;
        const GOAL_CELL_H = 220;
        const TASK_CELL_W = 260;
        const TASK_CELL_H = 140;
        const TOP_START_Y = 90;

        const viewportW = window.innerWidth;

        const goals = DataEngine.getGoals();
        const goalCols = Math.max(1, Math.floor((viewportW - MARGIN * 2) / (GOAL_CELL_W + GAP)));
        goals.forEach((g, i) => {
            const row = Math.floor(i / goalCols);
            const col = i % goalCols;
            g.x = MARGIN + col * (GOAL_CELL_W + GAP);
            g.y = TOP_START_Y + row * (GOAL_CELL_H + GAP);
        });
        DataEngine.saveGoals(goals);

        const goalRows = goals.length > 0 ? Math.ceil(goals.length / goalCols) : 0;
        const tasksTopY = TOP_START_Y + goalRows * (GOAL_CELL_H + GAP) + GAP;

        const tasks = DataEngine.getTasks();
        const rogueTasks = tasks.filter(t => t.goalId === null);
        const taskCols = Math.max(1, Math.floor((viewportW - MARGIN * 2) / (TASK_CELL_W + GAP)));
        rogueTasks.forEach((t, i) => {
            const row = Math.floor(i / taskCols);
            const col = i % taskCols;
            t.x = MARGIN + col * (TASK_CELL_W + GAP);
            t.y = tasksTopY + row * (TASK_CELL_H + GAP);
        });
        DataEngine.saveTasks(tasks);

        this.renderCanvasElements();
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
        const DRAG_THRESHOLD = 8; // px of movement before a mousedown counts as a real drag —
                                  // generous enough to absorb normal mouse/trackpad jitter on a tap

        // A real drag still fires a native "click" on mouseup (browsers do this
        // regardless of how far the mouse moved in between). If something else
        // wires an "expanded" toggle on this same element (e.g. rogue task
        // blocks), that ghost click would flip the card open/closed right after
        // every drag. Swallow exactly one click after a real drag so any click
        // listeners further up don't see it.
        element.addEventListener('click', (e) => {
            if (element.dataset.justDragged === 'true') {
                element.dataset.justDragged = 'false';
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        }, true);

        element.addEventListener('mousedown', (e) => {
            // Any new press — even one that starts on a button/input and bails
            // below — clears a stale flag first, so a prior drag can never
            // reach forward and swallow an unrelated later click (e.g. tapping
            // the checkmark right after repositioning the card).
            element.dataset.justDragged = 'false';

            if(e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
            e.preventDefault();
            element.classList.add('dragging');

            let hasMoved = false;
            initialX = e.clientX;
            initialY = e.clientY;
            offsetX = element.offsetLeft;
            offsetY = element.offsetTop;

            const onMouseMove = (moveEvent) => {
                const dx = moveEvent.clientX - initialX;
                const dy = moveEvent.clientY - initialY;
                if (!hasMoved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
                    hasMoved = true;
                }
                element.style.left = `${offsetX + dx}px`;
                element.style.top = `${offsetY + dy}px`;
            };

            const onMouseUp = (upEvent) => {
                element.classList.remove('dragging');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                // Mark that this was a genuine drag so the ghost click gets swallowed.
                // A tap with no real movement leaves this false, so normal
                // expand/complete clicks keep working exactly as before.
                element.dataset.justDragged = hasMoved ? 'true' : 'false';

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

        // getReflectionLog() auto-rolls a finished month into the yearly
        // archive and starts fresh, so what comes back here is always
        // "this month" by the time we render.
        const log = DataEngine.getReflectionLog();
        const goals = DataEngine.getGoals();

        tallyHero.textContent = `Total tasks completed this month: ${log.length}`;

        this.renderTopGoalCard(log);
        this.renderFocusCard(log, goals);
        this.renderDailyChart(log);
        this.renderYearlyChart();
        this.renderLedger(log, logContainer);
    },

    renderTopGoalCard(log) {
        const card = document.getElementById('reflect-top-goal-card');
        if (!card) return;

        if (log.length === 0) {
            card.innerHTML = `
                <p class="reflect-card-label">Top Goal This Month</p>
                <p class="reflect-card-detail">No completions logged yet this month.</p>
            `;
            return;
        }

        const byGoal = {};
        log.forEach(item => {
            const key = item.goalTitle || 'Rogue Project';
            byGoal[key] = (byGoal[key] || 0) + 1;
        });
        const [topTitle, topCount] = Object.entries(byGoal).sort((a, b) => b[1] - a[1])[0];

        card.innerHTML = `
            <p class="reflect-card-label">Top Goal This Month</p>
            <p class="reflect-card-hero">${topTitle}</p>
            <p class="reflect-card-detail">${topCount} task${topCount === 1 ? '' : 's'} completed</p>
        `;
    },

    renderFocusCard(log, goals) {
        const card = document.getElementById('reflect-focus-card');
        if (!card) return;

        if (goals.length === 0) {
            card.innerHTML = `
                <p class="reflect-card-label">Needs Focus Next Month</p>
                <p class="reflect-card-detail">Set up a few goals on the Canvas to get focus recommendations.</p>
            `;
            return;
        }

        const byGoal = {};
        goals.forEach(g => { byGoal[g.title] = 0; });
        log.forEach(item => {
            if (item.goalTitle in byGoal) byGoal[item.goalTitle]++;
        });

        const entries = Object.entries(byGoal);
        const total = entries.reduce((sum, [, c]) => sum + c, 0);
        const avg = entries.length ? total / entries.length : 0;
        const neglected = entries.filter(([, c]) => c < avg).sort((a, b) => a[1] - b[1]).slice(0, 3);

        if (neglected.length === 0) {
            card.innerHTML = `
                <p class="reflect-card-label">Needs Focus Next Month</p>
                <p class="reflect-card-detail">You kept a balanced focus across all your goals this month — nice work.</p>
            `;
            return;
        }

        card.innerHTML = `
            <p class="reflect-card-label">Needs Focus Next Month</p>
            <ul class="reflect-focus-list">
                ${neglected.map(([title, count]) => `<li><span>${title}</span><span>${count} task${count === 1 ? '' : 's'}</span></li>`).join('')}
            </ul>
        `;
    },

    renderDailyChart(log) {
        const chart = document.getElementById('reflect-daily-chart');
        const peakLabel = document.getElementById('reflect-daily-peak');
        if (!chart) return;

        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const counts = new Array(daysInMonth).fill(0);

        log.forEach(item => {
            const d = new Date(item.completedAtISO || item.completedAt);
            if (!isNaN(d) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
                counts[d.getDate() - 1]++;
            }
        });

        const maxCount = Math.max(1, ...counts);
        let peakDay = -1, peakCount = 0;
        counts.forEach((c, i) => { if (c > peakCount) { peakCount = c; peakDay = i + 1; } });

        if (peakLabel) {
            peakLabel.textContent = peakDay === -1
                ? 'No completions logged yet this month.'
                : `Most productive day: ${new Date(now.getFullYear(), now.getMonth(), peakDay).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} (${peakCount} task${peakCount === 1 ? '' : 's'})`;
        }

        chart.innerHTML = counts.map((c, i) => {
            const heightPct = Math.max(4, Math.round((c / maxCount) * 100));
            const isPeak = (i + 1) === peakDay && c > 0;
            return `
                <div class="bar-chart-col">
                    ${c > 0 ? `<span class="bar-chart-value">${c}</span>` : ''}
                    <div class="bar-chart-bar${isPeak ? ' peak' : ''}" style="height:${heightPct}%"></div>
                    <span class="bar-chart-label">${i + 1}</span>
                </div>
            `;
        }).join('');
    },

    renderYearlyChart() {
        const chart = document.getElementById('reflect-yearly-chart');
        if (!chart) return;

        const now = new Date();
        const year = now.getFullYear();
        const archive = DataEngine.getMonthlyArchive(); // { 'YYYY-MM': total }
        const currentLog = DataEngine.getReflectionLog();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const totals = monthNames.map((_, i) => {
            if (i === now.getMonth()) return currentLog.length;
            const key = `${year}-${String(i + 1).padStart(2, '0')}`;
            return archive[key] || 0;
        });

        const maxTotal = Math.max(1, ...totals);

        chart.innerHTML = totals.map((c, i) => {
            const heightPct = Math.max(4, Math.round((c / maxTotal) * 100));
            const isCurrent = i === now.getMonth();
            return `
                <div class="bar-chart-col">
                    ${c > 0 ? `<span class="bar-chart-value">${c}</span>` : ''}
                    <div class="bar-chart-bar${isCurrent ? ' current-month' : ''}" style="height:${heightPct}%"></div>
                    <span class="bar-chart-label">${monthNames[i]}</span>
                </div>
            `;
        }).join('');
    },

    renderLedger(log, logContainer) {
        if (log.length === 0) {
            logContainer.innerHTML = `<p style="color: var(--text-secondary); text-align:center; padding: 40px;">No tasks completed yet this month.</p>`;
            return;
        }

        logContainer.innerHTML = '';
        [...log].reverse().forEach(item => {
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
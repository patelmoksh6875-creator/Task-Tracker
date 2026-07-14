export const DataEngine = {
    // YYYY-MM-DD for "today", local time — used to detect how long a task
    // has been sitting uncompleted (carry-over tracking).
    todayKey() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    // YYYY-MM for "this month" — used to detect when a new month has begun.
    currentMonthKey() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    },

    getGoals() {
        const local = localStorage.getItem('cs_goals');
        return local ? JSON.parse(local) : [
            { id: 'g_1', title: 'Operational Focus', x: 100, y: 150 }
        ];
    },
    saveGoals(goals) { localStorage.setItem('cs_goals', JSON.stringify(goals)); },

    getTasks() {
        const local = localStorage.getItem('cs_tasks');
        return local ? JSON.parse(local) : [];
    },
    saveTasks(tasks) { localStorage.setItem('cs_tasks', JSON.stringify(tasks)); },

    // Rolls the detailed reflection log into the yearly archive whenever a
    // new calendar month has started since it was last checked. This runs
    // lazily on every read so it doesn't matter which page loads first.
    ensureMonthlyRollover() {
        const nowMonth = this.currentMonthKey();
        const trackedMonth = localStorage.getItem('cs_current_log_month');

        if (trackedMonth === null) {
            // First run ever — just start tracking from this month.
            localStorage.setItem('cs_current_log_month', nowMonth);
            return;
        }

        if (trackedMonth !== nowMonth) {
            const log = this.getReflectionLog();
            if (log.length > 0) {
                const archive = this.getMonthlyArchive();
                archive[trackedMonth] = (archive[trackedMonth] || 0) + log.length;
                this.saveMonthlyArchive(archive);
            }
            this.saveReflectionLog([]);
            localStorage.setItem('cs_current_log_month', nowMonth);
        }
    },

    getReflectionLog() {
        this.ensureMonthlyRollover();
        const local = localStorage.getItem('cs_reflection_log');
        return local ? JSON.parse(local) : [];
    },
    saveReflectionLog(log) { localStorage.setItem('cs_reflection_log', JSON.stringify(log)); },

    // Map of "YYYY-MM" -> total tasks completed that month, kept forever so
    // the yearly bar graph still has history after the detailed log resets.
    getMonthlyArchive() {
        const local = localStorage.getItem('cs_monthly_archive');
        return local ? JSON.parse(local) : {};
    },
    saveMonthlyArchive(archive) { localStorage.setItem('cs_monthly_archive', JSON.stringify(archive)); },

    addCompletedLog(task, goalTitle) {
        this.ensureMonthlyRollover();
        const log = this.getReflectionLog();
        const now = new Date();
        log.push({
            id: 'log_' + Date.now(),
            title: task.title,
            timeRange: task.timeRange || 'All-Day',
            goalTitle: goalTitle || 'Rogue Project',
            completedAt: now.toLocaleDateString(),
            completedAtISO: now.toISOString()
        });
        this.saveReflectionLog(log);
    }
};
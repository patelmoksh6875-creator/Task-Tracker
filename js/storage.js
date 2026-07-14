export const DataEngine = {
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

    getReflectionLog() {
        const local = localStorage.getItem('cs_reflection_log');
        return local ? JSON.parse(local) : [];
    },
    saveReflectionLog(log) { localStorage.setItem('cs_reflection_log', JSON.stringify(log)); },

    addCompletedLog(task, goalTitle) {
        const log = this.getReflectionLog();
        log.push({
            id: 'log_' + Date.now(),
            title: task.title,
            timeRange: task.timeRange || 'All-Day',
            goalTitle: goalTitle || 'Rogue Project',
            completedAt: new Date().toLocaleDateString()
        });
        this.saveReflectionLog(log);
    }
};
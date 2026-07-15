import { TaskManager } from './tasks.js';

/**
 * Analytical Performance & Metrics Processor Module
 */
export const StatsManager = {
    getAnalytics() {
        const tasks = TaskManager.getAllTasks();
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.completed).length;
        
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        const totalMinutes = tasks
            .filter(t => t.completed)
            .reduce((sum, t) => sum + (t.duration || 0), 0);

        const categoryDistribution = {
            work: 0,
            personal: 0,
            focus: 0
        };

        tasks.forEach(t => {
            if (t.completed && t.category in categoryDistribution) {
                categoryDistribution[t.category]++;
            }
        });

        return {
            totalTasks,
            completedTasks,
            completionRate,
            totalMinutes,
            categoryDistribution
        };
    }
};
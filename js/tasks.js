import { StorageEngine } from './storage.js';
import { generateId } from './utils.js';

/**
 * Task Management State Module
 */
let tasks = StorageEngine.getTasks();

export const TaskManager = {
    getAllTasks() {
        return tasks;
    },

    addTask(title, category, duration) {
        const newTask = {
            id: generateId(),
            title,
            category,
            duration: parseInt(duration, 10),
            completed: false,
            createdAt: new Date().toISOString()
        };
        tasks.push(newTask);
        StorageEngine.saveTasks(tasks);
        return newTask;
    },

    updateTask(id, updatedFields) {
        tasks = tasks.map(t => t.id === id ? { ...t, ...updatedFields } : t);
        StorageEngine.saveTasks(tasks);
    },

    deleteTask(id) {
        tasks = tasks.filter(t => t.id !== id);
        StorageEngine.saveTasks(tasks);
    },

    reorderTasks(orderedIds) {
        const lookup = new Map(tasks.map(t => [t.id, t]));
        tasks = orderedIds.map(id => lookup.get(id)).filter(Boolean);
        StorageEngine.saveTasks(tasks);
    }
};
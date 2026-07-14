import { TaskManager } from './tasks.js';

/**
 * Native micro-interaction drag & drop sorting orchestrator
 */
export function initDragAndDrop(containerSelector, onReorderCallback) {
    const container = document.querySelector(containerSelector);

    container.addEventListener('dragstart', (e) => {
        const targetCard = e.target.closest('.task-card');
        if (targetCard) {
            targetCard.classList.add('dragging');
        }
    });

    container.addEventListener('dragend', (e) => {
        const targetCard = e.target.closest('.task-card');
        if (targetCard) {
            targetCard.classList.remove('dragging');
            const orderedIds = [...container.querySelectorAll('.task-card')].map(card => card.dataset.id);
            TaskManager.reorderTasks(orderedIds);
            onReorderCallback();
        }
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingCard = container.querySelector('.dragging');
        if (!draggingCard) return;

        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement == null) {
            container.appendChild(draggingCard);
        } else {
            container.insertBefore(draggingCard, afterElement);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}
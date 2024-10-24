/**
 * Logs user behavior by recording details about the interaction with a particular element.
 *
 * @param component - The UI element that the user interacted with.
 * @param action - The action performed by the user (e.g., 'click', 'drag').
 * @param func - The functionality of the performed action (e.g., 'predict a data point').
 * @param details - Additional details or metadata related to the action (e.g., 'data point at (x1, y1)').
 * @returns {void} This function does not return anything.
 *
 * @example
 * // Example usage:
 * logUserBehavior('submitButton', 'click', 'form submission', { formId: 'loginForm' });
 */
export const logUserBehavior = (component, action, func, details) => {
    const logEntry = {
        "timestamp": new Date(),
        "component": component,
        "action": action,
        "function": func,
        "details": details,
    };

    const logs = JSON.parse(localStorage.getItem('userLogs')) || [];
    logs.push(logEntry);
    localStorage.setItem('userLogs', JSON.stringify(logs));
};


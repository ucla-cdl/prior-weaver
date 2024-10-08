
export const logUserBehavior = (action, element, details) => {
    const logEntry = {
        timestamp: new Date(),
        action,
        element,
        details,
    };

    console.log(logEntry); // Log to console or send to server
};


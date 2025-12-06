export const sanitizeInput = (str) => {
    if (typeof str !== 'string') return str;
    
    // Replace potentially dangerous characters
    return str.replace(/[<>&"']/g, (tag) => {
        const chars = {
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return chars[tag] || tag;
    });
};


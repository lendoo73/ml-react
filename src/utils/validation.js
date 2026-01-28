export const validateUrl = (str) => {
    if (typeof str !== "string" || !str.trim()) {
        throw new Error("URL cannot be empty");
    }

    try {
        new URL(str);
    } catch {
        throw new Error("Invalid URL format");
    }
};
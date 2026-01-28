export const getInitialTheme = () => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('theme');
        if (stored) return stored === "dark";
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
};

export const applyTheme = (isDark) => {
    if (typeof document === "undefined") return;

    if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
};
import {useEffect, useState} from "react";
import {applyTheme, getInitialTheme} from "../utils/theme.js";
import {Moon, Sun} from "lucide-react";

export const ThemeToggle = () => {
    const [isDark, setIsDark] = useState(getInitialTheme);

    useEffect(() => {
        applyTheme(isDark);
    }, [isDark]);

    return (
        <button
            onClick={() => setIsDark(!isDark)}
            className="
                fixed bottom-6 right-6 z-50 cursor-pointer
                bg-white text-gray-700 shadow-md rounded-full p-3 transition-all
                dark:bg-gray-800 dark:text-gray-200
                hover:shadow-lg
            "
            aria-label="Toggle theme"
        >
            {isDark ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}
        </button>
    );
};
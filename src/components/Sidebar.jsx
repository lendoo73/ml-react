import version from "../version.json";
import { useLanguage } from "../context/useLanguage.js";
import {Header} from "./Header.jsx";
import {LanguageToggle} from "./LanguageToggle.jsx";

export const Sidebar = ({ activePage, onSelect }) => {
    const { t } = useLanguage();

    const modelLabels = t("models");

    return (
        <aside className="
            w-64 bg-gray-200
            dark:bg-gray-800 dark:text-gray-300
        ">
            <Header />
            <ul>
                {modelLabels.map((page, index) => {
                    return (
                        <li key={index}>
                            <button
                                onClick={() => onSelect(index)}
                                className={`
                                    w-full text-left p-2
                                    ${activePage === index
                                    ? "bg-gray-400 dark:bg-gray-700"
                                    : "hover:bg-gray-300 dark:hover:bg-gray-600"
                                }
                                `}
                            >
                                {page.name}
                            </button>
                        </li>
                    )
                })}
            </ul>
            <div className="fixed bottom-6 left-6 z-50">
                <LanguageToggle />
                <div
                    className="
                        text-gray-800 text-sm mt-4 text-center
                        dark:text-gray-200
                    "
                >v{version.major}.{version.minor}.{version.patch}</div>
            </div>
        </aside>
    );
};

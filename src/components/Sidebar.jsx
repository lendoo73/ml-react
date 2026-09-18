import version from "../version.json";
import {
    ChevronDown,
    ChevronRight,
    Computer,
    Radar,
    ScanSearch,
    Tags,
    Shapes,
    PersonStanding,
    FlaskConical,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLanguage } from "../context/useLanguage.js";
import { Header } from "./Header.jsx";
import { LanguageToggle } from "./LanguageToggle.jsx";

const ICONS_BY_KEY = {
    computerVision: Computer,
    detection: ScanSearch,
    classification: Tags,
    segmentation: Shapes,
    pose: PersonStanding,
    customModel: FlaskConical,
    yolo26: Radar,
};

export const Sidebar = ({ activePageId, onSelect, isOpen, onClose }) => {
    const { t } = useLanguage();
    const [openMenuIds, setOpenMenuIds] = useState(["computer-vision"]);
    const [openSectionIds, setOpenSectionIds] = useState(["computer-vision-classification"]);

    const menus = useMemo(() => t("navigation"), [t]);

    const toggleMenu = (menuId) => {
        setOpenMenuIds((currentMenuIds) => (
            currentMenuIds.includes(menuId)
                ? []
                : [menuId]
        ));
    };

    const toggleSection = (sectionId) => {
        const targetSection = menus
            .flatMap((menu) => menu.sections)
            .find((section) => sectionId.endsWith(`-${section.id}`));
        const isOpen = openSectionIds.includes(sectionId);

        setOpenSectionIds(isOpen ? [] : [sectionId]);

        if (!isOpen) {
            const officialItem = targetSection?.items.find((item) => (
                item.id.includes("official") || item.name.toLowerCase().includes("official")
            ));
            if (officialItem) onSelect(officialItem.id);
        }
    };

    return (
        <aside className={`fixed inset-y-0 right-0 z-40 flex h-screen w-72 flex-shrink-0 flex-col overflow-y-auto border-l border-gray-300 bg-white transition-transform duration-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 md:inset-y-0 md:left-0 md:right-auto md:z-40 md:border-l-0 md:border-r md:translate-x-0 ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
            <Header />
            <nav className="flex-1 px-3 py-4" aria-label={t("sidebarAriaLabel")}>
                <ul className="space-y-2">
                    {menus.map((menu) => {
                        const MenuIcon = ICONS_BY_KEY[menu.iconKey];
                        const isOpen = openMenuIds.includes(menu.id);

                        return (
                            <li key={menu.id} className="rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => toggleMenu(menu.id)}
                                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                                >
                                    <span className="flex items-center gap-3">
                                        {MenuIcon ? <MenuIcon className="h-4 w-4" aria-hidden="true" /> : null}
                                        {menu.name}
                                    </span>
                                    {isOpen ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
                                </button>

                                {isOpen ? (
                                    <div className="mt-2 space-y-4 pl-4">
                                        {menu.sections.map((section) => (
                                            <div key={section.id} className="space-y-1">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSection(`${menu.id}-${section.id}`)}
                                                    className="flex w-full items-center justify-between px-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300"
                                                >
                                                    {section.name}
                                                    {openSectionIds.includes(`${menu.id}-${section.id}`)
                                                        ? <ChevronDown className="h-3 w-3" aria-hidden="true" />
                                                        : <ChevronRight className="h-3 w-3" aria-hidden="true" />}
                                                </button>
                                                {openSectionIds.includes(`${menu.id}-${section.id}`) ? <ul className="space-y-1">
                                                    {section.items.map((item) => {
                                                        const ItemIcon = ICONS_BY_KEY[item.iconKey];
                                                        const isActive = activePageId === item.id;

                                                        return (
                                                            <li key={item.id}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        onSelect(item.id);
                                                                        onClose();
                                                                    }}
                                                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                                                                        isActive
                                                                            ? "bg-blue-600 text-white shadow-sm"
                                                                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                                                    }`}
                                                                >
                                                                    {ItemIcon ? <ItemIcon className="h-4 w-4" aria-hidden="true" /> : null}
                                                                    <span>{item.name}</span>
                                                                </button>
                                                            </li>
                                                        );
                                                    })}
                                                </ul> : null}
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            </nav>
            <div className="border-t border-gray-200 px-4 py-4 dark:border-gray-700">
                <div className="flex justify-center">
                    <LanguageToggle />
                </div>
                <div className="mt-4 flex justify-center text-center text-sm text-gray-600 dark:text-gray-300">
                    v{version.major}.{version.minor}.{version.patch}
                </div>
            </div>
        </aside>
    );
};

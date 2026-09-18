import { Menu, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Sidebar } from "./components/Sidebar.jsx";
import { ModelWorkspace } from "./components/ModelWorkspace.jsx";
import { ThemeToggle } from "./components/ThemeToggle.jsx";
import { useLanguage } from "./context/useLanguage.js";
import { getDefaultModelId, getModelCatalog } from "./utils/modelCatalog.js";

export const App = () => {
    const { language } = useLanguage();
    const modelCatalog = useMemo(() => getModelCatalog(language), [language]);
    const defaultModelId = useMemo(() => getDefaultModelId(language), [language]);
    const [activePageId, setActivePageId] = useState(defaultModelId);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const activeModel = modelCatalog[activePageId] ?? modelCatalog[defaultModelId];

    const handleSelectModel = (modelId) => {
        setActivePageId(modelId);
    };

    return (
        <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
            <Sidebar
                activePageId={activePageId}
                onSelect={handleSelectModel}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            {isSidebarOpen ? (
                <button
                    type="button"
                    className="fixed inset-0 z-30 bg-black/40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                    aria-label="Close navigation"
                />
            ) : null}
            <main className="min-h-screen flex-1 md:ml-72">
                <button
                    type="button"
                    onClick={() => setIsSidebarOpen((isOpen) => !isOpen)}
                    className="fixed right-3 top-3 z-[9999] flex rounded-lg bg-blue-600 p-3 text-white shadow-lg hover:bg-blue-700 md:!hidden"
                    aria-label={isSidebarOpen ? "Close navigation" : "Open navigation"}
                >
                    {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                <ModelWorkspace model={activeModel} />
            </main>
            <ThemeToggle />
        </div>
    );
};

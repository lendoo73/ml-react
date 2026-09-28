import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../context/useLanguage.js";
import { useClassificationClassPreview } from "../hooks/useClassificationClassPreview.js";

const IMAGENET_CLASSES_URL = "https://raw.githubusercontent.com/pytorch/hub/master/imagenet_classes.txt";

export const ClassificationClassSelector = ({ model, onPreview }) => {
    const { t } = useLanguage();
    const fetchClassificationPreview = useClassificationClassPreview();
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [classFilter, setClassFilter] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState("");
    const filteredClasses = useMemo(() => {
        const normalizedFilter = classFilter.trim().toLowerCase();

        return classes
            .map((className, index) => ({ className, index }))
            .filter(({ className }) => (
                normalizedFilter === ""
                || className.toLowerCase().includes(normalizedFilter)
            ));
    }, [classes, classFilter]);

    useEffect(() => {
        const loadClasses = async () => {
            try {
                if (model.classes) {
                    setClasses(model.classes);
                } else {
                    const response = await fetch(model.classSourceUrl ?? IMAGENET_CLASSES_URL);
                    if (!response.ok) throw new Error(`Class request failed with status ${response.status}`);
                    const text = await response.text();
                    setClasses(text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean));
                }
            } catch (loadError) {
                console.error("Unable to load ImageNet classes:", loadError);
                setError(t("ui.classificationClassesError"));
            } finally {
                setIsLoading(false);
            }
        };

        loadClasses();
    }, [model.classSourceUrl, model.classes, t]);

    const handleClassChange = async (event) => {
        const className = event.target.value;
        setSelectedClass(className);
        if (!className) return;

        setError("");
        setIsSearching(true);
        try {
            onPreview(URL.createObjectURL(await fetchClassificationPreview(model, className)), className);
        } catch (searchError) {
            console.error("Unable to load classification class preview:", searchError);
            setError(t("ui.classificationSearchError"));
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="mt-6 w-full border-t border-gray-200 pt-5 dark:border-gray-700">
            <label htmlFor="classification-class-select" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                {t("ui.selectClassificationClass")}
            </label>
            <div className="relative mt-2">
                <button
                    type="button"
                    disabled={isLoading || isSearching}
                    onClick={() => setIsOpen((open) => !open)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                    {selectedClass || (isLoading ? t("ui.loadingClasses") : t("ui.chooseClassificationClass"))}
                </button>
                {isOpen ? (
                    <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-gray-300 bg-white p-2 shadow-xl dark:border-gray-600 dark:bg-gray-700">
                        <input
                            autoFocus
                            type="search"
                            value={classFilter}
                            onChange={(event) => setClassFilter(event.target.value)}
                            placeholder={t("ui.filterClassificationClasses")}
                            className="mb-2 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                        <div className="max-h-64 overflow-y-auto">
                            {filteredClasses.map(({ className, index }) => {
                                return (
                                    <button
                                        type="button"
                                        key={`${className}-${index}`}
                                        onClick={() => {
                                            handleClassChange({ target: { value: className } });
                                            setIsOpen(false);
                                            setClassFilter("");
                                        }}
                                        className="block w-full rounded px-2 py-1.5 text-left text-sm text-gray-900 hover:bg-blue-100 dark:text-white dark:hover:bg-gray-600"
                                    >
                                        {index}. {className}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </div>
            {isSearching ? <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t("ui.loadingClassPreview")}</p> : null}
            {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-300" role="alert">{error}</p> : null}
        </div>
    );
};

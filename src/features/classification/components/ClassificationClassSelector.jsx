import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../context/useLanguage.js";
import { useClassificationClassPreview } from "../hooks/useClassificationClassPreview.js";

const IMAGENET_CLASSES_URL = "https://raw.githubusercontent.com/pytorch/hub/master/imagenet_classes.txt";

export const ClassificationClassSelector = ({ model, onPreview }) => {
    const { t } = useLanguage();
    const fetchClassificationPreview = useClassificationClassPreview();
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
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

    const handleClassChange = async (className) => {
        setSelectedClass(className);

        setError("");
        setIsSearching(true);
        try {
            const { blob, sourceUrl } = await fetchClassificationPreview(model, className);
            onPreview(URL.createObjectURL(blob), className, sourceUrl);
        } catch (searchError) {
            console.error("Unable to load classification class preview:", searchError);
            setError(t("ui.classificationSearchError"));
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="mt-6 w-full border-t border-gray-200 pt-5 dark:border-gray-700">
            <label htmlFor="classification-class-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                {t("ui.selectClassificationClass")}
            </label>
            <input
                id="classification-class-filter"
                type="search"
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
                placeholder={t("ui.filterClassificationClasses")}
                className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
            />
            <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/30">
                {isLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
                        {t("ui.loadingClasses")}
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {filteredClasses.map(({ className, index }) => (
                            <button
                                key={`${className}-${index}`}
                                type="button"
                                disabled={isSearching}
                                onClick={() => void handleClassChange(className)}
                                aria-pressed={selectedClass === className}
                                className={`cursor-pointer rounded-full px-3 py-1 text-left text-sm transition disabled:cursor-wait disabled:opacity-60 ${selectedClass === className
                                    ? "bg-blue-600 text-white dark:bg-blue-500"
                                    : "bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-100 dark:hover:bg-blue-900/70"
                                }`}
                            >
                                {className}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {isSearching ? <p className="mt-2 text-sm text-gray-500 dark:text-gray-400" aria-live="polite">{t("ui.loadingClassPreview")}</p> : null}
            {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-300" role="alert">{error}</p> : null}
        </div>
    );
};

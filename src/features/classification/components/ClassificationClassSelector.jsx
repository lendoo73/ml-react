import { useEffect, useState } from "react";
import { useLanguage } from "../../../context/useLanguage.js";
import { fetchClassificationPreview } from "../services/classificationService.js";

const IMAGENET_CLASSES_URL = "https://raw.githubusercontent.com/pytorch/hub/master/imagenet_classes.txt";

export const ClassificationClassSelector = ({ model, onPreview }) => {
    const { t } = useLanguage();
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadClasses = async () => {
            try {
                const response = await fetch(model.classSourceUrl ?? IMAGENET_CLASSES_URL);
                if (!response.ok) throw new Error(`ImageNet class request failed with status ${response.status}`);
                const text = await response.text();
                setClasses(text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean));
            } catch (loadError) {
                console.error("Unable to load ImageNet classes:", loadError);
                setError(t("ui.classificationClassesError"));
            } finally {
                setIsLoading(false);
            }
        };

        loadClasses();
    }, [model.classSourceUrl, t]);

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
            <select
                id="classification-class-select"
                value={selectedClass}
                onMouseDown={() => {
                    if (selectedClass) setSelectedClass("");
                }}
                onChange={handleClassChange}
                disabled={isLoading || isSearching}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
                <option value="">{isLoading ? t("ui.loadingClasses") : t("ui.chooseClassificationClass")}</option>
                {classes.map((className, index) => (
                    <option key={`${className}-${index}`} value={className}>{index}. {className}</option>
                ))}
            </select>
            {isSearching ? <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t("ui.loadingClassPreview")}</p> : null}
            {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-300" role="alert">{error}</p> : null}
        </div>
    );
};

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../context/useLanguage.js";
import { ModelClassLabels } from "../../../components/ModelClassLabels.jsx";
import { useInstanceSegmentationClassPreview } from "../hooks/useInstanceSegmentationClassPreview.js";

export const InstanceSegmentationClassBrowser = ({ model, inline = false }) => {
    const Container = inline ? "div" : "section";
    const { t } = useLanguage();
    const fetchPreview = useInstanceSegmentationClassPreview();
    const [filter, setFilter] = useState("");
    const [preview, setPreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const filteredClasses = useMemo(() => model.classes.filter((className) => (
        className.toLowerCase().includes(filter.trim().toLowerCase())
    )), [filter, model.classes]);

    useEffect(() => () => {
        if (preview?.url) URL.revokeObjectURL(preview.url);
    }, [preview]);

    const selectClass = async (className) => {
        setIsLoading(true);
        setError("");
        try {
            const { blob, sourceUrl } = await fetchPreview(model, className);
            setPreview({ className, url: URL.createObjectURL(blob), sourceUrl });
        } catch (previewError) {
            console.error("Unable to load instance segmentation class preview:", previewError);
            setError(model.info?.previewError ?? t("ui.instanceSegmentationPreviewError"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Container className={inline ? "" : "rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"}>
            {!inline ? (
                <div>
                    <h2 className="text-xl font-semibold">{t("ui.instanceSegmentationClasses")}</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                        {t("ui.selectInstanceSegmentationClass")}
                    </p>
                </div>
            ) : null}
            <input
                type="search"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder={t("ui.filterClassificationClasses")}
                aria-label={t("ui.filterClassificationClasses")}
                className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {!inline ? (
                <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
                    {filteredClasses.map((className) => (
                        <button
                            key={className}
                            type="button"
                            onClick={() => void selectClass(className)}
                            disabled={isLoading}
                            className={`cursor-pointer rounded-lg bg-gray-100 px-3 py-2 text-left text-sm text-gray-800 transition hover:bg-blue-100 hover:text-blue-800 disabled:cursor-wait disabled:opacity-60 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-blue-900 dark:hover:text-blue-100 ${preview?.className === className ? "ring-2 ring-blue-500" : ""}`}
                        >
                            {className}
                        </button>
                    ))}
                </div>
            ) : (
                <ModelClassLabels
                    classes={filteredClasses}
                    onSelectClass={(className) => void selectClass(className)}
                    isLoading={isLoading}
                    descriptions={model.info?.classDescriptions}
                />
            )}
            {isLoading ? (
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
                    {model.info?.loadingPreview ?? t("ui.loadingClassPreview")}
                </p>
            ) : null}
            {error ? <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
            {preview ? (
                <div className="mt-6 border-t border-gray-200 pt-5 dark:border-gray-700">
                    <div className="mb-4 flex items-center justify-between gap-4">
                        <h3 className="text-lg font-semibold">
                            {model.info?.previewTitle ?? t("ui.instanceSegmentationRandomPreview")}: {preview.className}
                        </h3>
                        <button
                            type="button"
                            onClick={() => setPreview(null)}
                            className="cursor-pointer rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
                            aria-label={model.info?.closePreview ?? t("ui.closePreview")}
                        >
                            <X className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>
                    <a
                        href={preview.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={t("ui.openOriginalImage")}
                        className="block cursor-pointer"
                    >
                        <img
                            src={preview.url}
                            alt={`${preview.className} ${model.info?.previewAlt ?? t("ui.instanceSegmentationPreviewAlt")}`}
                            className="max-h-[36rem] w-full rounded-xl bg-black object-contain"
                        />
                    </a>
                </div>
            ) : null}
        </Container>
    );
};

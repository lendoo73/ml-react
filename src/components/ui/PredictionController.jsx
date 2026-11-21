import { Maximize, Minimize } from "lucide-react";
import { AnnotationSizeControl } from "./AnnotationSizeControl.jsx";
import { Checkbox } from "./Checkbox.jsx";
import { ConfidenceThresholdControl } from "./ConfidenceThresholdControl.jsx";
import { FullscreenMediaLayout } from "./FullscreenMediaLayout.jsx";
import { useLanguage } from "../../context/useLanguage.js";

export const PredictionController = ({
    containerRef,
    isFullscreen,
    onToggleFullscreen,
    media,
    modelSections = [],
    confidenceThresholds = [],
    annotationOptions = [],
    annotationSize,
    onAnnotationSizeChange,
    className = "",
    mediaClassName = "",
}) => {
    const { t } = useLanguage();

    return (
        <FullscreenMediaLayout
            containerRef={containerRef}
            isFullscreen={isFullscreen}
            className={className}
            media={<div className={`relative min-w-0 ${mediaClassName}`}>{media}</div>}
            controls={(
                <div className={`space-y-4 ${isFullscreen ? "" : "rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"}`}>
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("ui.predictionControls")}</h2>
                        <button
                            type="button"
                            onClick={() => void onToggleFullscreen()}
                            className="cursor-pointer rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700"
                            aria-label={isFullscreen ? t("ui.exitFullscreen") : t("ui.enterFullscreen")}
                            title={isFullscreen ? t("ui.exitFullscreen") : t("ui.enterFullscreen")}
                        >
                            {isFullscreen
                                ? <Minimize className="h-4 w-4" aria-hidden="true" />
                                : <Maximize className="h-4 w-4" aria-hidden="true" />}
                        </button>
                    </div>
                    {modelSections.map((section) => (
                        <section
                            key={section.id}
                            className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800"
                        >
                            <h3 className="mb-3 border-b border-gray-200 pb-2 text-center font-semibold dark:border-gray-700">
                                {section.title}
                            </h3>
                            {section.content}
                        </section>
                    ))}
                    {confidenceThresholds.map((threshold) => (
                        <section key={threshold.id} aria-label={threshold.label}>
                            <ConfidenceThresholdControl
                                value={threshold.value}
                                onChange={threshold.onChange}
                                label={threshold.label}
                                debounceMs={threshold.debounceMs}
                            />
                        </section>
                    ))}
                    {annotationOptions.length || onAnnotationSizeChange ? (
                        <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <h3 className="mb-3 border-b border-gray-200 pb-2 text-center font-semibold dark:border-gray-700">
                                {t("image.annotationOptions")}
                            </h3>
                            {annotationOptions.map((option) => (
                                <Checkbox
                                    key={option.id}
                                    checked={option.checked}
                                    onChange={(event) => option.onChange(event.target.checked)}
                                    className="mb-2 text-xs"
                                >
                                    <span>{option.label}</span>
                                </Checkbox>
                            ))}
                            {onAnnotationSizeChange ? (
                                <AnnotationSizeControl
                                    value={annotationSize}
                                    onChange={onAnnotationSizeChange}
                                />
                            ) : null}
                        </section>
                    ) : null}
                </div>
            )}
        />
    );
};

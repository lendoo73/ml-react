import { Minus, Plus } from "lucide-react";
import { useLanguage } from "../../context/useLanguage.js";

export const AnnotationSizeControl = ({ value, onChange }) => {
    const { t } = useLanguage();
    const updateValue = (nextValue) => onChange(Math.min(2, Math.max(0.5, nextValue)));
    const formattedValue = Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/0$/, "");

    return (
        <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span>{t("image.annotationSize")}</span>
                <span className="tabular-nums text-gray-500 dark:text-gray-400">{formattedValue}x</span>
            </div>
            <div className="flex items-center gap-2">
                <button type="button" onClick={() => updateValue(value - 0.25)} className="rounded-lg bg-blue-600 p-1 text-white hover:bg-blue-700" aria-label={t("image.decreaseAnnotationSize")}>
                    <Minus className="h-3 w-3" />
                </button>
                <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.25"
                    value={value}
                    onChange={(event) => updateValue(Number(event.target.value))}
                    className="min-w-0 flex-1 accent-blue-600"
                    aria-label={t("image.annotationSize")}
                />
                <button type="button" onClick={() => updateValue(value + 0.25)} className="rounded-lg bg-blue-600 p-1 text-white hover:bg-blue-700" aria-label={t("image.increaseAnnotationSize")}>
                    <Plus className="h-3 w-3" />
                </button>
            </div>
        </div>
    );
};

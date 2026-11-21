import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "../../context/useLanguage.js";

export const ConfidenceThresholdControl = ({ value, onChange, label, debounceMs = 1000 }) => {
    const { t } = useLanguage();
    const [pendingValue, setPendingValue] = useState(value);

    useEffect(() => {
        setPendingValue(value);
    }, [value]);

    useEffect(() => {
        if (pendingValue === value) return undefined;
        if (debounceMs <= 0) {
            onChange(pendingValue);
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            onChange(pendingValue);
        }, debounceMs);

        return () => window.clearTimeout(timeoutId);
    }, [debounceMs, onChange, pendingValue, value]);

    const updateValue = (nextValue) => setPendingValue(Math.min(1, Math.max(0, nextValue)));

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold">
                <span>{label ?? t("image.confidenceThreshold")}</span>
                <span className="tabular-nums text-gray-500 dark:text-gray-400">
                    {Math.round(pendingValue * 100)}%
                </span>
            </div>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => updateValue(pendingValue - 0.05)}
                    className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700"
                    aria-label={t("image.decreaseConfidenceThreshold")}
                >
                    <Minus className="h-4 w-4" />
                </button>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={pendingValue}
                    onChange={(event) => updateValue(Number(event.target.value))}
                    className="min-w-0 flex-1 accent-blue-600"
                    aria-label={t("image.confidenceThreshold")}
                />
                <button
                    type="button"
                    onClick={() => updateValue(pendingValue + 0.05)}
                    className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700"
                    aria-label={t("image.increaseConfidenceThreshold")}
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

import { useId } from "react";
import { Tooltip } from "./ui/Tooltip.jsx";

export const ModelClassLabels = ({
    classes = [],
    onSelectClass,
    isLoading = false,
    descriptions = {},
}) => {
    const tooltipIdPrefix = useId();
    if (classes.length === 0) return null;

    return (
        <ul className="mt-4 flex flex-wrap gap-2">
            {classes.map((className) => {
                const tooltipId = `${tooltipIdPrefix}-${className.toLowerCase()}`;
                return (
                    <li key={className} className="group relative">
                        {onSelectClass ? (
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => onSelectClass(className)}
                                aria-describedby={descriptions[className] ? tooltipId : undefined}
                                className="cursor-pointer rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800 transition hover:bg-blue-100 disabled:cursor-wait disabled:opacity-50 dark:bg-blue-900/40 dark:text-blue-100 dark:hover:bg-blue-900/70"
                            >
                                {className}
                            </button>
                        ) : (
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800 dark:bg-blue-900/40 dark:text-blue-100">
                                {className}
                            </span>
                        )}
                        {descriptions[className] ? (
                            <Tooltip
                                id={tooltipId}
                                className="left-0 group-focus-within:visible group-focus-within:opacity-100"
                            >
                                {descriptions[className]}
                            </Tooltip>
                        ) : null}
                    </li>
                );
            })}
        </ul>
    );
};

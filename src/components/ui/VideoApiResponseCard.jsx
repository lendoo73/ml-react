import { useId } from "react";
import { Info } from "lucide-react";
import { Checkbox } from "./Checkbox.jsx";
import { VideoFrameResponse } from "./VideoFrameResponse.jsx";
import { ApiResponseCard } from "./ApiResponseCard.jsx";

export const VideoApiResponseCard = ({
    frames,
    currentFrame,
    onSelectFrame,
    videoRef,
    syncEnabled,
    onSyncChange,
    apiResponseLabel,
    apiResponseTooltip,
    syncLabel,
    className = "",
}) => {
    const tooltipId = useId();

    return (
        <ApiResponseCard
            headerContent={(
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                        {apiResponseLabel}
                        {apiResponseTooltip ? (
                            <span className="group relative inline-flex">
                                <button
                                    type="button"
                                    aria-label={apiResponseTooltip}
                                    aria-describedby={tooltipId}
                                    className="cursor-help rounded-full text-blue-800 hover:text-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 dark:text-blue-200 dark:hover:text-white"
                                >
                                    <Info aria-hidden="true" className="h-4 w-4" />
                                </button>
                                <span
                                    id={tooltipId}
                                    role="tooltip"
                                    className="pointer-events-none invisible absolute left-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-600 bg-gray-900 p-3 text-left text-xs font-normal leading-relaxed text-white opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                                >
                                    {apiResponseTooltip}
                                </span>
                            </span>
                        ) : null}
                    </span>
                    <Checkbox checked={syncEnabled} onChange={onSyncChange} className="text-sm font-normal" checkboxClassName="h-5 w-5">
                        <span>{syncLabel}</span>
                    </Checkbox>
                </div>
            )}
            className={className}
        >
            <VideoFrameResponse
                frames={frames}
                currentFrame={currentFrame}
                onSelectFrame={onSelectFrame}
                syncEnabled={syncEnabled}
                videoRef={videoRef}
            />
        </ApiResponseCard>
    );
};

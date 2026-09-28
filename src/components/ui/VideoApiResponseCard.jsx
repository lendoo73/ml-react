import { Checkbox } from "./Checkbox.jsx";
import { VideoFrameResponse } from "./VideoFrameResponse.jsx";
import { ApiResponseCard } from "./ApiResponseCard.jsx";

export const VideoApiResponseCard = ({
    frames,
    currentFrame,
    onSelectFrame,
    syncEnabled,
    onSyncChange,
    apiResponseLabel,
    syncLabel,
    className = "",
}) => (
    <ApiResponseCard
        headerContent={(
            <div className="flex items-center justify-between">
                <span>{apiResponseLabel}</span>
                <Checkbox checked={syncEnabled} onChange={onSyncChange} className="text-sm font-normal" checkboxClassName="h-5 w-5">
                    <span>{syncLabel}</span>
                </Checkbox>
            </div>
        )}
        className={className}
    >
        <VideoFrameResponse frames={frames} currentFrame={currentFrame} onSelectFrame={onSelectFrame} syncEnabled={syncEnabled} />
    </ApiResponseCard>
);

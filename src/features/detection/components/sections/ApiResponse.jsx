import { ApiResponseCard } from "../../../../components/ui/ApiResponseCard.jsx";
import { VideoApiResponseCard } from "../../../../components/ui/VideoApiResponseCard.jsx";
import { useLanguage } from "../../../../context/useLanguage.js";
import { useState } from "react";

export const ApiResponse = ({ result, sourceId, videoResponse }) => {
    const { t } = useLanguage();
    const [syncEnabled, setSyncEnabled] = useState(false);
    const [selectedFrame, setSelectedFrame] = useState(null);
    const currentFrame = selectedFrame?.response === videoResponse
        ? selectedFrame.frame
        : videoResponse?.currentFrame;
    if (sourceId === "video" && videoResponse?.frames?.length) {
        return (
            <VideoApiResponseCard
                {...videoResponse}
                currentFrame={currentFrame ?? videoResponse.currentFrame}
                onSelectFrame={(frame, index) => {
                    videoResponse.onSelectFrame?.(frame, index);
                    setSelectedFrame({ response: videoResponse, frame });
                }}
                syncEnabled={syncEnabled}
                onSyncChange={(event) => setSyncEnabled(event.target.checked)}
                apiResponseLabel={t("ui.apiResponse")}
                syncLabel={t("ui.syncVideoFrame")}
            />
        );
    }
    if (!result || sourceId !== "image") return null;
    return <ApiResponseCard data={result} label={t("ui.apiResponse")} />;
};

import { useLanguage } from "../../../../context/useLanguage.js";
import { ApiResponseCard } from "../../../../components/ui/ApiResponseCard.jsx";
import { VideoApiResponseCard } from "../../../../components/ui/VideoApiResponseCard.jsx";

export const ApiResponse = ({ result, isVideoSource = false, isWebcamSource = false, videoResponse }) => {
    const { t } = useLanguage();

    if (isWebcamSource) return null;

    if (isVideoSource) {
        if (!videoResponse?.frames?.length) return null;

        return (
            <VideoApiResponseCard
                {...videoResponse}
                apiResponseLabel={t("ui.apiResponse")}
                syncLabel={t("ui.syncVideoFrame")}
            />
        );
    }

    if (!result) return null;

    return <ApiResponseCard data={result} label={t("ui.apiResponse")} />;
};

import { PredictImage } from "../PredictImage.jsx";
import { PredictVideo } from "../PredictVideo.jsx";
import { WebcamPredictor } from "../WebcamPredictor.jsx";

export const SourceInput = ({ model, sourceId, onChange, onPredictionStart, onPredictionPending, onPredictionControlsReady, onVideoResponseChange, randomMediaSearchTerms }) => {
    const cardClass = "rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800";

    if (sourceId === "image") {
        return (
            <PredictImage
                model={model}
                onChange={onChange}
                onPredictionStart={onPredictionStart}
                onPredictionPending={onPredictionPending}
                onPredictionControlsReady={onPredictionControlsReady}
                randomMediaSearchTerms={randomMediaSearchTerms}
                showPredictionResult={false}
            />
        );
    }
    if (sourceId === "video") {
        return (
            <PredictVideo
                model={model}
                supportsTracking={model.supportsTracking ?? true}
                onResponseChange={onVideoResponseChange}
                showApiResponse={false}
                randomVideoSearchTerms={randomMediaSearchTerms}
            />
        );
    }
    return (
        <div className={cardClass}>
            <WebcamPredictor model={model} supportsTracking={model.supportsTracking ?? true} />
        </div>
    );
};

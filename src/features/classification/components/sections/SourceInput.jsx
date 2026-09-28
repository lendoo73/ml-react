import { useLanguage } from "../../../../context/useLanguage.js";
import { ClassificationImage } from "../ClassificationImage.jsx";
import { ClassificationVideo } from "../ClassificationVideo.jsx";
import { ClassificationWebcam } from "../ClassificationWebcam.jsx";
import { ModelPlaceholder } from "../../../../components/ModelPlaceholder.jsx";

export const SourceInput = ({ model, sourceId, onChange, onPredictionStart, onPredictionPending, onPredictionControlsReady, onVideoResponseChange }) => {
    const { t } = useLanguage();

    if (model.status === "placeholder") {
        return <ModelPlaceholder model={model} />;
    }

    return (
        <div className={sourceId === "video" ? "" : "rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"}>
            {sourceId === "image" ? (
                <ClassificationImage
                    model={model}
                    onChange={onChange}
                    onPredictionStart={onPredictionStart}
                    onPredictionPending={onPredictionPending}
                    onPredictionControlsReady={onPredictionControlsReady}
                />
            ) : null}
            {sourceId === "video" ? (
                model.supportedInputs.includes("video")
                    ? (
                        <ClassificationVideo
                            model={model}
                            onPredictionStart={onPredictionStart}
                            onVideoResponseChange={onVideoResponseChange}
                        />
                    )
                    : <p className="text-sm text-gray-500 dark:text-gray-400">{t("ui.modeUnavailable")}</p>
            ) : null}
            {sourceId === "webcam" ? (
                model.supportedInputs.includes("webcam")
                    ? <ClassificationWebcam model={model} onChange={onChange} />
                    : <p className="text-sm text-gray-500 dark:text-gray-400">{t("ui.modeUnavailable")}</p>
            ) : null}
        </div>
    );
};

import {useState} from "react";
import {useLanguage} from "../context/useLanguage.js";
import {MediaToggle} from "./ui/MediaToggle.jsx";
import {PredictImage} from "../features/detection/components/PredictImage.jsx";
import {PredictVideo} from "../features/detection/components/PredictVideo.jsx";

export const PassengerCounter = () => {
    const [mode, setMode] = useState("image");
    const { t } = useLanguage();
    const model = t("models.passenger-counter");

    return (
        <div className="flex flex-col items-center gap-6 pt-6 min-h-screen bg-gray-100 text-gray-900
                dark:bg-gray-900 dark:text-gray-300
        ">
            <h1 className="text-center text-3xl font-bold">
                {model.name}
            </h1>
            <div className="mt-3 w-full flex justify-center">
                <MediaToggle
                    mode={mode}
                    onChange={setMode}
                    imageLabel={model.mode.image.name}
                    videoLabel={model.mode.video.name}
                    ariaLabel={t("ui.selectInputType")}
                />
            </div>
            {mode === "image" && (
                <PredictImage model={model} />
            )}
            {mode === "video" && (
                <PredictVideo model={model} />
            )}
        </div>
    );
};

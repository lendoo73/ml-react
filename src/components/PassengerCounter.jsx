import {useState} from "react";
import {useLanguage} from "../context/useLanguage.js";
import {MediaToggle} from "./ui/MediaToggle.jsx";
import {PredictImage} from "./PredictImage.jsx";
import {PredictVideo} from "./PredictVideo.jsx";

export const PassengerCounter = () => {
    const [mode, setMode] = useState("image");
    const {t} = useLanguage();

    return (
        <div className="flex flex-col items-center gap-6 pt-6 min-h-screen bg-gray-100 text-gray-900
                dark:bg-gray-900 dark:text-gray-300
        ">
            <h1 className="text-center text-3xl font-bold">
                {t("models.0.name")}
            </h1>
            <div className="mt-3 w-full flex justify-center">
                <MediaToggle
                    mode={mode}
                    onChange={setMode}
                    imageLabel={t("models.0.mode.image.name")}
                    videoLabel={t("models.0.mode.video.name")}
                    ariaLabel={"Select input type"}
                />
            </div>
            {mode === "image" && (
                <PredictImage />
            )}
            {mode === "video" && (
                <PredictVideo />
            )}
        </div>
    );
};

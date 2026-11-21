import { useCallback, useRef, useState } from "react";
import { ClassificationPageLayout } from "../../../classification/components/sections/ClassificationPageLayout.jsx";
import { Hero } from "../../../classification/components/sections/Hero.jsx";
import { SourceCards } from "../../../classification/components/sections/SourceCards.jsx";
import { PoseVideo } from "../../components/PoseVideo.jsx";
import { PoseWebcam } from "../../components/PoseWebcam.jsx";
import { addBicepCurlMetricsToFrames } from "../../utils/addBicepCurlMetricsToFrames.js";
import { updateBicepCurlCounters } from "../../utils/updateBicepCurlCounters.js";

const BICEP_CURL_ANGLES = [
    ["left_shoulder", "left_elbow", "left_wrist"],
    ["right_shoulder", "right_elbow", "right_wrist"],
];
const BICEP_CURL_KEYPOINTS = BICEP_CURL_ANGLES.flat();
const PREVIEW_SEARCH_TERMS = ["bicep curl", "person lifting weights", "weightlifting"];
const COUNTER_THRESHOLDS = {
    flexed: 50,
    extended: 120,
};

export const BicepCurlCounter = ({ model }) => {
    const [activeSourceId, setActiveSourceId] = useState("video");
    const [liveCounters, setLiveCounters] = useState([]);
    const [counterVisibility, setCounterVisibility] = useState({});
    const liveCountersRef = useRef(new Map());
    const sources = ["video", "webcam"].map((id) => ({
        id,
        name: model.mode[id].name,
        description: model.mode[id].description,
    }));
    const resetLiveCounter = useCallback((trackId) => {
        if (trackId != null) {
            const counters = new Map(liveCountersRef.current);
            counters.delete(trackId);
            liveCountersRef.current = counters;
            setLiveCounters([...counters.values()]);
            return;
        }
        liveCountersRef.current = new Map();
        setLiveCounters([]);
    }, []);
    const handleLiveFrame = useCallback((frame) => {
        liveCountersRef.current = updateBicepCurlCounters(
            liveCountersRef.current,
            frame,
            BICEP_CURL_ANGLES,
            COUNTER_THRESHOLDS,
        );
        setLiveCounters([...liveCountersRef.current.values()]);
    }, []);
    const handleSourceChange = (sourceId) => {
        resetLiveCounter();
        setCounterVisibility({});
        setActiveSourceId(sourceId);
    };
    const handleCounterVisibilityChange = useCallback((trackId, metric, visible) => {
        setCounterVisibility((current) => ({
            ...current,
            [trackId]: { ...current[trackId], [metric]: visible },
        }));
    }, []);
    const addVideoMetrics = (frames) => addBicepCurlMetricsToFrames(
        frames,
        BICEP_CURL_ANGLES,
        COUNTER_THRESHOLDS,
    );

    return (
        <ClassificationPageLayout>
            <Hero {...model.hero} image="/images/bicep_curl_counter-sample.jpg" />
            <SourceCards sources={sources} selectedSourceId={activeSourceId} onSelect={handleSourceChange} />
            {activeSourceId === "video" ? (
                <PoseVideo
                    model={model}
                    angles={BICEP_CURL_ANGLES}
                    defaultSelectedKeypoints={BICEP_CURL_KEYPOINTS}
                    defaultShowLabels={false}
                    defaultShowConfidence={false}
                    previewSearchTerms={PREVIEW_SEARCH_TERMS}
                    transformResult={addVideoMetrics}
                    counterVisibility={counterVisibility}
                    onCounterVisibilityChange={handleCounterVisibilityChange}
                    counterLabels={model.counterLabels}
                    counterPersonLabel={model.personLabel}
                    apiResponseTooltip={model.counterResponseTooltip}
                />
            ) : (
                <PoseWebcam
                    model={model}
                    angles={BICEP_CURL_ANGLES}
                    defaultSelectedKeypoints={BICEP_CURL_KEYPOINTS}
                    defaultShowLabels={false}
                    defaultShowConfidence={false}
                    onFrame={handleLiveFrame}
                    onPredictionStart={resetLiveCounter}
                    counterMetrics={liveCounters}
                    counterVisibility={counterVisibility}
                    onCounterVisibilityChange={handleCounterVisibilityChange}
                    onResetCounter={resetLiveCounter}
                    counterLabels={model.counterLabels}
                    counterPersonLabel={model.personLabel}
                />
            )}
        </ClassificationPageLayout>
    );
};

import { ApiResponse } from "../../components/sections/ApiResponse.jsx";
import { DetectionEvaluation } from "../../components/sections/DetectionEvaluation.jsx";
import { PredictionResult } from "../../components/sections/PredictionResult.jsx";
import { RandomPrediction } from "../../components/sections/RandomPrediction.jsx";
import { SourceInput } from "../../components/sections/SourceInput.jsx";
import { SourceCards } from "../../../classification/components/sections/SourceCards.jsx";
import { Hero } from "../../../classification/components/sections/Hero.jsx";
import { ClassificationPageLayout } from "../../../classification/components/sections/ClassificationPageLayout.jsx";
import { useDetectionWorkspace } from "../../hooks/useDetectionWorkspace.js";
import { confusionMatrixData } from "./evaluation/confusionMatrixData.js";

const ROAD_SIGN_CLASSES = ["Speedlimit", "Trafficlight", "Stop", "Crosswalk"];
const ROAD_SIGN_CLASS_SEARCH_QUERIES = {
    Speedlimit: "speed limit road sign",
    Trafficlight: "traffic light",
    Stop: "stop road sign",
    Crosswalk: "crosswalk road sign",
};

export const RoadSignDetection = ({ model }) => {
    const workspace = useDetectionWorkspace();
    const pageModel = {
        ...model,
        apiPath: "object_detection",
        apiModel: "road-sign-detect",
        classSearchQueries: ROAD_SIGN_CLASS_SEARCH_QUERIES,
    };
    const sourceIds = ["image", "video", "webcam"];

    return (
        <ClassificationPageLayout>
            <Hero {...pageModel.hero} image="/images/detect-roadsign-sample.jpg" links={[]} />
            <RandomPrediction model={pageModel} classes={ROAD_SIGN_CLASSES} />
            <DetectionEvaluation
                confusionMatrixData={confusionMatrixData}
                tensorBoardUrl="http://localhost:6006"
            />
            <SourceCards
                sources={sourceIds.map((id) => ({
                    id,
                    name: pageModel.mode?.[id]?.name ?? id,
                    description: pageModel.mode?.[id]?.description ?? "",
                }))}
                selectedSourceId={workspace.activeSourceId}
                onSelect={workspace.onSourceChange}
            />
            <SourceInput
                model={pageModel}
                sourceId={workspace.activeSourceId}
                onChange={workspace.onResultChange}
                onPredictionStart={workspace.onPredictionStart}
                onPredictionPending={workspace.onPredictionPending}
                onPredictionControlsReady={workspace.onPredictionControlsReady}
                onVideoResponseChange={workspace.setVideoResponse}
                randomMediaSearchTerms={ROAD_SIGN_CLASSES}
            />
            {workspace.activeSourceId === "image" ? (
                <PredictionResult
                    result={workspace.result}
                    image={workspace.previewImage}
                    model={pageModel}
                    isPending={workspace.isResultPending}
                    confidenceThreshold={workspace.confidenceThreshold}
                    onConfidenceThresholdChange={workspace.onConfidenceThresholdChange}
                />
            ) : null}
            <ApiResponse result={workspace.result} sourceId={workspace.activeSourceId} videoResponse={workspace.videoResponse} />
        </ClassificationPageLayout>
    );
};

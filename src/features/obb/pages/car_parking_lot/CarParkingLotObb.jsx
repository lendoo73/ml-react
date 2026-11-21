import { ApiResponse } from "../../../detection/components/sections/ApiResponse.jsx";
import { DetectionEvaluation } from "../../../detection/components/sections/DetectionEvaluation.jsx";
import { PredictionResult } from "../../../detection/components/sections/PredictionResult.jsx";
import { RandomPrediction } from "../../../detection/components/sections/RandomPrediction.jsx";
import { SourceInput } from "../../../detection/components/sections/SourceInput.jsx";
import { SourceCards } from "../../../classification/components/sections/SourceCards.jsx";
import { Hero } from "../../../classification/components/sections/Hero.jsx";
import { ClassificationPageLayout } from "../../../classification/components/sections/ClassificationPageLayout.jsx";
import { useDetectionWorkspace } from "../../../detection/hooks/useDetectionWorkspace.js";

const CAR_PARKING_LOT_CLASSES = ["Car", "Empty space"];
const CAR_PARKING_LOT_SEARCH_QUERIES = {
    Car: "top down aerial view parking lot cars",
    "Empty space": "top down aerial view empty parking spaces",
};

export const CarParkingLotObb = ({ model }) => {
    const workspace = useDetectionWorkspace();
    const pageModel = {
        ...model,
        apiPath: "oriented_bounding_box",
        apiModel: "car-parking-lot",
        resultType: "detection",
        supportedInputs: ["image", "video", "webcam"],
        supportsTracking: true,
        supportsOrientedBoxes: true,
        classes: CAR_PARKING_LOT_CLASSES,
        classSearchQueries: CAR_PARKING_LOT_SEARCH_QUERIES,
    };
    const sourceIds = pageModel.supportedInputs;

    return (
        <ClassificationPageLayout>
            <Hero {...model.hero} image="/images/car_parking_lot-sample.jpg" links={[]} />
            <RandomPrediction model={pageModel} classes={CAR_PARKING_LOT_CLASSES} />
            <DetectionEvaluation underConstruction tensorBoardUrl="http://localhost:6006" />
            <SourceCards
                sources={sourceIds.map((id) => ({
                    id,
                    name: model.mode?.[id]?.name ?? id,
                    description: model.mode?.[id]?.description ?? "",
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
                randomMediaSearchTerms={CAR_PARKING_LOT_CLASSES}
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
            <ApiResponse
                result={workspace.result}
                sourceId={workspace.activeSourceId}
                videoResponse={workspace.videoResponse}
            />
        </ClassificationPageLayout>
    );
};

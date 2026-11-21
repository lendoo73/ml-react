import { ApiResponse } from "../../components/sections/ApiResponse.jsx";
import { DetectionEvaluation } from "../../components/sections/DetectionEvaluation.jsx";
import { PredictionResult } from "../../components/sections/PredictionResult.jsx";
import { RandomPrediction } from "../../components/sections/RandomPrediction.jsx";
import { SourceInput } from "../../components/sections/SourceInput.jsx";
import { SourceCards } from "../../../classification/components/sections/SourceCards.jsx";
import { Hero } from "../../../classification/components/sections/Hero.jsx";
import { ClassificationPageLayout } from "../../../classification/components/sections/ClassificationPageLayout.jsx";
import { useDetectionWorkspace } from "../../hooks/useDetectionWorkspace.js";
import badMaskPreviewImages from "virtual:face-mask-bad-mask-images";
import { confusionMatrixData } from "./evaluation/confusionMatrixData.js";

const FACE_MASK_MODEL_CONFIG = {
    apiPath: "object_detection",
    apiModel: "face-mask-detect",
    classes: ["Mask", "No Mask", "Bad Mask"],
    classSearchQueries: {
        Mask: "person wearing a face mask",
        "No Mask": "person",
        "Bad Mask": "person wearing mask below nose",
    },
    previewImagesByClass: {
        "Bad Mask": badMaskPreviewImages,
    },
    endpoints: {
        image: "predict",
        search: "predict/search",
        video: "predict/video",
    },
    hero: { image: "/images/detect-face_mask-sample.jpg" },
    tensorBoardUrl: "http://localhost:6006",
};

export const FaceMaskDetection = ({ model }) => {
    const pageModel = {
        ...model,
        ...FACE_MASK_MODEL_CONFIG,
        hero: { ...model.hero, ...FACE_MASK_MODEL_CONFIG.hero },
    };
    const workspace = useDetectionWorkspace();
    const sourceIds = ["image", "video", "webcam"];

    return (
        <ClassificationPageLayout>
            <Hero {...pageModel.hero} />
            <RandomPrediction
                model={pageModel}
                classes={pageModel.classes}
            />
            <DetectionEvaluation
                confusionMatrixData={confusionMatrixData}
                tensorBoardUrl={pageModel.tensorBoardUrl}
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
                randomMediaSearchTerms={pageModel.classes}
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

import { ApiResponse } from "../../components/sections/ApiResponse.jsx";
import { DetectionEvaluation } from "../../components/sections/DetectionEvaluation.jsx";
import { PredictionResult } from "../../components/sections/PredictionResult.jsx";
import { RandomPrediction } from "../../components/sections/RandomPrediction.jsx";
import { SourceInput } from "../../components/sections/SourceInput.jsx";
import { SourceCards } from "../../../classification/components/sections/SourceCards.jsx";
import { Hero } from "../../../classification/components/sections/Hero.jsx";
import { ClassificationPageLayout } from "../../../classification/components/sections/ClassificationPageLayout.jsx";
import { useDetectionWorkspace } from "../../hooks/useDetectionWorkspace.js";
import { COCO_CLASSES } from "../../../../content/cocoClasses.js";

export const Yolo26Detection = ({ model }) => {
    const workspace = useDetectionWorkspace();
    const pageModel = { ...model, apiPath: "object_detection", apiModel: "yolo26x" };
    const sourceIds = ["image", "video", "webcam"];
    const links = model.links?.map((link) => ({
        ...link,
        href: link.id === "docs"
            ? "https://docs.ultralytics.com/models/yolo26/"
            : link.id === "github"
                ? "https://github.com/ultralytics/ultralytics"
                : "https://github.com/ultralytics/ultralytics/blob/main/ultralytics/cfg/datasets/coco.yaml",
    })) ?? [];

    return (
        <ClassificationPageLayout>
            <Hero
                {...model.hero}
                image="/images/detection-sample.png"
                imageHref="https://docs.ultralytics.com/tasks/detect"
                links={links}
            />
            <RandomPrediction model={pageModel} classes={COCO_CLASSES} canFilterClasses />
            <DetectionEvaluation />
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
                randomMediaSearchTerms={COCO_CLASSES}
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

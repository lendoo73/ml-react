import { ApiResponse } from "../../../detection/components/sections/ApiResponse.jsx";
import { PredictionResult } from "../../../detection/components/sections/PredictionResult.jsx";
import { RandomPrediction } from "../../../detection/components/sections/RandomPrediction.jsx";
import { SourceInput } from "../../../detection/components/sections/SourceInput.jsx";
import { SourceCards } from "../../../classification/components/sections/SourceCards.jsx";
import { Hero } from "../../../classification/components/sections/Hero.jsx";
import { ClassificationPageLayout } from "../../../classification/components/sections/ClassificationPageLayout.jsx";
import { useDetectionWorkspace } from "../../../detection/hooks/useDetectionWorkspace.js";

const DOTA_CLASSES = [
    "plane", "ship", "storage tank", "baseball diamond", "tennis court",
    "basketball court", "ground track field", "harbor", "bridge", "large vehicle",
    "small vehicle", "helicopter", "roundabout", "soccer ball field", "swimming pool",
];

const DOTA_CLASS_SEARCH_QUERIES = {
    plane: "aerial top down drone view airplane airport runway",
    ship: "aerial top down drone view ship harbor port",
    "storage tank": "aerial top down satellite view industrial storage tanks",
    "baseball diamond": "aerial top down drone view baseball diamond field",
    "tennis court": "aerial top down drone view tennis courts",
    "basketball court": "aerial top down drone view outdoor basketball court",
    "ground track field": "aerial top down drone view running track stadium",
    harbor: "aerial top down satellite view harbor ships port",
    bridge: "aerial top down drone view bridge crossing river",
    "large vehicle": "aerial top down drone view bus truck highway",
    "small vehicle": "aerial top down drone view cars road parking lot",
    helicopter: "aerial top down drone view helicopter helipad",
    roundabout: "aerial top down satellite view roundabout road intersection",
    "soccer ball field": "aerial top down drone view soccer football field",
    "swimming pool": "aerial top down drone view swimming pool",
};

export const Yolo26Obb = ({ model }) => {
    const workspace = useDetectionWorkspace();
    const pageModel = {
        ...model,
        apiPath: "oriented_bounding_box",
        apiModel: "yolo26x-obb",
        resultType: "detection",
        supportedInputs: ["image", "video", "webcam"],
        supportsTracking: true,
        classes: DOTA_CLASSES,
        classSearchQueries: DOTA_CLASS_SEARCH_QUERIES,
    };
    const sourceIds = pageModel.supportedInputs;
    const links = model.links?.map((link) => ({
        ...link,
        href: link.id === "docs"
            ? "https://docs.ultralytics.com/tasks/obb/"
            : link.id === "github"
                ? "https://github.com/ultralytics/ultralytics"
                : "https://github.com/ultralytics/ultralytics/blob/main/ultralytics/cfg/datasets/DOTAv1.yaml",
    })) ?? [];

    return (
        <ClassificationPageLayout>
            <Hero
                {...model.hero}
                image="/images/oriented_bounding_box-sample.jpg"
                imageHref="https://docs.ultralytics.com/tasks/obb/"
                links={links}
            />
            <RandomPrediction model={pageModel} classes={DOTA_CLASSES} canFilterClasses />
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
                randomMediaSearchTerms={DOTA_CLASSES}
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

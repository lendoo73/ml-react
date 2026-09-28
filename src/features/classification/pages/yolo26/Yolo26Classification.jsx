import { ApiResponse } from "../../components/sections/ApiResponse.jsx";
import { ClassificationEvaluation } from "../../components/sections/ClassificationEvaluation.jsx";
import { ClassificationPageLayout } from "../../components/sections/ClassificationPageLayout.jsx";
import { Hero } from "../../components/sections/Hero.jsx";
import { PredictionResult } from "../../components/sections/PredictionResult.jsx";
import { RandomPrediction } from "../../components/sections/RandomPrediction.jsx";
import { SourceCards } from "../../components/sections/SourceCards.jsx";
import { SourceInput } from "../../components/sections/SourceInput.jsx";
import { useClassificationWorkspace } from "../../hooks/useClassificationWorkspace.js";

const YOLO26_CLASSIFICATION_CONFIG = {
    apiPath: "classification",
    classSourceUrl: "https://raw.githubusercontent.com/pytorch/hub/master/imagenet_classes.txt",
    endpoints: {
        image: "predict",
        url: "predict",
        video: "predict/video",
        webcam: "predict/webcam",
        search: "predict/search",
    },
    fileFieldName: "source",
    hero: {
        image: "/images/classification-sample.png",
        imageHref: "https://docs.ultralytics.com/tasks/classify",
    },
    links: {
        docs: "https://docs.ultralytics.com/tasks/classify/",
        github: "https://github.com/ultralytics/ultralytics",
        imagenet: "https://github.com/pytorch/hub/blob/master/imagenet_classes.txt",
    },
    queryParamName: "source",
    resultType: "classification",
    status: "ready",
    supportedInputs: ["image", "video", "webcam"],
    videoUrlInput: { queryParamName: "source" },
    videoFieldName: "source",
};

export const Yolo26Classification = ({ model }) => {
    const pageModel = {
        ...model,
        ...YOLO26_CLASSIFICATION_CONFIG,
        hero: { ...model.hero, ...YOLO26_CLASSIFICATION_CONFIG.hero },
        videoUrlInput: {
            ...model.videoUrlInput,
            ...YOLO26_CLASSIFICATION_CONFIG.videoUrlInput,
        },
        links: model.links.map((link) => ({
            ...link,
            href: YOLO26_CLASSIFICATION_CONFIG.links[link.id],
        })),
    };
    const workspace = useClassificationWorkspace(pageModel);

    return (
        <ClassificationPageLayout>
            <Hero
                badge={pageModel.hero.badge}
                title={pageModel.hero.title}
                description={pageModel.hero.description}
                image={pageModel.hero.image}
                imageAlt={pageModel.hero.imageAlt}
                imageHref={pageModel.hero.imageHref}
                imageLinkLabel={pageModel.hero.imageLinkLabel}
                links={pageModel.links}
            />
            <RandomPrediction
                model={pageModel}
                title={pageModel.info.title}
                description={pageModel.info.description}
                classes={pageModel.classes}
                preview={workspace.randomPreview}
                onPreview={workspace.onRandomPreview}
            />
            <ClassificationEvaluation evaluation={pageModel.evaluation} />
            <SourceCards
                sources={pageModel.supportedInputs.map((id) => ({
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
                onVideoResponseChange={workspace.onVideoResponseChange}
            />
            {workspace.activeSourceId === "image" ? (
                <PredictionResult
                    resultRef={workspace.resultRef}
                    isPending={workspace.isResultPending}
                    image={workspace.previewImage}
                    result={workspace.result}
                    onImageLoad={workspace.onImageLoad}
                    confidenceThreshold={workspace.confidenceThreshold}
                    onConfidenceThresholdChange={workspace.onConfidenceThresholdChange}
                />
            ) : null}
            <ApiResponse
                result={workspace.result}
                isVideoSource={workspace.activeSourceId === "video"}
                isWebcamSource={workspace.activeSourceId === "webcam"}
                videoResponse={workspace.videoResponse}
            />
        </ClassificationPageLayout>
    );
};

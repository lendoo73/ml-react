import { ApiResponse } from "../../components/sections/ApiResponse.jsx";
import { ClassificationEvaluation } from "../../components/sections/ClassificationEvaluation.jsx";
import { ClassificationPageLayout } from "../../components/sections/ClassificationPageLayout.jsx";
import { Hero } from "../../components/sections/Hero.jsx";
import { PredictionResult } from "../../components/sections/PredictionResult.jsx";
import { RandomPrediction } from "../../components/sections/RandomPrediction.jsx";
import { SourceCards } from "../../components/sections/SourceCards.jsx";
import { SourceInput } from "../../components/sections/SourceInput.jsx";
import { useRandomClassImage } from "../../hooks/useRandomClassImage.js";
import { useClassificationWorkspace } from "../../hooks/useClassificationWorkspace.js";
import weatherEvaluationCsv from "./evaluation/results.csv?raw";
import { confusionMatrixData } from "./evaluation/confusionMatrixData.js";

const WEATHER_CLASSIFICATION_CONFIG = {
    apiPath: "classification",
    apiModel: "weather",
    classes: ["cloudy", "foggy", "rainy", "shine", "sunrise"],
    classSearchQueries: {
        cloudy: "cloudy weather",
        foggy: "foggy weather",
        rainy: "rainy weather",
        shine: "sunshine weather",
        sunrise: "sunrise weather",
    },
    endpoints: {
        image: "predict",
        url: "predict",
        video: "predict/video",
        webcam: "predict/webcam",
        search: "predict/search",
    },
    fileFieldName: "source",
    maxTrainingEpochs: 100,
    tensorBoardUrl: "http://localhost:6006",
    hero: { image: "/images/weather-classification-sample.jpg" },
    queryParamName: "source",
    resultType: "classification",
    status: "ready",
    supportedInputs: ["image", "video", "webcam"],
    videoFieldName: "source",
};

export const WeatherClassification = ({ model }) => {
    const pageModel = {
        ...model,
        ...WEATHER_CLASSIFICATION_CONFIG,
        hero: { ...model.hero, ...WEATHER_CLASSIFICATION_CONFIG.hero },
        videoUrlInput: {
            ...model.videoUrlInput,
            queryParamName: "source",
        },
    };
    const workspace = useClassificationWorkspace(pageModel);
    const randomClassImage = useRandomClassImage(pageModel, workspace.onRandomPreview);

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
                classes={pageModel.classes}
                preview={workspace.randomPreview}
                onPreview={workspace.onRandomPreview}
                onSelectClass={randomClassImage.onSelectClass}
                isClassPreviewLoading={randomClassImage.isLoading}
                classPreviewError={randomClassImage.error}
            />
            <ClassificationEvaluation
                csvData={weatherEvaluationCsv}
                maxEpochs={pageModel.maxTrainingEpochs}
                tensorBoardUrl={pageModel.tensorBoardUrl}
                confusionMatrixData={confusionMatrixData}
            />
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

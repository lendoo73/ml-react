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
import testImages from "./testImages.json";
import evaluationCsv from "./evaluation/results.csv?raw";

const CHEST_XRAY_CONFIG = {
    apiPath: "classification",
    apiModel: "chest-xray",
    classes: ["covid", "normal", "pneumonia"],
    endpoints: { image: "predict" },
    fileFieldName: "source",
    queryParamName: "source",
    hero: { image: "/images/chest_xray-classification-sample.jpg" },
    resultType: "classification",
    status: "ready",
    supportedInputs: ["image"],
    tensorBoardUrl: "http://localhost:6006",
    testImageDirectory: "/images/chest_xray_dataset/test",
    testImages,
};

export const ChestXrayClassification = ({ model }) => {
    const pageModel = {
        ...model,
        ...CHEST_XRAY_CONFIG,
        hero: { ...model.hero, ...CHEST_XRAY_CONFIG.hero },
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
                csvData={evaluationCsv}
                underConstruction
                tensorBoardUrl={pageModel.tensorBoardUrl}
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
            <ApiResponse result={workspace.result} />
        </ClassificationPageLayout>
    );
};

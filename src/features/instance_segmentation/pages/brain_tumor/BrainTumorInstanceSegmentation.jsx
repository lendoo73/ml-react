import { useState } from "react";
import { ClassificationPageLayout } from "../../../classification/components/sections/ClassificationPageLayout.jsx";
import { Hero } from "../../../classification/components/sections/Hero.jsx";
import { SourceCards } from "../../../classification/components/sections/SourceCards.jsx";
import { ModelInfoSection } from "../../../../components/ModelInfoSection.jsx";
import { PatientScanPanel } from "../../components/PatientScanPanel.jsx";
import { InstanceSegmentationClassBrowser } from "../../components/InstanceSegmentationClassBrowser.jsx";
import { InstanceSegmentationEvaluation } from "../../components/InstanceSegmentationEvaluation.jsx";
import { InstanceSegmentationImage } from "../../components/InstanceSegmentationImage.jsx";
import evaluationCsv from "./evaluation/results.csv?raw";

const confusionMatrixData = {
    classes: ["Glioma", "Meningioma", "Pituitary", "background"],
    values: [
        { predicted: "Glioma", true: "Glioma", value: 107 },
        { predicted: "Glioma", true: "Meningioma", value: 1 },
        { predicted: "Glioma", true: "background", value: 16 },
        { predicted: "Meningioma", true: "Glioma", value: 4 },
        { predicted: "Meningioma", true: "Meningioma", value: 161 },
        { predicted: "Meningioma", true: "Pituitary", value: 2 },
        { predicted: "Meningioma", true: "background", value: 8 },
        { predicted: "Pituitary", true: "Meningioma", value: 1 },
        { predicted: "Pituitary", true: "Pituitary", value: 163 },
        { predicted: "Pituitary", true: "background", value: 35 },
        { predicted: "background", true: "Glioma", value: 38 },
        { predicted: "background", true: "Meningioma", value: 5 },
        { predicted: "background", true: "Pituitary", value: 18 },
    ],
    normalizedValues: [
        { predicted: "Glioma", true: "Glioma", value: 0.72 },
        { predicted: "Glioma", true: "Meningioma", value: 0.01 },
        { predicted: "Glioma", true: "background", value: 0.27 },
        { predicted: "Meningioma", true: "Glioma", value: 0.03 },
        { predicted: "Meningioma", true: "Meningioma", value: 0.96 },
        { predicted: "Meningioma", true: "Pituitary", value: 0.01 },
        { predicted: "Meningioma", true: "background", value: 0.14 },
        { predicted: "Pituitary", true: "Meningioma", value: 0.01 },
        { predicted: "Pituitary", true: "Pituitary", value: 0.89 },
        { predicted: "Pituitary", true: "background", value: 0.59 },
        { predicted: "background", true: "Glioma", value: 0.26 },
        { predicted: "background", true: "Meningioma", value: 0.03 },
        { predicted: "background", true: "Pituitary", value: 0.10 },
    ],
};

const BRAIN_TUMOR_INSTANCE_SEGMENTATION_CONFIG = {
    apiPath: "instance_segmentation",
    apiModel: "brain-tumor",
    endpoints: { image: "predict", url: "predict", batch: "predict/batch" },
    fileFieldName: "source",
    queryParamName: "source",
    supportedInputs: ["image", "patientScan"],
    resultType: "instance-segmentation",
    status: "ready",
    hero: { image: "/images/brain_tumor_instance-segmentation-sample.jpg" },
    sourceCardsEnabled: true,
    classPreviewEnabled: true,
    classPreviewInline: true,
    testImageDirectory: "/images/brain_tumor_dataset/test",
    testImageClassCodes: {
        Glioma: "gl",
        Gliome: "gl",
        Meningioma: "me",
        "M\u00e9ningiome": "me",
        Pituitary: "pi",
        Hypophyse: "pi",
    },
    classSearchQueries: {
        Glioma: "Brain CT scan with glioma tumor",
        Gliome: "glioma brain MRI tumor",
        Meningioma: "meningioma brain MRI tumor",
        "M\u00e9ningiome": "meningioma brain MRI tumor",
        Pituitary: "pituitary tumor brain MRI",
        Hypophyse: "pituitary tumor brain MRI",
    },
    patientScanPanel: { sourceUrl: "https://www.cancerimagingarchive.net/dataset-explorer/" },
};

export const BrainTumorInstanceSegmentation = ({ model }) => {
    const pageModel = {
        ...model,
        ...BRAIN_TUMOR_INSTANCE_SEGMENTATION_CONFIG,
        hero: { ...model.hero, ...BRAIN_TUMOR_INSTANCE_SEGMENTATION_CONFIG.hero },
        patientScanPanel: { ...model.patientScanPanel, ...BRAIN_TUMOR_INSTANCE_SEGMENTATION_CONFIG.patientScanPanel },
    };
    const [activeSourceId, setActiveSourceId] = useState(pageModel.supportedInputs?.[0] ?? "image");
    const sources = pageModel.supportedInputs.map((id) => ({
        id,
        name: pageModel.mode?.[id]?.name ?? id,
        description: pageModel.mode?.[id]?.description ?? "",
    }));

    return (
        <ClassificationPageLayout>
            <Hero {...pageModel.hero} links={pageModel.links ?? []} />
            {pageModel.info ? (
                <ModelInfoSection info={pageModel.info}>
                    {pageModel.classPreviewInline ? (
                        <InstanceSegmentationClassBrowser model={pageModel} inline />
                    ) : null}
                </ModelInfoSection>
            ) : null}
            <InstanceSegmentationEvaluation
                csvData={evaluationCsv}
                tensorBoardUrl="http://localhost:6006"
                confusionMatrixData={confusionMatrixData}
            />
            {pageModel.classPreviewEnabled && !pageModel.classPreviewInline ? (
                <InstanceSegmentationClassBrowser model={pageModel} />
            ) : null}
            {pageModel.sourceCardsEnabled ? (
                <SourceCards sources={sources} selectedSourceId={activeSourceId} onSelect={setActiveSourceId} />
            ) : null}
            {activeSourceId === "image" ? <InstanceSegmentationImage model={pageModel} /> : null}
            {activeSourceId === "patientScan" ? <PatientScanPanel model={pageModel} /> : null}
        </ClassificationPageLayout>
    );
};

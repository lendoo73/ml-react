import { useState } from "react";
import { ClassificationPageLayout } from "../../../classification/components/sections/ClassificationPageLayout.jsx";
import { Hero } from "../../../classification/components/sections/Hero.jsx";
import { SourceCards } from "../../../classification/components/sections/SourceCards.jsx";
import { PredictVideo } from "../../../detection/components/PredictVideo.jsx";
import { WebcamPredictor } from "../../../detection/components/WebcamPredictor.jsx";
import { ModelInfoSection } from "../../../../components/ModelInfoSection.jsx";
import { SegmentationClassBrowser } from "../../components/SegmentationClassBrowser.jsx";
import { SegmentationEvaluation } from "../../components/SegmentationEvaluation.jsx";
import { SegmentationImage } from "../../components/SegmentationImage.jsx";

const POTHOLE_SEGMENTATION_CONFIG = {
    apiPath: "segmentation",
    apiModel: "pothole",
    endpoints: { image: "predict", url: "predict", video: "predict/video" },
    fileFieldName: "source",
    queryParamName: "source",
    supportedInputs: ["image", "video", "webcam"],
    resultType: "segmentation",
    classes: ["pothole"],
    hero: { image: "/images/pothole_segmentation-sample.jpg" },
    testImageDirectory: "/images/pothole_dataset/test/images",
    testImageManifest: "/images/pothole_dataset/test/images/index.json",
};

export const PotholeSegmentation = ({ model }) => {
    const pageModel = {
        ...model,
        ...POTHOLE_SEGMENTATION_CONFIG,
        hero: { ...model.hero, ...POTHOLE_SEGMENTATION_CONFIG.hero },
    };
    const [activeSourceId, setActiveSourceId] = useState("image");
    const sources = pageModel.supportedInputs.map((id) => ({
        id,
        name: pageModel.mode?.[id]?.name ?? id,
        description: pageModel.mode?.[id]?.description ?? "",
    }));

    return (
        <ClassificationPageLayout>
            <Hero {...pageModel.hero} links={[]} />
            {pageModel.info ? (
                <ModelInfoSection info={pageModel.info}>
                    <SegmentationClassBrowser model={pageModel} inline />
                </ModelInfoSection>
            ) : null}
            <SegmentationEvaluation tensorBoardUrl="http://localhost:6006" underConstruction />
            <SourceCards sources={sources} selectedSourceId={activeSourceId} onSelect={setActiveSourceId} />
            {activeSourceId === "image" ? <SegmentationImage model={pageModel} /> : null}
            {activeSourceId === "video" ? <PredictVideo model={pageModel} /> : null}
            {activeSourceId === "webcam" ? (
                <WebcamPredictor model={pageModel} isSegmentation />
            ) : null}
        </ClassificationPageLayout>
    );
};

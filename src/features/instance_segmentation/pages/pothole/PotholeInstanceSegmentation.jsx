import { useState } from "react";
import { ClassificationPageLayout } from "../../../classification/components/sections/ClassificationPageLayout.jsx";
import { Hero } from "../../../classification/components/sections/Hero.jsx";
import { SourceCards } from "../../../classification/components/sections/SourceCards.jsx";
import { PredictVideo } from "../../../detection/components/PredictVideo.jsx";
import { WebcamPredictor } from "../../../detection/components/WebcamPredictor.jsx";
import { ModelInfoSection } from "../../../../components/ModelInfoSection.jsx";
import { InstanceSegmentationClassBrowser } from "../../components/InstanceSegmentationClassBrowser.jsx";
import { InstanceSegmentationEvaluation } from "../../components/InstanceSegmentationEvaluation.jsx";
import { InstanceSegmentationImage } from "../../components/InstanceSegmentationImage.jsx";

const POTHOLE_INSTANCE_SEGMENTATION_CONFIG = {
    apiPath: "instance_segmentation",
    apiModel: "pothole",
    endpoints: { image: "predict", url: "predict", video: "predict/video" },
    fileFieldName: "source",
    queryParamName: "source",
    supportedInputs: ["image", "video", "webcam"],
    resultType: "instance-segmentation",
    classes: ["pothole"],
    hero: { image: "/images/pothole_instance-segmentation-sample.jpg" },
    testImageDirectory: "/images/pothole_dataset/test/images",
    testImageManifest: "/images/pothole_dataset/test/images/index.json",
};

export const PotholeInstanceSegmentation = ({ model }) => {
    const pageModel = {
        ...model,
        ...POTHOLE_INSTANCE_SEGMENTATION_CONFIG,
        hero: { ...model.hero, ...POTHOLE_INSTANCE_SEGMENTATION_CONFIG.hero },
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
                    <InstanceSegmentationClassBrowser model={pageModel} inline />
                </ModelInfoSection>
            ) : null}
            <InstanceSegmentationEvaluation tensorBoardUrl="http://localhost:6006" underConstruction />
            <SourceCards sources={sources} selectedSourceId={activeSourceId} onSelect={setActiveSourceId} />
            {activeSourceId === "image" ? <InstanceSegmentationImage model={pageModel} /> : null}
            {activeSourceId === "video" ? <PredictVideo model={pageModel} /> : null}
            {activeSourceId === "webcam" ? (
                <WebcamPredictor model={pageModel} isInstanceSegmentation />
            ) : null}
        </ClassificationPageLayout>
    );
};

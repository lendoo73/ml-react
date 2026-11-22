import { useState } from "react";
import { ClassificationPageLayout } from "../../../classification/components/sections/ClassificationPageLayout.jsx";
import { Hero } from "../../../classification/components/sections/Hero.jsx";
import { SourceCards } from "../../../classification/components/sections/SourceCards.jsx";
import { PredictVideo } from "../../../detection/components/PredictVideo.jsx";
import { WebcamPredictor } from "../../../detection/components/WebcamPredictor.jsx";
import { ModelInfoSection } from "../../../../components/ModelInfoSection.jsx";
import { InstanceSegmentationClassBrowser } from "../../components/InstanceSegmentationClassBrowser.jsx";
import { InstanceSegmentationImage } from "../../components/InstanceSegmentationImage.jsx";
import { COCO_CLASSES } from "../../../../content/cocoClasses.js";

export const Yolo26InstanceSegmentation = ({ model }) => {
    const pageModel = {
        ...model,
        apiPath: "instance_segmentation",
        apiModel: "yolo26x-seg",
        classes: model.classes?.length ? model.classes : COCO_CLASSES,
    };
    const [activeSourceId, setActiveSourceId] = useState("image");
    const sources = ["image", "video", "webcam"].map((id) => ({
        id,
        name: pageModel.mode?.[id]?.name ?? id,
        description: pageModel.mode?.[id]?.description ?? "",
    }));

    return (
        <ClassificationPageLayout>
            <Hero
                {...pageModel.hero}
                image="/images/instance-segmentation-sample.png"
                imageHref="https://docs.ultralytics.com/tasks/segment/"
                links={pageModel.links?.map((link) => ({
                    ...link,
                    href: link.id === "docs"
                        ? "https://docs.ultralytics.com/tasks/segment/"
                        : link.id === "github"
                            ? "https://github.com/ultralytics/ultralytics"
                            : "https://github.com/ultralytics/ultralytics/blob/main/ultralytics/cfg/datasets/coco.yaml",
                }))}
            />
            {pageModel.info ? (
                <ModelInfoSection info={pageModel.info}>
                    <InstanceSegmentationClassBrowser model={pageModel} inline />
                </ModelInfoSection>
            ) : null}
            <SourceCards sources={sources} selectedSourceId={activeSourceId} onSelect={setActiveSourceId} />
            {activeSourceId === "image" ? <InstanceSegmentationImage model={pageModel} /> : null}
            {activeSourceId === "video" ? <PredictVideo model={pageModel} /> : null}
            {activeSourceId === "webcam" ? <WebcamPredictor model={pageModel} isInstanceSegmentation /> : null}
        </ClassificationPageLayout>
    );
};

import { useState } from "react";
import { ClassificationPageLayout } from "../../../classification/components/sections/ClassificationPageLayout.jsx";
import { Hero } from "../../../classification/components/sections/Hero.jsx";
import { SourceCards } from "../../../classification/components/sections/SourceCards.jsx";
import { ModelInfoSection } from "../../../../components/ModelInfoSection.jsx";
import { PoseImage } from "../../components/PoseImage.jsx";
import { PoseVideo } from "../../components/PoseVideo.jsx";
import { PoseWebcam } from "../../components/PoseWebcam.jsx";

const POSE_PREVIEW_SEARCH_TERMS = ["person", "athlete", "dancer", "runner", "yoga pose"];

export const Yolo26Pose = ({ model }) => {
    const [activeSourceId, setActiveSourceId] = useState("image");
    const [showKeypoints, setShowKeypoints] = useState(false);
    const sources = ["image", "video", "webcam"].map((id) => ({
        id,
        name: model.mode?.[id]?.name ?? id,
        description: model.mode?.[id]?.description ?? "",
    }));
    const links = model.links?.map((link) => ({
        ...link,
        href: link.id === "docs"
            ? "https://docs.ultralytics.com/tasks/pose/"
            : link.id === "github"
                ? "https://github.com/ultralytics/ultralytics"
                : "https://github.com/ultralytics/ultralytics/blob/main/ultralytics/cfg/datasets/coco8-pose.yaml",
    })) ?? [];

    return (
        <ClassificationPageLayout>
            <Hero
                {...model.hero}
                image="/images/pose_estimation-sample.jpg"
                imageHref="https://docs.ultralytics.com/tasks/pose/"
                links={links}
            />
            {model.info ? (
                <ModelInfoSection info={model.info}>
                    <button
                        type="button"
                        onClick={() => setShowKeypoints((visible) => !visible)}
                        className="mt-4 cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        aria-expanded={showKeypoints}
                    >
                        {showKeypoints ? model.info.hideKeypoints : model.info.showKeypoints}
                    </button>
                    {showKeypoints ? (
                        <ol className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-700 sm:grid-cols-3 md:grid-cols-4 dark:text-gray-300">
                            {model.keypoints?.map((keypoint, index) => (
                                <li key={keypoint} className="rounded-md bg-gray-100 px-2 py-1 dark:bg-gray-700">
                                    {index}. {keypoint}
                                </li>
                            ))}
                        </ol>
                    ) : null}
                </ModelInfoSection>
            ) : null}
            <SourceCards sources={sources} selectedSourceId={activeSourceId} onSelect={setActiveSourceId} />
            {activeSourceId === "image" ? (
                <PoseImage model={model} previewSearchTerms={POSE_PREVIEW_SEARCH_TERMS} />
            ) : null}
            {activeSourceId === "video" ? (
                <PoseVideo model={model} previewSearchTerms={POSE_PREVIEW_SEARCH_TERMS} />
            ) : null}
            {activeSourceId === "webcam" ? <PoseWebcam model={model} /> : null}
        </ClassificationPageLayout>
    );
};


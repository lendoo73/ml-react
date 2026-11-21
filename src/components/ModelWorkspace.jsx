import { Camera, ExternalLink, Image as ImageIcon, Video, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_URL } from "../config/settings.js";
import { useLanguage } from "../context/useLanguage.js";
import { WeatherClassification } from "../features/classification/pages/weather/WeatherClassification.jsx";
import { ChestXrayClassification } from "../features/classification/pages/chest_xray/ChestXrayClassification.jsx";
import { Yolo26Classification } from "../features/classification/pages/yolo26/Yolo26Classification.jsx";
import { Yolo26Detection } from "../features/detection/pages/yolo26/Yolo26Detection.jsx";
import { Yolo26Obb } from "../features/obb/pages/yolo26/Yolo26Obb.jsx";
import { CarParkingLotObb } from "../features/obb/pages/car_parking_lot/CarParkingLotObb.jsx";
import { RoadSignDetection } from "../features/detection/pages/road_sign/RoadSignDetection.jsx";
import { FaceMaskDetection } from "../features/detection/pages/face_mask/FaceMaskDetection.jsx";
import { ObjectCounter } from "../features/detection/pages/object_counter/ObjectCounter.jsx";
import { Yolo26Pose } from "../features/pose/pages/yolo26/Yolo26Pose.jsx";
import { BicepCurlCounter } from "../features/pose/pages/bicep_curl/BicepCurlCounter.jsx";
import { ModelPlaceholder } from "./ModelPlaceholder.jsx";
import { PredictImage } from "../features/detection/components/PredictImage.jsx";
import { PredictVideo } from "../features/detection/components/PredictVideo.jsx";
import { WebcamPredictor } from "../features/detection/components/WebcamPredictor.jsx";
import { useDetectionClassPreview } from "../features/detection/hooks/useDetectionClassPreview.js";
import { PoseImage } from "../features/pose/components/PoseImage.jsx";
import { PoseVideo } from "../features/pose/components/PoseVideo.jsx";
import { PoseWebcam } from "../features/pose/components/PoseWebcam.jsx";
import { PosePredictionResult } from "../features/pose/components/PosePredictionResult.jsx";
import { SegmentationImage } from "../features/segmentation/components/SegmentationImage.jsx";
import { BrainTumorSegmentation } from "../features/segmentation/pages/brain_tumor/BrainTumorSegmentation.jsx";
import { PotholeSegmentation } from "../features/segmentation/pages/pothole/PotholeSegmentation.jsx";
import { Yolo26Segmentation } from "../features/segmentation/pages/yolo26/Yolo26Segmentation.jsx";
import { useSegmentationClassPreview } from "../features/segmentation/hooks/useSegmentationClassPreview.js";
import { getRandomImageUrl } from "../services/mediaService.js";
import { KnifeAttackDetection } from "../features/multi_model/pages/knife_attack/KnifeAttackDetection.jsx";

const TAB_ICONS = {
    image: ImageIcon,
    video: Video,
    webcam: Camera,
};

const getSupportedInputs = (model) => (
    model?.id === "yolo26-pose-official" ? ["image", "video", "webcam"] : model?.supportedInputs ?? []
);
const getInitialTabId = (model) => getSupportedInputs(model)[0] ?? "image";
const POSE_PREVIEW_SEARCH_TERMS = [
    "African person", "Asian person", "astronaut", "athlete", "basketball player", "biker",
    "child", "children", "chimpanzees", "crowd", "dancer", "elderly person", "family", "fitness",
    "football player", "gorillas", "group exercise", "group of people", "gymnast", "hiker",
    "horse rider", "humanoid robot", "hunter", "Indian person", "industrial worker", "Japanese person",
    "Japanese woman", "jogger", "knight", "Latin American person", "man", "marathon runner",
    "Middle Eastern person", "Native American person", "orangutans", "people", "person",
    "person with arm prosthesis", "person with leg prosthesis", "person with prosthetic arm",
    "person with prosthetic leg", "runner", "scooter rider", "skater", "soccer", "soccer player",
    "soldier", "statue human", "street performer", "tennis player", "walking people", "warehouse worker",
    "woman", "worker", "workers", "yoga", "yoga pose",
];

export const ModelWorkspace = ({ model }) => {
    if (model?.id === "knife-attack-detection") {
        return <KnifeAttackDetection model={model} />;
    }
    if (model?.id === "person-counter-custom") {
        return <ObjectCounter model={model} />;
    }
    if (model?.id === "bicep-curl-counter-custom") {
        return <BicepCurlCounter model={model} />;
    }
    if (model?.id === "yolo26-pose-official") {
        return <Yolo26Pose model={model} />;
    }
    if (model?.id === "yolo26-obb-official") {
        return <Yolo26Obb model={model} />;
    }
    if (model?.id === "obb-car-parking-lot-custom") {
        return <CarParkingLotObb model={model} />;
    }

    return <ModelWorkspaceContent model={model} />;
};

const ModelWorkspaceContent = ({ model }) => {
    const { t } = useLanguage();
    const fetchDetectionClassPreview = useDetectionClassPreview();
    const fetchSegmentationClassPreview = useSegmentationClassPreview();
    const [activeTabId, setActiveTabId] = useState(getInitialTabId(model));
    const [previewImage, setPreviewImage] = useState(null);
    const [showClasses, setShowClasses] = useState(false);
    const [classFilter, setClassFilter] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [previewUrl, setPreviewUrl] = useState("");
    const [previewSourceUrl, setPreviewSourceUrl] = useState("");
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [previewError, setPreviewError] = useState("");
    const [posePreview, setPosePreview] = useState(null);
    const previewRef = useRef(null);

    useEffect(() => {
        setActiveTabId(getInitialTabId(model));
        setPreviewImage(null);
        setShowClasses(false);
        setClassFilter("");
        setSelectedClass("");
        setPreviewUrl("");
        setPreviewSourceUrl("");
        setPreviewError("");
        setPosePreview(null);
    }, [model]);

    useEffect(() => () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    useEffect(() => () => {
        if (previewImage?.startsWith?.("blob:")) URL.revokeObjectURL(previewImage);
    }, [previewImage]);

    const supportedTabs = useMemo(() => (
        getSupportedInputs(model).map((inputId) => ({
            id: inputId,
            icon: TAB_ICONS[inputId],
            name: model?.mode?.[inputId]?.name ?? inputId,
            description: model?.mode?.[inputId]?.description ?? "",
        }))
    ), [model]);

    const resultType = model?.id === "yolo26-pose-official" ? "pose" : model?.resultType;
    const poseKeypoints = resultType === "pose" ? (model?.keypoints ?? []) : [];
    const classList = resultType === "pose" ? poseKeypoints : (model?.classes ?? []);
    const filteredClassList = classList.filter((entry) => (
        entry.toLowerCase().includes(classFilter.trim().toLowerCase())
    ));
    const showClassBrowser = ["detection", "segmentation", "pose"].includes(resultType)
        && Array.isArray(classList)
        && classList.length > 0;
    const loadRandomPosePreview = useCallback(async () => {
        if (!model || resultType !== "pose") return;

        setPosePreview(null);
        setPreviewError("");
        setIsLoadingPreview(true);

        try {
            const { url: sourceUrl, query: keyword } = await getRandomImageUrl(model, POSE_PREVIEW_SEARCH_TERMS);

            const params = new URLSearchParams({ source: sourceUrl, output: "json" });
            const response = await fetch(`${API_URL}/api/pose_estimation/predict?${params.toString()}`);
            const result = await response.json().catch(() => null);
            if (!response.ok) {
                const statusMessage = result?.detail ? (Array.isArray(result.detail) ? result.detail.map((item) => item.msg).join(", ") : result.detail) : `Pose preview failed with status ${response.status}`;
                throw new Error(statusMessage);
            }

            setPosePreview({ image: sourceUrl, keyword, result });
        } catch (error) {
            console.error("Unable to load pose preview:", error);
            setPosePreview(null);
            setPreviewError(model?.info?.previewError ?? "Unable to load the pose preview.");
        } finally {
            setIsLoadingPreview(false);
        }
    }, [model, resultType]);

    useEffect(() => {
        if (resultType === "pose" && showClasses) {
            void loadRandomPosePreview();
        }
    }, [loadRandomPosePreview, resultType, showClasses]);

    const handleClassClick = async (className) => {
        if (!model?.apiPath || (!model?.endpoints?.search && !model?.previewImageUrl)) return;

        setSelectedClass(className);
        setPreviewError("");
        setIsLoadingPreview(true);
        requestAnimationFrame(() => {
            previewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        });

        try {
            if (resultType === "segmentation") {
                const { blob, sourceUrl } = await fetchSegmentationClassPreview(model, className);
                const nextPreviewUrl = URL.createObjectURL(blob);
                setPreviewUrl((currentPreviewUrl) => {
                    if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
                    return nextPreviewUrl;
                });
                setPreviewSourceUrl(sourceUrl);
                return;
            }
            const { blob, sourceUrl } = await fetchDetectionClassPreview(model, className);
            const nextPreviewUrl = URL.createObjectURL(blob);
            setPreviewUrl((currentPreviewUrl) => {
                if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
                return nextPreviewUrl;
            });
            setPreviewSourceUrl(sourceUrl);
        } catch (error) {
            console.error("Unable to load class preview:", error);
            setPreviewUrl("");
            setPreviewSourceUrl("");
            setPreviewError(model?.info?.previewError ?? "");
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const handleResultChange = (_nextResult, nextPreviewImage = null) => {
        setPreviewImage((currentPreviewImage) => {
            if (currentPreviewImage?.startsWith?.("blob:")) {
                URL.revokeObjectURL(currentPreviewImage);
            }

            return nextPreviewImage instanceof Blob
                ? URL.createObjectURL(nextPreviewImage)
                : nextPreviewImage;
        });
    };
    if (!model) return null;

    if (model.id === "classification-weather-custom") {
        return <WeatherClassification model={model} />;
    }

    if (model.id === "classification-chest-xray-custom") {
        return <ChestXrayClassification model={model} />;
    }

    if (model.id === "yolo26-classify-official") {
        return <Yolo26Classification model={model} />;
    }

    if (model.id === "detection-face-mask") {
        return <FaceMaskDetection model={model} />;
    }

    if (["yolo26-detect-official", "detection-road-sign"].includes(model.id)) {
        return model.id === "detection-road-sign"
            ? <RoadSignDetection model={model} />
            : <Yolo26Detection model={model} />;
    }


    if (model.id === "segmentation-placeholder") {
        return <Yolo26Segmentation model={model} />;
    }

    if (model.id === "segmentation-brain-tumor") {
        return <BrainTumorSegmentation model={model} />;
    }

    if (model.id === "segmentation-pothole") {
        return <PotholeSegmentation model={model} />;
    }

    if (model.status === "placeholder") {
        return (
            <section className="min-h-screen px-6 py-8 text-gray-900 dark:text-gray-100">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
                    <HeroSection model={model} />
                    <ModelPlaceholder model={model} />
                </div>
            </section>
        );
    }

    return (
        <section className="min-h-screen px-6 py-8 text-gray-900 dark:text-gray-100">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
                <HeroSection model={model} />

                {model.info ? (
                    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-semibold">{model.info.title}</h2>
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                                    {model.info.description}
                                </p>
                            </div>
                            {showClassBrowser ? (
                                <button
                                    type="button"
                                    onClick={() => setShowClasses((visible) => !visible)}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                    aria-expanded={showClasses}
                                >
                                    {showClasses
                                        ? (resultType === "pose" ? model.info.hideKeypoints : model.info.hideClasses)
                                        : (resultType === "pose" ? model.info.showKeypoints : model.info.showClasses)}
                                </button>
                            ) : null}
                        </div>
                        {showClasses ? (
                            <div className="mt-5 border-t border-gray-200 pt-5 dark:border-gray-700">
                                <input
                                    autoFocus
                                    type="search"
                                    value={classFilter}
                                    onChange={(event) => setClassFilter(event.target.value)}
                                    placeholder={t("ui.filterClassificationClasses")}
                                    aria-label={t("ui.filterClassificationClasses")}
                                    className="mb-3 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
                                />
                                <div className="grid max-h-96 grid-cols-2 gap-2 overflow-y-auto text-sm text-gray-700 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 dark:text-gray-300">
                                {filteredClassList.map((entry) => {
                                    const index = classList.indexOf(entry);
                                    const isPoseKeypoint = resultType === "pose";
                                    const itemKey = `${isPoseKeypoint ? "keypoint" : "class"}-${entry}`;

                                    return isPoseKeypoint ? (
                                        <div
                                            key={itemKey}
                                            className="rounded-md bg-gray-100 px-2 py-1 text-left dark:bg-gray-700"
                                        >
                                            {index}. {entry}
                                        </div>
                                    ) : (
                                        <button
                                            key={itemKey}
                                            type="button"
                                            onClick={() => handleClassClick(entry)}
                                            disabled={isLoadingPreview}
                                            className={`cursor-pointer rounded-md bg-gray-100 px-2 py-1 text-left transition hover:bg-blue-100 hover:text-blue-800 disabled:cursor-wait disabled:opacity-60 dark:bg-gray-700 dark:hover:bg-blue-900 dark:hover:text-blue-100 ${selectedClass === entry ? "ring-2 ring-blue-500" : ""}`}
                                        >
                                            {index}. {entry}
                                        </button>
                                    );
                                })}
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {resultType === "pose" && showClasses ? (
                    <div
                        ref={previewRef}
                        className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                    >
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                            <h2 className="text-xl font-semibold">
                                {model.info.randomPreviewTitle ?? "Random pose preview"}
                                {posePreview?.keyword ? `: ${posePreview.keyword}` : ""}
                            </h2>
                            <button
                                type="button"
                                onClick={() => void loadRandomPosePreview()}
                                disabled={isLoadingPreview}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                            >
                                {model.info.refreshRandomPreview ?? "Another random pose image"}
                            </button>
                        </div>
                        {isLoadingPreview ? (
                            <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" aria-hidden="true" />
                                <span>{model.info.loadingPreview ?? "Loading random pose preview..."}</span>
                            </div>
                        ) : null}
                        {previewError ? <p className="text-sm text-red-600 dark:text-red-300">{previewError}</p> : null}
                        {posePreview ? (
                            <PosePredictionResult
                                image={posePreview.image}
                                imageLink={posePreview.image}
                                result={posePreview.result}
                                countLabel={model.predictionLabel ?? "Detected poses"}
                                showSummary={false}
                                showToggle={false}
                                showResponse={false}
                            />
                        ) : null}
                    </div>
                ) : null}

                {selectedClass && resultType !== "pose" ? (
                    <div
                        ref={previewRef}
                        className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                    >
                        <div className="mb-4 flex items-center justify-between gap-4">
                            <h2 className="text-xl font-semibold">
                                {model.info.previewTitle}: {selectedClass}
                            </h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedClass("");
                                    setPreviewUrl("");
                                    setPreviewSourceUrl("");
                                    setPreviewError("");
                                }}
                                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
                                aria-label={model.info.closePreview}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        {isLoadingPreview ? (
                            <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" aria-hidden="true" />
                                <span>{model.info.loadingPreview}</span>
                            </div>
                        ) : null}
                        {previewError ? <p className="text-sm text-red-600 dark:text-red-300">{previewError}</p> : null}
                        {previewUrl ? (
                            <a
                                href={previewSourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={t("ui.openOriginalImage")}
                                className="relative block cursor-pointer"
                            >
                                <img
                                    src={previewUrl}
                                    alt={`${selectedClass} ${model.info.previewAlt}`}
                                    className={`max-h-[36rem] w-full rounded-xl bg-black object-contain transition ${isLoadingPreview ? "blur-sm opacity-60" : ""}`}
                                />
                            </a>
                        ) : null}
                    </div>
                ) : null}

                <div className="flex flex-wrap justify-center gap-4">
                    {supportedTabs.map(({ id, icon: Icon, name, description }) => {
                        const isActive = activeTabId === id;

                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setActiveTabId(id)}
                                className={`w-full max-w-[17rem] rounded-2xl border px-5 py-4 text-left transition ${
                                    isActive
                                        ? "border-blue-600 bg-blue-600 text-white shadow-lg"
                                        : "border-gray-200 bg-white text-gray-800 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-blue-500 dark:hover:bg-gray-700"
                                }`}
                            >
                                {Icon ? <Icon className="mb-3 h-5 w-5" aria-hidden="true" /> : null}
                                <div className="text-base font-semibold">{name}</div>
                                <p className={`mt-2 text-sm ${isActive ? "text-blue-100" : "text-gray-500 dark:text-gray-300"}`}>
                                    {description}
                                </p>
                            </button>
                        );
                    })}
                </div>

                <div className={activeTabId === "video" || (activeTabId === "image" && ["detection", "segmentation"].includes(resultType)) ? "" : "rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"}>
                    {activeTabId === "image" ? (
                        resultType === "segmentation"
                            ? <SegmentationImage model={model} onChange={handleResultChange} />
                            : resultType === "pose"
                                ? <PoseImage model={model} previewSearchTerms={POSE_PREVIEW_SEARCH_TERMS} onChange={handleResultChange} />
                                : <PredictImage model={model} onChange={handleResultChange} previewImage={previewImage} />
                    ) : null}
                    {activeTabId === "video" ? (
                        getSupportedInputs(model).includes("video")
                            ? resultType === "pose"
                                ? <PoseVideo model={model} previewSearchTerms={POSE_PREVIEW_SEARCH_TERMS} onChange={handleResultChange} />
                                : <PredictVideo model={model} />
                            : <p className="text-sm text-gray-500 dark:text-gray-400">{t("ui.modeUnavailable")}</p>
                    ) : null}
                    {activeTabId === "webcam" ? (
                        getSupportedInputs(model).includes("webcam")
                            ? resultType === "pose"
                                ? <PoseWebcam model={model} />
                                : <WebcamPredictor model={model} isSegmentation={resultType === "segmentation"} />
                            : <p className="text-sm text-gray-500 dark:text-gray-400">{t("ui.modeUnavailable")}</p>
                    ) : null}
                </div>

            </div>
        </section>
    );
};

const HeroSection = ({ model }) => {
    const isPose = model.id === "yolo26-pose-official";
    const heroImage = isPose ? "/images/pose_estimation-sample.jpg" : model.hero.image;
    const heroImageHref = isPose ? "https://docs.ultralytics.com/tasks/pose/" : model.hero.imageHref;

    return (
    <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-700 px-8 py-10 text-white shadow-xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:justify-between">
            <div className="min-w-0 flex-1">
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">{model.hero.badge}</p>
                <h1 className="mt-3 text-4xl font-bold">{model.hero.title}</h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-100">{model.hero.description}</p>
                {model.links?.length ? (
                    <div className="mt-6 flex flex-wrap gap-3">
                        {model.links.map(({ id, href, label }) => (
                            <a
                                key={id}
                                href={isPose
                                    ? id === "docs"
                                        ? "https://docs.ultralytics.com/tasks/pose/"
                                        : id === "github"
                                            ? "https://github.com/ultralytics/ultralytics"
                                            : "https://github.com/ultralytics/ultralytics/blob/main/ultralytics/cfg/datasets/coco8-pose.yaml"
                                    : href}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/20"
                            >
                                {label}
                                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            </a>
                        ))}
                    </div>
                ) : null}
            </div>
            {heroImage ? (
                <a
                    href={heroImageHref}
                    target="_blank"
                    rel="noreferrer"
                    className="relative block shrink-0 self-center p-1 transition hover:scale-[1.02] focus:outline-none lg:-my-6 lg:-mr-4"
                    aria-label={model.hero.imageLinkLabel ?? model.hero.title}
                >
                    <img
                        src={heroImage}
                        alt={model.hero.imageAlt ?? model.hero.title}
                        className="block h-auto min-h-36 w-full rounded-2xl border border-white/40 object-contain shadow-lg lg:min-h-0 lg:w-80"
                    />
                </a>
            ) : null}
        </div>
    </div>
    );
};

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {ApiResponseCard} from "../../../components/ui/ApiResponseCard.jsx";
import {ImageInputPanel} from "../../../components/ui/ImageInputPanel.jsx";
import {PredictionController} from "../../../components/ui/PredictionController.jsx";
import {API_URL} from "../../../config/settings.js";
import {useLanguage} from "../../../context/useLanguage.js";
import {getRandomImageUrl} from "../../../services/mediaService.js";
import {analyzeKnifeAttackFrames} from "../utils/analyzeKnifeAttackFrames.js";
import {KnifeAttackAnnotations} from "./KnifeAttackAnnotations.jsx";

const IMAGE_ENDPOINT = `${API_URL}/api/multi_model/predict`;
const MODELS = ["instance-segmentation", "pose-estimation", "object-detection"];

const readResponse = async (response, labels) => {
    const body = await response.json().catch(() => null);
    if (!response.ok) {
        const detail = Array.isArray(body?.detail)
            ? body.detail.map((item) => item.msg).join(", ")
            : body?.detail;
        throw new Error(detail || `${labels.requestError} (${response.status})`);
    }
    if (!body?.predictions || typeof body.predictions !== "object") {
        throw new Error(labels.invalidResponse);
    }
    return body;
};

export const KnifeAttackImage = ({
                                     model,
                                     searchTerms,
                                     roleLabels,
                                     onFrameChange,
                                     predictionController,
                                     annotationOptions,
                                     modelOptions,
                                 }) => {
    const {t} = useLanguage();
    const imageRef = useRef(null);
    const sourceUrlRef = useRef("");
    const rerunRequestIdRef = useRef(0);
    const [file, setFile] = useState(null);
    const [imageUrl, setImageUrl] = useState("");
    const [imageSource, setImageSource] = useState("");
    const [frame, setFrame] = useState(null);
    const [apiResponse, setApiResponse] = useState(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const confidenceRef = useRef({
        instanceSegmentation: annotationOptions.instanceSegmentationConfidence,
        pose: annotationOptions.poseConfidence,
        knife: annotationOptions.knifeConfidence,
    });
    const imageAnnotationOptions = useMemo(() => ({
        ...annotationOptions,
        showPoseIds: false,
    }), [annotationOptions]);

    const setSourceUrl = useCallback((nextUrl) => {
        if (sourceUrlRef.current === nextUrl) return;
        if (sourceUrlRef.current.startsWith("blob:")) URL.revokeObjectURL(sourceUrlRef.current);
        sourceUrlRef.current = nextUrl;
        setImageSource(nextUrl);
    }, []);

    useEffect(() => () => {
        if (sourceUrlRef.current.startsWith("blob:")) URL.revokeObjectURL(sourceUrlRef.current);
    }, []);

    const handleResult = useCallback((result, source) => {
        const [nextFrame] = analyzeKnifeAttackFrames([result], {
            requireKnifeOverlapForAttacker: true,
        });
        setFrame(nextFrame);
        setApiResponse(result);
        onFrameChange(nextFrame);
        setImageLoaded(
            sourceUrlRef.current === source
            && Boolean(imageRef.current?.complete && imageRef.current.naturalWidth),
        );
        setSourceUrl(source);
        setError("");
    }, [onFrameChange, setSourceUrl]);

    const handleFileSelect = useCallback(async (nextFile) => {
        rerunRequestIdRef.current += 1;
        setFile(nextFile);
        setImageUrl("");
        setFrame(null);
        setApiResponse(null);
        onFrameChange(null);
        setSourceUrl("");
        setImageLoaded(false);
        setError("");
        if (!nextFile) return;

        if (!["image/jpeg", "image/png", "image/webp"].includes(nextFile.type)) {
            setError(model.imageLabels.invalidFileType);
            return;
        }

        setIsLoading(true);
        const formData = new FormData();
        formData.append("source", nextFile);
        MODELS.forEach((selectedModel) => formData.append("models", selectedModel));
        formData.append("model_options", modelOptions);
        try {
            const response = await fetch(IMAGE_ENDPOINT, {method: "POST", body: formData});
            const result = await readResponse(response, model.imageLabels);
            handleResult(result, URL.createObjectURL(nextFile));
        } catch (requestError) {
            setError(requestError.message || model.imageLabels.requestError);
        } finally {
            setIsLoading(false);
        }
    }, [
        handleResult,
        model.imageLabels,
        modelOptions,
        onFrameChange,
        setSourceUrl,
    ]);

    const rerunPrediction = useCallback(async () => {
        const source = sourceUrlRef.current;
        if (!source) return;

        const requestId = ++rerunRequestIdRef.current;
        setIsLoading(true);
        setError("");
        try {
            let response;
            if (file) {
                const formData = new FormData();
                formData.append("source", file);
                MODELS.forEach((selectedModel) => formData.append("models", selectedModel));
                formData.append("model_options", modelOptions);
                response = await fetch(IMAGE_ENDPOINT, {method: "POST", body: formData});
            } else {
                const params = new URLSearchParams({source, model_options: modelOptions});
                MODELS.forEach((selectedModel) => params.append("models", selectedModel));
                response = await fetch(`${IMAGE_ENDPOINT}?${params.toString()}`);
            }
            const result = await readResponse(response, model.imageLabels);
            if (requestId === rerunRequestIdRef.current) handleResult(result, source);
        } catch (requestError) {
            if (requestId === rerunRequestIdRef.current) {
                setError(requestError.message || model.imageLabels.requestError);
            }
        } finally {
            if (requestId === rerunRequestIdRef.current) setIsLoading(false);
        }
    }, [
        file,
        handleResult,
        model.imageLabels,
        modelOptions,
    ]);

    useEffect(() => {
        const previous = confidenceRef.current;
        const changed = previous.instanceSegmentation !== annotationOptions.instanceSegmentationConfidence
            || previous.pose !== annotationOptions.poseConfidence
            || previous.knife !== annotationOptions.knifeConfidence;
        confidenceRef.current = {
            instanceSegmentation: annotationOptions.instanceSegmentationConfidence,
            pose: annotationOptions.poseConfidence,
            knife: annotationOptions.knifeConfidence,
        };
        if (changed && sourceUrlRef.current) void rerunPrediction();
    }, [
        annotationOptions.poseConfidence,
        annotationOptions.knifeConfidence,
        annotationOptions.instanceSegmentationConfidence,
        rerunPrediction,
    ]);

    const handleUrlResult = useCallback((result, source) => {
        setFile(null);
        handleResult(result, source);
    }, [handleResult]);

    return (
        <>
            <section
                className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <ImageInputPanel
                    model={model}
                    file={file}
                    onFileSelect={(nextFile) => void handleFileSelect(nextFile)}
                    imageUrl={imageUrl}
                    setImageUrl={(value) => {
                        setImageUrl(value);
                        setFile(null);
                        setFrame(null);
                        setApiResponse(null);
                        onFrameChange(null);
                        setSourceUrl("");
                        setImageLoaded(false);
                        setError("");
                    }}
                    urlEndpoint={IMAGE_ENDPOINT}
                    queryParamName="source"
                    queryParams={{models: MODELS, model_options: modelOptions}}
                    onResult={handleUrlResult}
                    onPredictionStart={() => {
                        rerunRequestIdRef.current += 1;
                        setFile(null);
                        setIsLoading(false);
                        setFrame(null);
                        setApiResponse(null);
                        onFrameChange(null);
                        setError("");
                        setImageLoaded(false);
                    }}
                    randomImageLabel={t("ui.randomImage")}
                    randomImageLoadingLabel={t("ui.loadingRandomImage")}
                    loadingLabel={model.imageLabels.processing}
                    onRandomImage={() => getRandomImageUrl(model, searchTerms)}
                    randomClassLabel={t("ui.randomImageQuery")}
                />
                {isLoading ? <p role="status"
                                className="text-sm text-blue-700 dark:text-blue-300">{model.imageLabels.processing}</p> : null}
                {error ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            </section>
            {imageSource ? (
                <PredictionController
                    {...predictionController}
                    className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:grid-cols-[minmax(0,1fr)_20rem]"
                    media={(
                        <div className="relative min-w-0">
                            {frame?.behavior?.attackDetected ? (
                                <p role="status"
                                   className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                                    {model.email.attackDetected}
                                </p>
                            ) : null}
                            <div className="relative mx-auto w-full overflow-hidden rounded-2xl bg-black">
                                <img
                                    ref={imageRef}
                                    src={imageSource}
                                    alt={model.imageLabels.resultAlt}
                                    onLoad={() => setImageLoaded(true)}
                                    className="block h-auto w-full"
                                />
                                <KnifeAttackAnnotations
                                    mediaRef={imageRef}
                                    frame={imageLoaded ? frame : null}
                                    labels={roleLabels}
                                    annotationOptions={imageAnnotationOptions}
                                    mediaLoaded={imageLoaded}
                                    useDetectionLabelStyle
                                />
                            </div>
                        </div>
                    )}
                />
            ) : null}
            {apiResponse ? (
                <ApiResponseCard data={apiResponse} label={t("ui.apiResponse")} />
            ) : null}
        </>
    );
};

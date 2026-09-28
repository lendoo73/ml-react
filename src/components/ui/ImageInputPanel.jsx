import { FileUploader } from "./FileUploader.jsx";
import { UrlInput } from "./UrlInput.jsx";
import { SubHeader } from "../SubHeader.jsx";
import { FixedSpinner } from "./FixedSpinner.jsx";
import { useState } from "react";

export const ImageInputPanel = ({
    model,
    file,
    onFileSelect,
    imageUrl,
    setImageUrl,
    fileEndpoint,
    urlEndpoint,
    onResult,
    showHeader = true,
    randomImageLabel,
    randomImageLoadingLabel,
    onRandomImage,
    onPredictionStart,
    randomClassLabel,
    randomClassMatched,
    onRandomClassChange,
}) => {
    const [isFileLoading, setIsFileLoading] = useState(false);
    const [isUrlLoading, setIsUrlLoading] = useState(false);
    const [randomClassInputKey, setRandomClassInputKey] = useState(0);
    return (
    <div className="relative flex w-full flex-col items-center">
        <FixedSpinner loading={isFileLoading || isUrlLoading} message="Processing..." />
        {showHeader ? <SubHeader content={model?.mode?.image?.subheader} className="text-center" /> : null}
        <div
            className="flex w-full flex-col items-center gap-4"
            style={isFileLoading || isUrlLoading ? { pointerEvents: "none", opacity: 0.6 } : undefined}
            aria-busy={isFileLoading || isUrlLoading}
        >
            <FileUploader
                label={model?.mode?.image?.uploadLabel}
                buttonText={model?.mode?.image?.chooseFile}
                accept="image/png,image/jpeg,image/webp"
                endpoint={fileEndpoint}
                fieldName={model?.fileFieldName}
                file={file}
                onFileSelect={(nextFile) => {
                    setRandomClassInputKey((key) => key + 1);
                    onRandomClassChange?.("");
                    onPredictionStart?.();
                    onFileSelect?.(nextFile);
                }}
                onLoadingChange={setIsFileLoading}
                onResult={onResult}
                disabled={isUrlLoading}
            />
            <UrlInput
                key={randomClassInputKey}
                label={model?.urlInput?.label}
                buttonText={model?.urlInput?.buttonText}
                placeholder={model?.urlInput?.placeholder}
                imgUrl={imageUrl}
                setImgUrl={setImageUrl}
                endpoint={urlEndpoint}
                queryParamName={model?.queryParamName ?? "img_url"}
                queryParams={model?.urlQueryParams ?? {}}
                inputId={`${model?.id ?? "model"}-image-url`}
                onResult={onResult}
                onLoadingChange={setIsUrlLoading}
                disabled={isFileLoading}
                mediaType="image"
                exampleLabel={randomImageLabel}
                exampleLoadingLabel={randomImageLoadingLabel}
                onExampleClick={onRandomImage}
                onPredictionStart={onPredictionStart}
                randomClassLabel={randomClassLabel}
                randomClassMatched={randomClassMatched}
                onRandomClassChange={onRandomClassChange}
            />
        </div>
    </div>
    );
};

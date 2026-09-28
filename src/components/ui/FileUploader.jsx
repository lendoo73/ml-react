import { useState } from "react";
import {sendFileToAPI} from "../../utils/fileApi.js";
import { useLanguage } from "../../context/useLanguage.js";


export const FileUploader = ({label, buttonText, accept, endpoint, onResult, file, onFileSelect, onLoadingChange, disabled = false, fieldName = "image"}) => {
    const [loading, setLoading] = useState(false);
    const { t } = useLanguage();

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        onFileSelect?.(selectedFile);

        if (endpoint && onResult) {
            setLoading(true);
            onLoadingChange?.(true);
            try {
                const result = await sendFileToAPI(selectedFile, endpoint, fieldName);
                onResult(result, selectedFile);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
                onLoadingChange?.(false);
            }
        }
    };

    return (
        <label
            className="
                flex flex-col items-center justify-center
                w-full max-w-md p-6
                border-2 border-dashed rounded-xl cursor-pointer
                border-gray-400 hover:bg-gray-200
                dark:border-gray-600 dark:hover:bg-gray-800
                transition
            "
            style={disabled || loading ? { pointerEvents: "none", opacity: 0.6 } : undefined}
            aria-disabled={disabled || loading}
        >
        <span className="text-sm mb-2 text-gray-600 dark:text-gray-400">{label}</span>
            <input
                type="file"
                className="hidden"
                accept={accept}
                onChange={handleFileChange}
                disabled={disabled || loading}
            />

            <span
                className="
                px-4 py-2 text-sm font-medium rounded-lg
                bg-gray-800 text-gray-100
                dark:bg-gray-200 dark:text-gray-900
            "
            >{loading ? t("ui.uploading") : buttonText}</span>
            {file && !loading && (
                <p className="text-sm text-gray-700 dark:text-gray-400 mt-2">
                    {file.name}
                </p>
            )}
        </label>
    );
};

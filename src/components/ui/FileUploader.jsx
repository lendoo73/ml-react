import {useRef, useState} from "react";
import {sendFileToAPI} from "../../utils/fileApi.js";


export const FileUploader = ({label, buttonText, accept, endpoint, onResult, file, onFileSelect}) => {
    const [loading, setLoading] = useState(false);

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        onFileSelect?.(selectedFile);

        if (endpoint && onResult) {
            setLoading(true);
            try {
                const result = await sendFileToAPI(selectedFile, endpoint);
                onResult(result);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
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
        >
        <span className="text-sm mb-2 text-gray-600 dark:text-gray-400">{label}</span>
            <input
                type="file"
                className="hidden"
                accept={accept}
                onChange={handleFileChange}
            />

            <span
                className="
                px-4 py-2 text-sm font-medium rounded-lg
                bg-gray-800 text-gray-100
                dark:bg-gray-200 dark:text-gray-900
            "
            >{loading ? "Uploading..." : buttonText}</span>
            {file && !loading && (
                <p className="text-sm text-gray-700 dark:text-gray-400 mt-2">
                    {file.name}
                </p>
            )}
        </label>
    );
};

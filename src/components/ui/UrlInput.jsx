import {useLanguage} from "../../context/useLanguage.js";
import {API_URL} from "../../config/settings.js";

export const UrlInput = ({ imgUrl, setImgUrl, onResult }) => {
    const {t} = useLanguage();

    const handlePredict = async () => {
        if (!imgUrl) return;

        const res = await fetch(
            `${API_URL}/api/passenger_counter/predict/url?img_url=${encodeURIComponent(imgUrl)}`
        );

        const data = await res.json();
        onResult(data);
    };

    return (
        <div className="w-full max-w-md flex gap-3 items-center">
            <input
                type="text"
                value={imgUrl}
                onChange={(e) => setImgUrl(e.target.value)}
                placeholder={t("models.0.urlInput.placeholder")}
                className="
                    flex-1 p-2 rounded-md
                    bg-gray-200 dark:bg-gray-800
                    text-gray-900 dark:text-gray-100
                "
            />

            <button
                onClick={handlePredict}
                className="
                    px-4 py-2 rounded-md
                    bg-blue-600 text-white
                    dark:bg-blue-400 dark:text-gray-900
                "
            >{t("models.0.urlInput.buttonText")}</button>
        </div>
    );
};

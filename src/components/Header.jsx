import {useLanguage} from "../context/useLanguage.js";

export const Header = () => {
    const { t } = useLanguage();

    return (
        <div className="
            text-2xl text-gray-800 p-2 mb-2 shadow-lg
            dark:text-gray-200
        ">{t("header")}</div>
    );
};
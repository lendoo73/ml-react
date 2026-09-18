export const SubHeader = ({ content, className = "" }) => {

    return (
        <div className={`w-full p-2 mb-2 text-xl text-gray-800 dark:text-gray-200 ${className}`}>
            {content}
        </div>
    );
};
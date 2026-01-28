export const sendFileToAPI = async (file, endpoint) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file, file.name);

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error sending file:", error);
        throw error;
    }
};

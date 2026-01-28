const getApiUrl = async () => {
    try {
        const res = await fetch('/config.json');
        const json = await res.json();
        return json.API_URL;
    }
    catch (error) {
        console.error("Error: config.json not found");
        return window.location.origin;
    }
}

let apiUrl = await getApiUrl();

export const API_URL = apiUrl || window.location.origin;
console.log("API URL: ", API_URL);

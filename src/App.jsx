import {Sidebar} from "./components/Sidebar.jsx";
import {useState} from "react";
import {ThemeToggle} from "./components/ThemeToggle.jsx";
import {PassengerCounter} from "./components/PassengerCounter.jsx";
import {BrainTumorDetection} from "./components/BrainTumorDetection.jsx";

export const App = () => {
    const [activePage, setActivePage] = useState(0);

    const pages = [
        <PassengerCounter />,
        <BrainTumorDetection />,
    ];

    return (
        <div className="flex h-screen">
            {/* Sidebar stays fixed, full height */}
            <Sidebar activePage={activePage} onSelect={setActivePage} />

            {/* Right content scrollable */}
            <div className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900 overflow-y-auto">
                {pages[activePage]}
            </div>

            <ThemeToggle />
        </div>
    );
};


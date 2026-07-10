import { useEffect } from "react";

export default function AppDownload() {
    useEffect(() => {
        window.location.href = "https://api.axerium.org/app";
    }, []);

    return (
        <div style={{ padding: "50px", textAlign: "center" }}>
            <h2>Starting download...</h2>
            <p>
                If it does not start automatically,
                <a href="https://api.axerium.org/app">click here</a>.
            </p>
        </div>
    );
}

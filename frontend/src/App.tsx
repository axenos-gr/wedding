import { BrowserRouter, Routes, Route } from "react-router-dom";
import Main from "./pages/Main";
import Admin from "./pages/Admin";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Main />} />
                <Route path="/admin" element={<Admin />} />
            </Routes>
        </BrowserRouter>
    );
}

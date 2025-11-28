import { createRoot } from "react-dom/client";
import { App } from "./app";

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<App />);
} else {
	throw new Error("Failed to find root element");
}

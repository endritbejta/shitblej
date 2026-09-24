import { pageTitle, useDocumentMeta } from "../hooks/useDocumentMeta";

export default function NotFound() {
    useDocumentMeta({
        title: pageTitle("Page not found"),
        description: "The page you requested could not be found on Shitblej.",
    });

    return (
        <div className="text-center py-20">
            <h1 className="text-3xl font-semibold mb-2">404</h1>
            <p className="opacity-70">Page not found.</p>
        </div>
    );
}

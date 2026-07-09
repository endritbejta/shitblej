import LoadingDots from './LoadingDots';

export default function Loading({ fullScreen = false, message = "Loading..." }) {
    if (fullScreen) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <LoadingDots size="lg" color="green" />
                {message && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{message}</p>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
            <LoadingDots size="md" color="green" />
            {message && (
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{message}</p>
            )}
        </div>
    );
}

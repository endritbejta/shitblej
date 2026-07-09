export default function Search() {
    return (
        <section>
            <h1 className="text-xl font-semibold mb-2">Search</h1>
            <input
                type="text"
                placeholder="Search for items..."
                className="border p-2 rounded w-full max-w-md"
            />
        </section>
    );
}
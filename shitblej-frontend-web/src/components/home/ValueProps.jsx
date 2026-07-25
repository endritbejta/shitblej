import { ShieldCheck, Truck, Sparkles, MessageCircle } from "lucide-react";

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Buyer protection",
    body: "Every purchase is covered. Your money is safe until you get your item.",
  },
  {
    icon: Sparkles,
    title: "Curated quality",
    body: "Authenticated designer pieces and hand-picked collectibles.",
  },
  {
    icon: Truck,
    title: "Fast local delivery",
    body: "Meet up or ship across Kosovo in days, not weeks.",
  },
  {
    icon: MessageCircle,
    title: "Secure order chat",
    body: "Messaging unlocks after checkout and stays inside Shitblej.",
  },
];

/** “Why shop here” trust grid. */
export default function ValueProps() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ITEMS.map(({ icon: Icon, title, body }) => (
        <div
          key={title}
          className="rounded-card border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <Icon className="h-5 w-5" />
          </span>
          <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            {body}
          </p>
        </div>
      ))}
    </div>
  );
}

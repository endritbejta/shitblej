import { useRef } from "react";
import { User, Camera, Plus, LogOut, BadgeCheck, Loader2 } from "lucide-react";
import Button from "../ui/Button";
import { WIDTHS, buildSrcSet, imageAtWidth } from "../../lib/imageUrl";

function Stat({ label, value }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

/**
 * Profile overview card: identity, membership, a real stat row, and clearly
 * ranked actions (List an item primary, Sign out quiet). One card — no nesting.
 */
export default function ProfileHeader({
  user,
  listingsCount,
  savedCount,
  onAvatarChange,
  uploadingAvatar,
  onLogout,
}) {
  const fileInputRef = useRef(null);
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;
  // The backend seeds a dead via.placeholder default — treat it as no photo.
  const rawAvatar = user.image || user.avatar;
  const avatar = rawAvatar && !rawAvatar.includes("via.placeholder") ? rawAvatar : null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Avatar */}
        <div className="relative mx-auto shrink-0 sm:mx-0">
          <div className="h-24 w-24 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-zinc-700 dark:bg-zinc-800">
            {avatar ? (
              <img
                src={imageAtWidth(avatar, 192)}
                srcSet={buildSrcSet(avatar, WIDTHS.thumb) || undefined}
                sizes="96px"
                alt={user.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-gray-400">
                <User className="h-9 w-9" />
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onAvatarChange} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            aria-label="Change profile photo"
            className="absolute -bottom-0.5 -right-0.5 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-brand-600 text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60 dark:border-zinc-900"
          >
            {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
        </div>

        {/* Identity + actions */}
        <div className="flex-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {user.name || "Your profile"}
                </h1>
                {user.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
              {memberSince && (
                <p className="mt-0.5 text-xs text-gray-400">Member since {memberSince}</p>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 sm:justify-end">
              <Button to="/sell" size="sm">
                <Plus className="h-4 w-4" /> List an item
              </Button>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-4 gap-4 border-t border-gray-100 pt-5 dark:border-zinc-800">
            <Stat label="Listings" value={listingsCount} />
            <Stat label="Saved" value={savedCount} />
            <Stat label="Sold" value="0" />
            <Stat label="Rating" value="New" />
          </div>
        </div>
      </div>
    </section>
  );
}

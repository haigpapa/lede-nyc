import { auth, signIn, signOut } from '../../auth';
import Image from 'next/image';

export default async function UserBar() {
    const session = await auth();
    const user = session?.user;

    if (!user) {
        return (
            <div className="px-4 pt-3 pb-1">
                {/* Soft account gate — save neighborhood prompt */}
                <form
                    action={async () => {
                        'use server';
                        await signIn('google', { redirectTo: '/' });
                    }}
                    className="flex items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5"
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base shrink-0" aria-hidden="true">📍</span>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-zinc-300 leading-tight">Save your neighborhood</p>
                            <p className="text-[10px] text-zinc-600 leading-tight truncate">Sign in to unlock a second location &amp; daily alerts</p>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="shrink-0 text-[11px] font-bold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors px-3 py-1.5 rounded-lg"
                    >
                        Sign in
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between px-4 pt-3">
            <span className="text-[11px] text-zinc-500">
                {user.name?.split(' ')[0]}
            </span>
            <div className="flex items-center gap-2">
                {user.image && (
                    <Image
                        src={user.image}
                        alt={user.name ?? 'User'}
                        width={24}
                        height={24}
                        className="rounded-full ring-1 ring-zinc-700"
                    />
                )}
                <form
                    action={async () => {
                        'use server';
                        await signOut({ redirectTo: '/' });
                    }}
                >
                    <button
                        type="submit"
                        className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        Sign out
                    </button>
                </form>
            </div>
        </div>
    );
}

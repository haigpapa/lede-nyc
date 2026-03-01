'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
    { href: '/', label: 'Brief', icon: '📋' },
    { href: '/atlas', label: 'Atlas', icon: '🗺️' },
    { href: '/transit', label: 'Transit', icon: '🚇' },
    { href: '/diligence', label: 'Diligence', icon: '🏢' },
    { href: '/search', label: 'Search', icon: '🔍' },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-[#09090b]/90 backdrop-blur-md border-t border-zinc-800">
            <ul className="flex items-center justify-around px-2 py-2">
                {tabs.map(({ href, label, icon }) => {
                    const active = pathname === href;
                    return (
                        <li key={href} className="flex-1">
                            <Link
                                href={href}
                                className={`flex flex-col items-center gap-0.5 py-1 rounded-lg transition-colors ${active
                                    ? 'text-emerald-400'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                <span className="text-xl leading-none">{icon}</span>
                                <span className={`text-[10px] font-semibold tracking-wide ${active ? 'text-emerald-400' : ''}`}>
                                    {label}
                                </span>
                                {active && (
                                    <span className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />
                                )}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

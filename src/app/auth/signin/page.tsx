import { signIn } from '../../../../auth';

export default function SignInPage() {
    return (
        <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
            <div className="w-full max-w-sm space-y-6 text-center">
                {/* Logo mark */}
                <div className="flex flex-col items-center gap-3">
                    <span className="text-4xl font-black tracking-tight text-white">
                        Lede<span className="text-emerald-400">.</span>
                    </span>
                    <p className="text-sm text-zinc-400">
                        Civic intelligence for New York City
                    </p>
                </div>

                {/* Sign-in card */}
                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-6 space-y-4 backdrop-blur-md">
                    <p className="text-zinc-300 text-sm">Sign in to save your neighborhood profile and preferences.</p>

                    <form
                        action={async () => {
                            'use server';
                            await signIn('google', { redirectTo: '/' });
                        }}
                    >
                        <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-3 rounded-lg bg-white text-zinc-900 font-semibold text-sm py-2.5 px-4 hover:bg-zinc-100 transition-colors"
                        >
                            {/* Google G logo */}
                            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
                                <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" />
                                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
                            </svg>
                            Continue with Google
                        </button>
                    </form>

                    <p className="text-[11px] text-zinc-600">
                        By signing in you agree to the Lede.NYC terms of service.
                    </p>
                </div>
            </div>
        </main>
    );
}

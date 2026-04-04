import "./globals.css";
import Link from "next/link";
import { getSessionUser } from "@/lib/server-auth";
import { LogoutButton } from "@/components/ui/logout-button";
import { ToastProvider } from "@/components/toast";
import { prisma } from "@/lib/prisma";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  let profile: { name: string; profileImage?: string | null } | null = null;
  if (user) {
    try {
      profile = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true, profileImage: true }
      });
    } catch {
      // If Prisma cannot reach the database or the schema is behind, fall back to
      // the session payload so the layout can still render.
      profile = { name: user.name, profileImage: null };
    }
  }

  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
            <nav className="mx-auto flex max-w-[92rem] items-center justify-between px-3 py-3 sm:px-4">
              <Link
                href="/"
                className="group inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 shadow-sm transition hover:shadow-md"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-emerald-600 text-[10px] font-black text-white shadow-sm">
                  SV
                </span>
                <span className="text-lg font-black tracking-[0.14em] text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-emerald-700 bg-clip-text">
                  SLIIT VIBE
                </span>
              </Link>
              <div className="flex items-center gap-4 text-sm text-secondary">
                {user?.role === "admin" ? (
                  <Link href="/admin" className="transition hover:text-primary">Admin</Link>
                ) : null}
                {user ? (
                  <div className="flex items-center gap-3">
                    <span className="text-primary">{profile?.name ?? user.name}</span>
                    <Link
                      href="/profile"
                      aria-label="My profile"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-highlight text-primary transition hover:bg-emerald-100"
                    >
                      {profile?.profileImage ? (
                        <img src={profile.profileImage} alt="Profile" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21a8 8 0 0 0-16 0" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      )}
                    </Link>
                    <LogoutButton />
                  </div>
                ) : (
                  <>
                    <Link href="/login" className="transition hover:text-primary">Login</Link>
                    <Link href="/signup" className="rounded-full bg-primary px-3 py-1.5 text-white transition hover:bg-slate-800">Signup</Link>
                  </>
                )}
              </div>
            </nav>
          </header>
          <main className="mx-auto max-w-[92rem] px-3 py-8 sm:px-4">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}

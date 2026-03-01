import "./globals.css";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight text-primary">
              UniEvents
            </Link>
            <div className="flex items-center gap-4 text-sm text-secondary">
              <Link href="/create-event" className="transition hover:text-primary">Create Event</Link>
              <Link href="/my-events" className="transition hover:text-primary">My Events</Link>
              <Link href="/admin" className="transition hover:text-primary">Admin</Link>
              {user ? (
                <span className="text-primary">
                  {user.name}{" "}
                  <span className="rounded-full bg-highlight px-2 py-0.5 text-xs font-medium text-emerald-700">Logged in</span>
                </span>
              ) : (
                <>
                  <Link href="/login" className="transition hover:text-primary">Login</Link>
                  <Link href="/signup" className="rounded-full bg-primary px-3 py-1.5 text-white transition hover:bg-slate-800">Signup</Link>
                </>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}

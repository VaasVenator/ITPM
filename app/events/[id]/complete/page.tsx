import Link from "next/link";

type TicketPurchaseCompletionPageProps = {
  params: {
    id: string;
  };
};

export default function TicketPurchaseCompletionPage({
  params
}: TicketPurchaseCompletionPageProps) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-lime-400" />
            <span className="text-xs font-semibold text-primary">Payment Completion</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2.5 w-8 rounded-full bg-highlight" />
            <span className="h-2.5 w-8 rounded-full bg-highlight" />
            <span className="h-2.5 w-8 rounded-full bg-primary" />
          </div>

          <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-lime-400 text-[10px] font-bold text-black">
            3
          </div>
        </div>

        <div className="px-6 py-10">
          <h1 className="text-center text-2xl font-bold text-primary">
            Ticket purchase completion
          </h1>

          <div className="mx-auto mt-10 max-w-md text-center">
            <p className="text-sm font-semibold leading-6 text-primary">
              We will review the payment
              <br />
              and get back to you with
              <br />
              an Email
            </p>

            <div className="mt-8">
              <Link
                href="/"
                className="rounded-full bg-slate-200 px-6 py-2 text-sm font-semibold text-primary transition hover:bg-slate-300"
              >
                Return To Home page
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

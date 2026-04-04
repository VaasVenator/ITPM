type TicketPurchaseFormPageProps = {
  params: {
    id: string;
  };
};

export default function TicketPurchaseFormPage({
  params
}: TicketPurchaseFormPageProps) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-lime-400" />
            <span className="text-xs font-semibold text-primary">SiteName</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2.5 w-8 rounded-full bg-primary" />
            <span className="h-2.5 w-8 rounded-full bg-highlight" />
            <span className="h-2.5 w-8 rounded-full bg-highlight" />
          </div>

          <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-lime-400 text-[10px] font-bold text-black">
            2
          </div>
        </div>

        <div className="px-6 py-6">
          <h1 className="text-center text-2xl font-bold text-primary">
            Ticket purchase form
          </h1>

          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
            <p className="mb-6 text-center text-sm font-semibold text-primary">
              Enter guest details
            </p>

            <form
              action={`/events/${params.id}/payment`}
              method="get"
              className="space-y-3"
            >
              <input
                name="guestName"
                type="text"
                placeholder="Guest name"
                className="input-field"
                required
              />

              <input
                name="guestEmail"
                type="email"
                placeholder="Guest email"
                className="input-field"
                required
              />

              <input
                name="guestPhone"
                type="text"
                placeholder="Guest phone number"
                className="input-field"
              />

              <input
                name="quantity"
                type="number"
                min={1}
                defaultValue={1}
                className="input-field"
                required
              />

              <textarea
                name="notes"
                placeholder="Extra notes"
                className="textarea-field"
              />

              <div className="pt-4 text-center">
                <button
                  type="submit"
                  className="rounded-full bg-slate-200 px-6 py-2 text-sm font-semibold text-primary transition hover:bg-slate-300"
                >
                  Next
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}


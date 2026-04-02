import { EventForm } from "@/components/forms/event-form";

const CREATE_EVENT_NOTES = [
  "Choose the category first so the form adapts to the type of experience you are planning.",
  "Use a strong event image or poster. It becomes the visual identity of the event card.",
  "If tickets are needed, add the ticket price and inventory clearly so organisers can track sales properly."
];

export default function CreateEventPage() {
  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="absolute -left-10 top-6 h-40 w-40 rounded-full bg-red-100 blur-3xl" />
        <div className="absolute -right-16 -top-14 h-48 w-48 rounded-full bg-yellow-100 blur-3xl" />
        <div className="absolute bottom-4 right-20 h-36 w-36 rounded-full bg-orange-100 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-r from-red-50/70 via-transparent to-yellow-50/80" />

        <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <h1 className="max-w-2xl bg-gradient-to-r from-slate-950 via-red-700 to-yellow-500 bg-clip-text text-4xl font-black tracking-tight text-transparent md:text-5xl">
              Shape the event before the crowd ever sees it.
            </h1>
            <p className="max-w-2xl rounded-2xl border border-slate-200 bg-gradient-to-r from-red-50 via-white to-yellow-50 px-4 py-3 text-sm leading-6 text-slate-700 md:text-base">
              Build a polished event submission with the right category, ticket setup, and visual identity.
              This page is designed to help organisers think like producers, not just fill a form.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {CREATE_EVENT_NOTES.map((note, index) => (
              <div
                key={note}
                className={`rounded-2xl border p-4 ${
                  index === 0
                    ? "border-red-200 bg-red-50/90"
                    : index === 1
                      ? "border-yellow-200 bg-yellow-50/90"
                      : "border-orange-200 bg-orange-50/90"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Tip {index + 1}</p>
                <p className="mt-2 text-sm leading-6 text-primary">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur md:p-6">
        <EventForm />
      </div>
    </section>
  );
}

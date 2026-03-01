import { EventForm } from "@/components/forms/event-form";

export default function CreateEventPage() {
  return (
    <section className="surface-card mx-auto max-w-3xl p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Organiser Studio</p>
      <h1 className="mt-1 mb-5 text-3xl font-bold tracking-tight text-primary">Create Event</h1>
      <EventForm />
    </section>
  );
}

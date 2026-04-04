import { SponsorshipForm } from "@/components/forms/sponsorship-form";

export default function SponsorshipPage({ params }: { params: { eventId: string } }) {
  return (
    <section className="surface-card mx-auto max-w-3xl p-7">
      <h1 className="mt-1 mb-5 text-3xl font-bold tracking-tight text-primary">Request Sponsorship</h1>
      <SponsorshipForm eventId={params.eventId} />
    </section>
  );
}

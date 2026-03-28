type EventDetailsPageProps = {
  params: {
    id: string;
  };
};

const wiramayaDescription = `
Wiramaya is an esteemed annual cultural event organized by the SLIIT Faculty of Computing Student Community, traditionally held every August at the SLIIT Malabe campus. This vibrant celebration serves as a platform to showcase the diverse artistic talents of university students, bringing together a rich blend of oriental, classical, and contemporary performing arts.

The event features an engaging lineup of student-led performances, including dance, music, and drama, where students actively participate as performers, demonstrating their creativity, passion, and dedication to the arts. In addition to student performances, Wiramaya is further enriched by the presence of renowned guest artists who are invited to perform, adding a professional and captivating dimension to the event.

Wiramaya not only entertains but also fosters a strong sense of community and cultural appreciation within the university. It provides students with an opportunity to collaborate, express themselves artistically, and gain valuable stage experience in a professional setting.
`.trim();

export default function EventDetailsPage({ params }: EventDetailsPageProps) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          Event Description
        </p>

        <h1 className="mt-3 text-4xl font-black tracking-tight text-primary md:text-5xl">
          Wiramaya - Annual Cultural Showcase at SLIIT
        </h1>

        <p className="mt-2 text-xs font-medium text-secondary">
          Event ID: {params.id}
        </p>

        <div className="mt-6 rounded-2xl border border-emerald-100 bg-highlight/30 p-6">
          <p className="whitespace-pre-line text-sm leading-8 text-primary md:text-base">
            {wiramayaDescription}
          </p>
        </div>
      </section>
    </main>
  );
}










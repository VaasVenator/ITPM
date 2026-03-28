type StepHeaderProps = {
  title: string;
  activeStep: 1 | 2 | 3 | 4;
};

const stepMessages: Record<1 | 2 | 3 | 4, string> = {
  1: "Discover and reserve",
  2: "Add attendee details",
  3: "Confirm your payment",
  4: "Ready for review"
};

const steps = [1, 2, 3, 4] as const;

export function StepHeader({ title, activeStep }: StepHeaderProps) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.25)] backdrop-blur">
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 px-6 py-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="h-4 w-4 rounded-[0.35rem] bg-accent shadow-sm" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
                Event Spotlight
              </p>
              <p className="text-sm font-bold text-primary">{stepMessages[activeStep]}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {steps.map((step) => (
              <span
                key={step}
                className={`h-3 rounded-full transition-all duration-300 ${
                  step === activeStep
                    ? "w-12 bg-primary shadow-sm"
                    : step < activeStep
                      ? "w-9 bg-accent"
                      : "w-9 bg-highlight"
                }`}
              />
            ))}

            <div className="ml-1 inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent text-sm font-black text-white shadow-sm">
              {activeStep}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 md:px-10 md:py-10">
        <h1 className="text-center text-3xl font-black tracking-tight text-primary md:text-5xl">
          {title}
        </h1>
      </div>
    </div>
  );
}






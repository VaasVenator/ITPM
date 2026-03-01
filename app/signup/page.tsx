import { SignupForm } from "@/components/forms/signup-form";

export default function SignupPage() {
  return (
    <section className="surface-card mx-auto max-w-md p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Get Started</p>
      <h1 className="mt-1 mb-5 text-2xl font-bold text-primary">Create account</h1>
      <SignupForm />
    </section>
  );
}

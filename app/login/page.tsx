import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <section className="surface-card mx-auto max-w-md p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Welcome Back</p>
      <h1 className="mt-1 mb-5 text-2xl font-bold text-primary">Login</h1>
      <LoginForm />
    </section>
  );
}

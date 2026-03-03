import { ProfileForm } from "@/components/forms/profile-form";

export default function ProfilePage() {
  return (
    <section className="surface-card mx-auto max-w-3xl p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Account</p>
      <h1 className="mt-1 mb-5 text-3xl font-bold tracking-tight text-primary">My Profile</h1>
      <ProfileForm />
    </section>
  );
}

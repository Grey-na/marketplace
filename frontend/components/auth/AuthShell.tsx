export default function AuthShell({
  heading, text, panelClass, children,
}: {
  heading: React.ReactNode;
  text: string;
  panelClass: string;         // for example "bg-lavender" (written in full, so Tailwind can see it)
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-2 md:py-16">
      <section className={`relative min-h-64 overflow-hidden rounded-frame border-2 border-charcoal p-8 shadow-sticker md:p-12 ${panelClass}`}>
        <h1 className="relative z-10 font-display text-5xl leading-[0.95] md:text-7xl">{heading}</h1>
        <p className="relative z-10 mt-5 max-w-sm text-lg">{text}</p>

        <span aria-hidden className="absolute right-8 top-8 font-display text-5xl text-coral">✦</span>
        <div aria-hidden className="absolute -bottom-10 -right-10 h-44 w-44 rounded-full border-2 border-charcoal bg-butter" />
        <div aria-hidden className="absolute bottom-20 right-28 h-16 w-16 rotate-12 rounded-2xl border-2 border-charcoal bg-paper" />
      </section>

      <section className="rounded-frame border-2 border-charcoal bg-paper p-8 md:p-10">{children}</section>
    </main>
  );
}
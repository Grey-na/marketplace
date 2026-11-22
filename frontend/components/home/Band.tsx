export default function Band({
  className = "", id, children,
}: {
  className?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`relative -mt-10 rounded-t-[3rem] pb-24 pt-20 ${className}`}>
      <div className="mx-auto max-w-7xl px-6 md:px-10">{children}</div>
    </section>
  );
}
export default function PageHeader({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl leading-none md:text-5xl">{title}</h1>
        {text && <p className="mt-2 max-w-xl text-sm opacity-80">{text}</p>}
      </div>
      {action}
    </div>
  );
}
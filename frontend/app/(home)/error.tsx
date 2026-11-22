"use client";

export default function HomeError() {
  return (
    <main className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-5xl">Something went sideways.</h1>
        <p className="mt-3">We could not load this page. Please try again in a moment.</p>
        <button onClick={() => window.location.reload()} className="btn-sticker mt-8">
          Try again
        </button>
      </div>
    </main>
  );
}
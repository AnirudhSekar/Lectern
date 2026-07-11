import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="font-display text-3xl text-paper">Page not found</h1>
      <p className="mt-4 text-paper-dim">
        This lecture or page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link href="/dashboard" className="mt-6 inline-block text-highlighter hover:underline">
        Back to your lectures
      </Link>
    </div>
  );
}
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mt-10 p-8 text-center">
      <h1 className="text-xl font-bold">Result not found</h1>
      <p className="mt-2 text-slate-500">That link may have expired or never existed.</p>
      <Link href="/quiz" className="btn-primary mt-6">
        Start a new quiz
      </Link>
    </div>
  );
}

// Container for the interactive app surface (quiz, chat, account, pricing,
// review, legal pages). The publication surface at the top level renders full
// bleed and manages its own width via `.wrap`, so the constraining container
// lives here. The single <main> landmark is provided by the root layout.
export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">{children}</div>
  );
}

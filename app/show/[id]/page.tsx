export default async function ShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <main className="p-8">Show {id} — coming in M6.</main>;
}

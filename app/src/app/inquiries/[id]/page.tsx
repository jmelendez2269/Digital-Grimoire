import { redirect } from "next/navigation";
export const metadata = {
  title: "Research Inquiry | Prismarium",
  robots: { index: false, follow: false },
};
export default async function InquiryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/journal/research/${id}`);
}

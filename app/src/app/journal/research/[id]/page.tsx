import InquiryWorkspace from "@/components/inquiries/InquiryWorkspace";

export const metadata = {
  title: "Saved Research | Study Journal | Prismarium",
  robots: { index: false, follow: false },
};

export default async function JournalResearchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InquiryWorkspace id={id} />;
}

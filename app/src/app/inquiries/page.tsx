import { redirect } from "next/navigation";
export const metadata = {
  title: "Research Inquiries | Prismarium",
  robots: { index: false, follow: false },
};
export default function InquiriesPage() {
  redirect("/journal?tab=research");
}

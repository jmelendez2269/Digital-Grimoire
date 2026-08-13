import type { Metadata } from "next";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Community | Prismarium",
  description: "Videos, blog, and conversation with other Prismarium practitioners.",
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}

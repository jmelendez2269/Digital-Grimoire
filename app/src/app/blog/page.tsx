import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BlogListing, { type BlogPostSummary } from "@/components/blog/BlogListing";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Blog | Prismarium",
  description: "Essays and updates from Prismarium.",
};

export const revalidate = 60;

async function getPosts(): Promise<BlogPostSummary[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, title, excerpt, cover_image_url, tags, author_name, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Failed to load blog posts:", error);
    return [];
  }
  return data ?? [];
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-zinc-100 selection:bg-amber-900 selection:text-amber-50">
      <Header />
      <main className="container mx-auto flex-1 px-4 pt-32 pb-24 max-w-6xl">
        <div className="mb-12 text-center">
          <p className="text-xs font-mono text-amber-500/70 uppercase tracking-widest mb-3">Community</p>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-300 via-amber-200 to-orange-300 bg-clip-text text-transparent mb-4">
            The Grimoire Blog
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Essays, updates, and field notes from the Prismarium scribes.
          </p>
        </div>

        <BlogListing posts={posts} />
      </main>
      <Footer />
    </div>
  );
}

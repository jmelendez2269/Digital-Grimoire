import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MarkdownViewer from "@/components/Wiki/MarkdownViewer";
import { createServiceClient } from "@/lib/supabase/service";
import { ArrowLeft, ScrollText } from "lucide-react";

export const revalidate = 60;

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

interface BlogPostDetail {
  title: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  tags: string[];
  author_name: string;
  published_at: string | null;
}

async function getPost(slug: string): Promise<BlogPostDetail | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("title, excerpt, content, cover_image_url, tags, author_name, published_at")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to load blog post:", error);
    return null;
  }
  return data;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    return { title: "Post Not Found | Prismarium Blog" };
  }
  return {
    title: `${post.title} | Prismarium Blog`,
    description: post.excerpt ?? undefined,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-zinc-100 selection:bg-amber-900 selection:text-amber-50">
      <Header />
      <main className="flex-1">
        {post.cover_image_url ? (
          <div className="relative h-64 md:h-96 w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.cover_image_url} alt={post.title} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
          </div>
        ) : (
          <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-amber-950/40 via-zinc-950 to-black flex items-center justify-center">
            <ScrollText className="w-12 h-12 text-amber-900/50" />
          </div>
        )}

        <article className="container mx-auto max-w-3xl px-4 -mt-16 relative pb-24">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-amber-300 transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Blog
          </Link>

          <header className="mb-8">
            <h1 className="text-3xl md:text-5xl font-bold text-zinc-50 leading-tight mb-4">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
              <span>{post.author_name}</span>
              <span className="text-zinc-700">&middot;</span>
              <span>{formatDate(post.published_at)}</span>
            </div>
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-amber-900/30 bg-amber-950/20 px-2.5 py-1 text-xs text-amber-300/80"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          <MarkdownViewer content={post.content} />
        </article>
      </main>
      <Footer />
    </div>
  );
}

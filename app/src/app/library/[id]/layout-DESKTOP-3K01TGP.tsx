import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Wrap everything in try-catch to ensure we never throw
  try {
    let id: string = 'unknown';
    try {
      const resolvedParams = await params;
      id = resolvedParams.id || 'unknown';
    } catch (error) {
      console.error('Error getting params in generateMetadata:', error);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.projectparallax.io';

    try {
      let supabase;
      try {
        supabase = await createClient();
      } catch (clientError) {
        console.error('Error creating Supabase client in generateMetadata:', clientError);
        // Fall through to return default metadata
        supabase = null;
      }

      // Only try to fetch if we have a valid client
      if (supabase) {
        try {
          // Try to fetch document metadata (may fail if not authenticated, which is fine)
          const { data: document, error: queryError } = await supabase
            .from('texts')
            .select('title, author, summary, curator_note, tags, domain')
            .eq('id', id)
            .single();

          // Only use document data if query succeeded and document exists
          if (!queryError && document) {
            const title = document.title || 'Untitled Document';
            const author = document.author ? ` by ${document.author}` : '';
            const description = document.summary ||
              document.curator_note ||
              `Explore ${title}${author} in Project Parallax Library - a curated collection of esoteric texts and wisdom traditions.`;

            return {
              title: `${title}${author} | Project Parallax Library`,
              description,
              openGraph: {
                title: `${title}${author} | Parallax`,
                description,
                type: "website",
                url: `${baseUrl}/library/${id}`,
                images: [
                  {
                    url: "https://www.projectparallax.io/og-image.png",
                    width: 1200,
                    height: 630,
                    alt: title,
                  },
                ],
              },
              twitter: {
                card: "summary_large_image",
                title: `${title}${author} | Parallax`,
                description,
                images: ["https://www.projectparallax.io/og-image.png"],
              },
              robots: {
                index: true,
                follow: true,
              },
            };
          }
        } catch (queryError) {
          console.error('Error querying database in generateMetadata:', queryError);
          // Fall through to return default metadata
        }
      }
    } catch (error) {
      // If we can't fetch the document, return default metadata
      console.error('Error generating metadata for library document:', error);
      // Don't rethrow - always return fallback metadata
    }

    // Fallback metadata
    return {
      title: "Document | Project Parallax Library",
      description: "Explore this document in Project Parallax Library - a curated collection of esoteric texts and wisdom traditions.",
      openGraph: {
        title: "Document | Project Parallax Library",
        description: "Explore this document in Project Parallax Library.",
        type: "website",
        url: `${baseUrl}/library/${id}`,
        images: [
          {
            url: "https://www.projectparallax.io/og-image.png",
            width: 1200,
            height: 630,
            alt: "Project Parallax Library Document",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "Document | Project Parallax Library",
        description: "Explore this document in Project Parallax Library.",
        images: ["https://www.projectparallax.io/og-image.png"],
      },
      robots: {
        index: false,
        follow: false,
      },
    };
  } catch (error) {
    // Ultimate fallback - this should never happen, but just in case
    console.error('Fatal error in generateMetadata:', error);
    return {
      title: "Document | Project Parallax Library",
      description: "Explore this document in Project Parallax Library.",
    };
  }
}

export default function LibraryDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}


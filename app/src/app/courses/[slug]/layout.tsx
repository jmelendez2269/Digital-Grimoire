import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://projectparallax.xyz';

  try {
    const supabase = await createClient();
    const { data: course } = await supabase
      .from('courses')
      .select('title, description, premise, level, duration_weeks')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (!course) {
      return { title: 'Course | Project Parallax' };
    }

    const description =
      course.description ||
      course.premise ||
      `Explore ${course.title} through multi-lens analysis on Project Parallax.`;

    const truncatedDescription =
      description.length > 155 ? description.slice(0, 152) + '...' : description;

    return {
      title: `${course.title} | Project Parallax`,
      description: truncatedDescription,
      openGraph: {
        title: `${course.title} | Project Parallax`,
        description: truncatedDescription,
        type: 'website',
        url: `${baseUrl}/courses/${slug}`,
        images: [
          {
            url: `${baseUrl}/og-image.png`,
            width: 1200,
            height: 630,
            alt: `${course.title} — Project Parallax`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${course.title} | Project Parallax`,
        description: truncatedDescription,
        images: [`${baseUrl}/og-image.png`],
      },
    };
  } catch {
    return { title: 'Course | Project Parallax' };
  }
}

export default function CourseSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

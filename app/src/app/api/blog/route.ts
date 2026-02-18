
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BLOG_DIR = path.join(process.cwd(), 'src', 'content', 'blog');

// Helper to ensure directory exists
const ensureDir = () => {
    if (!fs.existsSync(BLOG_DIR)) {
        fs.mkdirSync(BLOG_DIR, { recursive: true });
    }
};

export async function GET() {
    ensureDir();
    try {
        const files = fs.readdirSync(BLOG_DIR).filter(file => file.endsWith('.md'));
        const posts = files.map(filename => {
            const content = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf-8');
            // Simple frontmatter parsing (assuming "---" delimiters) could be added here
            // For now, returning filename and raw content snippet or full content
            return {
                slug: filename.replace('.md', ''),
                filename,
                // In a real app, parse frontmatter here
            };
        });
        return NextResponse.json({ posts });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to list posts' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    ensureDir();
    try {
        const { slug, content } = await req.json();

        if (!slug || !content) {
            return NextResponse.json({ error: 'Slug and content are required' }, { status: 400 });
        }

        const safeSlug = slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
        const filename = `${safeSlug}.md`;
        const filePath = path.join(BLOG_DIR, filename);

        if (fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Post with this slug already exists' }, { status: 409 });
        }

        fs.writeFileSync(filePath, content, 'utf-8');

        return NextResponse.json({ success: true, filename });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }
}

import fs from 'fs/promises';
import path from 'path';

export interface WikiDoc {
    slug: string;
    title: string;
    content: string;
    lastModified: string;
}

const CONTENT_DIR = path.join(process.cwd(), 'src/content/wiki');

async function getDocContent(section: 'user' | 'technical', slugPath: string[]): Promise<WikiDoc | null> {
    try {
        const slug = slugPath.join('/');
        // Prevent directory traversal
        if (slug.includes('..')) return null;

        const fullPath = path.join(CONTENT_DIR, section, `${slug}.md`);

        // Check if file exists
        try {
            await fs.access(fullPath);
        } catch {
            return null;
        }

        const content = await fs.readFile(fullPath, 'utf8');
        const stats = await fs.stat(fullPath);

        // Naive title extraction (first h1)
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : slug;

        // Remove the title from the content to avoid duplication in the UI
        const contentWithoutTitle = titleMatch ? content.replace(titleMatch[0], '') : content;

        return {
            slug,
            title,
            content: contentWithoutTitle.trim(),
            lastModified: stats.mtime.toISOString(),
        };
    } catch (error) {
        console.error(`Error reading wiki doc: ${error}`);
        return null;
    }
}

export async function getUserDoc(slug: string[]) {
    return getDocContent('user', slug);
}

export async function getTechnicalDoc(slug: string[]) {
    return getDocContent('technical', slug);
}

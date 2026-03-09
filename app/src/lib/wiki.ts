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

        return {
            slug,
            title,
            content,
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

export async function getAllTechnicalDocs(): Promise<WikiDoc[]> {
    try {
        const technicalDir = path.join(CONTENT_DIR, 'technical');
        // Check if directory exists
        try {
            await fs.access(technicalDir);
        } catch {
            return [];
        }

        const files = await fs.readdir(technicalDir);
        const mdFiles = files.filter(f => f.endsWith('.md'));

        const docs = await Promise.all(
            mdFiles.map(async (file) => {
                const slug = file.replace(/\.md$/, '');
                const doc = await getDocContent('technical', [slug]);
                return doc;
            })
        );

        // Filter out nulls and type cast
        return docs.filter((d): d is WikiDoc => d !== null);
    } catch (error) {
        console.error(`Error getting all technical docs: ${error}`);
        return [];
    }
}

export async function getAllUserDocs(): Promise<WikiDoc[]> {
    try {
        const userDir = path.join(CONTENT_DIR, 'user');
        // Check if directory exists
        try {
            await fs.access(userDir);
        } catch {
            return [];
        }

        const files = await fs.readdir(userDir);
        const mdFiles = files.filter(f => f.endsWith('.md'));

        const docs = await Promise.all(
            mdFiles.map(async (file) => {
                const slug = file.replace(/\.md$/, '');
                const doc = await getDocContent('user', [slug]);
                return doc;
            })
        );

        // Filter out nulls and type cast
        return docs.filter((d): d is WikiDoc => d !== null);
    } catch (error) {
        console.error(`Error getting all user docs: ${error}`);
        return [];
    }
}

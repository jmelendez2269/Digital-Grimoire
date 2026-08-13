import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as dotenv from "dotenv";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.join(process.cwd(), "..", ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: true });

type TextRow = {
  id: string;
  title: string;
  author: string | null;
  year: number | null;
  publisher: string | null;
  license: string | null;
  domain: string | null;
  tags: string[] | null;
  cover_image_url: string | null;
  cover_source: string | null;
  cover_status: string | null;
};

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  course_type: string | null;
};

type CourseTextRow = {
  course_id: string;
  text_id: string;
  week_number: number | null;
  courses: CourseRow | CourseRow[] | null;
  texts: TextRow | TextRow[] | null;
};

type AuditEntry = TextRow & {
  courses: Array<Pick<CourseRow, "slug" | "title" | "is_published" | "course_type">>;
  localFile: string | null;
  downloadStatus: number | null;
  contentType: string | null;
  byteSize: number | null;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  technicalFlags: string[];
};

const ROOT = path.resolve(process.cwd(), "..");
const OUT_DIR = path.join(ROOT, ".tmp", "course-cover-audit");
const IMAGE_DIR = path.join(OUT_DIR, "images");

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function safeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
}

function xml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrap(value: string, max = 25): string[] {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

async function fetchCatalog(): Promise<CourseTextRow[]> {
  const useStaging = process.argv.includes("--staging");
  const url = useStaging
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : process.env.PROD_SUPABASE_URL;
  const key = useStaging
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.PROD_SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(`Missing ${useStaging ? "staging" : "production"} Supabase credentials`);
  }

  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client
    .from("course_texts")
    .select(
      "course_id,text_id,week_number,courses(id,slug,title,is_published,course_type),texts(id,title,author,year,publisher,license,domain,tags,cover_image_url,cover_source,cover_status)",
    );
  if (error) throw new Error(`course_texts query failed: ${error.message}`);
  return (data ?? []) as unknown as CourseTextRow[];
}

async function downloadCover(text: TextRow): Promise<{
  localFile: string | null;
  downloadStatus: number | null;
  contentType: string | null;
  byteSize: number | null;
  width: number | null;
  height: number | null;
}> {
  if (!text.cover_image_url) {
    return {
      localFile: null,
      downloadStatus: null,
      contentType: null,
      byteSize: null,
      width: null,
      height: null,
    };
  }

  try {
    const response = await fetch(text.cover_image_url, {
      headers: { "User-Agent": "PrismariumCoverAudit/1.0" },
      redirect: "follow",
    });
    if (!response.ok) {
      return {
        localFile: null,
        downloadStatus: response.status,
        contentType: response.headers.get("content-type"),
        byteSize: null,
        width: null,
        height: null,
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(buffer).metadata();
    const extension = metadata.format === "jpeg" ? "jpg" : metadata.format || "img";
    const filename = `${safeName(text.title) || text.id}-${text.id.slice(0, 8)}.${extension}`;
    const absoluteFile = path.join(IMAGE_DIR, filename);
    await fs.writeFile(absoluteFile, buffer);
    return {
      localFile: path.relative(ROOT, absoluteFile).replaceAll("\\", "/"),
      downloadStatus: response.status,
      contentType: response.headers.get("content-type"),
      byteSize: buffer.length,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
    };
  } catch {
    return {
      localFile: null,
      downloadStatus: 0,
      contentType: null,
      byteSize: null,
      width: null,
      height: null,
    };
  }
}

function technicalFlags(entry: Omit<AuditEntry, "technicalFlags" | "aspectRatio">): string[] {
  const flags: string[] = [];
  if (!entry.cover_image_url) flags.push("missing-cover");
  if (entry.cover_image_url && entry.downloadStatus !== 200) flags.push("unreachable");
  if (entry.byteSize !== null && entry.byteSize < 25_000) flags.push("very-small-file");
  if (entry.width !== null && entry.width < 400) flags.push("low-width");
  if (entry.height !== null && entry.height < 600) flags.push("low-height");
  if (entry.width && entry.height) {
    const ratio = entry.width / entry.height;
    if (ratio < 0.55 || ratio > 0.8) flags.push("nonstandard-aspect");
  }
  if (entry.cover_image_url?.startsWith("data:")) flags.push("embedded-data-url");
  return flags;
}

async function makeContactSheets(entries: AuditEntry[]): Promise<void> {
  const pageSize = 24;
  const cardWidth = 280;
  const cardHeight = 520;
  const columns = 6;
  const rows = 4;
  const palette = ["#6b3f16", "#07505b", "#712b3c", "#315e43", "#5b3f73", "#31517b"];

  for (let offset = 0; offset < entries.length; offset += pageSize) {
    const page = entries.slice(offset, offset + pageSize);
    const composites: sharp.OverlayOptions[] = [];
    for (let index = 0; index < page.length; index += 1) {
      const entry = page[index];
      const x = (index % columns) * cardWidth;
      const y = Math.floor(index / columns) * cardHeight;
      let cover: Buffer;
      if (entry.localFile) {
        cover = await sharp(path.join(ROOT, entry.localFile))
          .resize(240, 360, { fit: "contain", background: "#111111" })
          .extend({ top: 0, bottom: 0, left: 0, right: 0, background: "#111111" })
          .png()
          .toBuffer();
      } else {
        const titleLines = wrap(entry.title, 22);
        const fallback = `<svg width="240" height="360" xmlns="http://www.w3.org/2000/svg">
          <rect width="240" height="360" fill="${palette[(offset + index) % palette.length]}"/>
          <rect x="18" y="18" width="204" height="324" fill="none" stroke="#f8dda0" stroke-opacity=".5"/>
          <text x="120" y="55" fill="#f8dda0" text-anchor="middle" font-size="10" font-family="monospace" letter-spacing="2">PRISMARIUM READING</text>
          ${titleLines.map((line, i) => `<text x="120" y="${150 + i * 32}" fill="#fff8e8" text-anchor="middle" font-size="24" font-family="Georgia,serif">${xml(line)}</text>`).join("")}
        </svg>`;
        cover = Buffer.from(fallback);
      }

      composites.push({ input: cover, left: x + 20, top: y + 15 });
      const labels = [
        `${offset + index + 1}. ${entry.title}`,
        entry.author || "Unknown author",
        `${entry.width ?? "?"}x${entry.height ?? "?"} · ${entry.byteSize ? Math.round(entry.byteSize / 1024) : "?"} KB`,
        entry.technicalFlags.length ? entry.technicalFlags.join(", ") : "technical checks pass",
      ];
      const labelSvg = `<svg width="260" height="135" xmlns="http://www.w3.org/2000/svg">
        <rect width="260" height="135" fill="#09090b"/>
        ${labels.flatMap((label, labelIndex) => wrap(label, 33).slice(0, labelIndex === 0 ? 2 : 1).map((line, lineIndex) => {
          const yPos = 20 + labelIndex * 28 + lineIndex * 16;
          const color = labelIndex === 3 && entry.technicalFlags.length ? "#fbbf24" : labelIndex === 0 ? "#fafafa" : "#a1a1aa";
          return `<text x="2" y="${yPos}" fill="${color}" font-size="${labelIndex === 0 ? 14 : 12}" font-family="Arial,sans-serif">${xml(line)}</text>`;
        })).join("")}
      </svg>`;
      composites.push({ input: Buffer.from(labelSvg), left: x + 10, top: y + 375 });
    }

    const sheetNumber = Math.floor(offset / pageSize) + 1;
    await sharp({
      create: {
        width: cardWidth * columns,
        height: cardHeight * rows,
        channels: 4,
        background: "#09090b",
      },
    })
      .composite(composites)
      .png()
      .toFile(path.join(OUT_DIR, `contact-sheet-${sheetNumber}.png`));
  }
}

async function main(): Promise<void> {
  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(IMAGE_DIR, { recursive: true });

  const rows = await fetchCatalog();
  const byText = new Map<string, { text: TextRow; courses: AuditEntry["courses"] }>();
  for (const row of rows) {
    const text = one(row.texts);
    const course = one(row.courses);
    if (!text || !course) continue;
    const current = byText.get(text.id) ?? { text, courses: [] };
    if (!current.courses.some((item) => item.slug === course.slug)) {
      current.courses.push({
        slug: course.slug,
        title: course.title,
        is_published: course.is_published,
        course_type: course.course_type,
      });
    }
    byText.set(text.id, current);
  }

  const entries: AuditEntry[] = [];
  let completed = 0;
  for (const { text, courses } of [...byText.values()].sort((a, b) => a.text.title.localeCompare(b.text.title))) {
    const downloaded = await downloadCover(text);
    const base = { ...text, courses, ...downloaded };
    entries.push({
      ...base,
      aspectRatio: base.width && base.height ? Number((base.width / base.height).toFixed(3)) : null,
      technicalFlags: technicalFlags(base),
    });
    completed += 1;
    process.stdout.write(`\rAudited ${completed}/${byText.size} covers`);
  }
  process.stdout.write("\n");

  await fs.writeFile(path.join(OUT_DIR, "catalog.json"), JSON.stringify(entries, null, 2), "utf8");
  await makeContactSheets(entries);

  const flagged = entries.filter((entry) => entry.technicalFlags.length > 0);
  console.log(`Unique course texts: ${entries.length}`);
  console.log(`Technical flags: ${flagged.length}`);
  console.log(`Missing covers: ${entries.filter((entry) => !entry.cover_image_url).length}`);
  console.log(`Contact sheets: ${Math.ceil(entries.length / 24)}`);
  console.log(`Output: ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

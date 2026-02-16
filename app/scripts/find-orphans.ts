
import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');

// Configuration
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss'];
const ALIAS_PREFIX = '@/';
const ALIAS_TARGET = 'src/';

// Entry pattern helpers
const IS_PAGE = (filename: string) => /page\.(tsx|jsx|js|ts)$/.test(filename);
const IS_LAYOUT = (filename: string) => /layout\.(tsx|jsx|js|ts)$/.test(filename);
const IS_ROUTE = (filename: string) => /route\.(ts|js)$/.test(filename);
const IS_LOADING = (filename: string) => /loading\.(tsx|jsx|js|ts)$/.test(filename);
const IS_ERROR = (filename: string) => /error\.(tsx|jsx|js|ts)$/.test(filename);
const IS_NOT_FOUND = (filename: string) => /not-found\.(tsx|jsx|js|ts)$/.test(filename);
const IS_GLOBAL_ERROR = (filename: string) => /global-error\.(tsx|jsx|js|ts)$/.test(filename);
const IS_TEMPLATE = (filename: string) => /template\.(tsx|jsx|js|ts)$/.test(filename);
const IS_DEFAULT = (filename: string) => /default\.(tsx|jsx|js|ts)$/.test(filename); // Parallel routes
const IS_MIDDLEWARE = (filename: string) => filename === 'middleware.ts' || filename === 'middleware.js';
const IS_INSTRUMENTATION = (filename: string) => filename === 'instrumentation.ts' || filename === 'instrumentation.js';

// Specific known entry points or files to ignore
const WHITELIST_FILES = [
    'src/middleware.ts',
    'src/instrumentation.ts',
    'src/styles/globals.css', // Usually imported in layout but good to keep
];

// Helper to walk directory
function getAllFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            getAllFiles(filePath, fileList);
        } else {
            fileList.push(filePath);
        }
    });
    return fileList;
}

// Helper to resolve import path to absolute file path
function resolveImport(sourceFile: string, importPath: string): string | null {
    let targetPath = '';

    if (importPath.startsWith(ALIAS_PREFIX)) {
        targetPath = path.join(process.cwd(), 'src', importPath.replace('@/', ''));
    } else if (importPath.startsWith('.')) {
        targetPath = path.resolve(path.dirname(sourceFile), importPath);
    } else {
        // Node modules or absolute system paths (ignore)
        return null;
    }

    // Check extensions
    for (const ext of EXTENSIONS) {
        if (fs.existsSync(targetPath + ext)) return targetPath + ext;
    }

    // Check exact
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) return targetPath;

    // Check index
    for (const ext of EXTENSIONS) {
        if (fs.existsSync(path.join(targetPath, 'index' + ext))) return path.join(targetPath, 'index' + ext);
    }

    // Handle CSS/SCSS/Images if imported specifically
    if (fs.existsSync(targetPath)) return targetPath;

    return null;
}

// Regex for imports
const IMPORT_REGEX = /import\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)|require\(['"]([^'"]+)['"]/g;

function analyze() {
    const allFiles = getAllFiles(SRC_DIR).filter(f => !f.includes('.test.') && !f.includes('.spec.')); // exclude tests for now? Maybe keep them.
    // Actually, keep everything in SRC for now.

    const fileSet = new Set(allFiles);
    const importMap = new Map<string, string[]>();
    const entryPoints = new Set<string>();

    // 1. Scan files
    allFiles.forEach(file => {
        const filename = path.basename(file);
        const relativePath = path.relative(process.cwd(), file).replace(/\\/g, '/');

        // Identify Entry Points
        if (
            relativePath.startsWith('src/app') && (
                IS_PAGE(filename) ||
                IS_LAYOUT(filename) ||
                IS_ROUTE(filename) ||
                IS_LOADING(filename) ||
                IS_ERROR(filename) ||
                IS_NOT_FOUND(filename) ||
                IS_GLOBAL_ERROR(filename) ||
                IS_TEMPLATE(filename) ||
                IS_DEFAULT(filename)
            )
        ) {
            entryPoints.add(file);
        } else if (WHITELIST_FILES.includes(relativePath)) {
            entryPoints.add(file);
        }

        // Parse Imports
        const content = fs.readFileSync(file, 'utf-8');
        let match;
        const imports: string[] = [];
        while ((match = IMPORT_REGEX.exec(content)) !== null) {
            const importPath = match[1] || match[2] || match[3];
            if (importPath) {
                const resolved = resolveImport(file, importPath);
                if (resolved && fileSet.has(resolved)) {
                    imports.push(resolved);
                }
            }
        }
        importMap.set(file, imports);
    });

    // 2. BFS
    const visited = new Set<string>();
    const queue = Array.from(entryPoints);
    queue.forEach(ep => visited.add(ep));

    let head = 0;
    while (head < queue.length) {
        const current = queue[head++];
        const imports = importMap.get(current) || [];
        imports.forEach(imp => {
            if (!visited.has(imp)) {
                visited.add(imp);
                queue.push(imp);
            }
        });
    }

    // 3. Find Orphans
    const orphans = allFiles.filter(f => !visited.has(f));

    // Output
    const reportPath = path.join(process.cwd(), 'orphans_report.txt');
    let output = '--- DEPENDENCY ANALYSIS REPORT ---\n';
    output += `Total Files Scanned: ${allFiles.length}\n`;
    output += `Entry Points: ${entryPoints.size}\n`;
    output += `Reachable Files: ${visited.size}\n`;
    output += `Orphaned Files: ${orphans.length}\n`;
    output += '\n--- ORPHANED FILES ---\n';
    orphans.forEach(f => {
        output += path.relative(process.cwd(), f).replace(/\\/g, '/') + '\n';
    });

    fs.writeFileSync(reportPath, output);
    console.log('Report written to orphans_report.txt');
}

analyze();

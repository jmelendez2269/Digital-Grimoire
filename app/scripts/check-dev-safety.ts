
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(color: string, message: string) {
    console.log(`${color}${message}${RESET}`);
}

function checkSupabaseStatus() {
    try {
        log(YELLOW, 'Checking local Supabase status...');
        execSync('npx supabase status', { stdio: 'ignore' });
        log(GREEN, '✅ Local Supabase is running.');
        return true;
    } catch (error) {
        log(RED, '❌ Local Supabase is NOT running.');
        log(YELLOW, '👉 Please run: npx supabase start');
        // Check if Docker is running
        try {
            execSync('docker ps', { stdio: 'ignore' });
        } catch {
            log(RED, '   (It seems Docker is also not running. Please start Docker Desktop.)');
        }
        return false;
    }
}

function getCurrentSupabaseMode() {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
        return 'missing';
    }

    const content = fs.readFileSync(envPath, 'utf-8');
    const urlMatch = content.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m);
    const url = urlMatch?.[1]?.trim() || '';

    if (url.includes('127.0.0.1:54321') || url.includes('localhost:54321')) {
        return 'local';
    }

    if (url.includes('supabase.co')) {
        return 'remote';
    }

    return 'unknown';
}

function checkGitBranch() {
    try {
        const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
        if (branch === 'prod' || branch === 'main') {
            log(RED, `❌ You are on the '${branch}' branch!`);
            log(YELLOW, '👉 Please switch to a dev branch before making changes: git checkout dev');
            return false;
        }
        log(GREEN, `✅ On branch '${branch}' (safe for dev).`);
        return true;
    } catch (error) {
        log(YELLOW, '⚠️  Could not determine git branch (not a git repo?)');
        return true; // Weak pass
    }
}

function checkEnvFile() {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
        log(YELLOW, '⚠️  No .env.local file found. You might be missing local keys.');
        return true; // Warn but allow
    }

    const content = fs.readFileSync(envPath, 'utf-8');
    const mode = getCurrentSupabaseMode();
    if (mode === 'remote') {
        log(GREEN, '✅ .env.local points to a hosted Supabase project.');
        log(YELLOW, '   Confirm this is your staging/dev project and not production.');
    } else if (mode === 'local') {
        log(GREEN, '✅ .env.local looks safe (local keys detected).');
    } else {
        log(YELLOW, '⚠️  Could not classify the active Supabase environment in .env.local.');
    }
    return true;
}

function main() {
    console.log('🛡️  Running Safety Checks...\n');

    const supabaseMode = getCurrentSupabaseMode();
    let isSupabaseRunning = true;

    if (supabaseMode === 'local') {
        log(YELLOW, 'Environment mode: local Supabase');
        isSupabaseRunning = checkSupabaseStatus();
    } else if (supabaseMode === 'remote') {
        log(GREEN, 'Environment mode: staging/remote Supabase');
        log(YELLOW, 'Skipping local Supabase health check because .env.local points to a hosted project.');
    } else {
        log(YELLOW, 'Environment mode: unknown');
        log(YELLOW, 'Could not determine whether .env.local points to local or remote Supabase.');
    }

    const isBranchSafe = checkGitBranch();
    const isEnvSafe = checkEnvFile();

    if (!isSupabaseRunning || !isBranchSafe) {
        log(RED, '\n⛔ Safety Checks Failed. Fix items above and try again.');
        process.exit(1);
    }

    log(GREEN, '\n✨ Environment looks safe for development.');
}

main();

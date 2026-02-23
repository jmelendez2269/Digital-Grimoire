
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
    if (content.includes('supabase.co')) { // simplistic check for remote URL
        log(YELLOW, '⚠️  YOUR .env.local CONTAINS REMOTE SUPABASE URLS!');
        log(YELLOW, '   This means you might connect to PROD from local.');
        log(YELLOW, '   Verify this is intentional.');
        // We don't block, but we warn heavily.
    } else {
        log(GREEN, '✅ .env.local looks safe (local keys detected).');
    }
    return true;
}

function main() {
    console.log('🛡️  Running Safety Checks...\n');

    const isSupabaseRunning = checkSupabaseStatus();
    const isBranchSafe = checkGitBranch();
    const isEnvSafe = checkEnvFile();

    if (!isSupabaseRunning || !isBranchSafe) {
        log(RED, '\n⛔ Safety Checks Failed. Fix items above and try again.');
        process.exit(1);
    }

    log(GREEN, '\n✨ Environment looks safe for development.');
}

main();

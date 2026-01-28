const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
const https = require('https');

// Quick and dirty .env.local parser
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env.local');
        if (!fs.existsSync(envPath)) {
            console.error("❌ .env.local file not found at " + envPath);
            return;
        }
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, '');
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
    } catch (e) {
        console.error("Error loading .env.local", e);
    }
}

loadEnv();

const nanoBananaKey = process.env.NANO_BANANA_API_KEY;
const replicateKey = process.env.REPLICATE_API_TOKEN;

console.log("========================================");
console.log("   AI SERVICE VERIFICATION ");
console.log("========================================");

// --- NANO BANANA (GOOGLE GEMINI) CHECK ---
async function verifyNanoBanana() {
    console.log("\n[1/2] Checking Nano Banana (Google Gemini)...");

    if (!nanoBananaKey) {
        console.error("❌ NANO_BANANA_API_KEY is missing in .env.local");
        return false;
    }
    console.log("   - Key found (" + nanoBananaKey.substring(0, 5) + "...)");

    const genAI = new GoogleGenerativeAI(nanoBananaKey);
    try {
        // Simple test with a known working model from previous steps
        const modelName = "gemini-2.0-flash";
        process.stdout.write(`   - Testing connection with ${modelName}... `);

        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("ping");
        const response = await result.response;
        const text = response.text();

        console.log("✅ OK");
        console.log(`   - Response: "${text.trim()}"`);
        return true;
    } catch (error) {
        console.log("❌ FAILED");
        console.error(`   - Error: ${error.message}`);
        // Fallback check
        console.log("   - Trying gemini-1.5-flash as fallback...");
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            await model.generateContent("ping");
            console.log("   - ✅ gemini-1.5-flash works.");
            return true;
        } catch (e) {
            console.error(`   - Fallback also failed: ${e.message}`);
            return false;
        }
    }
}

// --- REPLICATE CHECK ---
async function verifyReplicate() {
    console.log("\n[2/2] Checking Replicate...");

    if (!replicateKey) {
        console.error("❌ REPLICATE_API_TOKEN is missing in .env.local");
        return false;
    }
    console.log("   - Token found (" + replicateKey.substring(0, 5) + "...)");

    if (!replicateKey.startsWith('r8_')) {
        console.warn("   - ⚠️  Warning: Token does not start with 'r8_'. Old tokens might still work but 'r8_' is standard.");
    }

    return new Promise((resolve) => {
        process.stdout.write("   - Testing connection (fetching account/models)... ");

        // We'll try to list a public model or just hitting the API root/account
        // Replicate doesn't have a simple "ping", but listing collections or get a model works.
        // Let's try getting the stability-ai/sdxl model which should exist.
        const options = {
            hostname: 'api.replicate.com',
            path: '/v1/models/stability-ai/sdxl',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${replicateKey}`,
                'User-Agent': 'DigitalGrimoire-Verification/1.0'
            }
        };

        const req = https.request(options, (res) => {
            if (res.statusCode === 200) {
                console.log("✅ OK");
                resolve(true);
            } else {
                console.log("❌ FAILED");
                console.error(`   - Status Code: ${res.statusCode}`);
                let body = '';
                res.on('data', d => body += d);
                res.on('end', () => {
                    if (body) console.error(`   - Response: ${body.substring(0, 100)}...`);
                    resolve(false);
                });
            }
        });

        req.on('error', (e) => {
            console.log("❌ ERROR");
            console.error(`   - Request Error: ${e.message}`);
            resolve(false);
        });

        req.end();
    });
}

async function main() {
    const geminiOk = await verifyNanoBanana();
    const replicateOk = await verifyReplicate();

    console.log("\n========================================");
    console.log("SUMMARY:");
    console.log("Nano Banana (Gemini): " + (geminiOk ? "✅ WORKING" : "❌ FAILED"));
    console.log("Replicate:            " + (replicateOk ? "✅ WORKING" : "❌ FAILED"));
    console.log("========================================");
}

main();

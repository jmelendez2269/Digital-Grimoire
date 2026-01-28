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

const apiKey = process.env.NANO_BANANA_API_KEY;
const replicateKey = process.env.REPLICATE_API_TOKEN;

console.log("----------------------------------------");
if (apiKey) console.log("✅ NANO_BANANA_API_KEY found: " + apiKey.substring(0, 5) + "...");
else console.error("❌ NANO_BANANA_API_KEY is missing");

if (replicateKey) console.log("✅ REPLICATE_API_TOKEN found: " + replicateKey.substring(0, 5) + "...");
else console.error("❌ REPLICATE_API_TOKEN is missing");
console.log("----------------------------------------");

if (!apiKey) {
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModelsRaw() {
    return new Promise((resolve, reject) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) {
                        console.error("❌ List API Error:", json.error.message);
                        resolve([]);
                    } else if (json.models) {
                        console.log("\n📋 Available Models for this Key:");
                        json.models.forEach(m => {
                            if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                                console.log(`   - ${m.name.replace('models/', '')}`);
                            }
                        });
                        resolve(json.models.map(m => m.name.replace('models/', '')));
                    } else {
                        console.log("No models found in list response.");
                        resolve([]);
                    }
                } catch (e) {
                    console.error("Error parsing list response", e);
                    resolve([]);
                }
            });
        }).on('error', (e) => {
            console.error("Error listing models", e);
            resolve([]);
        });
    });
}

async function testModel(modelName) {
    console.log(`\nTesting generation with: ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Say 'ok'");
        const response = await result.response;
        const text = response.text();
        console.log(`✅ ${modelName} SUCCESS:`, text);
        return true;
    } catch (error) {
        console.error(`❌ ${modelName} FAILED: ${error.message.substring(0, 150)}...`);
        return false;
    }
}

async function main() {
    console.log("Starting connectivity test...");

    // Try to list models first to see what's actually available
    const availableModels = await listModelsRaw();

    // Define fallback list if listing fails or returns empty (though if listing fails, these likely fail too)
    let modelsToTest = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro'];

    if (availableModels.length > 0) {
        console.log("\nUsing listed models for testing...");
        // Filter for some known ones to avoid testing 50 models
        modelsToTest = availableModels.filter(m => m.includes('gemini') && (m.includes('flash') || m.includes('pro')));
    }

    let successCount = 0;
    for (const model of modelsToTest) {
        if (await testModel(model)) {
            successCount++;
        }
    }

    if (successCount === 0) {
        console.error("\n❌ ALL MODELS FAILED. Your API key might be invalid, expired, or lacking 'Generative Language API' permission in Google Cloud Console.");
        console.error("Please verify your key at: https://aistudio.google.com/app/apikey");
    } else {
        console.log("\n✅ At least one model works.");
    }
}

main();

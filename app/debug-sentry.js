const dsn = "https://a5986e6795248cc5952d42536d2b6a9d@o4510426955644928.ingest.us.sentry.io/4510426982055936";
const header = JSON.stringify({ dsn });
const itemHeader = JSON.stringify({ type: "event", length: 2 });
const itemPayload = "{}";
const envelope = `${header}\n${itemHeader}\n${itemPayload}`;

console.log("Sending envelope...");

// Simple fetch wrapper
async function run() {
    try {
        const r = await fetch('http://localhost:3000/monitoring', {
            method: 'POST',
            body: envelope,
            headers: {
                'Content-Type': 'application/x-sentry-envelope'
            }
        });

        console.log("Status:", r.status);
        const text = await r.text();
        console.log("Response Body Length:", text.length);
        // Write to file to avoid console garbling
        const fs = require('fs');
        fs.writeFileSync('debug-output.txt', text);
        console.log("Wrote response to debug-output.txt");
    } catch (e) {
        console.error("Error:", e);
    }
}

run();

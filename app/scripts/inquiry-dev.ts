import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { inquiryLocalEnv } from "./inquiry-local-env";

const env = inquiryLocalEnv(process.argv.includes("--research"));
console.log(
  `Inquiry verification server: http://127.0.0.1:3027 (database ${env.NEXT_PUBLIC_SUPABASE_URL})`
);
const child = spawn(
  process.execPath,
  [
    resolve("node_modules/next/dist/bin/next"),
    "dev",
    "--webpack",
    "--port",
    "3027",
    "--hostname",
    "127.0.0.1",
  ],
  { env, stdio: "inherit" }
);
child.on("exit", (code) => {
  process.exitCode = code || 0;
});

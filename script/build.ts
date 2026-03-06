import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";

async function buildAll() {
  console.log("Building Next.js application...");
  
  try {
    execSync("npx next build", { 
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "production" }
    });
    
    mkdirSync("dist", { recursive: true });
    
    const serverWrapper = `
const { execSync, spawn } = require("child_process");

const PORT = process.env.PORT || 5000;

console.log("Starting Next.js production server on port " + PORT + "...");

const server = spawn("npx", ["next", "start", "-p", PORT.toString(), "-H", "0.0.0.0"], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" }
});

server.on("error", (err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

server.on("close", (code) => {
  process.exit(code || 0);
});
`;
    
    writeFileSync("dist/index.cjs", serverWrapper);
    
    console.log("Build completed successfully!");
    console.log("Created dist/index.cjs production wrapper");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

buildAll();

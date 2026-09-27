import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");

// Define destination directory: strictly inside the taskmaster project folder
const releaseDir = path.resolve(appRoot, "releases");

console.log("\n========================================================");
console.log("  BUILDING TASKMASTER EVERYWHERE TAURI PRODUCTION RELEASE");
console.log("========================================================\n");

// 1. Build frontend and Tauri packages
console.log("[BUILD] Compiling frontend and bundling Tauri (EXE, MSI, NSIS)...");
execSync("npx tauri build", {
  cwd: appRoot,
  stdio: "inherit",
});

// 2. Locate built artifacts
const targetReleaseDir = path.resolve(appRoot, "src-tauri/target/release");
const bundleDir = path.resolve(targetReleaseDir, "bundle");
const nsisDir = path.resolve(bundleDir, "nsis");
const msiDir = path.resolve(bundleDir, "msi");

const pkg = JSON.parse(fs.readFileSync(path.resolve(appRoot, "package.json"), "utf8"));
const targetVersion = pkg.version;

function findBestArtifact(dir, predicate) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter(predicate)
    .map((name) => {
      const fullPath = path.resolve(dir, name);
      return { name, fullPath, mtime: fs.statSync(fullPath).mtimeMs };
    });
  
  // Prefer matching target version
  const exactMatch = files.find((f) => f.name.includes(targetVersion));
  if (exactMatch) return exactMatch.fullPath;

  // Fallback to most recently created/modified file
  files.sort((a, b) => b.mtime - a.mtime);
  return files.length > 0 ? files[0].fullPath : null;
}

const candidateExeNames = [
  "Taskmaster.exe",
  "taskmaster.exe",
  "todo-overlay-app.exe",
  "Taskmaster Everywhere.exe",
  "Taskmaster-Everywhere.exe",
  "taskmaster-everywhere.exe",
  "TaskMaster.exe",
];

let portableExe = null;
const foundExes = candidateExeNames
  .map((name) => path.resolve(targetReleaseDir, name))
  .filter((p) => fs.existsSync(p))
  .map((p) => ({ fullPath: p, mtime: fs.statSync(p).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

if (foundExes.length > 0) {
  portableExe = foundExes[0].fullPath;
}

let setupExe = findBestArtifact(nsisDir, (f) => f.endsWith("-setup.exe") || f.endsWith(".exe"));
let setupMsi = findBestArtifact(msiDir, (f) => f.endsWith(".msi"));

// 3. Prepare release files map (strictly versioned binaries only)
const filesToDeploy = [
  { source: portableExe, targetName: `Taskmaster-v${targetVersion}-Portable.exe`, desc: `Portable Executable v${targetVersion} (No install needed)` },
  { source: setupExe, targetName: `Taskmaster-v${targetVersion}-Setup.exe`, desc: `EXE Setup Installer v${targetVersion} (.exe)` },
  { source: setupMsi, targetName: `Taskmaster-v${targetVersion}-Setup.msi`, desc: `MSI Setup Installer v${targetVersion} (.msi)` },
];

// 4. Copy to release folder
// Ensure any running instances of Taskmaster are stopped so files can be replaced on Windows
try {
  if (process.platform === "win32") {
    execSync('taskkill /F /FI "IMAGENAME eq Taskmaster*" /IM "todo-overlay-app.exe" 2>nul || exit 0', { stdio: "ignore" });
  }
} catch {
  // Ignore if not running
}

fs.mkdirSync(releaseDir, { recursive: true });

// Clean up legacy unversioned binaries and 'Everywhere' binaries if present
const obsoleteFiles = [
  "Taskmaster-Portable.exe",
  "Taskmaster-Setup.exe",
  "Taskmaster-Setup.msi",
  "Taskmaster-Everywhere-Portable.exe",
  "Taskmaster-Everywhere-Setup.exe",
  "Taskmaster-Everywhere-Setup.msi",
];
for (const oldFile of obsoleteFiles) {
  const oldPath = path.resolve(releaseDir, oldFile);
  if (fs.existsSync(oldPath)) {
    try { fs.unlinkSync(oldPath); } catch {}
  }
}

for (const item of filesToDeploy) {
  if (item.source && fs.existsSync(item.source)) {
    const destPath = path.resolve(releaseDir, item.targetName);
    try {
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      fs.copyFileSync(item.source, destPath);
    } catch (err) {
      console.warn(`Warning copying to ${destPath}:`, err.message);
    }
  }
}

// Flush Windows Explorer icon cache so new icon appears immediately
try {
  if (process.platform === "win32") {
    execSync('ie4uinit.exe -show 2>nul || exit 0', { stdio: "ignore" });
  }
} catch {}

// 5. Output Summary
console.log("\n========================================================");
console.log("  [SUCCESS] RELEASE BUILD COMPLETED & UPDATED SUCCESSFULLY");
console.log("========================================================\n");
console.log("The following releases have been generated and updated:\n");

for (const item of filesToDeploy) {
  const filePath = path.resolve(releaseDir, item.targetName);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(` • ${item.targetName} (${sizeMb} MB)`);
    console.log(`   Description: ${item.desc}`);
    console.log(`   Path: ${filePath}\n`);
  } else {
    console.log(` [NOTICE] ${item.targetName}: Not found\n`);
  }
}

console.log(`Output release directory:\n - ${releaseDir}\n`);
console.log("Each time you run this command, old files in this directory are automatically replaced with the new build.\n");

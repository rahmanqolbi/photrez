// Kill leftover dev processes from this project
// Uses PowerShell to kill by port 1420 (non-standard port — unique to this project)
// + taskkill for the Tauri app binary
const { execSync } = require("child_process");

// 1. Kill whatever is holding port 1420 (leftover Vite from previous session)
try {
  execSync(
    'powershell -NoProfile -Command "$conn=Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue; if ($conn) { Stop-Process -Id $conn.OwningProcess -Force }"',
    { stdio: "ignore", timeout: 10000 },
  );
  console.log("Cleared port 1420");
} catch {
  // No process on port 1420 — expected
}

// 2. Kill leftover Tauri app process
try {
  execSync("taskkill /F /IM photrez-desktop.exe", { stdio: "ignore", timeout: 3000 });
  console.log("Killed leftover photrez-desktop process");
} catch {
  // Not running — expected
}

# Setup Environment for Photrez Development
# Adds MSYS2 MinGW to PATH permanently

$msysPath = "C:\msys64\mingw64\bin"

Write-Host "=== Photrez Environment Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if MSYS2 exists
if (!(Test-Path "C:\msys64\usr\bin\pacman.exe")) {
    Write-Host "ERROR: MSYS2 not found at C:\msys64" -ForegroundColor Red
    Write-Host "Install MSYS2 first: winget install MSYS2.MSYS2" -ForegroundColor Yellow
    exit 1
}

# Check if MinGW is installed
if (!(Test-Path "$msysPath\dlltool.exe")) {
    Write-Host "ERROR: MinGW toolchain not found at $msysPath" -ForegroundColor Red
    Write-Host "Install it: C:\msys64\usr\bin\pacman.exe -S --noconfirm mingw-w64-x86_64-toolchain" -ForegroundColor Yellow
    exit 1
}

# Get current user PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

# Check if already added
if ($currentPath -like "*$msysPath*") {
    Write-Host "OK: MSYS2 MinGW already in PATH" -ForegroundColor Green
} else {
    # Add to PATH
    $newPath = "$currentPath;$msysPath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "OK: Added $msysPath to user PATH" -ForegroundColor Green
    
    # Update current session
    $env:Path = "$env:Path;$msysPath"
    Write-Host "OK: Updated current session PATH" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Verification ===" -ForegroundColor Cyan

# Verify tools
$tools = @("dlltool", "windres", "gcc", "ar")
foreach ($tool in $tools) {
    $found = Get-Command $tool -ErrorAction SilentlyContinue
    if ($found) {
        Write-Host "  $tool : OK ($($found.Source))" -ForegroundColor Green
    } else {
        Write-Host "  $tool : NOT FOUND" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host "Open a NEW terminal, then run: bun run tauri dev" -ForegroundColor Yellow

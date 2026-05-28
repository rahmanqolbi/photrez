# Performance Measurement Script for Photrez M6
# Measures startup time and idle RAM per docs/16-performance-measurement-protocol.md

$exePath = "D:\Project\image-studio\target\release\photrez-desktop.exe"
$runs = 5

Write-Host "=== Photrez Performance Measurement ===" -ForegroundColor Cyan
Write-Host ""

# System Info
Write-Host "--- System Info ---" -ForegroundColor Yellow
$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor
$ram = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
Write-Host "OS: $($os.Caption) Build $($os.BuildNumber)"
Write-Host "CPU: $($cpu.Name)"
Write-Host "RAM: ${ram} GB"
Write-Host "Build mode: release"
Write-Host ""

# Startup Time Measurement
Write-Host "--- Startup Time Measurement ---" -ForegroundColor Yellow
$startupTimes = @()

for ($i = 1; $i -le $runs; $i++) {
    Write-Host "Run $i/$runs..." -NoNewline
    
    # Kill any existing instances
    Get-Process -Name "photrez-desktop" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 1
    
    # Measure startup time
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $process = Start-Process -FilePath $exePath -PassThru
    
    # Wait for the process to be responsive (main window handle exists)
    $timeout = 10000  # 10 seconds max wait
    $elapsed = 0
    while ($elapsed -lt $timeout) {
        $process.Refresh()
        if ($process.Responding) {
            break
        }
        Start-Sleep -Milliseconds 100
        $elapsed += 100
    }
    
    $stopwatch.Stop()
    $startupMs = $stopwatch.ElapsedMilliseconds
    $startupTimes += $startupMs
    
    Write-Host " ${startupMs}ms"
    
    # Keep app running for idle RAM measurement
    if ($i -eq $runs) {
        Write-Host ""
        Write-Host "Waiting 30 seconds for idle state..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    }
    
    # Kill for next run (except last)
    if ($i -lt $runs) {
        $process | Stop-Process -Force
    }
}

Write-Host ""
Write-Host "--- Startup Time Results ---" -ForegroundColor Yellow
$startupTimes | Sort-Object
$min = ($startupTimes | Measure-Object -Minimum).Minimum
$max = ($startupTimes | Measure-Object -Maximum).Maximum
$median = ($startupTimes | Sort-Object)[([math]::Floor($runs / 2))]
$avg = [math]::Round(($startupTimes | Measure-Object -Average).Average, 1)
Write-Host "Runs: $($startupTimes -join ', ')"
Write-Host "Min: ${min}ms"
Write-Host "Max: ${max}ms"
Write-Host "Median: ${median}ms"
Write-Host "Avg: ${avg}ms"
Write-Host "Target: <2000ms"
$result = if ($avg -lt 2000) { "PASS" } else { "FAIL" }
Write-Host "Result: $result" -ForegroundColor $(if ($result -eq "PASS") { "Green" } else { "Red" })
Write-Host ""

# Idle RAM Measurement
Write-Host "--- Idle RAM Measurement ---" -ForegroundColor Yellow
$process = Get-Process -Name "photrez-desktop" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($process) {
    $ramMB = [math]::Round($process.WorkingSet64 / 1MB, 1)
    Write-Host "Idle RAM: ${ramMB} MB"
    Write-Host "Target: <250 MB"
    $ramResult = if ($ramMB -lt 250) { "PASS" } else { "FAIL" }
    Write-Host "Result: $ramResult" -ForegroundColor $(if ($ramResult -eq "PASS") { "Green" } else { "Red" })
} else {
    Write-Host "ERROR: Process not found" -ForegroundColor Red
}

# Kill the app
$process | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== Measurement Complete ===" -ForegroundColor Cyan

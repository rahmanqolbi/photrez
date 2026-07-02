# Photrez Startup Time Measurement
# Usage: .\scripts\dev\measure-startup.ps1
# Measures time from process start to window being visible

$appPath = "D:\Project\image-studio\target\release\photrez-desktop.exe"
$results = @()
$runs = 5

Write-Host "=== Photrez Startup Time Measurement ==="
Write-Host "App: $appPath"
Write-Host "Runs: $runs"
Write-Host ""

for ($i = 1; $i -le $runs; $i++) {
    Write-Host "Run $i of $runs..."
    
    # Kill any existing Photrez process
    Get-Process -Name "photrez-desktop" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Milliseconds 500
    
    # Verify it's dead
    $existing = Get-Process -Name "photrez-desktop" -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "  Waiting for process to exit..."
        Start-Sleep -Seconds 2
        Get-Process -Name "photrez-desktop" -ErrorAction SilentlyContinue | Stop-Process -Force
    }
    
    # Start the app and measure
    $startTime = Get-Date
    $proc = Start-Process -FilePath $appPath -PassThru
    
    # Poll for window to appear (max 15 seconds)
    $elapsed = 0
    $windowFound = $false
    while ($elapsed -lt 15) {
        Start-Sleep -Milliseconds 100
        $elapsed = ((Get-Date) - $startTime).TotalSeconds
        
        # Check if process is still running and has a main window handle
        $proc.Refresh()
        if ($proc.HasExited) {
            Write-Host "  Process exited prematurely after ${elapsed}s"
            break
        }
        
        try {
            $hwnd = $proc.MainWindowHandle
            if ($hwnd -ne 0) {
                $windowFound = $true
                break
            }
        } catch {
            # MainWindowHandle can throw if process not ready
        }
    }
    
    $endTime = Get-Date
    $totalMs = [math]::Round(($endTime - $startTime).TotalMilliseconds, 0)
    
    if ($windowFound) {
        Write-Host "  Window appeared in ${totalMs}ms"
        $results += $totalMs
    } else {
        Write-Host "  Window NOT detected in 15s - recording as FAIL"
        $results += $null
    }
    
    # Wait a moment before killing for next run
    Start-Sleep -Seconds 1
    Get-Process -Name "photrez-desktop" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "=== Results ==="
$validResults = $results | Where-Object { $_ -ne $null }
if ($validResults.Count -gt 0) {
    $min = ($validResults | Measure-Object -Minimum).Minimum
    $max = ($validResults | Measure-Object -Maximum).Maximum
    $sorted = $validResults | Sort-Object
    $median = $sorted[[math]::Floor($sorted.Count/2)]
    $avg = [math]::Round(($validResults | Measure-Object -Average).Average, 0)
    
    Write-Host "Runs (ms): $($results -join ', ')"
    Write-Host "Min: ${min}ms"
    Write-Host "Max: ${max}ms"
    Write-Host "Median: ${median}ms"
    Write-Host "Avg: ${avg}ms"
    Write-Host "Target: <2000ms"
    
    if ($avg -lt 2000) {
        Write-Host "RESULT: PASS"
    } else {
        Write-Host "RESULT: FAIL"
    }
} else {
    Write-Host "No valid measurements"
}

Write-Host ""
Write-Host "Done."

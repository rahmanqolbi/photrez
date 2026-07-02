# Photrez Idle RAM Measurement
# Measures memory usage after app stabilizes
# Run this AFTER startup measurement

$appPath = "D:\Project\image-studio\target\release\photrez-desktop.exe"
$results = @()
$runs = 5

Write-Host "=== Photrez Idle RAM Measurement ==="
Write-Host "App: $appPath"
Write-Host "Runs: $runs"
Write-Host ""

for ($i = 1; $i -le $runs; $i++) {
    Write-Host "Run $i of $runs..."
    
    # Kill any existing process
    Get-Process -Name "photrez-desktop" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
    
    # Launch app
    $proc = Start-Process -FilePath $appPath -PassThru
    
    # Wait for window
    $timeout = 15
    $elapsed = 0
    while ($elapsed -lt $timeout) {
        Start-Sleep -Milliseconds 200
        $elapsed += 0.2
        $proc.Refresh()
        if ($proc.HasExited) { break }
        try { if ($proc.MainWindowHandle -ne 0) { break } } catch {}
    }
    
    # Wait 30 seconds for stabilization
    Write-Host "  Waiting 30s for stabilization..."
    Start-Sleep -Seconds 30
    
    # Capture memory
    $memMB = [math]::Round($proc.WorkingSet64 / 1MB, 0)
    Write-Host "  Idle RAM: ${memMB}MB"
    $results += $memMB
    
    # Kill for next run
    Get-Process -Name "photrez-desktop" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "=== Results ==="
if ($results.Count -gt 0) {
    $min = ($results | Measure-Object -Minimum).Minimum
    $max = ($results | Measure-Object -Maximum).Maximum
    $sorted = $results | Sort-Object
    $median = $sorted[[math]::Floor($sorted.Count/2)]
    $avg = [math]::Round(($results | Measure-Object -Average).Average, 0)
    
    Write-Host "Runs (MB): $($results -join ', ')"
    Write-Host "Min: ${min}MB"
    Write-Host "Max: ${max}MB"
    Write-Host "Median: ${median}MB"
    Write-Host "Avg: ${avg}MB"
    Write-Host "Target: <250MB"
    
    if ($avg -lt 250) {
        Write-Host "RESULT: PASS"
    } else {
        Write-Host "RESULT: FAIL"
    }
}

Write-Host ""
Write-Host "Done."

# Runs scrape batches one at a time. Safe from rate limiting.
param([int]$StartOffset = 80, [int]$BatchSize = 20, [int]$NumBatches = 15)

$base   = "C:\Users\Tarun\Documents\MedCompare"
$script = "$base\scripts\scrape-prices.cjs"
$logDir = "$base\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

for ($i = 0; $i -lt $NumBatches; $i++) {
    $offset = $StartOffset + ($i * $BatchSize)
    $label  = "seq-offset$offset"
    $log    = "$logDir\$label.log"
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Starting offset=$offset limit=$BatchSize -> $log"
    node $script --limit $BatchSize --offset $offset *> $log
    $last = Get-Content $log -Tail 2
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Done offset=$offset | $last"
    Start-Sleep -Seconds 15   # polite gap between batches
}

Write-Host "All $NumBatches batches complete."

# Walks the chain PC -> LM Studio -> model -> ngrok -> public URL and says which link is broken.
# Usage:  powershell -ExecutionPolicy Bypass -File check_llm.ps1 -Domain name.ngrok-free.dev [-Model llama-3.2-3b-instruct] [-Port 1234]
param(
  [string]$Domain = "",
  [string]$Model = "",
  [int]$Port = 1234
)
$ErrorActionPreference = "SilentlyContinue"
function Ok($m)   { Write-Host "[ OK ] $m" -ForegroundColor Green }
function Bad($m)  { Write-Host "[FAIL] $m" -ForegroundColor Red }
function Info($m) { Write-Host "       $m" }

# 1. LM Studio local server
try {
  $local = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/v1/models" -TimeoutSec 8
  $ids = @($local.data | ForEach-Object { $_.id })
  Ok "LM Studio server answers on port $Port. Loaded: $($ids -join ', ')"
} catch {
  Bad "LM Studio server is not answering on port $Port."
  Info "Fix: LM Studio -> Developer tab -> Start server (port $Port)."
  exit 1
}

# 2. Model
if ($Model) {
  if ($ids -contains $Model) { Ok "Model '$Model' is loaded." }
  else { Bad "Model '$Model' is not loaded."; Info "Load it, or set the app's model env var to one of: $($ids -join ', ')" }
}

# 3. ngrok agent (local inspection API)
try {
  $t = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 5
  $pub = @($t.tunnels | ForEach-Object { "$($_.public_url) -> $($_.config.addr)" })
  Ok "ngrok agent running: $($pub -join '; ')"
  if (-not ($t.tunnels | Where-Object { "$($_.config.addr)" -match ":?$Port$" })) {
    Bad "No tunnel points at port $Port."; Info "Run: ngrok http $Port --url=$Domain"
  }
  if (-not $Domain -and $t.tunnels.Count -gt 0) { $Domain = ($t.tunnels[0].public_url -replace '^https?://', '') }
} catch {
  Bad "ngrok agent is not running (nothing on 127.0.0.1:4040)."
  Info "Fix: ngrok http $Port --url=<your-domain>   (or install it as a service, see ngrok.yml)"
}

# 4. Public URL end to end
if ($Domain) {
  try {
    $r = Invoke-WebRequest -Uri "https://$Domain/v1/models" -Headers @{ "ngrok-skip-browser-warning" = "true" } -TimeoutSec 20 -UseBasicParsing
    Ok "Public URL works: https://$Domain/v1  (use this as the app's base URL)"
  } catch {
    $code = ""
    try { $code = $_.Exception.Response.Headers["ngrok-error-code"] } catch {}
    if (-not $code) { try { $code = ($_.Exception.Response.Headers.GetValues("ngrok-error-code") | Select-Object -First 1) } catch {} }
    Bad "Public URL failed ($code $($_.Exception.Message))."
    if ($code -eq "ERR_NGROK_3200") { Info "ngrok isn't connected for this domain." }
    elseif ($code -eq "ERR_NGROK_8012") { Info "ngrok can't reach port $Port - check the tunnel's port." }
  }
} else { Info "Pass -Domain to test the public URL." }

# 5. Sleep setting (plugged in)
$ac = "$(powercfg /query SCHEME_CURRENT SUB_SLEEP STANDBYIDLE | Select-String 'Current AC Power Setting Index')"
if ($ac -match "0x00000000") { Ok "PC never sleeps when plugged in." }
else { Bad "PC is set to sleep when plugged in ($ac)."; Info "Settings -> System -> Power & battery -> Screen and sleep -> Never." }

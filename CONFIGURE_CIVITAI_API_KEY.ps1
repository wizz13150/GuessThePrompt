$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$envPath = Join-Path $projectRoot '.env'

Write-Host ''
Write-Host 'Prompt Detective - Civitai API key configuration' -ForegroundColor Cyan
Write-Host 'The key will be written only to the local .env file. It is not printed back.' -ForegroundColor DarkGray
Write-Host ''

$secureKey = Read-Host 'Enter a NEW Civitai API key' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
  $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}

if ([string]::IsNullOrWhiteSpace($plainKey) -or $plainKey.Trim().Length -lt 20) {
  throw 'The API key looks empty or too short. Nothing was changed.'
}

$lines = @()
if (Test-Path $envPath) {
  $lines = Get-Content $envPath
} elseif (Test-Path (Join-Path $projectRoot '.env.example')) {
  $lines = Get-Content (Join-Path $projectRoot '.env.example')
}

function Set-EnvLine([string[]]$InputLines, [string]$Key, [string]$Value) {
  $found = $false
  $output = foreach ($line in $InputLines) {
    if ($line -match "^\s*$([regex]::Escape($Key))\s*=") {
      $found = $true
      "$Key=$Value"
    } else {
      $line
    }
  }
  if (-not $found) { $output += "$Key=$Value" }
  return $output
}

$lines = Set-EnvLine $lines 'APP_MODE' 'civitai'
$lines = Set-EnvLine $lines 'CIVITAI_API_KEY' $plainKey.Trim()
$lines = Set-EnvLine $lines 'PORT' '5174'
[System.IO.File]::WriteAllLines($envPath, $lines, [System.Text.UTF8Encoding]::new($false))

Write-Host ''
Write-Host '[OK] .env updated. The launcher will continue with Civitai mode.' -ForegroundColor Green

param(
  [switch]$Check
)

$ErrorActionPreference = "Stop"
$workspace = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$siteRoot = Join-Path $workspace "site"
$files = @(
  "index.html",
  "game.js",
  "auth.js",
  "auth-config.js",
  "styles.css",
  "staticwebapp.config.json"
)

$expected = [System.Collections.Generic.List[string]]::new()
foreach ($relative in $files) { $expected.Add($relative) }
$vendorRoot = Join-Path $workspace "vendor"
if (Test-Path -LiteralPath $vendorRoot) {
  Get-ChildItem -LiteralPath $vendorRoot -File -Recurse | ForEach-Object {
    $vendorRelative = $_.FullName.Substring($vendorRoot.Length).TrimStart([char]92, [char]47)
    $expected.Add((Join-Path "vendor" $vendorRelative))
  }
}

if (-not $Check) { New-Item -ItemType Directory -Path $siteRoot -Force | Out-Null }
$failures = [System.Collections.Generic.List[string]]::new()
foreach ($relative in $expected) {
  $source = Join-Path $workspace $relative
  $destination = Join-Path $siteRoot $relative
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    $failures.Add("Missing source: $relative")
    continue
  }
  if (-not $Check) {
    $destinationDirectory = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination -Force
    continue
  }
  if (-not (Test-Path -LiteralPath $destination -PathType Leaf)) {
    $failures.Add("Missing site copy: $relative")
    continue
  }
  $sourceHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
  $destinationHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
  if ($sourceHash -ne $destinationHash) {
    $failures.Add("Different bytes: $relative")
  }
}

if ($failures.Count -gt 0) {
  $failures | ForEach-Object { Write-Error $_ }
  exit 1
}

if ($Check) { Write-Output "Verified $($expected.Count) root-to-site runtime files." }
else { Write-Output "Synced $($expected.Count) root-to-site runtime files." }

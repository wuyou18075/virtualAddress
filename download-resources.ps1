#Requires -Version 5.1
<#
.SYNOPSIS
  从 mockaddress.com 拉取线上 JSON 数据与关键静态资源到本地项目。

.DESCRIPTION
  开源仓库默认不含完整数据资产。本脚本下载公开可访问的 data/*.json。
  大文件（如 usRealAddresses.json ~1.1MB）也会完整下载。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\download-resources.ps1
#>

$ErrorActionPreference = "Stop"
$BaseUrl = "https://mockaddress.com"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$DataDir = Join-Path $Root "data"
$JsDir = Join-Path $Root "src\js"

New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
New-Item -ItemType Directory -Force -Path $JsDir | Out-Null

# 逻辑键 -> 线上文件名（与 config.js 对齐）
$DataFiles = @(
  "usData.json",
  "namesData.json",
  "usRealAddresses.json",
  "us_taxfree.min.json",
  "hkData.json",
  "ukData.json",
  "caData.json",
  "jpData.json",
  "jpNamesData.json",
  "jpRealAreas.json",
  "inData.json",
  "inPinAreas.json",
  "twData.json",
  "sgData.json",
  "deData.json"
)

$JsFiles = @(
  "main.js",
  "address-generator.js",
  "utils.js",
  "storage.js",
  "language-switcher.js",
  "mac-generator.js"
)

function Download-One {
  param([string]$Url, [string]$OutPath)
  Write-Host "GET $Url"
  try {
    Invoke-WebRequest -Uri $Url -OutFile $OutPath -UseBasicParsing
    $len = (Get-Item $OutPath).Length
    Write-Host "  OK $($len) bytes -> $OutPath"
    return $true
  } catch {
    Write-Warning "  FAIL $Url : $($_.Exception.Message)"
    if (Test-Path $OutPath) { Remove-Item $OutPath -Force }
    return $false
  }
}

Write-Host "=== Download data JSON ==="
$ok = 0; $fail = 0
foreach ($f in $DataFiles) {
  $url = "$BaseUrl/data/$f"
  $out = Join-Path $DataDir $f
  if (Download-One -Url $url -OutPath $out) { $ok++ } else { $fail++ }
}

# 兼容本地 config.js 的 names 键
$namesPool = Join-Path $DataDir "names-pool.json"
$namesData = Join-Path $DataDir "namesData.json"
if ((Test-Path $namesData) -and -not (Test-Path $namesPool)) {
  Copy-Item $namesData $namesPool -Force
  Write-Host "Copied namesData.json -> names-pool.json"
} elseif (Test-Path $namesData) {
  Copy-Item $namesData $namesPool -Force
  Write-Host "Synced names-pool.json from namesData.json"
}

Write-Host "`n=== Optional: refresh local JS from live site ==="
$refreshJs = Read-Host "覆盖下载线上 js 到 src/js ? (y/N)"
if ($refreshJs -match '^[Yy]') {
  foreach ($f in $JsFiles) {
    $url = "$BaseUrl/js/$f"
    $out = Join-Path $JsDir $f
    if (Download-One -Url $url -OutPath $out) { $ok++ } else { $fail++ }
  }
}

Write-Host "`nDone. success=$ok fail=$fail"
Write-Host "然后用任意静态服务器打开项目根目录，例如:"
Write-Host "  npx --yes serve -l 5173 ."
Write-Host "  访问 http://localhost:5173/usa-address/"

$ErrorActionPreference = "Continue"

Write-Host "Capturing all An Tam AI screens (Desktop 1440p, Full Page, Mobile 390p, Mobile Full)..." -ForegroundColor Cyan

$outDir = "d:\07-Competitions-Hackathons\an-tam\docs\anh-chup-giao-dien"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force }

# 1. Login page
Write-Host "Capturing 00_Dang_Nhap..." -ForegroundColor Yellow
agent-browser --session antam open "http://localhost:5173/dang-nhap"
agent-browser --session antam wait 1200
agent-browser --session antam set viewport 1440 900
agent-browser --session antam screenshot "$outDir\00_Dang_Nhap_Desktop.png"
agent-browser --session antam screenshot "$outDir\00_Dang_Nhap_Desktop_Full.png" --full
agent-browser --session antam set viewport 390 844
agent-browser --session antam wait 500
agent-browser --session antam screenshot "$outDir\00_Dang_Nhap_Mobile.png"

# 2. Login
Write-Host "Logging in demo user..." -ForegroundColor Yellow
agent-browser --session antam fill "input[name='email']" "hung.demo@antam.vn"
agent-browser --session antam fill "input[name='password']" "demo12345"
agent-browser --session antam click "button[type='submit']"
agent-browser --session antam wait 2000

# 3. All 11 pages
$pages = @(
  @{ slug = "01_Tong_Quan"; path = "/" },
  @{ slug = "02_So_Thu_Chi"; path = "/thu-chi" },
  @{ slug = "03_Quy_An_Toan"; path = "/quy-an-toan" },
  @{ slug = "04_Tang_Thu_Nhap"; path = "/tang-thu-nhap" },
  @{ slug = "05_Lua_Chon_Cuoc_Doi"; path = "/lua-chon" },
  @{ slug = "06_Lich_AI"; path = "/lich-ai" },
  @{ slug = "07_Mo_Phong_Cu_Soc"; path = "/mo-phong" },
  @{ slug = "08_Danh_Muc_Tai_San"; path = "/danh-muc" },
  @{ slug = "09_AI_Workspace"; path = "/ai-workspace" },
  @{ slug = "10_Nhat_Ky_AI"; path = "/nhat-ky-ai" },
  @{ slug = "11_Cai_Dat"; path = "/cai-dat" }
)

foreach ($p in $pages) {
  $slug = $p.slug
  $url = "http://localhost:5173" + $p.path
  Write-Host "Capturing [$slug] $url..." -ForegroundColor Green

  # Desktop 1440x900 & Full Page
  agent-browser --session antam open $url
  agent-browser --session antam wait 1200
  agent-browser --session antam set viewport 1440 900
  agent-browser --session antam screenshot "$outDir\${slug}_Desktop.png"
  agent-browser --session antam screenshot "$outDir\${slug}_Desktop_Full.png" --full

  # Mobile 390x844 & Mobile Full Page
  agent-browser --session antam set viewport 390 844
  agent-browser --session antam wait 600
  agent-browser --session antam screenshot "$outDir\${slug}_Mobile.png"
  agent-browser --session antam screenshot "$outDir\${slug}_Mobile_Full.png" --full
}

Write-Host "All screenshots captured successfully in $outDir!" -ForegroundColor Cyan

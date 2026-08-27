$filePath = "C:\Users\51013\inventory-manager\src-tauri\target\release\bundle\nsis\WNZXMOTO_1.0.0_x64-setup.exe"
$url = "https://file.io/?expires=1w"

Write-Host "Uploading to file.io..."
$response = Invoke-RestMethod -Uri $url -Method Post -Form @{file = Get-Item -Path $filePath} -TimeoutSec 300
Write-Host "Upload result: $($response | ConvertTo-Json -Depth 5)"
$response.link
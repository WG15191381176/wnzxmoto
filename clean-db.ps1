$dirs = @(
  "$env:APPDATA\com.inventory.manager",
  "$env:LOCALAPPDATA\com.inventory.manager",
  "$env:APPDATA\inventory-manager",
  "$env:LOCALAPPDATA\inventory-manager",
  "$env:APPDATA\tauri\inventory-manager",
  "$env:LOCALAPPDATA\tauri\inventory-manager"
)
foreach ($d in $dirs) {
  $expanded = [System.Environment]::ExpandEnvironmentVariables($d)
  if (Test-Path $expanded) {
    Remove-Item -Recurse -Force $expanded -ErrorAction SilentlyContinue
    Write-Host "Deleted: $expanded"
  }
}
Write-Host 'Done.'
cd C:\Users\51013\inventory-manager
$env:CI = "true"
& 'C:\Users\51013\AppData\Roaming\npm\pnpm.ps1' exec vue-tsc --noEmit
& 'C:\Users\51013\AppData\Roaming\npm\pnpm.ps1' exec vite build
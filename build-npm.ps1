cd C:\Users\51013\inventory-manager
$env:CI = "true"
$env:NPM_CONFIG_BUILD_FROM_SOURCE = "false"
& 'C:\Program Files\nodejs\npm.cmd' install --production
& 'C:\Program Files\nodejs\npm.cmd' exec vue-tsc --noEmit
& 'C:\Program Files\nodejs\npm.cmd' exec vite build
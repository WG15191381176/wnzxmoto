$filePath = "C:\Users\51013\inventory-manager\src-tauri\target\release\bundle\nsis\WNZXMOTO_1.0.0_x64-setup.exe"
$url = "https://tmpfiles.org/api/v1/upload"

Write-Host "Uploading to tmpfiles.org..."

$boundary = [System.Guid]::NewGuid().ToString()

$fileBytes = [System.IO.File]::ReadAllBytes($filePath)
$fileName = [System.IO.Path]::GetFileName($filePath)

$body = @()
$body += "--$boundary"
$body += "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`""
$body += "Content-Type: application/octet-stream"
$body += ""
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes(($body -join "`r`n"))
$endBytes = [System.Text.Encoding]::UTF8.GetBytes("`r`n--$boundary--`r`n")

$totalBytes = $bodyBytes.Length + $fileBytes.Length + $endBytes.Length
$requestStream = New-Object System.IO.MemoryStream($totalBytes)
$requestStream.Write($bodyBytes, 0, $bodyBytes.Length)
$requestStream.Write($fileBytes, 0, $fileBytes.Length)
$requestStream.Write($endBytes, 0, $endBytes.Length)
$requestStream.Position = 0

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $requestStream.ToArray() -ContentType "multipart/form-data; boundary=$boundary" -TimeoutSec 300
    Write-Host "Upload successful!"
    Write-Host "Full response: $($response | ConvertTo-Json -Depth 10)"
    $response
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())"
    }
}
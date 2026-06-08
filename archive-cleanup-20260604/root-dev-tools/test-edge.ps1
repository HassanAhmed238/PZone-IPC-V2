$uri = "https://dwpdrclupradpnsminvi.supabase.co/functions/v1/analyze-contract"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4MDgxMzgsImV4cCI6MjA1ODM4NDEzOH0.JpSNMn8Y0bk_0MjIGYfV-LXLnMC_RudiHb0cLjFTVQs"
    "Content-Type" = "application/json"
}
$body = '{"prompt":"Reply with JSON: {\"status\": \"ok\"}","jsonMode":true}'

try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body
    Write-Host "SUCCESS:" ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "ERROR:" $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "BODY:" $reader.ReadToEnd()
    }
}

$url = "https://akcowxtpheyqzmeetovl.supabase.co/rest/v1"
$key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY293eHRwaGV5cXptZWV0b3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwOTI4MTcsImV4cCI6MjA4ODY2ODgxN30.avydN1h369Da_BTmtx9cT-yfIEaiVoDC1-74YnaVORE"
$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
    "Content-Type" = "application/json"
}

Write-Host "🚀 Starting Fresh Start Wipe..."

$tables = @("tailoring", "bookings", "inventory")

foreach ($table in $tables) {
    Write-Host "🧹 Wiping $table..."
    try {
        Invoke-RestMethod -Uri "$url/$table?id=neq.00000000-0000-0000-0000-000000000000" -Method Delete -Headers $headers
        Write-Host "✅ $table wiped."
    } catch {
        Write-Host "❌ Error wiping $table: $($_.Exception.Message)"
    }
}

Write-Host "✨ All data cleared."

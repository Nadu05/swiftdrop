<#
.SYNOPSIS
  Creates a short-lived HS256 JWT for calling the Order service by hand (local development only).

.DESCRIPTION
  Signs {sub, role, iat, exp} with the shared secret, the same way the Identity service is expected to.
  The secret is read from -Secret or the JWT_SECRET environment variable and is never printed or stored.

.EXAMPLE
  $env:JWT_SECRET = "<the same value the order-service runs with>"
  $token = ./scripts/new-dev-token.ps1 -UserId 42
  Invoke-RestMethod http://localhost:8083/api/v1/orders/1 -Headers @{ Authorization = "Bearer $token" }
#>
param(
    [Parameter(Mandatory = $true)][long]$UserId,
    [string]$Role = 'CUSTOMER',
    [int]$Minutes = 60,
    [string]$Secret = $env:JWT_SECRET
)

if ([string]::IsNullOrWhiteSpace($Secret)) {
    throw 'No secret: set $env:JWT_SECRET or pass -Secret.'
}

function ConvertTo-Base64Url([byte[]]$Bytes) {
    [Convert]::ToBase64String($Bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

$now = [DateTimeOffset]::UtcNow
$header  = '{"alg":"HS256","typ":"JWT"}'
$payload = @{
    sub  = "$UserId"
    role = $Role
    iat  = $now.ToUnixTimeSeconds()
    exp  = $now.AddMinutes($Minutes).ToUnixTimeSeconds()
} | ConvertTo-Json -Compress

$encode = { param($text) ConvertTo-Base64Url ([Text.Encoding]::UTF8.GetBytes($text)) }
$unsigned = "$(& $encode $header).$(& $encode $payload)"

$hmac = New-Object System.Security.Cryptography.HMACSHA256 (, [Text.Encoding]::UTF8.GetBytes($Secret))
try {
    $signature = ConvertTo-Base64Url ($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($unsigned)))
} finally {
    $hmac.Dispose()
}

"$unsigned.$signature"

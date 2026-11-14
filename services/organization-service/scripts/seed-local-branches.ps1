<#
.SYNOPSIS
    Idempotent local-development seeder for the 7 approved ACTIVE SwiftDrop branches.
.DESCRIPTION
    Seeds the 7 approved regional branches (CMB-CENTRAL, CMB-SOUTH, KDY-MAIN, GLE-SOUTH,
    NGM-COAST, KRN-WAYAMBA, JFN-NORTH) via the Organization Service REST API so that
    BranchService.create() transactionally creates each branch and its default 25.00 km
    service area in local PostgreSQL (organization_db).
    Does NOT seed MTR-RUHUNA (Matara) or Ratnapura.
    Safe and idempotent: checks existing branch codes first and skips any branch that already exists.
#>

param(
    [string]$BaseUrl = "http://localhost:8080/api/v1/organization/branches"
)

$ErrorActionPreference = "Stop"

$approvedBranches = @(
    @{
        code         = "CMB-CENTRAL"
        name         = "Colombo Central Hub"
        addressLine1 = "No. 45, Union Place"
        addressLine2 = "Colombo 02, Western Province"
        city         = "Colombo"
        phone        = "+94 11 234 5678"
        email        = "colombo.central@swiftdrop.lk"
        latitude     = 6.9218
        longitude    = 79.8612
    },
    @{
        code         = "CMB-SOUTH"
        name         = "Nugegoda Metro Hub"
        addressLine1 = "No. 210, High Level Road"
        addressLine2 = "Nugegoda, Colombo"
        city         = "Nugegoda"
        phone        = "+94 11 281 4490"
        email        = "nugegoda.hub@swiftdrop.lk"
        latitude     = 6.8649
        longitude    = 79.8997
    },
    @{
        code         = "KDY-MAIN"
        name         = "Kandy Hill Country Hub"
        addressLine1 = "No. 120, Peradeniya Road"
        addressLine2 = "Kandy Municipal Limits"
        city         = "Kandy"
        phone        = "+94 81 222 3344"
        email        = "kandy.main@swiftdrop.lk"
        latitude     = 7.2906
        longitude    = 80.6337
    },
    @{
        code         = "GLE-SOUTH"
        name         = "Galle Southern Hub"
        addressLine1 = "No. 18, Wakwella Road"
        addressLine2 = "Near Galle Railway Station"
        city         = "Galle"
        phone        = "+94 91 223 4455"
        email        = "galle.south@swiftdrop.lk"
        latitude     = 6.0535
        longitude    = 80.221
    },
    @{
        code         = "NGM-COAST"
        name         = "Negombo Airport & Coastal Hub"
        addressLine1 = "No. 88, Colombo Road"
        addressLine2 = "Kurana, Negombo"
        city         = "Negombo"
        phone        = "+94 31 222 7890"
        email        = "negombo.coast@swiftdrop.lk"
        latitude     = 7.2008
        longitude    = 79.8358
    },
    @{
        code         = "KRN-WAYAMBA"
        name         = "Kurunegala Wayamba Hub"
        addressLine1 = "No. 64, Dambulla Road"
        addressLine2 = "Kurunegala Town Center"
        city         = "Kurunegala"
        phone        = "+94 37 222 6120"
        email        = "kurunegala@swiftdrop.lk"
        latitude     = 7.4818
        longitude    = 80.3609
    },
    @{
        code         = "JFN-NORTH"
        name         = "Jaffna Northern Hub"
        addressLine1 = "No. 142, Hospital Road"
        addressLine2 = "Jaffna Town"
        city         = "Jaffna"
        phone        = "+94 21 222 5110"
        email        = "jaffna.north@swiftdrop.lk"
        latitude     = 9.6615
        longitude    = 80.0255
    }
)

$existingBranches = Invoke-RestMethod -Uri $BaseUrl -Method Get
$existingCodes = @{}
foreach ($b in $existingBranches) {
    if ($b.code) {
        $existingCodes[$b.code.ToUpper()] = $b.id
    }
}

foreach ($branch in $approvedBranches) {
    $code = $branch.code.ToUpper()
    if ($existingCodes.ContainsKey($code)) {
        Write-Output "SKIP: Branch $code already exists with ID=$($existingCodes[$code])"
        continue
    }

    $bodyJson = $branch | ConvertTo-Json -Compress
    $created = Invoke-RestMethod -Uri $BaseUrl -Method Post -ContentType "application/json" -Body $bodyJson
    Write-Output "SEEDED: ID=$($created.id) Code=$($created.code) Name=$($created.name) Status=$($created.status)"
}


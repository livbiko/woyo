# Creates the woyo-secrets Kubernetes Secret (Postgres password, assembled
# DATABASE_URL, and JWT_SECRET) without ever writing it to a committed file
# -- same pattern as nouvellesdupays/tekeche-api's own 02-create-secret.ps1:
# assembled in memory, piped to `kubectl apply -f -` via stdin only.
#
# First run generates random values and prints them once -- save them
# somewhere (password manager), not retrievable from the cluster afterwards
# except via `kubectl get secret ... -o jsonpath` by someone with cluster access.

$env:KUBECONFIG = "C:\Users\Administrator\.kube\config"

function New-RandomSecret($length) {
  -join ((48..57) + (65..90) + (97..122) | Get-Random -Count $length | ForEach-Object { [char]$_ })
}

$existingPassword = kubectl get secret woyo-secrets -n woyo -o jsonpath="{.data.POSTGRES_PASSWORD}" 2>$null
if ($existingPassword) {
  $pgPassword = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($existingPassword))
  $jwtSecret = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String((kubectl get secret woyo-secrets -n woyo -o jsonpath="{.data.JWT_SECRET}")))
  Write-Host "Reusing existing POSTGRES_PASSWORD/JWT_SECRET from the cluster."
} else {
  $pgPassword = New-RandomSecret 24
  $jwtSecret = New-RandomSecret 48
  Write-Host "Generated new POSTGRES_PASSWORD -- save this now, it will not be shown again:"
  Write-Host $pgPassword
  Write-Host "Generated new JWT_SECRET -- save this now, it will not be shown again:"
  Write-Host $jwtSecret
}

$databaseUrl = "postgresql://woyo:$pgPassword@postgres.woyo.svc.cluster.local:5432/woyo"

function ToB64($s) { [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($s)) }

$manifest = @"
apiVersion: v1
kind: Secret
metadata:
  name: woyo-secrets
  namespace: woyo
type: Opaque
data:
  POSTGRES_PASSWORD: $(ToB64 $pgPassword)
  DATABASE_URL: $(ToB64 $databaseUrl)
  JWT_SECRET: $(ToB64 $jwtSecret)
"@

$manifest | & kubectl apply -f -

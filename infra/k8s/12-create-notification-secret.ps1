# Creates the woyo-notification-secrets Secret for the driver-registration
# form's email notification. Copies BREVO_API_KEY + a verified sender
# address straight from tekeche-api's .env (same Brevo account, already
# proven working for Tekeche's OTP SMS/email) into Woyo's OWN secret --
# deliberately not cross-referencing Tekeche's secret at runtime, matching
# this project's "every project gets its own copy of shared infra
# credentials" pattern. Values are piped directly to kubectl, never
# printed or written to a file.

$env:KUBECONFIG = "C:\Users\Administrator\.kube\config"

$tekecheEnvPath = "C:\inetpub\wwwroot\tekeche\tekeche-api\.env"
$envLines = Get-Content $tekecheEnvPath

function Get-EnvValue($key) {
  $line = $envLines | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
  if (-not $line) { throw "Could not find $key in $tekecheEnvPath" }
  return $line.Substring($key.Length + 1)
}

$brevoApiKey = Get-EnvValue "BREVO_API_KEY"
$fromEmail = Get-EnvValue "BREVO_FROM_EMAIL"
$notifyEmail = "assalehervekouame@gmail.com"

function ToB64($s) { [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($s)) }

$manifest = @"
apiVersion: v1
kind: Secret
metadata:
  name: woyo-notification-secrets
  namespace: woyo
type: Opaque
data:
  BREVO_API_KEY: $(ToB64 $brevoApiKey)
  DRIVER_NOTIFICATION_EMAIL: $(ToB64 $notifyEmail)
  NOTIFICATION_FROM_EMAIL: $(ToB64 $fromEmail)
"@

$manifest | & kubectl apply -f -
Write-Host "woyo-notification-secrets created/updated (values not displayed)."

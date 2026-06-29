$ErrorActionPreference = 'Continue'
$adb = "C:\Users\Susan\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$log = "C:\Users\Susan\reparala\scripts\build-install.log"
function Log($m) { "$((Get-Date).ToString('HH:mm:ss')) $m" | Tee-Object -FilePath $log -Append }

# build id => @{ dir; package; name }
$builds = @{
  '56f8d3b1-6ef8-4dd5-ad87-43968c582e32' = @{ dir='C:\Users\Susan\reparala\apps\client-app'; pkg='com.reparala.client'; name='CLIENTE' }
  'db660f13-2bfd-461e-bd4a-66e6d560a23e' = @{ dir='C:\Users\Susan\reparala\apps\tech-app';   pkg='com.reparala.tech';   name='TECNICO' }
}

Log "=== Monitor iniciado. Aguardando builds EAS ==="
$pending = [System.Collections.ArrayList]@($builds.Keys)
$maxMin = 60
$start = Get-Date

while ($pending.Count -gt 0 -and ((Get-Date) - $start).TotalMinutes -lt $maxMin) {
  foreach ($id in @($pending)) {
    $info = $builds[$id]
    Set-Location $info.dir
    $json = eas build:view $id --json 2>$null | Out-String
    if (-not $json) { continue }
    try { $b = $json | ConvertFrom-Json } catch { continue }
    $status = $b.status
    Log "$($info.name) [$id] status=$status"
    if ($status -eq 'FINISHED') {
      $url = $b.artifacts.applicationArchiveUrl
      if (-not $url) { $url = $b.artifacts.buildUrl }
      if ($url) {
        $apk = Join-Path $env:TEMP "$($info.pkg).apk"
        Log "$($info.name) FINALIZADO. Baixando APK..."
        try {
          Invoke-WebRequest -Uri $url -OutFile $apk -UseBasicParsing
          Log "$($info.name) baixado em $apk. Instalando via adb..."
          $out = & $adb install -r $apk 2>&1
          Log "$($info.name) adb: $out"
        } catch {
          Log "$($info.name) ERRO no download/install: $_"
        }
      } else {
        Log "$($info.name) FINISHED mas sem URL de artefato."
      }
      $pending.Remove($id)
    }
    elseif ($status -in @('ERRORED','CANCELED')) {
      Log "$($info.name) FALHOU no EAS (status=$status). Ver logs no expo.dev."
      $pending.Remove($id)
    }
  }
  if ($pending.Count -gt 0) { Start-Sleep -Seconds 45 }
}

if ($pending.Count -gt 0) {
  Log "=== Timeout ($maxMin min). Ainda pendentes: $($pending -join ', ') ==="
} else {
  Log "=== Monitor concluido. Todos os builds processados. ==="
}
Log "=== Estado dos apps no aparelho ==="
& $adb shell pm list packages 2>&1 | Select-String 'reparala' | ForEach-Object { Log $_ }

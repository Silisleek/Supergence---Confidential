param([ValidateSet('activity','folders','notify')][string]$Action, [string]$MessagePath)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
if ($Action -eq 'folders') {
  $key = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders'
  @{ desktop=[Environment]::GetFolderPath('Desktop'); documents=[Environment]::GetFolderPath('MyDocuments'); downloads=[Environment]::ExpandEnvironmentVariables($key.'{374DE290-123F-4565-9164-39C4925E467B}') } | ConvertTo-Json -Compress
} elseif ($Action -eq 'activity') {
  Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class ForegroundContext {
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
}
'@
  $handle = [ForegroundContext]::GetForegroundWindow()
  $title = [Text.StringBuilder]::new(1024)
  [void][ForegroundContext]::GetWindowText($handle,$title,1024)
  [uint32]$foregroundProcessId = 0
  [void][ForegroundContext]::GetWindowThreadProcessId($handle,[ref]$foregroundProcessId)
  $processName = (Get-Process -Id $foregroundProcessId -ErrorAction SilentlyContinue).ProcessName
  @{ application=$processName; title=$title.ToString() } | ConvertTo-Json -Compress
} elseif ($Action -eq 'notify') {
  $message = Get-Content -LiteralPath $MessagePath -Raw -Encoding UTF8 | ConvertFrom-Json
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing
  $icon = [System.Windows.Forms.NotifyIcon]::new()
  try {
    $icon.Icon = [System.Drawing.SystemIcons]::Information
    $icon.Visible = $true
    $icon.BalloonTipTitle = ([string]$message.title).Substring(0,[Math]::Min(63,([string]$message.title).Length))
    $icon.BalloonTipText = ([string]$message.body).Substring(0,[Math]::Min(255,([string]$message.body).Length))
    $icon.ShowBalloonTip(7000)
    Write-Output '{"submitted":true,"channel":"windows-notification-area"}'
    Start-Sleep -Seconds 8
  } finally { $icon.Dispose() }
}

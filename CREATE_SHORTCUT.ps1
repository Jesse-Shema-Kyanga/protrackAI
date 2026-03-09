$WshShell = New-Object -ComObject WScript.Shell
$ShortcutPath = [System.IO.Path]::Combine([Environment]::GetFolderPath("Desktop"), "ProTrackAI.lnk")
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)

# Point to the master launcher
$Shortcut.TargetPath = "d:\Offshore New Query\Final Year Project\protrackAI\START_PROTRACK_AI.bat"
$Shortcut.WorkingDirectory = "d:\Offshore New Query\Final Year Project\protrackAI"
$Shortcut.Description = "ProTrackAI - Intelligent Productivity Management"

# Path to the icon (Note: Needs to be a .ico file for Windows to display it correctly)
$IconPath = "d:\Offshore New Query\Final Year Project\protrackAI\protrack_final_icon_v2.ico"
if (Test-Path $IconPath) {
    $Shortcut.IconLocation = "$IconPath,0"
}

$Shortcut.Save()
Write-Host "--- ProTrackAI Shortcut updated on Desktop! ---" -ForegroundColor Yellow
Write-Host "Note: It is using the new transparent logo." -ForegroundColor Gray

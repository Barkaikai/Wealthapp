$desktop = [Environment]::GetFolderPath('DesktopDirectory')
$target = 'C:\Users\Barkai Brinson\OneDrive\Desktop\WealthForge\Launch WealthForge.bat'
$lnk = Join-Path $desktop 'Launch WealthForge.lnk'
$icon = 'C:\Users\Barkai Brinson\OneDrive\Desktop\WealthForge\wealthforge-icon.ico'
$w = New-Object -ComObject WScript.Shell
$s = $w.CreateShortcut($lnk)
$s.TargetPath = $target
$s.WorkingDirectory = Split-Path $target
$s.IconLocation = "$icon,0"
$s.Description = 'Launch WealthForge'
$s.Save()
Write-Host $lnk

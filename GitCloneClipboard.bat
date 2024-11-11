@echo off
echo Getting URL from clipboard...
powershell -command "Add-Type -AssemblyName System.Windows.Forms; $clipboard = [System.Windows.Forms.Clipboard]::GetText(); git clone $clipboard"
echo Done.
pause

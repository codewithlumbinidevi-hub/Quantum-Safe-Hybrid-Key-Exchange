@echo off
echo [*] Detected execution inside P1_secure_channel.
echo [*] Delegating to root-level unified launcher...
cd /d "%~dp0.."
call run.bat %*


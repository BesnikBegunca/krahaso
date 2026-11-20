@echo off
chcp 65001 >nul
title Krahaso - krijo .exe
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo  Instalo Node.js nga https://nodejs.org dhe provo perseri.
  start "" "https://nodejs.org/"
  pause
  exit /b 1
)
echo  Po instalohen komponentet...
call npm install || goto fail
echo  Po krijohet aplikacioni per Windows ^(disa minuta^)...
call npx electron-builder --win portable nsis --x64 || goto fail
echo.
echo  GATI! Skedaret jane ne dosjen "dist":
echo    - Krahaso-portable.exe   ^(hapet direkt, pa instalim^)
echo    - Krahaso Setup 1.0.0.exe ^(instalues me shortcut ne Desktop/Start^)
start "" "%~dp0dist"
pause
exit /b 0
:fail
echo  Diçka deshtoi. Kontrollo internetin dhe provo perseri.
pause
exit /b 1

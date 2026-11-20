@echo off
chcp 65001 >nul
title Krahaso
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js nuk eshte i instaluar.
  echo  Shkarkoje nga https://nodejs.org  ^(versioni LTS^), instaloje, pastaj hap perseri kete skedar.
  echo.
  start "" "https://nodejs.org/"
  pause
  exit /b 1
)
if not exist "node_modules\electron" (
  echo  Hera e pare: po instalohen komponentet ^(1-3 minuta^)...
  call npm install
  if errorlevel 1 (
    echo  Instalimi deshtoi. Kontrollo internetin dhe provo perseri.
    pause
    exit /b 1
  )
)
set ELECTRON_RUN_AS_NODE=
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."
exit /b 0

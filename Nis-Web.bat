@echo off
chcp 65001 >nul
title Krahaso - versioni web
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
echo.
echo  Krahaso po niset si faqe web...
echo  Adresa hapet vete ne shfletues. Nga telefoni (i njejti Wi-Fi) perdor adresen me IP qe shfaqet me poshte.
echo  MOS e mbyll kete dritare derisa e perdor aplikacionin.
echo.
set ELECTRON_RUN_AS_NODE=
"%~dp0node_modules\electron\dist\electron.exe" "%~dp0." --web
pause

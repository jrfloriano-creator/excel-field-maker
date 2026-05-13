@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64
set PATH=C:\Program Files\nodejs;%USERPROFILE%\.cargo\bin;%PATH%
cd /d "C:\Users\ROBERTO\Projects\excel-field-maker"
npm run tauri build

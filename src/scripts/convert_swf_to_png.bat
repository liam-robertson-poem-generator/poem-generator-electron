@echo off
setlocal enabledelayedexpansion

set SWFToolsPath="C:\Program Files (x86)\SWFTools\SWFRender.exe"

for %%f in (*.swf) do (
    set "name=%%~nf"
    %SWFToolsPath% "%%f" -o "!name!.png"
    echo Converted "%%f" to "!name!.png"
)

endlocal

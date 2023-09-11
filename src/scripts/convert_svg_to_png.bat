@echo on
setlocal enabledelayedexpansion

set INKSCAPE_PATH=C:\Program Files\Inkscape\bin\inkscape.exe
set SVG_FOLDER=C:\programming\poem-generator-electron\src\assets\svg
set PNG_FOLDER=C:\programming\poem-generator-electron\src\assets\svg

echo Using Inkscape from: %INKSCAPE_PATH%
echo SVG Folder is: %SVG_FOLDER%
echo PNG Folder will be: %PNG_FOLDER%

for %%f in ("%SVG_FOLDER%\*.svg") do (
    echo Processing: "%%f"
    set "filename=%%~nf"
    set "full_output_name=%PNG_FOLDER%\!filename!.png"
    
    echo Output will be: "!full_output_name!"
    
    "%INKSCAPE_PATH%" --export-type=png --export-filename="!full_output_name!" --export-area=0:0:600:600 "%%f"
    if errorlevel 1 echo There was an error processing "%%f"
)

endlocal

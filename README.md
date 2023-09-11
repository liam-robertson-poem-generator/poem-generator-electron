INSTRUCTIONS 
*******************
- run in the electron app, the browser window won't work 
- app will refresh when changes are made
- build with this command:
npm run electron:build
- Builds are stored in release folder
- e.g. release/angular-electron 10.1.0.exe
*******************

ENVIRONMENT MODE
*******************
environment variable is below
- options: dev or prod
- change to prod before building
*******************

Converting SVG to PNG
*******************
The Syllabary runs on SVG or SWF
Poem Generator requires PNG or JPG 
You need to convert SVG or SWF to PNG
You can convert SVG to PNG using Inkscape
You can convert SWF to PNG using SWFRenderer
I wrote bat files in the scripts folder to handle this
    - convert_svg_to_png.bat
    - convert_swf_to_png.bat
Put this script in the same folder as your SVG files and run it
*******************
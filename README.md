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
The Syllabary runs on SVG
docx library requires PNG or JPG 
You need to convert SVG from the Syllabary to PNG
I did this using Inkscape
I wrote a bat file script to automate this conversion
It's in scripts -> convert_svg_to_png.bat
Put this script in the same folder as your SVG files and run it
*******************
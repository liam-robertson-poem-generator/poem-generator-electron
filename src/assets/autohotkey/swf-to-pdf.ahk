Loop Files, D:\liamr\Documents\programming\syllabary\glyphs\*.swf, R  ; Recurse into subfolders.
{
	Run %A_LoopFileFullPath%,, Max
	Sleep 100
	Click, 21 42
	Sleep 100	
	Click, 65 114
	Sleep 100
	Click, 317 394
	Sleep 100
	SplitPath, A_LoopFileLongPath, OutFileName, OutDir, OutExtension, OutNameNoExt, OutDrive
	Send %OutNameNoExt%
	Sleep 100
	Click, 1020 688
	Sleep 100
	Click, 3418 15
	Sleep 100
}
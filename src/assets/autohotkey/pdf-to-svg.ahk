Loop Files, D:\liamr\Documents\programming\syllabary\poem-glyphs-pdf-copy\*.pdf, R  ; Recurse into subfolders.
{
	Run %A_LoopFileFullPath%
	Sleep 1000
	MouseClickDrag, left, 913, 933, 1824, 996
	Send {Delete}
	Send {Delete}
	Sleep 100
	Send ^+g
	Sleep 350
	Send {Enter}
	Sleep 350
	Send {Enter}
	Sleep 350
	Send ^w
	Sleep 300
	Send {Enter}
	Sleep 400
}


Escape::
ExitApp
Return
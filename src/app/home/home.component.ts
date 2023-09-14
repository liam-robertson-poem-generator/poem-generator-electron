import { Component, OnInit } from '@angular/core';
import { FormControl, Validators, FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { ElectronService } from "../core/services/electron/electron.service";
import { map, startWith } from 'rxjs/operators';
import { join, resolve } from 'path';
import { PoemOut } from './poem-out.model';
import { AlignmentType, Document, HorizontalPositionAlign, ImageRun, Packer, Paragraph, TextRun, VerticalPositionRelativeFrom } from "docx";

@Component({
	selector: 'app-home',
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

	// Converting SVG to PNG
	/*******************
	The Syllabary runs on SVG or SWF
	Poem Generator requires PNG or JPG 
	You need to convert SVG or SWF to PNG
	You can convert SVG to PNG using Inkscape
	You can convert SWF to PNG using SWFRenderer
	I wrote bat files in the scripts folder to handle this
		- convert_svg_to_png.bat
		- convert_swf_to_png.bat
	Put this script in the same folder as your SVG files and run it
	*******************/

	// INSTRUCTIONS 
	/*******************
	- run in the electron app, the browser window won't work 
	- app will refresh when changes are made
	- Run with this command: 
		npm run start
	- build with this command:
		npm run electron:build
	- Builds are stored in release folder
		- e.g. release/angular-electron 10.1.0.exe
	*******************/

	// ENVIRONMENT MODE
	/*******************
	environment variable is below
	- options: dev or prod
	- change to prod before building
	*******************/
	environment: string = 'prod'

	writingDocBool: boolean = false;
	formBool = true;
	algorithmBool = false;
	successBool = false;	
	optionsInt: number[][];
	options: string[];
	templatePath: string;
	filteredOptions: Observable<string[]>;
	poemListRaw: any;
	poemList: number[][];
	poemListSorted: number[][];
	startingPoem: number[];
	poemListPath: string;
	numOfPoems: number;
	poemOrder: string;
	finalPoemList: string[];
	poemFormGroup = new FormGroup ({
		startingPoemControl: new FormControl(''),
		poemOrderControl: new FormControl(''),
		numOfPoemsControl: new FormControl('')
	});
	outputPath: string;
	startingPoemRaw: string;
	loopCounter: number;
	templateList: PoemOut[];
	poemListLength: number | null = null;

	constructor(private electronService: ElectronService) {}

	async ngOnInit() {
		if (this.environment == "dev") {
			this.poemListPath = resolve(__dirname, "../../../../../../src/assets/syllabary-poems")
			this.templatePath = resolve(__dirname, "../../../../../../src/assets/poetry-template.docx")
		} else if (this.environment == "prod") {
			this.poemListPath = resolve(__dirname, "./assets/syllabary-poems")
			this.templatePath = resolve(__dirname, "./assets/poetry-template.docx")
		}
		this.poemListRaw = await this.electronService.getDirectory(this.poemListPath)
		this.poemList = this.refinePoemList(this.poemListRaw)
		this.poemListLength = this.poemList.length

		this.poemFormGroup = new FormGroup ({
			startingPoemControl: new FormControl(''),
			poemOrderControl: new FormControl(''),
			numOfPoemsControl: new FormControl('', [Validators.min(0), Validators.max(this.poemListLength as number)])
		});

		this.poemListSorted = this.sortByMultipleValues(this.poemList);
		this.optionsInt = this.poemListSorted;
		this.options = this.optionsInt.map(value => value.join("-").toString())
		this.filteredOptions = (this.poemFormGroup.get('startingPoemControl') as FormControl).valueChanges.pipe(startWith(''), map(val => this._filter(val)));
	}

	public async execute() {
		this.formBool = false;
		this.algorithmBool = true;
		await this.sleep(100);

		this.startingPoemRaw = this.poemFormGroup.value.startingPoemControl
		this.startingPoem = this.startingPoemRaw.split('-').map(coord => parseInt(coord))
		this.numOfPoems = this.poemFormGroup.value.numOfPoemsControl
		this.poemOrder = this.poemFormGroup.value.poemOrderControl

		this.finalPoemList = this.iterateBySyllables(this.poemListSorted, this.startingPoem, this.numOfPoems, this.poemOrder)
		
		if (this.numOfPoems > 1200) {
			const finalPoemListSplit = [this.finalPoemList.slice(0, 1200), this.finalPoemList.slice(1200)]
			this.templateList = await this.createTemplateList(finalPoemListSplit[0])
			this.writeDocument(this.templateList, 1)
			this.templateList = await this.createTemplateList(finalPoemListSplit[1])
			this.writeDocument(this.templateList, 2)
		} else {
			this.templateList = await this.createTemplateList(this.finalPoemList)
			this.writeDocument(this.templateList)
		}
		await this.sleep(1500);

		this.writingDocBool = false;
		this.successBool = true;
	}

	/* Poem code algorithm explained:
	- Start with a given poem code X-Y-Z
	- Start with a given code axis (always starts with X)
	- Iterate that axis by 1 i.e. X+1-Y-Z
	- Check if that poem code is in the list of available poem codes
	- If it isn't then iterate that axis again i.e. X+2-Y-Z
	- If there is no poem on that axis at all then iterate Y by 1 and restart the process X-Y+1-Z
	- If it is then add that poem to the final list 
	*/
	public iterateBySyllables(poemList: number[][], startingPoem: number[], numOfPoems: number, poemOrder: string) {
		let maxValueX;
		let maxValueY;
		let maxValueZ;
		let currentValueX = startingPoem[0]
		let currentValueY = startingPoem[1]
		let currentValueZ = startingPoem[2]
		let currentPoem: number[];
		let outputList: number[][] = []
		let nextAxisNumDict: {0: number, 1: number, 2: number} = {0:1, 1:2, 2:0};
		let maxValueDict: {0: number, 1: number, 2: number} = {0:maxValueX, 1:maxValueY, 2:maxValueZ};
		maxValueDict = this.updateMaxValueDict(poemList);
		let currentAxisNum = 0
		let successCounter: number = 0
		let loopCounter1  = 0;
		let loopCounter2 = 0;
		let loopCounter3 = 0;
		let currentAxisValueDict: {0: number, 1: number, 2: number} = {0:currentValueX, 1:currentValueY, 2:currentValueZ};

		while (successCounter < numOfPoems) {			
			currentPoem = [currentAxisValueDict[0], currentAxisValueDict[1], currentAxisValueDict[2]]
			if (!this.checkArrIn2dMatrix(outputList, currentPoem) && this.checkArrIn2dMatrix(poemList, currentPoem)) {
				currentAxisNum = nextAxisNumDict[currentAxisNum]
				outputList.push([currentAxisValueDict[0], currentAxisValueDict[1], currentAxisValueDict[2]]);
				poemList = this.removeItem(poemList, currentPoem);
				this.adjustForEndOfList(currentPoem, currentAxisNum, maxValueDict);
				maxValueDict = this.updateMaxValueDict(poemList);
				loopCounter1 = 0;
				loopCounter2 = 0;
				loopCounter3 = 0;
				successCounter++
			} else if (loopCounter1 == maxValueDict[currentAxisNum]) {
				if (loopCounter2 == maxValueDict[nextAxisNumDict[currentAxisNum]]) {
					if (loopCounter3 == maxValueDict[nextAxisNumDict[nextAxisNumDict[currentAxisNum]]]) {
						alert("Error: Failed to complete cycle")
						break
					} else {
						const currentAxisNum3 = nextAxisNumDict[nextAxisNumDict[currentAxisNum]]
						currentAxisValueDict[currentAxisNum3] = this.adjustForEndOfList(currentPoem, currentAxisNum3, maxValueDict)
						loopCounter3++
						loopCounter2 = 0;
						loopCounter1 = 0;
					}
				} else {
					const currentAxisNum2 = nextAxisNumDict[currentAxisNum]
					currentAxisValueDict[currentAxisNum2] = this.adjustForEndOfList(currentPoem, currentAxisNum2, maxValueDict)
					loopCounter2++
					loopCounter1 = 0;
				}
			} else {
				currentAxisValueDict[currentAxisNum] = this.adjustForEndOfList(currentPoem, currentAxisNum, maxValueDict)
				loopCounter1++
			}
		}
		if (poemOrder == "end") {
			outputList = outputList.reverse();
		}
		this.algorithmBool = false;
		this.writingDocBool = true;
		const finalOutputList = outputList.map(value => value.join("-").toString())		
		return finalOutputList
	}

	public adjustForEndOfList(currentPoem: number[], currentAxisNum: number, maxValueDict: {0: number, 1: number, 2: number}) {
		const finalNumInList: number = maxValueDict[currentAxisNum]
		if (currentPoem[currentAxisNum] >= finalNumInList) {
			currentPoem[currentAxisNum] = 1
		} else {
			currentPoem[currentAxisNum]++
		}
		return currentPoem[currentAxisNum]
	}

	public updateMaxValueDict(poemList: number[][]) {
		const maxValueX: number = Math.max(...poemList.map((poemCode: number[]) => poemCode[0]))
		const maxValueY: number = Math.max(...poemList.map((poemCode: number[]) => poemCode[1]))
		const maxValueZ: number = Math.max(...poemList.map((poemCode: number[]) => poemCode[2]))
		return {0:maxValueX, 1:maxValueY, 2:maxValueZ};
	}

	public checkArrIn2dMatrix(matrix, testArr) {
		const matrixStr = matrix.map((poemCode) => String(poemCode));	
		return matrixStr.includes(testArr.toString())
	}

	public  removeItem(arr, item){
		return arr.filter(f => f.toString() !== item.toString())
	}

	public async createTemplateList(poemList: string[]) {
		const outputList: PoemOut[] = [];
		for (let index = 0; index < poemList.length; index++) {	
			let hasTextVar = true;
			const currentPoemName = poemList[index] + '.xml'
			const currentGlyphName = poemList[index] + '.png'
			let poemPath: string | null = null;
			let glyphPath: string | null = null;
			if (this.environment == "dev") {
				poemPath = join(resolve(__dirname, "../../../../../../src/assets/syllabary-poems"), currentPoemName);		
				glyphPath = join(resolve(__dirname, "../../../../../../src/assets/syllabary-glyphs"), currentGlyphName); 
			} else if (this.environment == "prod") {
				poemPath = join(resolve(__dirname, "./assets/syllabary-poems"), currentPoemName);		
				glyphPath = join(resolve(__dirname, "./assets/syllabary-glyphs"), currentGlyphName); 
			}
			const poemGlyph = await this.electronService.readFile(glyphPath, {})	
			const poemContent = await this.electronService.readFile(poemPath, {encoding:'utf8', flag:'r'})		
			const parser = new DOMParser();
			const poemXml = parser.parseFromString(poemContent.toString(), "text/xml");

			let poemTitle = "";
			let poemText = "";
			if (poemXml.getElementsByTagName("title")[0].childNodes[0] != undefined) {
				poemTitle = poemXml.getElementsByTagName("title")[0].childNodes[0].nodeValue as string;
			}
			if (poemXml.getElementsByTagName("text")[0].childNodes[0] != undefined) {
				poemText = poemXml.getElementsByTagName("text")[0].childNodes[0].nodeValue as string;
				hasTextVar = false;
			}
			
			const currentPoem: PoemOut = {
				code: poemList[index],
				title: poemTitle, 
				text: poemText,
				glyph: poemGlyph,
				hasText: hasTextVar
			}
			
			outputList.push(currentPoem)
		}
		return outputList
	}

	public writeDocument(outputList: any[], iteration: number = 0) {
		// const glyphRepositionList: String[] = [
		// 	"1-1-11", "9-8-3", "11-6-11", "11-6-12", "20-2-7", "4-3-11", "11-1-1", "3-3-9", "11-4-10", "11-5-12", "17-3-2", "2-1-11", "3-2-11", "2-9-12",
		// 	"19-7-18", "11-8-12", "4-4-1", "14-1-4", "17-3-9", "3-9-12", "11-7-9", "11-7-12", "1-7-11", "11-1-5", "16-8-9", "2-4-12", "11-9-11", "11-10-11",
		// 	"4-9-18", "11-4-17", "2-8-10", "1-5-9", "4-7-7", "11-3-11", "11-4-11", "11-5-9", "13-1-17", "8-1-12", "8-3-15", "3-5-9", "11-5-5", "11-4-9", "11-6-9",
		// 	"16-6-11", "9-5-14", "4-8-1", "2-8-11", "17-4-12", "17-5-11", "11-7-17", "4-5-3", "6-3-12"
		// ]
		const glyphRepositionList: String[] = []
		const glyphShrinkList: String[] = ["11-4-10", "11-4-17", "11-5-12", "14-1-4", "19-7-18", "11-7-17", "2-8-11"]
		const docContentList: Paragraph[] = [];
		for (let index = 0; index < outputList.length; index++) {
			let verticalOffset: number = 500000;
			let widthHeight: number = 215;
			if (glyphRepositionList.includes(outputList[index]["code"])) {
				verticalOffset = 1000000
			}
			if (glyphShrinkList.includes(outputList[index]["code"])) {
				widthHeight = 150
			}
			const poemGlyph = outputList[index]["glyph"]			
			const poemImage: ImageRun = new ImageRun({
				data: poemGlyph,
				transformation: {
					width: widthHeight,
					height: widthHeight,
				},
				floating: {
					horizontalPosition: {
						align: HorizontalPositionAlign.CENTER,
						offset: 0,
					},
					verticalPosition: {
						relative: VerticalPositionRelativeFrom.PARAGRAPH,
						offset: verticalOffset,
					},
				},
			});	

			let currentTitle: Paragraph;
			if (outputList[index]["title"].trim().length === 0) {
				currentTitle = 
					new Paragraph({
						children: [ 
							new TextRun({text: "break", color: "white", font: "Garamond", size: 30, break: 3}),
						],
						pageBreakBefore: true,
						alignment: AlignmentType.CENTER,
					})
			} else {			
				currentTitle = 
					new Paragraph({
						children: [ 
							new TextRun({text: outputList[index]["title"], font: "Garamond", size: 30, bold: true, break: 5}),
						],
						pageBreakBefore: true,
						alignment: AlignmentType.CENTER,
					})
			}

			const textLines: string[] = outputList[index]["text"].split("\n")
			let currentText: Paragraph[] = 
				textLines.map((poemLine: string) => {
					return new Paragraph({
						children: [ 
							new TextRun({text: poemLine, font: "Garamond", size: 30}),
						],
						alignment: AlignmentType.LEFT,
					})
				}) as Paragraph[]
				
			let currentImage = new Paragraph({
				children: [
					poemImage
				]})

			docContentList.push(currentTitle) 
			docContentList.push(new Paragraph({children: [new TextRun({text: "break", font: "Garamond", color: "white", size: 30})]})) 
			currentText.map((textLine: Paragraph) => docContentList.push(textLine))
			docContentList.push(currentImage) 
		}

		const doc: Document = new Document({
			sections: [{
				properties: {},
				children: docContentList,
			}]
		});

		let partTitle;
		switch (iteration) {
			case 0:
				partTitle = "";
				break;
			case 1:
				partTitle = "_part1";
				break;
			case 2:
			   partTitle = "_part2";
				break;
		  }

		Packer.toBuffer(doc).then(async (buffer) => {
			this.outputPath = join(resolve(__dirname, "../../../../../../generated-poems_" + this.startingPoemRaw + "_" + this.numOfPoems + "_" + this.poemOrder + partTitle + ".docx"))
			await this.electronService.writeFile(this.outputPath, buffer)
		});	
	}

	public sortByMultipleValues(inputList: number[][]) {
		const outputListRaw: number[][] = [];
		const tempList: number[][] = [];
		const uniqueCoordList1: number[] = this.sortedUniqueList(inputList, 0)
		const uniqueCoordList2: number[] = this.sortedUniqueList(inputList, 1)
		const uniqueCoordList3: number[] = this.sortedUniqueList(inputList, 2)

		for (let xj=0; xj < uniqueCoordList1.length; xj++) {
				for (let yj=0; yj < uniqueCoordList2.length; yj++) {
						for (let zj=0; zj < uniqueCoordList3.length; zj++) {
								for (let i=0; i < inputList.length; i++) {
										if (inputList[i][0] == uniqueCoordList1[xj] && inputList[i][1] == uniqueCoordList2[yj] && inputList[i][2] == uniqueCoordList3[zj]) {
												tempList.push(inputList[i]);
										}
								}
						}
				}
		}
		const outputList = outputListRaw.concat(tempList);
	return outputList
	}

	public sortedUniqueList(inputList: number[][], coordIndex: number) {
		const currentCoordSet = new Set(inputList.map(poemCode => poemCode[coordIndex]));  
		const currentCoordUnique = (Array.from(currentCoordSet));		
		const finalUniqueList = currentCoordUnique.sort(function(a, b){return a - b});
		return finalUniqueList
	}

	public refinePoemList(inputPoemListRaw: string[]): number[][] {
		let inputPoemList: number[][] = [];
		inputPoemListRaw.forEach((poemStr: string) => {
			if (poemStr.slice(-4) === '.xml') {
				const poem: number[] = poemStr.slice(0, -4).split('-').map((poemCoord: string) => parseInt(poemCoord));
				inputPoemList.push(poem);
			}
		});
	return inputPoemList
	}

	backToMain() {
		this.successBool = false;
		this.formBool = true;
	}

	sleep(ms) { 
		return new Promise(resolve => setTimeout(resolve, ms));
	}
	
	_filter(val: string): string[] {
    return this.options.filter(option =>
      option.toLowerCase().indexOf(val.toLowerCase()) === 0);
  }

}
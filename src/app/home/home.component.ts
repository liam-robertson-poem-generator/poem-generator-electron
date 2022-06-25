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
	formBool = true;
	loadingBool = false;
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

	constructor(private electronService: ElectronService) {}

	async ngOnInit() {
		// npm run electron:build
		// this.poemListPath = resolve(__dirname, "../../../../../../src/assets/syllabary-poems")
		// this.templatePath = resolve(__dirname, "../../../../../../src/assets/poetry-template.docx")
		this.poemListPath = resolve(__dirname, "./assets/syllabary-poems")
		this.templatePath = resolve(__dirname, "./assets/poetry-template.docx")
		this.poemListRaw = await this.electronService.getDirectory(this.poemListPath)

		this.poemFormGroup = new FormGroup ({
			startingPoemControl: new FormControl(''),
			poemOrderControl: new FormControl(''),
			numOfPoemsControl: new FormControl('', [Validators.min(0), Validators.max(this.poemListRaw.length)])
		});
		
		this.poemList = this.refinePoemList(this.poemListRaw)
		this.poemListSorted = this.sortByMultipleValues(this.poemList);
		this.optionsInt = this.poemListSorted;
		this.options = this.optionsInt.map(value => value.join("-").toString())
		this.filteredOptions = (this.poemFormGroup.get('startingPoemControl') as FormControl).valueChanges.pipe(startWith(''), map(val => this._filter(val)));
	}

	public async execute() {
		this.formBool = false;
		this.loadingBool = true;
		await this.sleep(100);

		this.startingPoemRaw = this.poemFormGroup.value.startingPoemControl
		this.startingPoem = this.startingPoemRaw.split('-').map(coord => parseInt(coord))
		this.numOfPoems = this.poemFormGroup.value.numOfPoemsControl
		this.poemOrder = this.poemFormGroup.value.poemOrderControl

		this.finalPoemList = this.iterateBySyllables(this.poemListSorted, this.startingPoem, this.numOfPoems, this.poemOrder)
		this.templateList = await this.createTemplateList(this.finalPoemList)
		this.writeDocument(this.templateList)
		await this.sleep(1500);

		this.loadingBool = false;
		this.successBool = true;
	}

	public iterateBySyllables(poemList: number[][], startingPoem: number[], numOfPoems: number, poemOrder: string) {
		let uniqueCoordList1: number[] = this.updateUniqueLists(poemList, startingPoem)[0]
		let uniqueCoordList2: number[] = this.updateUniqueLists(poemList, startingPoem)[1]
		let uniqueCoordList3: number[] = this.updateUniqueLists(poemList, startingPoem)[2]

		let nextAxisNumberDict: {0: number, 1: number, 2: number} = {0:1, 1:2, 2:0};
		let outputList: number[][] = []
		let successCounter: number = 0
		let currentAxisNumber: number = 0
		let xLoopCounter: number = 0
		let yLoopCounter: number = 0
		let zLoopCounter: number = 0

		while (successCounter < numOfPoems) {
			let axisDict: {0: number[], 1: number[], 2: number[]} = {0:uniqueCoordList1, 1:uniqueCoordList2, 2:uniqueCoordList3}
			let currentXUniqueList: number[] = axisDict[currentAxisNumber]
			let currentYUniqueList: number[] = axisDict[nextAxisNumberDict[currentAxisNumber]]
			let currentZUniqueList: number[] = axisDict[nextAxisNumberDict[nextAxisNumberDict[currentAxisNumber]]]
			let currentXCoord: number = currentXUniqueList[xLoopCounter]
			let currentYCoord: number = currentYUniqueList[yLoopCounter]
			let currentZCoord: number = currentZUniqueList[zLoopCounter]
			let targetPoemDict: {0: number[], 1: number[], 2: number[]} = {0: [currentXCoord, currentYCoord, currentZCoord], 1: [currentZCoord, currentXCoord, currentYCoord], 2: [currentYCoord, currentZCoord, currentXCoord]}
			let currentTargetPoem: number[] = targetPoemDict[currentAxisNumber]
			
			if (!this.checkArrIn2dMatrix(outputList, currentTargetPoem) && this.checkArrIn2dMatrix(poemList, currentTargetPoem)) {
				uniqueCoordList1 = this.updateUniqueLists(poemList, currentTargetPoem)[0]
				uniqueCoordList2 = this.updateUniqueLists(poemList, currentTargetPoem)[1]
				uniqueCoordList3 = this.updateUniqueLists(poemList, currentTargetPoem)[2]
				
				currentAxisNumber = nextAxisNumberDict[currentAxisNumber]
				outputList.push(currentTargetPoem);
				poemList = this.removeItem(poemList, currentTargetPoem);

				zLoopCounter  = 0;
				yLoopCounter = 0;
				xLoopCounter = 0;
				successCounter++
			} else if (currentXCoord == currentXUniqueList[currentXUniqueList.length - 1]) {
				if (currentYCoord == currentYUniqueList[currentYUniqueList.length - 1]) {
					if (currentZCoord == currentZUniqueList[currentZUniqueList.length - 1]) {
						zLoopCounter  = 0;
						yLoopCounter = 0;
						xLoopCounter = 0;
					}
					zLoopCounter += 1;
					yLoopCounter = 0;
					xLoopCounter = 0;
				}
				yLoopCounter += 1;
				xLoopCounter = 0;
			} else {
				xLoopCounter += 1;
			}
		}
		if (poemOrder == "end") {
			outputList = outputList.reverse();
		}
		const finalOutputList = outputList.map(value => value.join("-").toString())		
		return finalOutputList
	}

	public updateUniqueLists(poemList: number[][], currentPoem: number[]) {
		const uniqueCoordList1Raw: number[] = this.sortedUniqueList(poemList, 0)
		const uniqueCoordList2Raw: number[] = this.sortedUniqueList(poemList, 1)
		const uniqueCoordList3Raw: number[] = this.sortedUniqueList(poemList, 2)
		const xIndex = uniqueCoordList1Raw.indexOf(currentPoem[0])
		const yIndex = uniqueCoordList2Raw.indexOf(currentPoem[1])
		const zIndex = uniqueCoordList3Raw.indexOf(currentPoem[2])
		const uniqueCoordList1: number[] = uniqueCoordList1Raw.slice(xIndex).concat(uniqueCoordList1Raw.slice(0, xIndex));
		const uniqueCoordList2: number[] = uniqueCoordList2Raw.slice(yIndex).concat(uniqueCoordList2Raw.slice(0, yIndex));
		const uniqueCoordList3: number[] = uniqueCoordList3Raw.slice(zIndex).concat(uniqueCoordList3Raw.slice(0, zIndex));
		return [uniqueCoordList1, uniqueCoordList2, uniqueCoordList3]
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
			const currentGlyphName = poemList[index] + '.jpg'
			// const poemPath = join(resolve(__dirname, "../../../../../../src/assets/syllabary-poems"), currentPoemName);		
			// const glyphPath = join(resolve(__dirname, "../../../../../../src/assets/syllabary-glyphs-jpg"), currentGlyphName); 
			const poemPath = join(resolve(__dirname, "./assets/syllabary-poems"), currentPoemName);		
			const glyphPath = join(resolve(__dirname, "./assets/syllabary-glyphs-jpg"), currentGlyphName); 
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
			
			outputList.push(currentPoem)}		
		return outputList
	}

	public writeDocument(outputList: any[]) {
		const docContentList: Paragraph[] = [];
		for (let index = 0; index < outputList.length; index++) { 
			const poemGlyph = outputList[index]["glyph"]			
			const poemImage: ImageRun = new ImageRun({
				data: poemGlyph,
				transformation: {
					width: 215,
					height: 215,
				},
				floating: {
					horizontalPosition: {
						align: HorizontalPositionAlign.CENTER,
						offset: 0,
					},
					verticalPosition: {
						relative: VerticalPositionRelativeFrom.PARAGRAPH,
						offset: 2014400,
					},
				},
			});				

			let currentTitle: Paragraph = 
				new Paragraph({
					children: [ 
						new TextRun({text: outputList[index]["title"], font: "Garamond", size: 28, bold: true, break: 1}),
					],
					pageBreakBefore: true,
					alignment: AlignmentType.CENTER,
				})

			if (outputList[index]["title"] == "") {
				currentTitle = 
					new Paragraph({
						children: [ 
							new TextRun({text: "", font: "Garamond", size: 10}),
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
							new TextRun({text: poemLine, font: "Garamond", size: 24, break: 0.5}),
						],
						alignment: AlignmentType.LEFT,
					})
				})
				
			let currentImage = new Paragraph({
				children: [
					poemImage
				]})

			
			docContentList.push(currentTitle) 
			currentText.map((textLine: Paragraph) => docContentList.push(textLine))
			docContentList.push(currentImage) 
		}

		const doc: Document = new Document({
			sections: [{
				properties: {},
				children: docContentList,
			}]
		});

		Packer.toBuffer(doc).then(async (buffer) => {
			// this.outputPath = join(resolve(__dirname, "../../../../../../../generated-poems_" + this.startingPoemRaw + "_" + this.numOfPoems + "_" + this.poemOrder + ".docx"))
			this.outputPath = join(resolve(__dirname, "../../../../../../generated-poems_" + this.startingPoemRaw + "_" + this.numOfPoems + "_" + this.poemOrder + ".docx"))
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
		let inputPoemList: string[] = [];
		inputPoemList = inputPoemListRaw.reduce(function (filtered: any[], currentElement: string) {
			if (currentElement.slice(-4) === '.xml') {
					currentElement = currentElement.slice(0, -4);
					filtered.push(currentElement);
				}
				return filtered
		}, []);
		const inputPoemListInt = inputPoemList.map(poemCode => (poemCode.split('-')).map(coord => parseInt(coord)));
	return inputPoemListInt
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
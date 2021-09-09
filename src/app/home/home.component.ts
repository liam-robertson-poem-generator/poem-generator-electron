import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, Validators, FormBuilder, FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { ElectronService } from "../core/services/electron/electron.service";
import { map, startWith } from 'rxjs/operators';
import { AlignmentType, Document, HeadingLevel, HorizontalPositionAlign, HorizontalPositionRelativeFrom, ImageRun, Packer, PageBreak, Paragraph, TextRun, TextWrappingSide, TextWrappingType, VerticalPositionRelativeFrom } from "docx";
import { join, resolve } from 'path';

@Component({
	selector: 'app-home',
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
	public formBool = true;
	public loadingBool = false;
	public successBool = false;
	public optionsInt: number[][];
	public options: string[];
	public templatePath: string;
	filteredOptions: Observable<string[]>;
	public poemListRaw: any;
	public poemList: number[][];
	public poemListSorted: number[][];
	public startingPoem: number[];
	public poemListPath: string;
	yourVariable: any;
	numOfPoems: any;
	poemOrder: any;
	finalPoemList: string[];
	poemFormGroup = new FormGroup ({
		startingPoemControl: new FormControl(''),
		poemOrderControl: new FormControl(''),
		numOfPoemsControl: new FormControl('', [Validators.min(0), Validators.max(2268)])
	});
	templateList: any[];
	outputPath: string;
	startingPoemRaw: any;
	loopCounter: any;

	constructor(private router: Router, private electronService: ElectronService, private fb: FormBuilder) {  
	}
	async ngOnInit() {
		this.poemListPath = resolve(__dirname, "../../../../../../src/assets/syllabary-poems")   
		this.templatePath = resolve(__dirname, "../../../../../../src/assets/poetry-template.docx") 
		this.poemListRaw = await this.electronService.getDirectory(this.poemListPath)	
				
		this.poemList = this.refinePoemList(this.poemListRaw)
		
		this.poemListSorted = this.sortByMultipleValues(this.poemList);		
		this.optionsInt = this.poemListSorted;
		this.options = this.optionsInt.map(value => value.join("-").toString())
		this.filteredOptions = this.poemFormGroup.get('startingPoemControl').valueChanges
      .pipe(
        startWith(''),
        map(val => this._filter(val))
      );
	}

	public async execute() {
		console.log(this.numOfPoems);
		console.log(this.startingPoem);
		console.log(this.poemOrder);

		this.formBool = false;
		this.loadingBool = true;
		await this.sleep(100);

		this.startingPoemRaw = this.poemFormGroup.value.startingPoemControl
		this.startingPoem = this.startingPoemRaw.split('-').map(coord => parseInt(coord))
		this.numOfPoems = this.poemFormGroup.value.numOfPoemsControl
		this.poemOrder = this.poemFormGroup.value.poemOrderControl

		this.finalPoemList = this.iterateBySyllables(this.poemListSorted, this.startingPoem, this.numOfPoems, this.poemOrder)
		console.log(this.finalPoemList);
		this.templateList = await this.createTemplateList(this.finalPoemList)
		this.writeDocument(this.templateList)
		await this.sleep(1500);

		this.loadingBool = false;
		this.successBool = true;
	}

	public iterateBySyllables(poemList: number[][], startingPoem: number[], numOfPoems: number, poemOrder: string) {
		let uniqueCoordList1 = this.updateUniqueLists(poemList, startingPoem)[0]
		let uniqueCoordList2 = this.updateUniqueLists(poemList, startingPoem)[1]
		let uniqueCoordList3 = this.updateUniqueLists(poemList, startingPoem)[2]

		let nextAxisNumberDict = {0:1, 1:2, 2:0};
		let outputList = []
		let successCounter: number = 0
		let currentAxisNumber = 0
		let xLoopCounter = 0
		let yLoopCounter = 0
		let zLoopCounter = 0
		let currentTargetPoem = startingPoem

		while (successCounter < numOfPoems) {
			let axisDict = {0:uniqueCoordList1, 1:uniqueCoordList2, 2:uniqueCoordList3}
			let currentXUniqueList = axisDict[currentAxisNumber]
			let currentYUniqueList = axisDict[nextAxisNumberDict[currentAxisNumber]]
			let currentZUniqueList = axisDict[nextAxisNumberDict[nextAxisNumberDict[currentAxisNumber]]]
			let currentXCoord = currentXUniqueList[xLoopCounter]
			let currentYCoord = currentYUniqueList[yLoopCounter]
			let currentZCoord = currentZUniqueList[zLoopCounter]
			let targetPoemDict = {0: [currentXCoord, currentYCoord, currentZCoord], 1: [currentZCoord, currentXCoord, currentYCoord], 2: [currentYCoord, currentZCoord, currentXCoord]}
			let currentTargetPoem = targetPoemDict[currentAxisNumber]
			
			if (!this.checkArrIn2dMatrix(outputList, currentTargetPoem) && this.checkArrIn2dMatrix(poemList, currentTargetPoem)) {
				console.log(successCounter);
				uniqueCoordList1 = this.updateUniqueLists(poemList, currentTargetPoem)[0]
				uniqueCoordList2 = this.updateUniqueLists(poemList, currentTargetPoem)[1]
				uniqueCoordList3 = this.updateUniqueLists(poemList, currentTargetPoem)[2]
				
				currentAxisNumber = nextAxisNumberDict[currentAxisNumber]
				outputList.push(currentTargetPoem.slice(0));
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
		const outputList = [];
		for (let index = 0; index < poemList.length; index++) {		

			const currentTargetPoem = poemList[index]
			let hasTextVar = true;
			const currentPoemName = poemList[index] + '.json'
			const currentGlyphName = poemList[index] + '.jpg'
			const poemPath = join(resolve(__dirname, "../../../../../../src/assets/syllabary-poems"), currentPoemName);		
			const glyphPath = join(resolve(__dirname, "../../../../../../src/assets/syllabary-glyphs-jpg"), currentGlyphName); 
			const poemGlyph = await this.electronService.readFile(glyphPath, {})	
			const poemContent = await this.electronService.readFile(poemPath, {encoding:'utf8', flag:'r'})		
			const poemJson = JSON.parse(poemContent.toString());   
			const contentJson = poemJson['poem'];
			if (contentJson['title'] === null) {
					contentJson['title'] = 'Untitled';
			}
			if (contentJson['text'] === null) {
					hasTextVar = false;
			}
			outputList.push({
			"code": currentTargetPoem,
			"title": contentJson['title'],
			"text": contentJson['text'],
			"glyph": poemGlyph,
			"hasText": hasTextVar,
	})}		
		return outputList
	}

	public writeDocument(outputList) {
		const docContentList = [];
		for (let index = 0; index < outputList.length; index++) { 
			const poemGlyph = outputList[index]["glyph"]			
			const poemImage = new ImageRun({
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

			let currentTitle = 
				new Paragraph({
					children: [ 
						new TextRun({text: outputList[index]["title"], font: "Underwood Champion", size: 40}),
						new TextRun({text: " (" + outputList[index]["code"] + ")", font: "Underwood Champion", size: 30}),
					],
					pageBreakBefore: true,
					alignment: AlignmentType.CENTER,
				})

			let currentText = 
				new Paragraph({
					children: [ 
						new TextRun({text: outputList[index]["text"], font: "Underwood Champion", size: 30, break: 2}),
					],
				})

			let currentImage = new Paragraph({
				children: [
					poemImage
				]})

			docContentList.push(currentTitle) 
			docContentList.push(currentText) 
			docContentList.push(currentImage) 
		}

		const doc = new Document({
			sections: [{
				properties: {},
				children: docContentList,
			}]
		});

		Packer.toBuffer(doc).then(async (buffer) => {
			this.outputPath = join(resolve(__dirname, "../../../../../../../generated-poems_" + this.startingPoemRaw + "_" + this.numOfPoems + ".docx"))
			await this.electronService.writeFile(this.outputPath, buffer)
		});	
	}

	public sortByMultipleValues(inputList: number[][]) {
		const outputListRaw = [];
		const tempList = [];
		const uniqueCoordList1 = this.sortedUniqueList(inputList, 0)
		const uniqueCoordList2 = this.sortedUniqueList(inputList, 1)
		const uniqueCoordList3 = this.sortedUniqueList(inputList, 2)

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
			if (currentElement.slice(-5) === '.json') {
					currentElement = currentElement.slice(0, -5);
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



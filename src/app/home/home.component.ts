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
		this.formBool = false;
		this.loadingBool = true;

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
		console.log("poemOrder: " + poemOrder);
		console.log("startingPoem: " + startingPoem);
		console.log("numOfPoems: " + numOfPoems);

		const xUniqueCoordListRaw: number[] = this.sortedUniqueList(poemList, 0)
		const yUniqueCoordListRaw: number[] = this.sortedUniqueList(poemList, 1)
		const zUniqueCoordListRaw: number[] = this.sortedUniqueList(poemList, 2)
		const xIndex = xUniqueCoordListRaw.indexOf(startingPoem[0])
		const yIndex = yUniqueCoordListRaw.indexOf(startingPoem[1])
		const zIndex = zUniqueCoordListRaw.indexOf(startingPoem[2])
		const xUniqueCoordList: number[] = xUniqueCoordListRaw.slice(xIndex).concat(xUniqueCoordListRaw.slice(0, xIndex));
		const yUniqueCoordList: number[] = yUniqueCoordListRaw.slice(yIndex).concat(yUniqueCoordListRaw.slice(0, yIndex));
		const zUniqueCoordList: number[] = zUniqueCoordListRaw.slice(zIndex).concat(zUniqueCoordListRaw.slice(0, zIndex));
		
		let currentAxis: number[] = xUniqueCoordList;
		const nextAxisDict = {0:yUniqueCoordList, 1:zUniqueCoordList, 2:xUniqueCoordList}
		const currentAxisDict = {0:xUniqueCoordList, 1:yUniqueCoordList, 2:zUniqueCoordList}
		let currentAxisNumber = 0
		const nextAxisNumberDict = {0:1, 1:2, 2:0};
		let outputList = []
		let successCounter: number = 0
		let currentTargetPoem = startingPoem
		let loopCounter = 0

		// else if (currentTargetPoem[currentAxisNumber] == currentAxis[currentAxis.length - 1]){
		// 	if (currentTargetPoem[nextAxisNumberDict[currentAxisNumber]] == nextAxisDict[currentAxisNumber][nextAxisDict[currentAxisNumber].length - 1]) {
		// 		currentTargetPoem[nextAxisNumberDict[currentAxisNumber] + 1] += 1
		// 		currentTargetPoem[currentAxisNumber] = currentAxis[0]
		// 		loopCounter = 0
		// 	} else {
		// 		currentTargetPoem[nextAxisNumberDict[currentAxisNumber]] += 1
		// 		currentTargetPoem[currentAxisNumber] = currentAxis[0]
		// 		loopCounter = 0
		// 	}
		// } 

		while (successCounter < numOfPoems) {
			currentTargetPoem[currentAxisNumber] = currentAxis[loopCounter]	
			console.log(currentTargetPoem);
			
			if (!this.checkArrIn2dMatrix(outputList, currentTargetPoem) && this.checkArrIn2dMatrix(poemList, currentTargetPoem)) {
				console.log(successCounter);			
				outputList.push(currentTargetPoem.slice(0));				
				loopCounter = 1;
				currentAxis = nextAxisDict[currentAxisNumber]
				currentAxisNumber = nextAxisNumberDict[currentAxisNumber]
				const currentIndex = currentAxis.indexOf(startingPoem[currentAxisNumber])
				currentAxis = currentAxis.slice(currentIndex).concat(currentAxis.slice(0, currentIndex));
				successCounter++
			} else {
				loopCounter++
			}
		}
		if (poemOrder == "end") {
			outputList = outputList.reverse();
		}
		const finalOutputList = outputList.map(value => value.join("-").toString())		
		return finalOutputList
	}

	public updateUniqueLists(poemList) {
		
	}

	public checkArrIn2dMatrix(matrix, testArr) {
		const matrixStr = matrix.map((poemCode) => String(poemCode));	
		return matrixStr.includes(testArr.toString())
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
		const xUniqueCoordList = this.sortedUniqueList(inputList, 0)
		const yUniqueCoordList = this.sortedUniqueList(inputList, 1)
		const zUniqueCoordList = this.sortedUniqueList(inputList, 2)

		for (let xj=0; xj < xUniqueCoordList.length; xj++) {
				for (let yj=0; yj < yUniqueCoordList.length; yj++) {
						for (let zj=0; zj < zUniqueCoordList.length; zj++) {
								for (let i=0; i < inputList.length; i++) {
										if (inputList[i][0] == xUniqueCoordList[xj] && inputList[i][1] == yUniqueCoordList[yj] && inputList[i][2] == zUniqueCoordList[zj]) {
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



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
	uniqueCoordList1: any;
	uniqueCoordList2: any;
	uniqueCoordList3: any;
	nextAxisNumberDict: { 0: number; 1: number; 2: number; };
	outputList: any[];
	successCounter: number;
	currentAxisNumber: number;
	xLoopCounter: number;
	yLoopCounter: number;
	zLoopCounter: number;
	currentTargetPoem: number[];
	axisDict: { 0: any; 1: any; 2: any; };
	currentXUniqueList: any;
	currentYUniqueList: any;
	currentZUniqueList: any;
	currentXCoord: any;
	currentYCoord: any;
	currentZCoord: any;
	targetPoemDict: { 0: any[]; 1: any[]; 2: any[]; };
	uniqueCoordList1Raw: number[];
	uniqueCoordList2Raw: number[];
	uniqueCoordList3Raw: number[];
	xIndex: number;
	yIndex: number;
	zIndex: number;
	currentTemplatePoem: string;
	outputListRaw: any[];

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
		await this.sleep(100);

		this.startingPoemRaw = this.poemFormGroup.value.startingPoemControl
		this.startingPoem = this.startingPoemRaw.split('-').map(coord => parseInt(coord))
		this.numOfPoems = this.poemFormGroup.value.numOfPoemsControl
		this.poemOrder = this.poemFormGroup.value.poemOrderControl

		this.finalPoemList = this.iterateBySyllables(this.poemList, this.startingPoem, this.numOfPoems, this.poemOrder)
		console.log(this.finalPoemList);
		this.templateList = await this.createTemplateList()
		this.writeDocument()
		await this.sleep(1500);

		this.loadingBool = false;
		this.successBool = true;
	}

	public iterateBySyllables(poemList, startingPoem, numOfPoems, poemOrder) {
		this.nextAxisNumberDict = {0: 1, 1: 2, 2: 0};
		this.outputList = []
		this.successCounter = 0
		this.currentAxisNumber = 0
		this.xLoopCounter = 0
		this.yLoopCounter = 0
		this.zLoopCounter = 0
		this.currentTargetPoem = this.startingPoem

		this.uniqueCoordList1 = this.updateUniqueLists()[0]
		this.uniqueCoordList2 = this.updateUniqueLists()[1]
		this.uniqueCoordList3 = this.updateUniqueLists()[2]

		while (this.successCounter < this.numOfPoems) {
			this.axisDict = {0: this.uniqueCoordList1, 1: this.uniqueCoordList2, 2: this.uniqueCoordList3}
			this.currentXUniqueList = this.axisDict[this.currentAxisNumber]
			this.currentYUniqueList = this.axisDict[this.nextAxisNumberDict[this.currentAxisNumber]]
			this.currentZUniqueList = this.axisDict[this.nextAxisNumberDict[this.nextAxisNumberDict[this.currentAxisNumber]]]
			this.currentXCoord = this.currentXUniqueList[this.xLoopCounter]
			this.currentYCoord = this.currentYUniqueList[this.yLoopCounter]
			this.currentZCoord = this.currentZUniqueList[this.zLoopCounter]
			this.targetPoemDict = {0: [this.currentXCoord, this.currentYCoord, this.currentZCoord], 1: [this.currentZCoord, this.currentXCoord, this.currentYCoord], 2: [this.currentYCoord, this.currentZCoord, this.currentXCoord]}
			this.currentTargetPoem = this.targetPoemDict[this.currentAxisNumber]
			
			if (!this.checkArrIn2dMatrix(this.outputList, this.currentTargetPoem) && this.checkArrIn2dMatrix(this.poemList, this.currentTargetPoem)) {
				console.log(this.successCounter);
				this.uniqueCoordList1 = this.updateUniqueLists()[0]
				this.uniqueCoordList2 = this.updateUniqueLists()[1]
				this.uniqueCoordList3 = this.updateUniqueLists()[2]
				
				this.currentAxisNumber = this.nextAxisNumberDict[this.currentAxisNumber]
				this.outputList.push(this.currentTargetPoem.slice(0));
				this.poemList = this.removeItem(this.poemList, this.currentTargetPoem);

				this.zLoopCounter  = 0;
				this.yLoopCounter = 0;
				this.xLoopCounter = 0;
				this.successCounter++
			} else if (this.currentXCoord == this.currentXUniqueList[this.currentXUniqueList.length - 1]) {
				if (this.currentYCoord == this.currentYUniqueList[this.currentYUniqueList.length - 1]) {
					if (this.currentZCoord == this.currentZUniqueList[this.currentZUniqueList.length - 1]) {
						this.zLoopCounter  = 0;
						this.yLoopCounter = 0;
						this.xLoopCounter = 0;
					}
					this.zLoopCounter += 1;
					this.yLoopCounter = 0;
					this.xLoopCounter = 0;
				}
				this.yLoopCounter += 1;
				this.xLoopCounter = 0;
			} else {
				this.xLoopCounter += 1;
			}
		}
		if (this.poemOrder == "end") {
			this.outputList = this.outputList.reverse();
		}
		const finalOutputList = this.outputList.map(value => value.join("-").toString())		
		return finalOutputList
	}

	public updateUniqueLists() {
		this.uniqueCoordList1Raw = this.sortedUniqueList(this.poemList, 0)
		this.uniqueCoordList2Raw = this.sortedUniqueList(this.poemList, 1)
		this.uniqueCoordList3Raw = this.sortedUniqueList(this.poemList, 2)
		this.xIndex = this.uniqueCoordList1Raw.indexOf(this.currentTargetPoem[0])
		this.yIndex = this.uniqueCoordList2Raw.indexOf(this.currentTargetPoem[1])
		this.zIndex = this.uniqueCoordList3Raw.indexOf(this.currentTargetPoem[2])
		this.uniqueCoordList1 = this.uniqueCoordList1Raw.slice(this.xIndex).concat(this.uniqueCoordList1Raw.slice(0, this.xIndex));
		this.uniqueCoordList2 = this.uniqueCoordList2Raw.slice(this.yIndex).concat(this.uniqueCoordList2Raw.slice(0, this.yIndex));
		this.uniqueCoordList3 = this.uniqueCoordList3Raw.slice(this.zIndex).concat(this.uniqueCoordList3Raw.slice(0, this.zIndex));
		return [this.uniqueCoordList1, this.uniqueCoordList2, this.uniqueCoordList3]
	}

	public checkArrIn2dMatrix(matrix, testArr) {
		const matrixStr = matrix.map((poemCode) => String(poemCode));	
		return matrixStr.includes(testArr.toString())
	}

	public  removeItem(arr, item){
		return arr.filter(f => f.toString() !== item.toString())
	}

	public async createTemplateList() {
		this.outputList = [];
		for (let index = 0; index < this.finalPoemList.length; index++) {		

			this.currentTemplatePoem = this.finalPoemList[index]
			let hasTextVar = true;
			const currentPoemName = this.finalPoemList[index] + '.json'
			const currentGlyphName = this.finalPoemList[index] + '.jpg'
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
			this.outputList.push({
			"code": this.currentTemplatePoem,
			"title": contentJson['title'],
			"text": contentJson['text'],
			"glyph": poemGlyph,
			"hasText": hasTextVar,
	})}		
		return this.outputList
	}

	public writeDocument() {
		const docContentList = [];
		for (let index = 0; index < this.outputList.length; index++) { 
			const poemGlyph = this.outputList[index]["glyph"]			
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
						new TextRun({text: this.outputList[index]["title"], font: "Underwood Champion", size: 40}),
						new TextRun({text: " (" + this.outputList[index]["code"] + ")", font: "Underwood Champion", size: 30}),
					],
					pageBreakBefore: true,
					alignment: AlignmentType.CENTER,
				})

			let currentText = 
				new Paragraph({
					children: [ 
						new TextRun({text: this.outputList[index]["text"], font: "Underwood Champion", size: 30, break: 2}),
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
		this.outputListRaw = [];
		const tempList = [];
		this.uniqueCoordList1 = this.sortedUniqueList(inputList, 0)
		this.uniqueCoordList2 = this.sortedUniqueList(inputList, 1)
		this.uniqueCoordList3 = this.sortedUniqueList(inputList, 2)

		for (let xj=0; xj < this.uniqueCoordList1.length; xj++) {
				for (let yj=0; yj < this.uniqueCoordList2.length; yj++) {
						for (let zj=0; zj < this.uniqueCoordList3.length; zj++) {
								for (let i=0; i < inputList.length; i++) {
										if (inputList[i][0] == this.uniqueCoordList1[xj] && inputList[i][1] == this.uniqueCoordList2[yj] && inputList[i][2] == this.uniqueCoordList3[zj]) {
												tempList.push(inputList[i]);
										}
								}
						}
				}
		}
		const outputList = this.outputListRaw.concat(tempList);
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



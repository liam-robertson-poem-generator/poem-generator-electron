import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, Validators, FormBuilder, FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { ElectronService } from "../core/services/electron/electron.service";
import { map, startWith } from 'rxjs/operators';
import { Document, ImageRun, Packer, PageBreak, Paragraph, TextRun } from "docx";
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

		const startingPoemRaw: string = this.poemFormGroup.value.startingPoemControl
		this.startingPoem = startingPoemRaw.split('-').map(coord => parseInt(coord))
		this.numOfPoems = this.poemFormGroup.value.numOfPoemsControl
		this.poemOrder = this.poemFormGroup.value.poemOrderControl

		this.finalPoemList = this.iterateBySyllables(this.poemListSorted, this.startingPoem, this.numOfPoems, this.poemOrder)
		console.log(this.finalPoemList);
		this.templateList = await this.createTemplateList(this.finalPoemList)
		this.writeDocument(this.templateList)

		this.loadingBool = false;
		this.successBool = true;
	}

	public iterateBySyllables(poemList: number[][], startingPoem: number[], numOfPoems: number, poemOrder: string) {
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

		while (successCounter < numOfPoems) {
			currentTargetPoem[currentAxisNumber] = currentAxis[loopCounter]	
			
			if (!this.checkArrIn2dMatrix(outputList, currentTargetPoem) && this.checkArrIn2dMatrix(poemList, currentTargetPoem)) {
				outputList.push(currentTargetPoem.slice(0));				
				loopCounter = 1;
				currentAxis = nextAxisDict[currentAxisNumber]
				currentAxisNumber = nextAxisNumberDict[currentAxisNumber]
				const currentIndex = currentAxis.indexOf(startingPoem[currentAxisNumber])
				currentAxis = currentAxis.slice(currentIndex).concat(currentAxis.slice(0, currentIndex));
				successCounter++
			} else if (currentTargetPoem[currentAxisNumber] == currentAxis[currentAxis.length - 1]){
				currentTargetPoem[nextAxisNumberDict[currentAxisNumber]] += 1
				loopCounter = 0
			} else {
				loopCounter++
			}
		}
		const finalOutputList = outputList.map(value => value.join("-").toString())
		return finalOutputList
	}

	public checkArrIn2dMatrix(matrix, testArr) {
		const matrixStr = matrix.map((poemCode) => String(poemCode));	
		return matrixStr.includes(testArr.toString())
	}

	// const poemGlyph = await this.electronService.readFile(join(resolve(__dirname, "../../../../../../src/assets/syllabary-glyphs"), poemList[index] + '.png'))
			// const poemImage = new ImageRun({
			// 	data: poemGlyph,
			// 	transformation: {
			// 		width: 200,
			// 		height: 200,
			// 	},
			// 	floating: {
			// 		horizontalPosition: {
			// 			offset: 1014400,
			// 		},
			// 		verticalPosition: {
			// 			offset: 1014400,
			// 		},
			// 	},
			// });

	public async createTemplateList(poemList: string[]) {
		const outputList = [];
		for (let index = 0; index < poemList.length; index++) {			
			const currentTargetPoem = poemList[index]
			let hasTextVar = true;
			const currentPoemName = poemList[index] + '.json'
			const poemPath = join(resolve(__dirname, "../../../../../../src/assets/syllabary-poems"), currentPoemName);			
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
			"hasText": hasTextVar,
	})}	
		return outputList
	}

	public writeDocument(outputList) {
		const docContentList = [];
		for (let index = 0; index < outputList.length; index++) {
			let tempVar = 
				new Paragraph({
					children: [ 
						new TextRun({text: outputList[index]["title"], font: "Arial", size: 40}),
						new TextRun({text: " (" + outputList[index]["code"] + ")", font: "Arial", size: 40}),
						new TextRun({text: outputList[index]["text"], font: "Arial", size: 30, break: 2}),
					],
					pageBreakBefore: true,
				})
			docContentList.push(tempVar)
		}

		const doc = new Document({
			sections: [{
				properties: {},
				children: docContentList,
			}]
		});
		
		Packer.toBuffer(doc).then((buffer) => {
			this.electronService.writeFile(resolve(__dirname, "../../../../../../src/assets/myDoc.docx"), buffer)
		});	
	}
		
// 		const currentPoemName = currentTargetPoem.join('-') + '.json'
// 		const poemPath = join(resolve(__dirname, "../../../../../../src/assets/syllabary-poems"), currentPoemName);
// 		const poemContent = await this.electronService.readFile(poemPath)
// 		const poemJson = JSON.parse(poemContent.toString());   
// 		const contentJson = poemJson['poem'];
// 		if (contentJson['title'] === null) {
// 				contentJson['title'] = 'Untitled';
// 		}
// 		if (contentJson['text'] === null) {
// 				hasTextVar = false;
// 		}
// 		outputTemplateList.push({
// 		"code": currentTargetPoem.join('-'),
// 		"title": contentJson['title'],
// 		"text": contentJson['text'],
// 		"hasText": hasTextVar,
// })
// 		poemList = poemList.slice(indexCounter).concat(poemList.slice(0, indexCounter));
// 		indexCounter = 0
// 		currentCoord = nextCoordDict[currentCoord]							
// 		currentUniqueList = currentUniqueList.slice(1).concat(currentUniqueList.slice(0, 1));
// 		currentUniqueList = nextUniqueDict[currentCoord]
// 		const currentUniqueListCoord = currentUniqueList.indexOf(poemList[indexCounter][currentCoord]);
// 		currentUniqueList = currentUniqueList.slice(currentUniqueListCoord + 1).concat(currentUniqueList.slice(0, currentUniqueListCoord + 1));
// 		successCounter++;
// }


// 	public async iterateBySyllables(poemListRaw: number[][], startingPoem: number[], numOfPoems: number, poemOrder: string, docTemplate: string[]) {
// 			// Initialising startup variables
// 			let successCounter: number = 0;
// 			let indexCounter: number = 0;
// 			let currentTargetPoem: number[];
// 			let currentCoord: number = 0;
// 			const outputTemplateList = [];
// 			const outputList: number[][] = [];
// 			const nextCoordDict= {0:1, 1:2, 2:0};
// 			const poemListStr = poemListRaw.map((poemCode) => String(poemCode));

// 			const xUniqueCoordListRaw: number[] = this.sortedUniqueList(poemListRaw, 0)
// 			const yUniqueCoordListRaw: number[] = this.sortedUniqueList(poemListRaw, 1)
// 			const zUniqueCoordListRaw: number[] = this.sortedUniqueList(poemListRaw, 2)
// 			const xUniqueCoordList: number[] = xUniqueCoordListRaw.slice(xUniqueCoordListRaw.indexOf(startingPoem[0])).concat(xUniqueCoordListRaw.slice(0, xUniqueCoordListRaw.indexOf(startingPoem[0])));
// 			const yUniqueCoordList: number[] = yUniqueCoordListRaw.slice(yUniqueCoordListRaw.indexOf(startingPoem[1])).concat(yUniqueCoordListRaw.slice(0, yUniqueCoordListRaw.indexOf(startingPoem[1])));
// 			const zUniqueCoordList: number[] = zUniqueCoordListRaw.slice(zUniqueCoordListRaw.indexOf(startingPoem[2])).concat(zUniqueCoordListRaw.slice(0, zUniqueCoordListRaw.indexOf(startingPoem[2])));

// 			const nextUniqueDict = {0:yUniqueCoordList, 1:zUniqueCoordList, 2:xUniqueCoordList}
// 			let currentUniqueList: number[] = xUniqueCoordList;

// 			// Changing the inputList to start from the startingPoem and appending the starting poem to output
// 			const startingPoemIndex = poemListStr.indexOf(startingPoem.toString());			
// 			let poemList = poemListRaw.slice(startingPoemIndex).concat(poemListRaw.slice(0, startingPoemIndex));
// 			console.log(poemList);
					
// 			while (successCounter < numOfPoems) {
// 					let hasTextVar = true;
// 					currentTargetPoem = poemList[indexCounter]
// 					console.log(currentTargetPoem);
// 					console.log(currentCoord);
					
// 					console.log((currentTargetPoem) && currentTargetPoem[currentCoord] == currentUniqueList[0]);
					
// 					// Checks if the current poem contains the correct coordinate for a given axis
// 					// Iterate currentCoord and currentUniqueCoordList
// 					if (!outputList.includes(currentTargetPoem) && currentTargetPoem[currentCoord] == currentUniqueList[0]) {
// 							const currentPoemName = currentTargetPoem.join('-') + '.json'
// 							const poemPath = join(resolve(__dirname, "../../../../../../src/assets/syllabary-poems"), currentPoemName);
// 							const poemContent = await this.electronService.readFile(poemPath)
// 							const poemJson = JSON.parse(poemContent.toString());   
// 							const contentJson = poemJson['poem'];
// 							if (contentJson['title'] === null) {
// 									contentJson['title'] = 'Untitled';
// 							}
// 							if (contentJson['text'] === null) {
// 									hasTextVar = false;
// 							}
// 							outputTemplateList.push({
// 							"code": currentTargetPoem.join('-'),
// 							"title": contentJson['title'],
// 							"text": contentJson['text'],
// 							"hasText": hasTextVar,
// 					})
// 							poemList = poemList.slice(indexCounter).concat(poemList.slice(0, indexCounter));
// 							indexCounter = 0
// 							currentCoord = nextCoordDict[currentCoord]							
// 							currentUniqueList = currentUniqueList.slice(1).concat(currentUniqueList.slice(0, 1));
// 							currentUniqueList = nextUniqueDict[currentCoord]
// 							const currentUniqueListCoord = currentUniqueList.indexOf(poemList[indexCounter][currentCoord]);
// 							currentUniqueList = currentUniqueList.slice(currentUniqueListCoord + 1).concat(currentUniqueList.slice(0, currentUniqueListCoord + 1));
// 							successCounter++;
// 					}
// 					indexCounter++;					
// 			}		
// 			console.log(outputTemplateList);
// 			const outputPoemList = outputTemplateList.map(poemCode => poemCode["code"]); 
// 			console.log(outputPoemList);
			
// 			const zip = new PizZip(docTemplate);
// 			const doc = new Docxtemplater(zip, {parser: this.parser});
// 			const finalOutputData = {'poemList': outputTemplateList};
// 			doc.setData(finalOutputData);
// 			doc.render()
// 			const buf = doc.getZip().generate({type: 'nodebuffer'});
// 			const templatePath = resolve(__dirname, '../../syllabary-poems_' + numOfPoems + '_' + startingPoem.join('-') + '.docx')
// 			// this.electronService.writeFile(templatePath, buf);
// }


	

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
	
	_filter(val: string): string[] {
    return this.options.filter(option =>
      option.toLowerCase().indexOf(val.toLowerCase()) === 0);
  }

	
// 	public angularParser(tag: string) {
// 		if (tag === '.') {
// 				return {
// 						get: function(s: any){ return s;}
// 				};
// 		}
// 		const expr = expressions.compile(
// 				tag.replace(/(’|‘)/g, "'").replace(/(“|”)/g, '"')
// 		);
// 		return {
// 				get: function(scope: any, context: { scopeList: any; num: any; }) {
// 						let obj = {};
// 						const scopeList = context.scopeList;
// 						const num = context.num;
// 						for (let i = 0, len = num + 1; i < len; i++) {
// 								obj = assign(obj, scopeList[i]);
// 						}
// 						return expr(scope, obj);
// 				}
// 		};
// 	}
// 	public parser(tag: string) {
// 	if (tag === "$pageBreakExceptLast") {
// 			return {
// 					get(scope: any, context: { scopePathLength: string | any[]; scopePathItem: string | any[]; }) {
// 							const totalLength = context.scopePathLength[context.scopePathLength.length - 1];
// 							const index = context.scopePathItem[context.scopePathItem.length - 1];
// 							const isLast = index === totalLength - 1;
// 							if (!isLast) {
// 									return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
// 							}
// 							else {
// 									return '';
// 							}
// 					}
// 			}
// 	}
// 	return this.angularParser(tag);
// }
	
		

}



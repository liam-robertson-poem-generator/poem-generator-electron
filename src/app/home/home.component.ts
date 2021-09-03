import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, Validators, FormBuilder, FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { ElectronService } from "../core/services/electron/electron.service";
import { map, startWith } from 'rxjs/operators';
const expressions = require('angular-expressions');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
import assign from "lodash/assign";
import { join, resolve } from 'path';

interface Food {
	value: string;
	viewValue: string;
}

@Component({
	selector: 'app-home',
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
	myControl = new FormControl();
	public optionsInt: number[][];
	public options: string[];
	filteredOptions: Observable<string[]>;
	public poemListRaw: any;
	public poemList: number[][];
	public poemListSorted: number[][];
	public startingPoemStr: string;
	public startingPoem: number[];
	public poemListPath: string;
	docTemplate: string[];
	foods: Food[] = [
		{value: 'steak-0', viewValue: 'Steak'},
		{value: 'pizza-1', viewValue: 'Pizza'},
		{value: 'tacos-2', viewValue: 'Tacos'}
	];

	constructor(private router: Router, private electronService: ElectronService) {  
	}
	async ngOnInit() {
		this.poemListPath = resolve(__dirname, "../../../../../../src/assets/syllabaryPoems")    
		this.startingPoemStr = "[1-1-1]"
		this.startingPoem = this.startingPoemStr.split('-').map((coord: string) => parseInt(coord));
		this.poemListRaw = await this.electronService.getDirectory(this.poemListPath)			
		this.poemList = this.refinePoemList(this.poemListRaw)
		this.poemListSorted = this.sortByMultipleValues(this.poemList);

		this.optionsInt = this.poemListSorted;
		this.options = this.optionsInt.map(value => value.join("-").toString())
		this.filteredOptions = this.myControl.valueChanges
		.pipe(
			startWith(''), 
			map(value => this._filter(value))
		);
	
		this.readWritePoems(this.poemList, this.startingPoem, 20, "forwards", this.docTemplate)
}

	public async readWritePoems(poemListRaw: number[][], startingPoem: number[], numOfPoems: number, poemOrder: string, docTemplate: string[]) {
			// Initialising startup variables
			let successCounter: number = 0;
			let indexCounter: number = 0;
			let currentTargetElement: number[] = [1, 1, 1];
			let currentCoord: number = 1;
			const outputTemplateList: string[] = [];
			const outputList: number[][] = [];
			const nextCoordDict= {0:1, 1:2, 2:0};

			const xUniqueCoordList: number[] = this.sortedUniqueList(poemListRaw, 0)
			const yUniqueCoordList: number[] = this.sortedUniqueList(poemListRaw, 1)
			const zUniqueCoordList: number[] = this.sortedUniqueList(poemListRaw, 2)
			const nextUniqueDict = {0:yUniqueCoordList, 1:zUniqueCoordList, 2:xUniqueCoordList}
			let currentUniqueList: number[] = yUniqueCoordList;

			// Changing the inputList to start from the startingPoem and appending the starting poem to output
			const startingPoemIndex = poemListRaw.indexOf(startingPoem);
			let poemList = poemListRaw.slice(startingPoemIndex).concat(poemListRaw.slice(0, startingPoemIndex));			

			while (successCounter < numOfPoems - 1) {
					let hasTextVar = true;
					currentTargetElement = poemList[indexCounter]
					// Checks if the current poem contains the correct coordinate for a given axis
					// Iterate currentCoord and currentUniqueCoordList
					if (!outputList.includes(currentTargetElement) && currentTargetElement[currentCoord] == currentUniqueList[0]) {
							const currentPoemName = currentTargetElement.join('-') + '.json'
							const poemPath = join(resolve(__dirname, "../../../../../../src/assets/syllabaryPoems"), currentPoemName);
							const poemContent = await this.electronService.readFile(poemPath)
							const poemJson = JSON.parse(poemContent.toString());   
							const contentJson = poemJson['poem'];
							if (contentJson['title'] === null) {
									contentJson['title'] = 'Untitled';
							}
							if (contentJson['text'] === null) {
									hasTextVar = false;
							}
							outputTemplateList.push(`{
							"code": "${currentTargetElement.join('-')}",
							"title": "${contentJson['title']}",
							"text": "${contentJson['text']}",
							"hasText": "${hasTextVar}",
					}`)
							poemList = poemList.slice(indexCounter).concat(poemList.slice(0, indexCounter));
							indexCounter = 0
							currentCoord = nextCoordDict[currentCoord]							
							currentUniqueList = currentUniqueList.slice(1).concat(currentUniqueList.slice(0, 1));
							currentUniqueList = nextUniqueDict[currentCoord]
							const currentUniqueListCoord = currentUniqueList.indexOf(poemList[indexCounter][currentCoord]);
							currentUniqueList = currentUniqueList.slice(currentUniqueListCoord).concat(currentUniqueList.slice(0, currentUniqueListCoord));
							successCounter++;
					}
					indexCounter++;					
			}			
			const zip = new PizZip(docTemplate);
			const doc = new Docxtemplater(zip, {parser: this.parser});
			const finalOutputData = {'poemList': outputTemplateList};
			doc.setData(finalOutputData);
			doc.render()
			const buf = doc.getZip().generate({type: 'nodebuffer'});
			const templatePath = resolve(__dirname, '../../syllabary-poems_' + numOfPoems + '_' + startingPoem.join('-') + '.docx')
			this.electronService.writeFile(templatePath, buf);
}

	email = new FormControl('', [Validators.required, Validators.email]);

	getErrorMessage() {
		if (this.email.hasError('required')) {
			return 'You must enter a value';
		}

		return this.email.hasError('email') ? 'Not a valid email' : '';
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
	
	public _filter(value: string) {
		const filterValue = value.toLowerCase();
		return this.options.filter(option => option.toLowerCase().includes(filterValue));
	}

	
	public angularParser(tag: string) {
		if (tag === '.') {
				return {
						get: function(s: any){ return s;}
				};
		}
		const expr = expressions.compile(
				tag.replace(/(’|‘)/g, "'").replace(/(“|”)/g, '"')
		);
		return {
				get: function(scope: any, context: { scopeList: any; num: any; }) {
						let obj = {};
						const scopeList = context.scopeList;
						const num = context.num;
						for (let i = 0, len = num + 1; i < len; i++) {
								obj = assign(obj, scopeList[i]);
						}
						return expr(scope, obj);
				}
		};
	}
	public parser(tag: string) {
	if (tag === "$pageBreakExceptLast") {
			return {
					get(scope: any, context: { scopePathLength: string | any[]; scopePathItem: string | any[]; }) {
							const totalLength = context.scopePathLength[context.scopePathLength.length - 1];
							const index = context.scopePathItem[context.scopePathItem.length - 1];
							const isLast = index === totalLength - 1;
							if (!isLast) {
									return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
							}
							else {
									return '';
							}
					}
			}
	}
	return this.angularParser(tag);
}
	
		

}



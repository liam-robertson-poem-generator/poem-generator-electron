import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, Validators, FormBuilder, FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { ElectronService } from "../core/services/electron/electron.service";
import { map, startWith } from 'rxjs/operators';
const expressions = require('angular-expressions');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const util = require('util')
import assign from "lodash/assign";
import { readFileSync, writeFileSync } from 'fs';

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
  public poemListRaw: any[];
  public poemList: number[][];
  foods: Food[] = [
    {value: 'steak-0', viewValue: 'Steak'},
    {value: 'pizza-1', viewValue: 'Pizza'},
    {value: 'tacos-2', viewValue: 'Tacos'}
  ];

  constructor(private router: Router, private electronService: ElectronService) {  
  }

  ngOnInit(): void {
    var asyncPoemList = (async () => {
      var poemListRaw = await this.electronService.getFiles();
      return poemListRaw;
    })();
  
    (async () => {
      this.poemListRaw = await asyncPoemList
      console.log(this.poemListRaw);
      this.poemList = this.refinePoemList(this.poemListRaw)
      this.optionsInt = this.sortByMultipleValues(this.poemList)
      this.options = this.optionsInt.map(value => value.join("-").toString())
      this.filteredOptions = this.myControl.valueChanges
      .pipe(
        startWith(''), 
        map(value => this._filter(value))
      );

    })();
    
    

  }

//   public readWritePoems(inputList, startingPoemStr, numOfPoems, poemOrder) {
//     // Initialising startup variables
//     const xUniqueCoordList = this.sortedUniqueList(inputList, 0)
//     const yUniqueCoordList = this.sortedUniqueList(inputList, 1)
//     const zUniqueCoordList = this.sortedUniqueList(inputList, 2)

//     const startingPoem = startingPoemStr.split('-').map(coord => parseInt(coord));
//     let successCounter = 0;
//     let loopCounter = 0;
//     let indexCounter = 0;
//     let outputList = [];
//     let targetElement = [[1], [1], [1]];
//     let currentCoord = 1;
//     let currentUniqueList = yUniqueCoordList;
//     const docTemplate = readFileSync(path.resolve(__dirname, '../../assets/poetry-template.docx'), );
//     const nextCoordDict = {0:1, 1:2, 2:0};
//     const nextUniqueDict = {0:yUniqueCoordList, 1:zUniqueCoordList, 2:xUniqueCoordList}

//     // Sorting input list (2d matrix) by two values. In this case X then Y
//     let inputListSorted = this.sortByMultipleValues(inputList);
//     console.log(inputListSorted);

//     // Changing the inputList to start from the startingPoem and appending the starting poem to output
//     const inputListSortedStr = inputListSorted.map(poemCode => String(poemCode.join('-')));
//     const startingPoemIndex = inputListSortedStr.indexOf(startingPoemStr);
//     let fullySortedPoemList = inputListSorted.slice(startingPoemIndex).concat(inputListSorted.slice(0, startingPoemIndex));

//     while (successCounter < numOfPoems - 1) {
//         let hasTextVar = true;
//         targetElement = fullySortedPoemList[indexCounter]
//         // Checks if the current poem contains the correct coordinate for a given axis
//         // Iterate currentCoord and currentUniqueCoordList
//         if (!outputList.includes(targetElement) && targetElement[currentCoord] == currentUniqueList[0]) {
//             const currentPoemName = targetElement.join('-') + '.json'
//             const poemPath = path.join(__dirname, '../syllabaryPoems', currentPoemName);
//             const poemContent = readFileSync(poemPath);
//             const poemJson = JSON.parse(poemContent);
//             const contentJson = poemJson['poem'];
//             if (contentJson['title'] === null) {
//                 contentJson['title'] = 'Untitled';
//             }
//             if (contentJson['text'] === null) {
//                 hasTextVar = false;
//             }
//             console.log(outputList);
//             outputList.push({
//             code: targetElement.join('-'),
//             title: contentJson['title'],
//             text: contentJson['text'],
//             hasText: hasTextVar,
//         })
//             fullySortedPoemList = fullySortedPoemList.slice(indexCounter).concat(fullySortedPoemList.slice(0, indexCounter));
//             indexCounter = 0
//             currentCoord = nextCoordDict[currentCoord]
//             currentUniqueList = currentUniqueList.slice(1).concat(currentUniqueList.slice(0, 1));
//             currentUniqueList = nextUniqueDict[currentCoord]
//             const currentUniqueListCoord = currentUniqueList.indexOf(fullySortedPoemList[indexCounter][currentCoord]);
//             currentUniqueList = currentUniqueList.slice(currentUniqueListCoord).concat(currentUniqueList.slice(0, currentUniqueListCoord));
//             successCounter++;
//         }
//         indexCounter++;
//     }
//     const zip = new PizZip(docTemplate);
//     const doc = new Docxtemplater(zip, {parser: this.parser});
//     const finalOutputData = {'poemList': outputList};
//     doc.setData(finalOutputData);
//     doc.render()
//     const buf = doc.getZip().generate({type: 'nodebuffer'});
//     writeFileSync(path.resolve(__dirname, '../../syllabary-poems_' + numOfPoems + '_' + startingPoem.join('-') + '.docx'), buf);
//     // location.href = 'confirmationPage.html';
// }


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
    const currentCoordSet= new Set(inputList.map(poemCode => poemCode[coordIndex]));  
    const currentCoordUnique = (Array.from(currentCoordSet));
    
    const finalUniqueList = currentCoordUnique.sort(function(a, b){return a - b});
    return finalUniqueList
  }

  public refinePoemList(inputPoemListRaw: string[]) {
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

  
  public angularParser(tag) {
    if (tag === '.') {
        return {
            get: function(s){ return s;}
        };
    }
    const expr = expressions.compile(
        tag.replace(/(’|‘)/g, "'").replace(/(“|”)/g, '"')
    );
    return {
        get: function(scope, context) {
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
  public parser(tag) {
  if (tag === "$pageBreakExceptLast") {
      return {
          get(scope, context) {
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

function shuffle(array) {
  var currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}


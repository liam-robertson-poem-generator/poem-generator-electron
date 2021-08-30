import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { ElectronService } from "../core/services/electron/electron.service";
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  myControl = new FormControl();
  // options: string[] = ['One', 'Two', 'Three', 'One', 'Two', 'Three', 'One', 'Two', 'Three', 'One', 'Two', 'Three'];
  public optionsInt: number[][];
  public options: string[];
  filteredOptions: Observable<string[]>;
  public poemListRaw: any[];
  public poemList: number[][];

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
  
    

}

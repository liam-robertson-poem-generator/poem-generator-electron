import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {FormControl} from '@angular/forms';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import { ElectronService } from "../core/services/electron/electron.service";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  myControl = new FormControl();
  options: string[] = ['Delhi', 'Mumbai', 'Banglore'];
  filteredOptions: Observable<string[]> | undefined;

  constructor(private router: Router, private electronService: ElectronService) {
    this.electronService.getFiles().then(console.log);
  }

  ngOnInit(): void {
    console.log('HomeComponent INIT');
    this.filteredOptions = this.myControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value))
    );
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.options.filter(option => option.toLowerCase().indexOf(filterValue) === 0);
  }

  // inputPoemList = readdirSync('./syllabaryPoems');
  // inputPoemList = inputPoemList.reduce(function (filtered: any[], currentElement: string) {
  //     if (currentElement.slice(-5) === '.json') {
  //         currentElement = currentElement.slice(0, -5);
  //         filtered.push(currentElement);
  //     }
  //     return filtered
  // }, []);

}

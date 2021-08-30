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
  private poemListRaw;

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
    })();
    
    // Write rest of on initialisation code here
    // Has to be inside of this async function to be able to access get files variable 

  }


}

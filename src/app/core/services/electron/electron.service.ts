import { Injectable } from '@angular/core';

// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import { ipcRenderer, webFrame } from 'electron';
import * as remote from '@electron/remote';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import { resolve } from 'path';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  ipcRenderer: typeof ipcRenderer;
  webFrame: typeof webFrame;
  remote: typeof remote;
  childProcess: typeof childProcess;
  fs: typeof fs;

  get isElectron(): boolean {
    return !!(window && window.process && window.process.type);
  }

  constructor() {
    // Conditional imports
    if (this.isElectron) {
      this.ipcRenderer = window.require('electron').ipcRenderer;
      this.webFrame = window.require('electron').webFrame;

      this.childProcess = window.require('child_process');
      this.fs = window.require('fs');

      // If you want to use a NodeJS 3rd party deps in Renderer process (like @electron/remote),
      // it must be declared in dependencies of both package.json (in root and app folders)
      // If you want to use remote object in renderer process, please set enableRemoteModule to true in main.ts
      this.remote = window.require('@electron/remote');
    }
  }

  async getDirectory(dirPath) {
    return new Promise<string[]>((resolve, reject) => {
      this.ipcRenderer.once("getDirectoryResponse", (event, dirContent) => {
        resolve(dirContent);
      });
      this.ipcRenderer.send("getDirectory", dirPath);
    });
  }

  async readFile(filePath) {
    return new Promise<string[]>((resolve, reject) => {
      this.ipcRenderer.once("readFileResponse", (event, fileContent) => {
        resolve(fileContent);
      });
      this.ipcRenderer.send("readFile", filePath);
    });
  }

  async writeFile(filePath, buf) {
    return new Promise<string[]>((resolve, reject) => {
      this.ipcRenderer.once("writeFileResponse", (event, fileContent) => {
        resolve(fileContent);
      });
      this.ipcRenderer.send("writeFile", filePath, buf);
    });
  }

  // ipcMain.on("writeFile", (event, filePath, buf) => {
  //   const docTemplate = fs.writeFileSync(filePath, buf);
  //   win.webContents.send("writeFileResponse", docTemplate);
  // });

  // async getDocTemplate(numOfPoems, startingPoem, buf) {
  //   return new Promise<string[]>((resolve, reject) => {
  //     this.ipcRenderer.once("getDocTemplateResponse", (event, docTemplate) => {
  //       resolve(docTemplate);
  //     });
  //     this.ipcRenderer.send("getDocTemplate", numOfPoems, startingPoem, buf);
  //   });
  // }
}

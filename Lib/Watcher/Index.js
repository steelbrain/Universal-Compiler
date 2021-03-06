

"use strict";
require('../Compiler/Index');

var
  FS = require('fs'),
  Path = require('path'),
  FSWatcher = require('node-fswatcher'),
  EventEmitter = require('events').EventEmitter,
  Log = require('debug');
Log.enable('uc-watcher');
Log = Log('uc-watcher');
class Watcher extends EventEmitter{
  constructor(Dir, Excluded){
    var Self = this;

    this.Dir = FS.realpathSync(Dir);
    this.ManifestPath = `${Dir}${Path.sep}DeProc.json`;
    this.Watcher = new FSWatcher;
    this.Files = new Map;

    FS.access(this.ManifestPath, FS.R_OK, function(err){
      if(!err){
        // Exists
        FS.readFile(Self.ManifestPath, function(erro, Contents){
          Self.Manifest = JSON.parse(Contents.toString());
          Self.Watch();
        });
      } else {
        // Create New
        UniversalCompiler.H.Manifest(Self.Dir, Excluded || []).then(function(Manifest){
          Self.Manifest = Manifest;
          Self.WriteManifest();
          Self.Watch();
        },function(Error){
          Self.emit('error', Error);
        });
      }
    });

    this.Watcher.on('update', this.OnUpdate.bind(this));
    this.Watcher.on('unlink', this.OnUnlink.bind(this));
  }
  Watch(){
    var
      NumItems = 0,
      NumWatching = 0,
      Key = null,
      Item = null;
    for(Key in this.Manifest.Items.Info){
      if(this.Manifest.Items.Info.hasOwnProperty(Key)){
        Item = this.Manifest.Items.Info[Key];
        ++NumItems;
        if(Item.Config.Watch){
          ++NumWatching;
          this.Watcher.Watch(this.Dir + Path.sep + Key);
        }
        this.Files.set(Key, Item);
      }
    }
    Log(`Watching  ${NumWatching} of ${NumItems} Files`);
    this.emit('init');
  }
  UnWatch(Path){
    this.OnUnlink({Path:Path});
  }
  Close(){
    this.Watcher.Close();
  }
  static Watch(Dir, Callback, Excluded){
    var Inst = new Watcher(Dir, Excluded);
    Inst.once('init', Callback);
    return Inst;
  }
  // -------------------- private stuff
  WriteManifest(){
    FS.writeFile(this.ManifestPath,JSON.stringify(this.Manifest, null, 2));
  }
  OnUnlink(Info){
    if(this.Files.has(Info.Path)){
      this.Files.delete(Info.Path);
      this.Watcher.UnWatch(Info.Path);
      delete this.Manifest.Items.Info[Info.Path];
      this.WriteManifest();
    }
  }
  OnUpdate(Info){
    var LocalPath = Path.relative(this.Dir, Info.Path);
    if(!this.Files.has(LocalPath)) return Log(`'${LocalPath}' isn't the file we were watching`);
    var FileInfo = this.Files.get(LocalPath);
    Log(`'${LocalPath}' was changed, compiling now.`);
    UniversalCompiler.Compile(Info.Path, FileInfo.Config).then(function(FileInfo){
      if(FileInfo.Opts.Output){
        try {
          FS.writeFileSync(FileInfo.Opts.Output, FileInfo.Result);
        } catch(error){
          error = new Error(`Permission denied, can't write output to file '${FileInfo.Opts.Output}'`);
          Log(error.message);
          return this.emit('error', error);
        }
        if(FileInfo.Opts.SourceMap){
          try {
            FS.writeFileSync(FileInfo.Opts.SourceMap, FileInfo.SourceMap);
          } catch(error){
            error = new Error(`Permission denied, can't write sourcemap to file '${FileInfo.Opts.SourceMap}'`);
            Log(error.message);
            return this.emit('error', error);
          }
        }
      } else {
        console.log(FileInfo.Result);
      }
    }.bind(this), function(error){
      Log(error.message);
      this.emit('error',error);
    }.bind(this));
  }
}
module.exports = Watcher;
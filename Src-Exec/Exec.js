#!/usr/bin/env nodejs
// @Compiler-Output "../Built-Bin/Exec.js"


var
  Compiler = require('./../Src/Compiler');
if(!process.argv[2]){
  console.log("Please Specify a source File");
  process.exit(1);
}
Compiler = new Compiler();
Compiler.Compile(process.argv[2],process.argv[3],process.argv[4]).then(function(Result){
  if(!process.argv[3] && Result){
    process.stdout.write(Result.Content);
  }
},function(Error){
  console.log(Error.toString());
  process.exit(1);
});
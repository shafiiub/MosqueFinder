'use strict';

const Fs = require('fs');
const tFs = require('fs');
const Fsw = require('fs');

const fs = require('fs');
const path = require('path');

const async = require("async")

const rPath = './_data/Suburblist.json';
const rTemplate = './_templates/suburb-prayertime.html';
var mTemplate ='';

function mkDirByPathSync(targetDir, opts) {
    const isRelativeToScript = opts && opts.isRelativeToScript;
    const sep = path.sep;
    const initDir = path.isAbsolute(targetDir) ? sep : '';
    const baseDir = isRelativeToScript ? __dirname : '.';
  
    return targetDir.split(sep).reduce((parentDir, childDir) => {
      const curDir = path.resolve(baseDir, parentDir, childDir);
      try {
        fs.mkdirSync(curDir);
        //console.log(`Directory ${curDir} created!`);
      } catch (err) {
        if (err.code === 'EEXIST') { // curDir already exists!
          //console.log(`Directory ${curDir} already exists!`);
          return curDir;
        }
  
        // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows
        if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
          throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
        }
  
        const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
        if (!caughtErr || caughtErr && curDir === path.resolve(targetDir)) {
          throw err; // Throw if it's just the last created dir.
        }
      }
  
      return curDir;
    }, initDir);
  }
  
  var q = async.queue(function(task, callback) {
    //console.log(task.filename);
    /*fs.readFile(task.filename,"utf-8",function (err, data_read) {
            callback(err,task.filename,data_read);
        }
    );*/
    Fsw.writeFile(task.filename, task.data,(err) =>{
      callback(err,task.filename);
    });
}, 4);

//const wPath = './_data/location.html';
//var tfs = require('fs')
tFs.readFile(rTemplate, 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  mTemplate = data;
  if(mTemplate) 
    {
        console.log('Template in memory');
    }else{
        console.log('Template in memory fail');
    };

});

console.log("\n==========START==============\n");
//function readFromFile(rPath){

    Fs.readFile(rPath , 'utf8', (err, json) => {
        if (err){
            console.error(err)
            throw err
        }
        try {
            const data = JSON.parse(json)
            console.log('JSON Loaded')
            for(var id in data) {
                //console.log("key:"+id+", id:"+ data[id].id+", title:"+ data[id].Title);
                var 
                    //dir = __dirname + '/public/'+data[id].url.replace(/\'/ig,'-'),
                    dir =  __dirname + '/public/'+data[id].url.replace(/\'/ig,'-'),
                    wPath = __dirname + '/public/'+data[id].url.replace(/\'/ig,'-')+'/index.html',
                    html = mTemplate;
                    html = html.replace(/{{title}}/g,'Prayer time for ' + data[id].Suburb + ', '+ data[id].State+'-'+data[id].Postcode)
                    .replace(/{{state}}/g, data[id].State.toLowerCase())
                    .replace(/{{suburb}}/g, data[id].Suburb)
                    .replace(/{{postcode}}/g, data[id].Postcode)
                    .replace(/{{latitude}}/g, data[id].Latitude)
                    .replace(/{{longitude}}/g, data[id].Longitude)
                    ; 
                    if (!Fsw.existsSync(dir)){
                        //console.log("create folder:" + dir);
                        //Fsw.mkdirSync(dir);
                        //mkDirByPathSync(dir,{isRelativeToScript: true});
                        mkDirByPathSync(dir);
                    }
                    q.push({filename:wPath, data:html}, function (err,filename) {
                      //console.log(filename + " write");
                      if(err){
                        console.error(err)
                        throw err
                      }
                      //console.log (filename + " write")
                    });
            }
          } catch(err) {
            console.error(err)
          }

          console.log("\n==========END SUBURB Pages==============\n");
        
})

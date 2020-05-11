'use strict';

const Fs = require('fs');
const tFs = require('fs');
const Fsw = require('fs');

const fs = require('fs');
const path = require('path');

const async = require("async")

const rPath = './_data/Suburblist.json';
const rTemplate = './_templates/suburb-prayertime.html';
const rTemplate1 = './_templates/state-listing.html';

var mTemplate ='',lTemplate ='';
var siteMapTemplate= '<?xml version="1.0" encoding="UTF-8"?>\n'+
                     '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n'
                     ;
var nswSitemap='', vicSitemap='', qldSitemap='', ntSitemap='',saSitemap='',waSitemap='', actSitemap='', tasSitemap='';
var nswList='', vicList='', qldList='', ntList='',saList='',waList='', actList='', tasList='';
var html ='';

function mkDirByPathSync(targetDir, opts) {
    const isRelativeToScript = opts && opts.isRelativeToScript;
    const sep = path.sep;
    const initDir = path.isAbsolute(targetDir) ? sep : '';
    const baseDir = isRelativeToScript ? __dirname : '.';
  
    return targetDir.split(sep).reduce((parentDir, childDir) => {
      const curDir = path.resolve(baseDir, parentDir, childDir);
      try {
        fs.mkdirSync(curDir);
        console.log(`Directory ${curDir} created!`);
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
    console.log(task.filename);
    if(task.read){
      Fs.readFile(task.filename,"utf-8",function (err, data_read) {
              callback(err,task.filename,data_read);
          }
      );
    } else{
      Fsw.writeFile(task.filename, task.data,(err) =>{
        callback(err,task.filename);
      });
    }
}, 2);

//const wPath = './_data/location.html';
//var tfs = require('fs')
q.push({filename:rTemplate, read:'yes'}, function (err,filename, data) {
  //console.log(filename + " write");
  if(err){
    console.error(err)
    throw err
  }
  mTemplate = data;
  console.log (filename + " read -" + "length: " + data.length)
});

q.push({filename:rTemplate1, read:'yes'}, function (err,filename, data) {
  //console.log(filename + " write");
  if(err){
    console.error(err)
    throw err
  }
  lTemplate = data;
  console.log (filename + " read -" + "length: " + data.length)
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
                    wPath = __dirname + '/public/'+data[id].url.replace(/\'/ig,'-')+'/index.html';
                    
                    html = mTemplate;
                    html = html.replace(/{{title}}/g,'Prayer time for ' + data[id].Suburb + ', '+ data[id].State+'-'+data[id].Postcode)
                    .replace(/{{state}}/g, data[id].State)
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
                      console.log (filename + " write")
                    });
                    /*Fsw.writeFile(wPath, html,(err) =>{
                        if(err){
                            console.error(err)
                            throw err
                        }
                        console.log ('save data to file')
                    })*/
                    if(/nsw/ig.test(data[id].State)){
                     nswSitemap = nswSitemap + "<url><loc>https://mosque-finder.com.au/"+data[id].url.replace(/\'/ig,'-')+"</loc></url>\n";
                     nswList = nswList + "<li><a href='https://mosque-finder.com.au/"+data[id].url.replace(/\'/ig,'-') +"'>postcode: "+data[id].Postcode +' - Suburb: '+data[id].Suburb+"</a></li>"
                    }else if(/qld/ig.test(data[id].State)){
                      qldSitemap = qldSitemap + "<url><loc>https://mosque-finder.com.au/"+data[id].url.replace(/\'/ig,'-')+"</loc></url>\n";
                      qldList = qldList + "<li><a href='https://mosque-finder.com.au/"+data[id].url.replace(/\'/ig,'-') +"'>postcode: "+data[id].Postcode +' - Suburb: '+data[id].Suburb+"</a></li>"
                    }else if(/vic/ig.test(data[id].State)){
                      vicSitemap = vicSitemap + "<url><loc>https://mosque-finder.com.au/"+data[id].url.replace(/\'/ig,'-')+"</loc></url>\n";
                      vicList = vicList + "<li><a href='https://mosque-finder.com.au/"+data[id].url.replace(/\'/ig,'-') +"'>postcode: "+data[id].Postcode +' - Suburb: '+data[id].Suburb+"</a></li>"
                    }else if(/tas/ig.test(data[id].State)){
                      tasSitemap = tasSitemap + "<url><loc>https://mosque-finder.com.au/"+data[id].url.replace(/\'/ig,'-')+"</loc></url>\n";
                      tasList = tasList + "<li><a href='https://mosque-finder.com.au/"+data[id].url.replace(/\'/ig,'-') +"'>postcode: "+data[id].Postcode +' - Suburb: '+data[id].Suburb+"</a></li>"
                    }else if(/nt/ig.test(data[id].State)){
                      ntSitemap = ntSitemap + "<url><loc>https://mosque-finder.com.au/"+data[id].url.replace(/\'/ig,'-')+"</loc></url>\n";
                      ntList = ntList + "<li><a href='https://mosque-finder.com.au/"+data[id].url.replace(/\'/ig,'-') +"'>postcode: "+data[id].Postcode +' - Suburb: '+data[id].Suburb+"</a></li>"
                    }else if(/wa/ig.test(data[id].State)){
                      waSitemap = waSitemap + "<url><loc>https://mosque-finder.com.au/"+data[id].url.replace(/\'/ig,'-')+"</loc></url>\n";
                      waList = waList + "<li><a href='https://mosque-finder.com.au/"+data[id].url.replace(/\'/ig,'-') +"'>postcode: "+data[id].Postcode +' - Suburb: '+data[id].Suburb+"</a></li>"
                    }else if(/sa/ig.test(data[id].State)){
                      saSitemap = saSitemap + "<url><loc>https://mosque-finder.com.au/"+data[id].url.replace(/\'/ig,'-')+"</loc></url>\n";
                      saList = saList + "<li><a href='https://mosque-finder.com.au/"+data[id].url.replace(/\'/ig,'-') +"'>postcode: "+data[id].Postcode +' - Suburb: '+data[id].Suburb+"</a></li>"
                    }else if(/act/ig.test(data[id].State)){
                      actSitemap = actSitemap + "<url><loc>https://mosque-finder.com.au/"+data[id].url.replace(/\'/ig,'-')+"</loc></url>\n";
                      actList = actList + "<li><a href='https://mosque-finder.com.au/"+data[id].url.replace(/\'/ig,'-') +"'>postcode: "+data[id].Postcode +' - Suburb: '+data[id].Suburb+"</a></li>"
                    }

            }
            q.push({ filename: __dirname +'/public/nsw/sitemap.xml', data:siteMapTemplate+nswSitemap }, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });
            q.push({ filename: __dirname +'/public/vic/sitemap.xml', data:siteMapTemplate+vicSitemap }, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });
            q.push({ filename: __dirname +'/public/qld/sitemap.xml', data:siteMapTemplate+qldSitemap }, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });
            q.push({ filename: __dirname +'/public/tas/sitemap.xml', data:siteMapTemplate+tasSitemap }, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });
            q.push({ filename: __dirname +'/public/act/sitemap.xml', data:siteMapTemplate+actSitemap }, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });
            q.push({ filename: __dirname +'/public/sa/sitemap.xml', data:siteMapTemplate+saSitemap }, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });
            q.push({ filename: __dirname +'/public/wa/sitemap.xml', data:siteMapTemplate+waSitemap }, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });
            q.push({ filename: __dirname +'/public/nt/sitemap.xml', data:siteMapTemplate+ntSitemap }, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });

            html = lTemplate;
            html = html.replace(/{{title}}/g, 'NSW Postcode and Suburb list')
            .replace(/{{state}}/g, 'nsw')
            .replace(/{{statelist}}/g, '<ul class="bullets">'+ nswList+'</ul>')      
            ;

            q.push({ filename: __dirname +'/public/nsw/postcode.html', data:html}, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });
            
            html = lTemplate;
            html = html.replace(/{{title}}/g, 'VIC Postcode and Suburb list')
            .replace(/{{state}}/g, 'vic')
            .replace(/{{statelist}}/g, '<ul class="bullets">'+ vicList+ '</ul>')      
            ;

            q.push({ filename: __dirname +'/public/vic/postcode.html', data:html}, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });

            html = lTemplate;
            html = html.replace(/{{title}}/g, 'QLD Postcode and Suburb list')
            .replace(/{{state}}/g, 'qld')
            .replace(/{{statelist}}/g, '<ul class="bullets">'+ qldList+ '</ul>')      
            ;

            q.push({ filename: __dirname +'/public/qld/postcode.html', data:html}, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });
            html = lTemplate;
            html = html.replace(/{{title}}/g, 'TAS Postcode and Suburb list')
            .replace(/{{state}}/g, 'tas')
            .replace(/{{statelist}}/g, '<ul class="bullets">'+ tasList+ '</ul>')      
            ;

            q.push({ filename: __dirname +'/public/tas/postcode.html', data:html}, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });

            html = lTemplate;
            html = html.replace(/{{title}}/g, 'ACT Postcode and Suburb list')
            .replace(/{{state}}/g, 'act')
            .replace(/{{statelist}}/g, '<ul class="bullets">'+ actList+ '</ul>')      
            ;

            q.push({ filename: __dirname +'/public/act/postcode.html', data:html}, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });
            html = lTemplate;
            html = html.replace(/{{title}}/g, 'NT Postcode and Suburb list')
            .replace(/{{state}}/g, 'nt')
            .replace(/{{statelist}}/g, '<ul class="bullets">'+ ntList+ '</ul>')      
            ;

            q.push({ filename: __dirname +'/public/nt/postcode.html', data:html}, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });

            html = lTemplate;
            html = html.replace(/{{title}}/g, 'SA Postcode and Suburb list')
            .replace(/{{state}}/g, 'sa')
            .replace(/{{statelist}}/g, saList)      
            ;

            q.push({ filename: __dirname +'/public/sa/postcode.html', data:html}, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });
            html = lTemplate;
            html = html.replace(/{{title}}/g, 'WA Postcode and Suburb list')
            .replace(/{{state}}/g, 'wa')
            .replace(/{{statelist}}/g, waList)      
            ;

            q.push({ filename: __dirname +'/public/wa/postcode.html', data:html}, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });

          } catch(err) {
            console.error(err)
          }

          console.log("\n==========index files==============\n");
          
        
})
//}

/*function writeToFile(data, wPath){
    const json =JSON.stringify(data, null, 2)
    Fs.writeFile(wPath, json,(err) =>{
        if(err){
            console.error(err)
            throw err
        }
        console.log ('save data to file')
    })
}*/
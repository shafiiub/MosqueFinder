'use strict';

const Fs = require('fs');
const tFs = require('fs');
const Fsw = require('fs');

const fs = require('fs');
const path = require('path');

const async = require("async")

const rPath = './_data/mosque_json.json';
const rTemplate = './_templates/mosque-detail.html';
var siteMapTemplate= '<?xml version="1.0" encoding="UTF-8"?>\n'+
                     '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n'
                     ;

var mTemplate ='';
var data = '';

var Sitemap='';


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

/*tFs.readFile(rTemplate, 'utf8', function (err,data) {
  if (err) {
    return console.log('Template file error:'+err);
  }
  mTemplate = data;
  if(mTemplate) 
    {
        console.log('Template in memory:' + mTemplate.length);
    }else{
        console.log('Template in memory fail');
    };

});*/

//console.log("template:"+mTemplate.length);

q.push({filename:rPath, read:'yes'}, function (err,filename, json) {
  //console.log(filename + " write");
  if(err){
    console.error(err)
    throw err
  }
  data = JSON.parse(json);
  console.log (filename + " Json -" + "length: " + json.length)

console.log("\n==========START loadMosqueDetails.js==============\n");
//function readFromFile(rPath){

try {
    //const data = JSON.parse(json)
    //console.log('JSON Loaded')
    for(var id in data) {
        //console.log("key:"+id+", id:"+ data[id].id+", title:"+ data[id].Title);
        var 
            //dir = __dirname + '/public/'+data[id].url.replace(/\'/ig,'-'),
            dir =  __dirname + '/public/mosque/'+data[id].URLSegment,
            wPath = __dirname + '/public/mosque/'+data[id].URLSegment+'/index.html',
            html = mTemplate;
            var gallery = '', thumbs='', features='', jummahLoc='', jummahAddress='';
            if (data[id].gallery && data[id].gallery.length > 0){
              for (var x=0; x<data[id].gallery.length; x++){
                gallery = gallery + '<div class="slide"><img src="'+data[id].gallery[x]+'" data-hash="'+(x+1)+'" alt=""></div>'
                thumbs = thumbs + '<a href="#'+(x+1)+'" id="thumbnail-'+(x+1)+'" class="'+(x==0?'active':'')+'"><img src="'+data[id].gallery[x]+'" alt=""></a>'
              }
            }else{
              gallery ='<div class="slide"><img src="/assets/img/items/1.jpg" data-hash="1" alt=""></div>'
              thumbs = '<a href="#1" id="thumbnail-1" class="active"><img src="/assets/img/items/1.jpg" alt=""></a>'
            }

            if (data[id].features && data[id].features.length > 0){
              for (var x=0; x<data[id].features.length; x++){
                features = features +  '<li>'+data[id].features[x]+'</li>';
              }
            }
            if(data[id].JummahLocation =="1"){
              jummahLoc =  '<article class="block"><header><h2>Jummah location details</h2></header>' +
                            '<p>'+ data[id].JummahDescription+ '</p>'+
                            '<ul class="bullets"><li>Jummah salat Time: '+data[id].JummahTime +'</li>'+
                            '<li>Jummah Address: '+data[id].JummahAddress +'</li>'+
                            '</ul>'+
                            '</article>';
              jummahAddress = '<section><header><h3>Jummah Address</h3></header><address><div>'+data[id].JummahAddress+'</div><figure><div class="info">Jummah salat Time: <span>'+data[id].JummahTime+'</span></div></figure></address></section>';
            }
            html = html.replace(/{{title}}/g, data[id].Title)
            .replace(/{{address}}/g, data[id].Address)
            .replace(/{{state}}/g, data[id].State)
            .replace(/{{suburb}}/g, data[id].Suburb)
            .replace(/{{postcode}}/g, data[id].Postcode)
            .replace(/{{latitude}}/g, data[id].Latitude)
            .replace(/{{longitude}}/g, data[id].Longitude)
            .replace(/{{category}}/g, data[id].ListingType)
            .replace(/{{content}}/g, data[id].Content)
            .replace(/{{jummah}}/g, data[id].JummahDescription? '<section><header><h3>Jummah Time</h3></header><figure><div class="expandable-content collapsed show-60" id="detail-sidebar-event"><div class="content">'+data[id].JummahDescription+'</div></div><a href="#" class="show-more expand-content" data-expand="#detail-sidebar-event" >Show More</a></figure></section>':'')
            .replace(/{{phone}}/g, data[id].Phone? '<div class="info"><i class="fa fa-mobile"></i><span>'+data[id].Phone+'</span></div>':'')
            .replace(/{{website}}/g, data[id].Website? '<div class="info"><i class="fa fa-globe"></i><a href="'+data[id].Website+'" target="_blank">'+data[id].Website+'</a></div>':'')
            .replace(/{{email}}/g, data[id].Email?'<div class="info"><i class="fa fa-email"></i><span>'+data[id].Email.replace('@','[at]')+'</span></div>':'')
            .replace(/{{gallery}}/g, gallery)
            .replace(/{{thumbs}}/g, thumbs)
            .replace(/{{features}}/g, features)
            .replace(/{{jummahloc}}/g, jummahLoc)
            .replace(/{{jummahOther}}/g, jummahAddress)
                       
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
            Sitemap = Sitemap + "<url><loc>https://mosque-finder.com.au/mosque/"+data[id].URLSegment+"</loc></url>\n";
               
      
    }

    q.push({ filename: __dirname +'/public/mosque/sitemap.xml', data:siteMapTemplate+Sitemap }, function (err,filename) {
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
});
          console.log("\n==========END loadMosqueDetails.js==============\n");

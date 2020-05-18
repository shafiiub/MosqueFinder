'use strict';

const Fs = require('fs');
const tFs = require('fs');
const Fsw = require('fs');

const fs = require('fs');
const path = require('path');

const async = require("async")

const rPath = './_data/mosque_json.json';
const rTemplate = './_templates/state-listing.html';
var mTemplate ='';
var data = '';

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

console.log("template:"+mTemplate.length);

q.push({filename:rPath, read:'yes'}, function (err,filename, json) {
  //console.log(filename + " write");
  if(err){
    console.error(err)
    throw err
  }
  data = JSON.parse(json);
  console.log (filename + " Json -" + "length: " + json.length)

console.log("\n==========START loadStateList.js==============\n");
//function readFromFile(rPath){
var item ='', nswItem = '',vicItem = '',qldItem = '',actItem = '',tasItem = '',saItem = '',waItem = '',ntItem = '';
var html ='';
try {
    //const data = JSON.parse(json)
    //console.log('JSON Loaded')
    for(var id in data) {
        //console.log("key:"+id+", id:"+ data[id].id+", title:"+ data[id].Title);

        var 
            //dir = __dirname + '/public/'+data[id].url.replace(/\'/ig,'-'),
            dir =  __dirname + '/public/mosque/'+data[id].URLSegment,
            wPath = __dirname + '/public/mosque/'+data[id].URLSegment+'/index.html',
            gallery = '', thumbs='', features='', jummahLoc='', jummahAddress='', img='';

            if (data[id].gallery && data[id].gallery.length > 0){
              /*for (var x=0; x<data[id].gallery.length; x++){
                gallery = gallery + '<div class="slide"><img src="'+data[id].gallery[x]+'" data-hash="'+(x+1)+'" alt=""></div>'
                thumbs = thumbs + '<a href="#'+(x+1)+'" id="thumbnail-'+(x+1)+'" class="'+(x==0?'active':'')+'"><img src="'+data[id].gallery[x]+'" alt=""></a>'
              }*/
              img = "<img src='"+data[id].gallery[0]+"' alt=''></img>";
            }else{
              /*gallery ='<div class="slide"><img src="/assets/img/items/1.jpg" data-hash="1" alt=""></div>'
              thumbs = '<a href="#1" id="thumbnail-1" class="active"><img src="/assets/img/items/1.jpg" alt=""></a>'*/
              img = '<img src="/assets/img/items/1.jpg" alt="">'
            }

            /*if (data[id].features && data[id].features.length > 0){
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
            }*/
             
            item = '<div class="col-md-3 col-sm-4">'+
                          '<div class="item ">'+
                              '<div class="image">'+
                                  '<div class="quick-view" data-toggle="modal" data-target="#modal-bar"><i class="fa fa-eye"></i><span>Quick View</span></div>'+
                                  '<a href="/mosque/'+data[id].URLSegment+'/index.html">'+
                                      '<div class="overlay">'+
                                          '<div class="inner">'+
                                              '<div class="content">'+
                                                  '<h4>Description</h4>'+
                                                  '<p>'+data[id].Teaser+'</p>'+
                                              '</div>'+
                                          '</div>'+
                                      '</div>'+
                                      img +
                                  '</a>'+
                              '</div>'+
                              '<div class="wrapper">'+
                                  '<a href="/mosque/'+data[id].URLSegment+'/index.html"><h3>'+data[id].URLSegment+'</h3></a>'+
                                  '<figure>'+data[id].Address+', '+data[id].Suburb+'</figure>'+
                                  '<div class="info">'+
                                      '<div class="type">'+
                                          '<i><img src="/assets/icons/tourism/cult-religion/mosquee.png" alt=""></i>'+
                                          '<span>'+data[id].ListingType+'</span>'+
                                      '</div>'+
                                  '</div>'+
                              '</div>'+
                          '</div>'+
                      '</div>';
            if(/nsw/ig.test(data[id].State)){
              nswItem = nswItem + item;
            } else if(/vic/ig.test(data[id].State)){
              vicItem = vicItem + item;
            }else if(/qld/ig.test(data[id].State)){
              qldItem = qldItem + item;
            }else if(/act/ig.test(data[id].State)){
              actItem = actItem + item;
            }else if(/tas/ig.test(data[id].State)){
              tasItem = tasItem + item;
            }else if(/sa/ig.test(data[id].State)){
              saItem = saItem + item;
            }else if(/nt/ig.test(data[id].State)){
              ntItem = ntItem + item;
            }else if(/wa/ig.test(data[id].State)){
              waItem = waItem + item;
            }

          }

          

            if (!Fsw.existsSync(dir)){
                //console.log("create folder:" + dir);
                //Fsw.mkdirSync(dir);
                //mkDirByPathSync(dir,{isRelativeToScript: true});
                mkDirByPathSync(dir);
            }
            html = mTemplate;
            html = html.replace(/{{title}}/g, 'NSW Prayer location')
            .replace(/{{state}}/g, 'nsw')
            .replace(/{{statelist}}/g, nswItem)
                       
            ;
            q.push({filename:__dirname + '/public/nsw/index.html', data:html}, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });
            html = mTemplate;
            html = html.replace(/{{title}}/g, 'VIC Prayer location')
            .replace(/{{state}}/g, 'vic')
            .replace(/{{statelist}}/g, vicItem)      
            ;
            q.push({filename:__dirname + '/public/vic/index.html', data:html}, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });
            html = mTemplate;
            html = html.replace(/{{title}}/g, 'QLD Prayer location')
            .replace(/{{state}}/g, 'qld')
            .replace(/{{statelist}}/g, qldItem)      
            ;
            q.push({filename:__dirname + '/public/qld/index.html', data:html}, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });
            html = mTemplate;
            html = html.replace(/{{title}}/g, 'ACT Prayer location')
            .replace(/{{state}}/g, 'act')
            .replace(/{{statelist}}/g, actItem)      
            ;
            q.push({filename:__dirname + '/public/act/index.html', data:html}, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });
            html = mTemplate;
            html = html.replace(/{{title}}/g, 'TAS Prayer location')
            .replace(/{{state}}/g, 'tas')
            .replace(/{{statelist}}/g, tasItem)      
            ;
            q.push({filename:__dirname + '/public/tas/index.html', data:html}, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });
            html = mTemplate;
            html = html.replace(/{{title}}/g, 'WA Prayer location')
            .replace(/{{state}}/g, 'wa')
            .replace(/{{statelist}}/g, waItem)      
            ;
            q.push({filename:__dirname + '/public/wa/index.html', data:html}, function (err,filename) {
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });
            html = mTemplate;
            html = html.replace(/{{title}}/g, 'NT Prayer location')
            .replace(/{{state}}/g, 'nt')
            .replace(/{{statelist}}/g, ntItem)      
            ;
            q.push({filename:__dirname + '/public/nt/index.html', data:html}, function (err,filename) {
            
              //console.log(filename + " write");
              if(err){
                console.error(err)
                throw err
              }
              console.log (filename + " write")
            });
            html = mTemplate;
            html = html.replace(/{{title}}/g, 'SA Prayer location')
            .replace(/{{state}}/g, 'sa')
            .replace(/{{statelist}}/g, saItem)      
            ;
            q.push({filename:__dirname + '/public/sa/index.html', data:html}, function (err,filename) {
            
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
          console.log("\n==========END loadStateList.js==============\n");

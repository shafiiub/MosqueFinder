'use strict';

const Fs = require('fs')
const Fsw = require('fs')

const rPath = './_data1/location.json';
//const wPath = './_data/location.html';
console.log("START")
//function readFromFile(rPath){

    Fs.readFile(rPath , 'utf8', (err, json) => {
        if (err){
            console.error(err)
            throw err
        }
        try {
            const data = JSON.parse(json)
            //console.log(data)
            for(var id in data) {
                //console.log("key:"+id+", id:"+ data[id].id+", title:"+ data[id].Title);
                var 
                    dir = __dirname + '/_posts/'+data[id].State.toLowerCase(),
                    wPath = __dirname + '/_posts/'+data[id].State.toLowerCase() +'/2019-09-20-'+data[id].URLSegment.toLowerCase()+'.md',
                    markDown = '---\n' +
                        'layout: page\n' +
                        'author: abu\n'+
                        'title: "' + data[id].Title +'"\n'+
                        'categories: [ ' + data[id].ListingType +', '+ data[id].State +' ]\n'+
                        'location: \n'+
                        '   latitude: ' + data[id].Latitude +'\n'+
                        '   latitude: ' + data[id].Longitude +'\n'+
                        'permalink: "' + '/'+data[id].State.toLowerCase() +'/'+data[id].URLSegment.toLowerCase()+'"/\n'+
                        'tag: [ ' + data[id].ListingType +'-'+ data[id].Suburb +' ]\n'+
                        'description: "' + data[id].Teaser +'"\n'+
                        '---\n' +
                        data[id].Content +'\n';
                    if (!Fsw.existsSync(dir)){
                        //console.log("create folder:" + dir);
                        Fsw.mkdirSync(dir);
                    }
                    
                    Fsw.writeFile(wPath, markDown,(err) =>{
                        if(err){
                            console.error(err)
                            throw err
                        }
                        console.log ('save data to file')
                    })
            }
            
          } catch(err) {
            console.error(err)
          }
        
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
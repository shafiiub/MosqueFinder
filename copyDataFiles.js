const fs = require("fs")
 
var pathToFile = __dirname + "/_data/Suburblist.json";
var pathToNewDestination = __dirname+"/public/assets/json/Suburblist.json";
 
try {
  fs.copyFileSync(pathToFile, pathToNewDestination)
  console.log("Successfully copied and moved the file!")
} catch(err) {
  throw err
}

pathToFile = __dirname + "/_data/mosque_json.json";
pathToNewDestination = __dirname+"/public/assets/json/mosque_json.json";
 
try {
  fs.copyFileSync(pathToFile, pathToNewDestination)
  console.log("Successfully copied and moved the file!")
} catch(err) {
  throw err
}

pathToFile = __dirname + "/_data/mosque_home.json";
pathToNewDestination = __dirname+"/public/assets/json/mosque_home.json";
 
try {
  fs.copyFileSync(pathToFile, pathToNewDestination)
  console.log("Successfully copied and moved the file!")
} catch(err) {
  throw err
}
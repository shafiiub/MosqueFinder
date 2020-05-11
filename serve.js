var express = require('express');
var app = express();

//setting middleware
app.use(express.static(__dirname+'/public' )); //Serves resources from public folder
console.log('server running on http://localhost:5000/')

var server = app.listen(5000);

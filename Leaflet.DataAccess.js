/**
 * @file Leaflet Data Access
 * @author Daniel Binsfeld <binsf024@umn.edu>
 * @version 1.0.0
 */
/**
 * @constructor
 * @param {object} Lt   // LTreering from Leaflet-treeing.js
 */
function createMockData1(yearStart = 1800, yearEnd = 2020, widthMin = 0.05, widthMax = 5) {
    let jsonOut = [];

    let nrows = yearEnd - yearStart + 1;
    for (i = 0; i < nrows; i++) {
        let width = Math.random() * (widthMax - widthMin) + widthMin;

        let newPointObj = {
            "year": yearStart + i,
            "ew_width": width * (1/3), 
            "lw_width": width * (2/3),
            "width": width, 
        }

        jsonOut.push(newPointObj);
    }

    return jsonOut;
}

function DataAccessInterface(Lt){
    this.treering = Lt; // assign thie given leaflet treering data to this.treering
    console.log("Data Access");
    this.dataAccessDialog = new DataAccessDialog(this); // create new dialog, linking dialog with interface
}
function DataAccessDialog(Inte){
    var window_ele = document.getElementById("DataAccess-Window-ID");
    var table_ele = document.getElementById("DataAccess-Table-ID");
    var html = table_ele.innerHTML;
    var tableTemplate = Handlebars.compile(html);
    var content = tableTemplate({
        "initialData" : 
        {tw: {x:[], y:[]},
        ew:{x:[], y: []}, 
        lw: {x:[], y:[]}
        }
    });
    document.getElementById("DataAccess-Table").innerHTML = content;
    this.dialog = L.control.dialog({
        "size": [400, 250],
        "anchor": [50, 0],
        "initOpen": true,
        'position': 'topleft',
        "maxSize": [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
        'minSize': [0, 0]
}).setContent(window_ele).addTo(Inte.treering.viewer);
}


// dialogue class
// different functions for the varying onclick events
    // popout 
    // download
    // upload/saving
    // dialog
function createMockData(yearStart = 1800, yearEnd = 2020, widthMin = 0.05, widthMax = 50) {
    let x = [];
    let yTW = [];
    let yEW = [];
    let yLW = [];

    let nrows = yearEnd - yearStart + 1;
    for (i = 0; i < nrows; i++) {
        let width = Math.random() * (widthMax - widthMin) + widthMin;

        x.push(yearStart + i);
        yTW.push(width);
        yEW.push(width * (1/3));
        yLW.push(width * (2/3));
    }

    let jsonTW = {
        "x": x,
        "y": yTW,
    }
    let jsonEW = {
        "x": x,
        "y": yEW,
    }
    let jsonLW = {
        "x": x,
        "y": yLW,
    }

    return {
        "tw": jsonTW,
        "ew": jsonEW,
        "lw": jsonLW
    };
}

// Handlebars.registerHelper('decimalFixed', function(decimal) {
//     if(decimal){
//         return Math.round(decimal * 1000) / 1000;
//     }
//     return "";
//     });
Handlebars.registerHelper('decimalFixed', function(decimal) {
    // console.log(decimal, typeof(decimal));
    if(decimal){
        decimal = decimal.toString()
        var dec_idx = decimal.indexOf('.');
        var rounded = decimal.slice(0,dec_idx+4);
        return rounded;
    }
    return typeof(decimal);
});

// var initialData = createMockData()
// console.log(initialData);
// var element = document.getElementById("DataAccess-Table-ID")
// var html = element.innerHTML;
// var tableTemplate = Handlebars.compile(html);
// console.log(html);

// var content = tableTemplate({"initialData" : initialData});
// console.log(content);

// var parentDocument = document.getElementById("DataAccess-Table");
// parentDocument.innerHTML = content;

// var insert_chart = document.getElementById("insert_chart")
// insert_chart.addEventListener("click", () => {
//     console.log("insert_chart was clicked");
// });

// var new_window = document.getElementById("new_window")
// new_window.addEventListener("click" ,() =>{
//     console.log("new-window was clicked");
// });

// var new_window = document.getElementById("upload_file")
// new_window.addEventListener("click" ,() =>{
//     console.log("upload_file was clicked");
// });
// var new_window = document.getElementById("cloud_upload")
// new_window.addEventListener("click" ,() =>{
//     console.log("cloud_upload was clicked");
// });
// var new_window = document.getElementById("delete")
// new_window.addEventListener("click" ,() =>{
//     console.log("delete was clicked");
// });
// var new_window = document.getElementById("copy")
// new_window.addEventListener("click" ,() =>{
//     console.log("copy was clicked");
// });
// var new_window = document.getElementById("csv")
// new_window.addEventListener("click" ,() =>{
//     console.log("csv was clicked");
// });
// var new_window = document.getElementById("tsv")
// new_window.addEventListener("click" ,() =>{
//     console.log("tsv was clicked");
// });
// var new_window = document.getElementById("rwl")
// new_window.addEventListener("click" ,() =>{
//     console.log("rwl was clicked");
// });
// var new_window = document.getElementById("json")
// new_window.addEventListener("click" ,() =>{
//     console.log("json was clicked");
// });


// Find distances from leaflet-treering has a find disance prototype that 
// I can reference for the data formatting

/**
 * @file Leaflet Data Access
 * @author Daniel Binsfeld <binsf024@umn.edu>
 * @version 1.0.0
 */

/**
 * @constructor
 * @param {object} Lt   // LTreering from Leaflet-treeing.js
 */

/** 
 * Temporary Function used for testing data window without full codebase integration. 
 * @function
 */
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

/**  
 * Interface for data access tools. Coexists with preexisting download types and tools
 * @fconstructor
 * 
 *  @param {object} Lt   // LTreering from Leaflet-treeing.js
*/
function DataAccessInterface(Lt){
    this.treering = Lt; // assign thie given leaflet treering data to this.treering
    console.log("Data Access");
    this.dataAccessDialog = new DataAccessDialog(this); // create new dialog, linking dialog with interface
}
/** 
 * Generates dialog window to view given data points
 * @constructor
 * 
 *  @param {object} Inte   // DataAccessInterface objects. Allows access to dataaccess tools
*/
function DataAccessDialog(Inte){
    var window_ele = document.getElementById("DataAccess-Window-ID");
    var table_ele = document.getElementById("DataAccess-Table-ID");
    var html = table_ele.innerHTML;
    var tableTemplate = Handlebars.compile(html);
    var data = Inte.treering.helper.findDistances();
    var content = tableTemplate({
        "initialData" : data
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
    
    // this.createEventListeners();
    DataAccessDialog.prototype.createEventListeners = function () {
        $("#insert_chart").on("click", () => {
            console.log("Insert Chart Click");
        });
        $("#new_window").on("click", () => {
            console.log("New Window CLick");
        });
        $("#upload_file").on("click", () => {
            console.log("Upload File CLick");
        });
        $("#cloud_upload").on("click", () => {
            console.log("Cloud Upload CLick");
        });
        $("#delete").on("click", () => {
            console.log("Delete CLick");
        });
        $("#copy").on("click",() => {
            console.log("Copy Click");
        });
        $("#csv").on("click", () => {
            console.log("CSV CLick");
        });
        $("#tsv").on("click", () => {
            console.log("CSV CLick");
        });
        $("#rwl").on("click", () => {
            console.log("CSV CLick");
        });
        $("#json").on("click", () => {
            console.log("CSV CLick");
        });
    }
        // Inte.createEventListeners();
}


// dialogue class
// different functions for the varying onclick events
    // popout 
    // download
    // upload/saving
    // dialog


/**
 * Helper function to round to a fixed decimal place
 * @function
 */
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




// Find distances from leaflet-treering has a find disance prototype that 
// I can reference for the data formatting


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

var initialData = createMockData()
// console.log(initialData);
var element = document.getElementById("DataAccess-Table-ID")
var html = element.innerHTML;
var tableTemplate = Handlebars.compile(html);
// console.log(html);

var content = tableTemplate({"initialData" : initialData});
// console.log(content);

var parentDocument = document.getElementById("DataAccess-Table");
parentDocument.innerHTML = content;

// Find distances from leaflet-treering has a find disance prototype that 
// I can reference for the data formatting

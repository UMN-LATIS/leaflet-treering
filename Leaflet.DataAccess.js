function createMockData(yearStart = 1800, yearEnd = 2020, widthMin = 0.05, widthMax = 5) {
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

var initialData = createMockData()
console.log(initialData);
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
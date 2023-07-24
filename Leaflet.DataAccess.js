/**
 * @file Leaflet Data Access
 * @author Daniel Binsfeld <binsf024@umn.edu>
 * @version 1.0.0
 */

/**
 * Interface for data access tools. 
 * @constructor
 * 
 * @param {object} Lt - LTreering object from leaflet-treering.js. 
 */
function DataAccessInterface(Lt) {
    this.treering = Lt;
    this.viewData = new ViewData(this);
    this.viewDataDialog = new ViewDataDialog(this);

    console.log("DataAccessInterface loaded.");
}

/**
 * Tool for viewing data. 
 * @constructor
 * 
 * @param {object} Inte - DataAccessInterface objects. Allows access to DataAccess tools.
 */
function ViewData(Inte) {
    this.btn = new Button (
        'view_list',
        'View & download measurement data',
        () => { this.enable() },
        () => { this.disable() })
    
    ViewData.prototype.enable = function() {
        this.btn.state('active');
        Inte.viewDataDialog.open();
    }

    ViewData.prototype.disable = function() {
        this.btn.state('inactive');
        Inte.viewDataDialog.close();
    }
}

/** 
 * Generates dialog window to view data. 
 * @constructor
 * 
 * @param {object} Inte - DataAccessInterface objects. Allows access to DataAccess tools.
*/
function ViewDataDialog(Inte) {
    Handlebars.registerHelper('numToFourDigits', function(decimal) {
        if (decimal) {
            decimal = decimal.toString() + "0000"; // Add zeroes for already truncated values (i.e. 0.3 -> 0.300).
            let dec_idx = decimal.indexOf('.');
            let rounded = decimal.slice(0, dec_idx + 4);
            return rounded;
        }
        
        console.log("Error: ", typeof(decimal));
    });

    let html = document.getElementById("DataAccess-dialog-template").innerHTML;
    this.template = Handlebars.compile(html);
      
    this.dialog = L.control.dialog({
        "size": [0, 0],
        "anchor": [50, 0],
        "initOpen": false,
        'position': 'topleft',
        "maxSize": [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
        "minSize": [0, 0],
    }).addTo(Inte.treering.viewer);
    this.dialog.hideResize();

    /**
     * Opens dialog window.
     * @function
     */
    ViewDataDialog.prototype.open = function() { 
        let dat = Inte.treering.helper.findDistances();
        let content = this.template({
            data: dat,
        });

        let size = dat?.ew ? [290, 220] : [220, 220];
        
        this.dialog.setContent(content);
        this.dialog.setSize(size);
        this.dialog.open();
        this.createEventListeners();
    }

    /**
     * Opens dialog window.
     * @function
     */
    ViewDataDialog.prototype.close = function() {
        this.dialog.close();
    }
    
    /**
     * Creates all event listeners for HTML elements in dialog window. 
     * @function
     */
    ViewDataDialog.prototype.createEventListeners = function () {
        $("#insert_chart").on("click", () => {
            console.log("Insert Chart Click");
        });

        $("#new_window").on("click", () => {
            console.log("New Window Click");
        });

        $("#upload_file").on("click", () => {
            console.log("Upload File Click");
        });

        $("#cloud_upload").on("click", () => {
            console.log("Cloud Upload Click");
        });

        $("#delete").on("click", () => {
            console.log("Delete Click");
        });

        $("#copy").on("click",() => {
            console.log("Copy Click");
        });

        $("#csv").on("click", () => {
            console.log("CSV Click");
        });

        $("#tsv").on("click", () => {
            console.log("TSV Click");
        });

        $("#rwl").on("click", () => {
            console.log("RWL Click");
        });

        $("#json").on("click", () => {
            console.log("JSON Click");
        });
    }
}




/**
 * @file Leaflet Data Access
 * @author Daniel Binsfeld <binsf024@umn.edu> & Jessica Thorne <thorn572@umn.edu>
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

    this.popoutPlots = new PopoutPlots(this);
    this.jsonFileUpload = new JSONFileUpload(this);
    this.cloudUpload = new CloudUpload(this);
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

    $(this.dialog._map).on('dialog:closed', (dialog) => { Inte.viewData.btn.state('inactive') });

    /**
     * Opens dialog window.
     * @function
     */
    ViewDataDialog.prototype.open = function() { 
        let dat = Inte.treering.helper.findDistances();
        let content = this.template({
            data: dat,
            savePermissions: Inte.treering.meta.savePermission,
        });

        let size = dat?.ew ? [290, 220] : [220, 220];
        
        this.dialog.setContent(content);
        this.dialog.setSize(size);
        this.dialog.open();
        this.createEventListeners();
    }

    /**
     * Closes dialog window.
     * @function
     */
    ViewDataDialog.prototype.close = function() {
        this.dialog.close();
    }
    
    /**
     * Reloads dialog window.
     * @function
     */
    ViewDataDialog.prototype.reload = function() {
        let dat = Inte.treering.helper.findDistances();
        let content = this.template({
            data: dat,
            savePermissions: Inte.treering.meta.savePermission,
        });
        
        this.dialog.setContent(content);
        this.dialog.open();
        this.createEventListeners();
    }
    
    /**
     * Creates all event listeners for HTML elements in dialog window. 
     * @function
     */
    ViewDataDialog.prototype.createEventListeners = function () {
        $("#insert_chart").on("click", () => {
            Inte.popoutPlots.action();
        });

        $("#new_window").on("click", () => {
            console.log("New Window Click");
        });

        $("#upload_file").on("click", () => {
            Inte.jsonFileUpload.input();
        });

        $("#cloud_upload").on("click", () => {
            Inte.cloudUpload.action();
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

/** 
 * A popout window with time series plots.
 * @constructor
 * @param {object} Inte - DataAccessInterface objects. Allows access to DataAccess tools.
 */
function PopoutPlots(Inte) {
    var height = (4/9) * screen.height;
    var top = (2/3) * screen.height;
    var width = screen.width;
    this.childSite = null
    this.win = null
    
    PopoutPlots.prototype.action = function() {
        //this.childSite = 'http://localhost:8080/dendro-plots/'
        this.childSite = 'https://umn-latis.github.io/dendro-plots/'
        this.win = window.open(this.childSite, 'popout' + Math.round(Math.random()*10000),
                    'location=yes,height=' + height + ',width=' + width + ',scrollbars=yes,status=yes, top=' + top);

        let data = { points: Inte.treering.helper.findDistances(), annotations: Inte.treering.aData.annotations };
        window.addEventListener('message', () => {
          this.win.postMessage(data, this.childSite);
        }, false)
    }
 
     PopoutPlots.prototype.sendData = function() {
       let data = { points: Inte.treering.helper.findDistances(), annotations: Inte.treering.aData.annotations };
       this.win.postMessage(data, this.childSite);
     }
 
     PopoutPlots.prototype.highlightYear = function(year) {
       this.win.postMessage(year, this.childSite);
     }
 
 };

/** 
 * Allows user to upload local JSON files. 
 * @constructor
 * @param {object} Inte - DataAccessInterface objects. Allows access to DataAccess tools.
 */
function JSONFileUpload(Inte) {
    /**
     * Create an input div on the UI and click it.
     * @function
     */
    JSONFileUpload.prototype.input = function() {
        var input = document.createElement('input');
        input.type = 'file';
        input.id = 'file';
        input.style = 'display: none';
        input.addEventListener('change', () => {this.action(input)});
        input.click();
    };

    /**
     * Load the file selected in the input.
     * @function 
     */
    JSONFileUpload.prototype.action = function(inputElement) {
        var files = inputElement.files;
        console.log(files);
        if (files.length <= 0) {
            return false;
        }

        var fr = new FileReader();

        fr.onload = function(e) {
            let newDataJSON = JSON.parse(e.target.result);

            Inte.treering.preferences = {
                'forwardDirection': newDataJSON.forwardDirection,
                'subAnnual': newDataJSON.subAnnual,
            };

            Inte.treering.data = new MeasurementData(newDataJSON, Inte.treering);
            Inte.treering.aData = new AnnotationData(newDataJSON.annotations);

            // If the JSON has PPM data, use that instead of loaded data.
            if (newDataJSON.ppm) {
                Inte.treering.meta.ppm = newDataJSON.ppm;
                Inte.treering.options.ppm = newDataJSON.ppm;
            }

            Inte.treering.loadData();
            Inte.treering.metaDataText.updateText();
        };

        fr.readAsText(files.item(0));
    };
}

/**
 * Save JSON to cloud.
 * @constructor
 * @param {object} Inte - DataAccessInterface objects. Allows access to DataAccess tools.
 */
function CloudUpload(Inte) {
    // Trigger save action with CTRL-S
    L.DomEvent.on(window, 'keydown', (e) => {
        if (e.keyCode == 83 && e.getModifierState("Control") && window.name.includes('popout')) { // 83 refers to 's'
        e.preventDefault();
        e.stopPropagation();
        this.action();
        };
    });

    this.date = new Date();

    /**
     * Update the save date & meta data.
     * @function
     */
    CloudUpload.prototype.updateDate = function() {
        this.date = new Date();
        var day = this.date.getDate();
        var month = this.date.getMonth() + 1;
        var year = this.date.getFullYear();
        var minute = this.date.getMinutes();
        var hour = this.date.getHours();
        Inte.treering.data.saveDate = {'day': day, 'month': month, 'year': year, 'hour': hour, 'minute': minute};
    };

    /**
     * Display the save date in the bottom left corner.
     * @function 
     */
    CloudUpload.prototype.displayDate = function() {
        var date = Inte.treering.data.saveDate;
        console.log(date);
        if (date.day != undefined && date.hour != undefined) {
        var am_pm = 'am';
        if (date.hour >= 12) {
            date.hour -= 12;
            am_pm = 'pm';
        }
        if (date.hour == 0) {
            date.hour += 12;
        }
        var minute_string = date.minute;
        if (date.minute < 10) {
            minute_string = '0' + date.minute;
        }

        this.saveText =
            "Saved to cloud " + date.year + '/' + date.month + '/' + date.day + ' ' + date.hour + ':' + minute_string + am_pm;
        } else if (date.day != undefined) {
        this.saveText =
            "Saved to cloud " + date.year + '/' + date.month + '/' + date.day;
        } else {
        this.saveText =
            'No data saved to cloud';
        };

        Inte.treering.data.saveDate;
    };

    /**
     * Save the measurement data to the cloud.
     * @function 
     */
    CloudUpload.prototype.action = function() {
        if (Inte.treering.meta.savePermission && Inte.treering.meta.saveURL != "") {
        Inte.treering.data.clean();
        this.updateDate();
        var dataJSON = {
            'SaveDate': Inte.treering.data.saveDate,
            'year': Inte.treering.data.year,
            'forwardDirection': Inte.treering.measurementOptions.forwardDirection,
            'subAnnual': Inte.treering.measurementOptions.subAnnual,
            'earlywood': Inte.treering.data.earlywood,
            'index': Inte.treering.data.index,
            'points': Inte.treering.data.points,
            'attributesObjectArray': Inte.treering.annotationAsset.attributesObjectArray,
            'annotations': Inte.treering.aData.annotations,
            'ppm': Inte.treering.meta.ppm,
        };

        // Do not serialize our default value.
        if (Inte.treering.meta.ppm != Inte.treering.defaultResolution || Inte.treering.meta.ppmCalibration) {
            dataJSON.ppm = Inte.treering.meta.ppm;
        }
        $.post(Inte.treering.meta.saveURL, {sidecarContent: JSON.stringify(dataJSON)})
            .done((msg) => {
                this.displayDate();
                Inte.treering.metaDataText.updateText();
            })
            .fail((xhr, status, error) => {
                alert('Error: Failed to save changes.');
            });
        } else {
            alert('Authentication Error: Save to cloud permission not granted.');
        };
    };
}
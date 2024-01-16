/**
 * @file Leaflet Pith Estamte
 * @author Jessica Thorne <thorn572@umn.edu>
 * @version 1.0.0
 */

/**
 * Interface for pith estimate tools. 
 * @constructor
 * 
 * @param {object} Lt - LTreering object from leaflet-treering.js. 
 */
function PithEstimateInterface(Lt) {
    this.treering = Lt;
    
    this.estimateData = new EstimateData(this);
    this.estimateVisualAssets = new EstimateVisualAssets(this);

    this.newEstimate = new NewEstimate(this);
    this.newEstimateDialog = new NewEstimateDialog(this);

    this.btns = [this.newEstimate.btn];
    this.tools = [this.newEstimate];
}

/**
 * Storage of pith estimate data.
 * @constructor
 * 
 * @param {object} Inte - PithEstimateInterface object. Allows access to all other tools.  
 */
function EstimateData(Inte) {
    this.data = [];
    this.recent = null;

    /**
     * Save estimate data to array.
     * @function
     * 
     * @param {float} innerHeight - 
     * @param {float} innerWidth -
     * @param {float} innerRadius -
     * @param {integer} growthRate -
     * @param {integer} innerYear - 
     * @param {integer} estYear -
     */
    EstimateData.prototype.saveEstimateData = function(innerHeight, innerLength, innerRadius, growthRate, innerYear, estYear) {
        let newDataElement = {
            height: innerHeight,
            width: innerLength,
            radius: innerRadius,
            growthRate: growthRate,
            yearsToPith: innerYear,
            estimatedYear: estYear            
        }

        this.data.push(newDataElement);
    }

    /**
     * Update value which controls what is shown to user. 
     * @function
     * 
     * @param {integer} estYear - Estimated inner year value.
     */
    EstimateData.prototype.updateRecent = function(estYear) {
        this.recent = estYear;
        Inte.treering.metaDataText.updateText();
    }
}

/**
 * Manage visual assets related to estimates.  
 * @constructor
 * 
 * @param {object} Inte - PithEstimateInterface object. Allows access to all other tools.  
 */
function EstimateVisualAssets(Inte) {
    this.elements = [];
    this.markerLayer = L.layerGroup().addTo(Inte.treering.viewer);
    this.lineLayer = L.layerGroup().addTo(Inte.treering.viewer);

    /**
     * 
     * @param {*} latLng 
     * @returns 
     */
    EstimateVisualAssets.prototype.newMarker = function(latLng) {
        let marker = L.marker(latLng, { icon: L.divIcon({className: "fa fa-plus guide"}) });
        this.markerLayer.addLayer(marker);

        return latLng;
    }

    /**
     * Draws line between two markers.  
     * @function
     * 
     * @param {object} fromLatLng - Starting location of line. 
     * @param {object} toLatLng - Ending location of line. 
     */
    EstimateVisualAssets.prototype.connectMarkers = function(fromLatLng, toLatLng) {
        let line = L.polyline([fromLatLng, toLatLng], {color: 'red'});
        this.markerLayer.addLayer(line);
    }

    /**
     * 
     * @param {*} fromLatLng 
     */
    EstimateVisualAssets.prototype.connectMouseToMarker = function(fromLatLng) {
        $(Inte.treering.viewer.getContainer()).off("mousemove");
        $(Inte.treering.viewer.getContainer()).on("mousemove", mouseEvent => {
            this.lineLayer.clearLayers();

            let mouseLatLng = Inte.treering.viewer.mouseEventToLatLng(mouseEvent);

            let line = L.polyline([fromLatLng, mouseLatLng], {color: 'red'});
            this.lineLayer.addLayer(line);

            let marker = L.marker(mouseLatLng, { icon: L.divIcon({className: "fa fa-plus guide"}) });
            this.lineLayer.addLayer(marker);
        })
    }

    /**
     * Removes marker and connecting line from view. 
     * @function
     */
    EstimateVisualAssets.prototype.clearMouseConnection = function() {
        $(Inte.treering.viewer.getContainer()).off("mousemove");
        this.lineLayer.clearLayers();
    }

    /**
     * Removes markers from view.
     * @function
     */
    EstimateVisualAssets.prototype.clearMarkers = function() {
        this.markerLayer.clearLayers();
    }
}

/**
 * Create new inner year estimate. 
 * @constructor
 * 
 * @param {object} Inte - PithEstimateInterface object. Allows access to all other tools.  
 */
function NewEstimate(Inte) {
    this.innerLength = 0;
    this.innerHeight = 0; 
    this.innerRadius = 0;

    this.btn = new Button (
        'looks',
        'Create inner year estimate',
        () => { Inte.treering.disableTools(); this.enable() },
        () => { this.disable() },
    );
    
    /**
     * Enable tool by activating button & starting event chain. 
     * @function
     */
    NewEstimate.prototype.enable = function() {
        if (!Inte.treering.data.points.length) {
            alert("Error: Measurements must exist to estimate inner year.");
            return
        }

        this.btn.state('active');
        Inte.treering.viewer.getContainer().style.cursor = 'pointer';

        // Push change to undo stack: 
        // Inte.treering.undo.push();
        Inte.newEstimateDialog.openInstructions();
        this.action();
    }

    /**
     * Disable tool by removing all events & setting button to inactive.  
     * @function
     */
    NewEstimate.prototype.disable = function() {
        this.btn.state('inactive');
        Inte.treering.viewer.getContainer().style.cursor = 'default';

        $(Inte.treering.viewer.getContainer()).off('click');
        $(Inte.treering.viewer.getContainer()).off('mousemove');

        if (Inte.newEstimateDialog.dialogOpen) Inte.newEstimateDialog.close();
        Inte.estimateVisualAssets.clearMouseConnection();
        Inte.estimateVisualAssets.clearMarkers();
    }

    NewEstimate.prototype.action = function() {
        let clickCount = 0;
        let lengthLatLng_1, lengthLatLng_2, centerLatLng, heightLatLng;

        $(Inte.treering.viewer.getContainer()).on("click", clickEvent => {
            // Prevent jQuery event error.
            if (!clickEvent.originalEvent) return;

            clickCount++;

            // Click order determines action. 1 & 2 determine width, 3 determines height. 
            switch (clickCount) {
                case 1:
                    lengthLatLng_1 = Inte.treering.viewer.mouseEventToLatLng(clickEvent);
                    Inte.estimateVisualAssets.newMarker(lengthLatLng_1);
                    Inte.estimateVisualAssets.connectMouseToMarker(lengthLatLng_1);
                    break;

                case 2:
                    Inte.estimateVisualAssets.clearMouseConnection();

                    lengthLatLng_2 = Inte.treering.viewer.mouseEventToLatLng(clickEvent);
                    Inte.estimateVisualAssets.newMarker(lengthLatLng_2);
                    Inte.estimateVisualAssets.connectMarkers(lengthLatLng_1, lengthLatLng_2);

                    // Find center of major axis via midpoint: 
                    centerLatLng = L.latLng(
                        (lengthLatLng_1.lat + lengthLatLng_2.lat) / 2,
                        (lengthLatLng_1.lng + lengthLatLng_2.lng) / 2
                    );
                    Inte.estimateVisualAssets.newMarker(centerLatLng);
                    Inte.estimateVisualAssets.connectMouseToMarker(centerLatLng);
                    break;

                case 3:
                    Inte.estimateVisualAssets.clearMouseConnection();

                    heightLatLng = Inte.treering.viewer.mouseEventToLatLng(clickEvent);
                    Inte.estimateVisualAssets.newMarker(heightLatLng);
                    Inte.estimateVisualAssets.connectMarkers(centerLatLng, heightLatLng);

                    this.innerLength = Inte.treering.helper.trueDistance(lengthLatLng_1, lengthLatLng_2);
                    this.innerHeight = Inte.treering.helper.trueDistance(centerLatLng, heightLatLng);
                    // Equation found by Duncan in 1989 paper:
                    this.innerRadius = ((this.innerLength**2) / (8*this.innerHeight)) + (this.innerHeight/2);
                    
                    Inte.newEstimateDialog.openInterface(this.innerLength, this.innerHeight, this.innerRadius);
                    break;
            }
        });
    }

    /**
     * 
     * @param {*} numYears 
     * @returns 
     */
    NewEstimate.prototype.findYear = function(numYears) {
        let allDistances = Inte.treering.helper.findDistances();
        let twDistances = allDistances.tw.y;

        let totalGrowth = twDistances.slice(0, numYears).reduce((partialSum, x) => partialSum + x, 0);
        let growthRate = totalGrowth / numYears;
        let innerYear = this.innerRadius / growthRate;
        let estYear = Math.round(allDistances.tw.x[0] - innerYear);

        Inte.estimateData.saveEstimateData(this.innerHeight, this.innerLength, this.innerRadius, growthRate, innerYear, estYear);
        
        return estYear;
    }
}

/**
 * Generates dialog boxes related to creating new estimates. 
 * @constructor
 * 
 * @param {object} Inte - PithEstimateInterface object. Allows access to all other tools.
 */
function NewEstimateDialog(Inte) {
    this.numYears = 0;
    this.numAvailableYears = 0;
    this.customEnabled = false;

    let minWidth = 200;
    let minHeight = 316;
    this.size = [minWidth, minHeight];
    this.anchor = [50, 0];
    
    this.dialog = L.control.dialog({
        "size": this.size,
        "anchor": this.anchor,
        "initOpen": false,
        "position": 'topleft',
        "maxSize": [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
        "minSize": [minWidth, minHeight],
    }).addTo(Inte.treering.viewer);
    this.dialog.hideClose();

    this.dialogOpen = false;

    /**
     * Opens instructional dialog window.
     * @function
     */
    NewEstimateDialog.prototype.openInstructions = function() {
        let content = document.getElementById("PithEstimate-instructionDialog-template").innerHTML;
        this.dialog.setContent(content);
        this.dialog.open();
        this.dialogOpen = true;
    }

    /**
     * Opens interactable dialog window. 
     * @function
     * 
     * @param {float} length - Number representing length of arc in mm. 
     * @param {float} height - Number representing height of arc in mm. 
     * @param {float} radius - Number representing radius of arc in mm. 
     */
    NewEstimateDialog.prototype.openInterface = function(length, height, radius) {
        let allDistances = Inte.treering.helper.findDistances();
        this.numAvailableYears = allDistances.tw.x.length;

        let year5DNE = this.numAvailableYears < 5;
        let year10DNE = this.numAvailableYears < 10;
        let year20DNE = this.numAvailableYears < 20;
        let year30DNE = this.numAvailableYears < 30;
        let customMax = this.numAvailableYears;

        let html = document.getElementById("PithEstimate-growthRateDialog-template").innerHTML;
        let template = Handlebars.compile(html);

        let content = template({
            l: length.toFixed(3),
            h: height.toFixed(3),
            r: radius.toFixed(3),
            customLimit: customMax,
            yearEst5: Inte.newEstimate.findYear(5),
            yearEst10: Inte.newEstimate.findYear(10),
            yearEst20: Inte.newEstimate.findYear(20),
            yearEst30: Inte.newEstimate.findYear(30),
        });

        this.dialog.setContent(content);
        this.createDialogEventListeners();

        this.dialog.open();
        this.dialogOpen = true;

        // Enable or disable buttons based on what data exists. 
        $("#PithEstimate-5-btn").prop("disabled", year5DNE);
        $("#PithEstimate-10-btn").prop("disabled", year10DNE);
        $("#PithEstimate-20-btn").prop("disabled", year20DNE);
        $("#PithEstimate-30-btn").prop("disabled", year30DNE);
    }

    /**
     * Closes dialog window.
     * @function
     */
    NewEstimateDialog.prototype.close = function() {
        this.dialog.close();
        this.dialogOpen = false;
    }

    /**
     * Creates all event listeners for HTML elements in dialog window. 
     * @function
     */
    NewEstimateDialog.prototype.createDialogEventListeners = function () {
        $("#PithEstimate-5-row").on("click", () => {
            this.disableCustom();
            this.highlightRow("#PithEstimate-5-row");
            this.numYears = 5;
        });

        $("#PithEstimate-10-row").on("click", () => {
            this.disableCustom();
            this.highlightRow("#PithEstimate-10-row");
            this.numYears = 10;
        });

        $("#PithEstimate-20-row").on("click", () => {
            this.disableCustom();
            this.highlightRow("#PithEstimate-20-row");
            this.numYears = 20;
        });

        $("#PithEstimate-30-row").on("click", () => {
            this.disableCustom();
            this.highlightRow("#PithEstimate-30-row");
            this.numYears = 30;
        });

        $("#PithEstimate-custom-row").on("click", () => {
            $("#PithEstimate-customYearInput").show();
            $("#PithEstimate-customBtn-text").hide();

            this.highlightRow("#PithEstimate-custom-row");
        });

        $("#PithEstimate-customYearInput").on("input", () => {
            this.customEnabled = true;
            this.numYears = parseInt($("#PithEstimate-customYearInput").val());

            if (this.numYears > this.numAvailableYears) {
                let yearDiff = this.numYears - this.numAvailableYears;
                alert(`Error: Need ${yearDiff} more measurements to use selected growth rate.`);
                return
            } else if (this.numYears < 1) {
                alert("Error: Growth rate must be calculated from >0 years.");
                return
            }

            let yearEst = Inte.newEstimate.findYear(this.numYears);
            $("#PithEstimate-customBtn-estimate").html(yearEst);
        })

        $("#PithEstimate-copy-btn").on("click", () => {
            let header = "growth_rate, year_est\n";
            let year5row = `5, ${$("#PithEstimate-5-estimate").html()}\n`;
            let year10row = `10, ${$("#PithEstimate-10-estimate").html()}\n`;
            let year20row = `20, ${$("#PithEstimate-20-estimate").html()}\n`;
            let year30row = `30, ${$("#PithEstimate-30-estimate").html()}\n`;

            let customRate = (this.customEnabled) ? $("#PithEstimate-customYearInput").val() : "Custom";
            let customVal = (this.customEnabled) ? $("#PithEstimate-customBtn-estimate").html() : "NaN";
            let yearCustomRow = `${customRate}, ${customVal}\n`;

            let text = header + year5row + year10row + year20row + year30row + yearCustomRow;
            navigator.clipboard.writeText(text);
            console.log(text);
        })

        $("#PithEstimate-confirm-btn").on("click", () => {
            if (this.numYears > this.numAvailableYears) {
                let yearDiff = this.numYears - this.numAvailableYears;
                alert(`Error: Need ${yearDiff} more measurements to use selected growth rate.`);
                return
            } else if (this.numYears < 1) {
                alert("Error: Growth rate must be calculated from >0 years.");
                return
            }

            let yearEst = Inte.newEstimate.findYear(this.numYears);
            Inte.estimateData.updateRecent(yearEst);
            console.log(Inte.estimateData.recent);
            Inte.newEstimate.disable();
        });
    }

    /**
     * Changes which row in 'Inner Year Estimate' table is highlighted.  
     * @function
     * 
     * @param {string} rowID - HTML element id of table row. 
     */
    NewEstimateDialog.prototype.highlightRow = function (rowID) {
        let highlightColor = "#e6f0ce";
        
        $("#PithEstimate-5-row").css("background-color", "");
        $("#PithEstimate-10-row").css("background-color", "");
        $("#PithEstimate-20-row").css("background-color", "");
        $("#PithEstimate-30-row").css("background-color", "");
        $("#PithEstimate-custom-row").css("background-color", "");

        $(rowID).css("background-color", highlightColor);
    }

    /**
     * Disables custom input in 'Inner Year Estimate' table.
     * @function
     */
    NewEstimateDialog.prototype.disableCustom = function() {
        this.customEnabled = false;
        $("#PithEstimate-customYearInput").hide();
        $("#PithEstimate-customBtn-text").show();
        $("#PithEstimate-customBtn-estimate").html("NaN");
    }
}
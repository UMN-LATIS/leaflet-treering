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

    /**
     * 
     * @param {*} innerHeight 
     * @param {*} innerWidth 
     * @param {*} growthRate 
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
                    
                    Inte.newEstimateDialog.open(this.innerLength, this.innerHeight, this.innerRadius);
                    break;
            }
        });
    }

    /**
     * 
     */
    NewEstimate.prototype.findYear = function(numYears) {
        let allDistances = Inte.treering.helper.findDistances();
        let twDistances = allDistances.tw.y;

        let totalGrowth = twDistances.slice(0, numYears).reduce((partialSum, x) => partialSum + x, 0);
        let growthRate = totalGrowth / numYears;
        let innerYear = this.innerRadius / growthRate;
        let estYear = allDistances.tw.x[0] - innerYear;

        Inte.estimateData.saveEstimateData(this.innerHeight, this.innerLength, this.innerRadius, growthRate, innerYear, estYear);
        alert(`Estimated innermost year value: ${estYear.toFixed(3)}`);
        this.disable();
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

    let minWidth = 200;
    let minHeight = 260;
    this.size = [minWidth, minHeight];
    this.anchor = [50, 0];

    let html = document.getElementById("PithEstimate-growthRateDialog-template").innerHTML;
    this.template = Handlebars.compile(html);
    let content = this.template({
        l: 0,
        h: 0,
        r: 0
    });
    
    this.dialog = L.control.dialog({
        "size": this.size,
        "anchor": this.anchor,
        "initOpen": false,
        "position": 'topleft',
        "maxSize": [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
        "minSize": [minWidth, minHeight],
    }).setContent(content).addTo(Inte.treering.viewer);
    this.dialog.hideClose();

    this.dialogOpen = false;

    /**
     * Opens dialog window. 
     * @function
     */
    NewEstimateDialog.prototype.open = function(length, height, radius) {
        let allDistances = Inte.treering.helper.findDistances();
        this.numAvailableYears = allDistances.tw.x.length;

        let year5DNE = this.numAvailableYears < 5;
        let year10DNE = this.numAvailableYears < 10;
        let year20DNE = this.numAvailableYears < 20;
        let year30DNE = this.numAvailableYears < 30;
        let customMax = this.numAvailableYears;

        let content = this.template({
            l: length.toFixed(3),
            h: height.toFixed(3),
            r: radius.toFixed(3),
            customLimit: customMax
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
        $("#PithEstimate-5-btn").on("click", () => {
            $("#PithEstimate-customYearInput").hide();
            $("#PithEstimate-customBtn-container").show();
            this.numYears = parseInt($("#PithEstimate-5-btn").val());
        });

        $("#PithEstimate-10-btn").on("click", () => {
            $("#PithEstimate-customYearInput").hide();
            $("#PithEstimate-customBtn-container").show();
            this.numYears = parseInt($("#PithEstimate-10-btn").val());
        });

        $("#PithEstimate-20-btn").on("click", () => {
            $("#PithEstimate-customYearInput").hide();
            $("#PithEstimate-customBtn-container").show();
            this.numYears = parseInt($("#PithEstimate-20-btn").val());
        });

        $("#PithEstimate-30-btn").on("click", () => {
            $("#PithEstimate-customYearInput").hide();
            $("#PithEstimate-customBtn-container").show();
            this.numYears = parseInt($("#PithEstimate-30-btn").val());
        });

        $("#PithEstimate-custom-btn").on("click", () => {
            $("#PithEstimate-customYearInput").show();
            $("#PithEstimate-customBtn-container").hide();
        })

        $("#PithEstimate-customYearInput").on("input", () => {
            this.numYears = parseInt($("#PithEstimate-customYearInput").val());
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
            Inte.newEstimate.findYear(this.numYears);
        });
    }
}
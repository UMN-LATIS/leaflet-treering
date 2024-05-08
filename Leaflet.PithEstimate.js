/**
 * @file Leaflet Pith Estamte
 * @author Jessica Thorne <thorn573@umn.edu>
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

    this.newGeoEstimate = new NewGeoEstimate(this);
    this.newGeoEstimateDialog = new NewGeoEstimateDialog(this);

    this.breakGeoEstimate = new BreakGeoEstimate(this);

    this.newCcmEstimate = new NewCcmEstimate(this);
    this.newCcmEstimateDialog = new NewCcmEstimateDialog(this);

    this.btns = [this.newGeoEstimate.btn, this.newCcmEstimate.btn];
    this.tools = [this.newGeoEstimate, this.breakGeoEstimate, this.newCcmEstimate];

    let objectId = "5b228a4b3f3cb12ab14d32e5";
    $.getJSON('https://dendro.elevator.umn.edu/asset/viewAsset/' + objectId + '/true', function(data) {
        console.log('Data received:', data);
    })
}

/**
 * Storage of pith estimate data.
 * @constructor
 * 
 * @param {object} Inte - PithEstimateInterface object. Allows access to all other tools.  
 */
function EstimateData(Inte) {
    this.geoData = [];
    this.shownGeoInnerYear = null;
    this.shownGeoGrowthRate = null;

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
    EstimateData.prototype.saveGeoEstimateData = function(innerHeight, innerLength, innerRadius, growthRate, innerYear, estYear) {
        let newDataElement = {
            height: innerHeight,
            width: innerLength,
            radius: innerRadius,
            growthRate: growthRate,
            yearsToPith: innerYear,
            estimatedYear: estYear            
        }

        this.geoData.push(newDataElement);
    }

    /**
     * Update value which controls what is shown to user. 
     * @function
     * 
     * @param {integer} estYear - Estimated inner year value.
     * @param {integer} growthRate - Calculated growth rate from which estYear was found. 
     */
    EstimateData.prototype.updateShownValues = function(estYear, growthRate) {
        this.shownGeoInnerYear = estYear;
        this.shownGeoGrowthRate = growthRate;
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

    this.arc = null;
    this.arcLayer = L.layerGroup().addTo(Inte.treering.viewer);

    this.circleLayer = L.layerGroup().addTo(Inte.treering.viewer);

    /**
     * Creates new Leaflet marker (regular or break).
     * @function
     * 
     * @param {*} latLng - Leaflet location of new marker. 
     * @param {boolean} [breakPointBool = false] - Indicates if new marker should be a break point. False by default. 
     * @returns 
     */
    EstimateVisualAssets.prototype.newMarker = function(latLng, breakPointBool = false) {
        let markerIcon = L.divIcon({className: "fa fa-plus guide"});
        if (breakPointBool) {
            markerIcon = new MarkerIcon("break", "../");
        }

        let marker = L.marker(latLng, { icon: markerIcon });
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

    EstimateVisualAssets.prototype.reloadMarkers

    /**
     * Connects mouse to a marker via a Leaflet polyline. 
     * @function
     * 
     * @param {object} fromLatLng - Starting location of line. 
     * @param {object} [options =  {color: "red"}] - Visual options of Leaflet polyline. Red by default. 
     */
    EstimateVisualAssets.prototype.connectMouseToMarker = function(fromLatLng, options = {color: "red"}) {
        $(Inte.treering.viewer.getContainer()).off("mousemove");
        $(Inte.treering.viewer.getContainer()).on("mousemove", mouseEvent => {
            this.lineLayer.clearLayers();

            let mouseLatLng = Inte.treering.viewer.mouseEventToLatLng(mouseEvent);

            let line = L.polyline([fromLatLng, mouseLatLng], options);
            this.lineLayer.addLayer(line);

            let marker = L.marker(mouseLatLng, { icon: L.divIcon({className: "fa fa-plus guide"}) });
            this.lineLayer.addLayer(marker);
        })
    }

    /**
     * Create arc representing the inner most ring measured. 
     * @function
     * 
     * @param {object} lengthLatLng_1 - First location of length measurement (Leaflet latLng). 
     * @param {object} lengthLatLng_2 - Second location of length measurement (Leaflet latLng).
     * @param {object} midLatLng - Location of mid point (Leaflet latLng). 
     * @param {object} heightLatLng - Location of height point (Leaflet latLng). 
     */
    EstimateVisualAssets.prototype.drawPithEstimateArc = function(center, radius, latLngObj = null) {
        if (latLngObj) {
            let lengthLatLng_1 = latLngObj.lengthLatLng_1;
            let lengthLatLng_2 = latLngObj.lengthLatLng_2;
            let heightLatLng = latLngObj.heightLatLng;

            // Use distance equation directly to get unproject Leaflet length: 
            let length_unCorrected = Math.sqrt(Math.pow(Math.abs(lengthLatLng_1.lng - lengthLatLng_2.lng), 2) + 
            Math.pow(Math.abs(lengthLatLng_1.lat - lengthLatLng_2.lat), 2));
            length_unCorrected -= Inte.breakGeoEstimate.lengthBreakSectionWidth_unCorrected;

            let height_unCorrected = Math.sqrt(Math.pow(Math.abs(center.lng - heightLatLng.lng), 2) + 
                    Math.pow(Math.abs(center.lat - heightLatLng.lat), 2));
            height_unCorrected -= Inte.breakGeoEstimate.heightBreakSectionWidth_unCorrected;

            // Equation by Duncan 1989:
            radius = ((length_unCorrected**2) / (8*height_unCorrected)) + (height_unCorrected/2);
        }

        let marker = L.marker(center, { icon: L.divIcon({className: "fa fa-plus guide"}) });
        this.arcLayer.addLayer(marker);

        this.arc = L.circle(center, {
            radius: radius, 
            color: "#8153f5", 
            weight: 6,
        }).addTo(this.arcLayer);
    }

    /**
     * Create Leaflet tooltip at center of arc. 
     * @function
     * 
     * @param {integer} estYear - Estimated inner year value. 
     */
    EstimateVisualAssets.prototype.addArcPopup = function(estYear) {
        this.arc.bindTooltip(`est. ${estYear}`, {permanent: true}).openTooltip();
    }

    /**
     * Removes all arc related visual assets. 
     * @function
     */
    EstimateVisualAssets.prototype.clearArcs = function() {
        this.arcLayer.clearLayers();
    }

    /**
     * Creates circles to a center and multiple radii. 
     * @function
     * 
     * @param {object} center - Center location of all circles (Leaflet latLng).
     * @param {array} radiiArr - Array of all radii for circles. 
     * @param {string} [color = "#fff"] - Color of circles.
     */
    EstimateVisualAssets.prototype.createCircles = function(center, radiiArr, color = "#fff") {
        let circleOptions = {
            radius: null, 
            fill: false, 
            color: color,
            opacity: 0.6,
            // dashArray: "20, 40",
            weight: 6
        }

        radiiArr.map((radius) => {
            circleOptions.radius = radius;

            let newCircle = L.circle(center, circleOptions);
            newCircle.addTo(this.circleLayer);
        })
    }

    EstimateVisualAssets.prototype.clearCircles = function() {
        this.circleLayer.clearLayers();
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
 * Create new inner year estimate with Geometric or Duncan method. 
 * @constructor
 * 
 * @param {object} Inte - PithEstimateInterface object. Allows access to all other tools.  
 */
function NewGeoEstimate(Inte) {
    this.clickCount = 0;

    this.lengthLatLng_1 = null;
    this.lengthLatLng_2 = null; 
    this.midLatLng = null;
    this.heightLatLng = null;

    this.innerLength = 0;
    this.innerHeight = 0; 
    this.innerRadius = 0;

    this.btn = new Button (
        'looks',
        'Create inner year estimate with Geometric or Duncan method (Shift-p)',
        () => { Inte.treering.disableTools(); this.enable() },
        () => { this.disable() },
    );
    
    // Keyboard shortcut: 
    L.DomEvent.on(window, 'keydown', (e) => {
        if (e.keyCode == 80 && e.getModifierState("Shift") && !e.getModifierState("Control") && // 80 refers to 'p'
        window.name.includes('popout') && !Inte.treering.annotationAsset.dialogAnnotationWindow) { // Dialog windows w/ text cannot be active
           e.preventDefault();
           e.stopPropagation();
           Inte.treering.disableTools(); 
           this.enable();
        }
    });
    
    /**
     * Enable tool by activating button & starting event chain. 
     * @function
     */
    NewGeoEstimate.prototype.enable = function() {
        if (!Inte.treering.data.points.length) {
            alert("Error: Measurements must exist to estimate inner year.");
            return
        }

        this.btn.state('active');
        this.enabled = true;
        Inte.treering.viewer.getContainer().style.cursor = 'pointer';

        this.clickCount = 0;
        this.lengthLatLng_1 = null;
        this.lengthLatLng_2 = null; 
        this.midLatLng = null;
        this.heightLatLng = null;

        // Push change to undo stack: 
        // Inte.treering.undo.push();
        Inte.newGeoEstimateDialog.openInstructions();
        Inte.estimateVisualAssets.clearArcs();
        this.action();
    }

    /**
     * Disable tool by removing all events & setting button to inactive.  
     * @function
     */
    NewGeoEstimate.prototype.disable = function() {
        this.btn.state('inactive');
        this.enabled = false;
        Inte.treering.viewer.getContainer().style.cursor = 'default';

        $(Inte.treering.viewer.getContainer()).off('click');
        $(Inte.treering.viewer.getContainer()).off('mousemove');

        if (Inte.newGeoEstimateDialog.dialogOpen) Inte.newGeoEstimateDialog.close();
        Inte.estimateVisualAssets.clearMouseConnection();
        Inte.estimateVisualAssets.clearMarkers();
    }

    /**
     * Begins event chain for estimating pith. 
     * @function
     */
    NewGeoEstimate.prototype.action = function() {
        // Begins event chain: 
        this.placeFirstWidthPoint();
    }

    /**
     * Creates click event listener for placing first estimate point (width_1). 
     * @function
     */
    NewGeoEstimate.prototype.placeFirstWidthPoint = function() {
        $(Inte.treering.viewer.getContainer()).on("click", clickEvent => {
            // Prevent jQuery event error.
            if (!clickEvent.originalEvent) return;

            this.clickCount++;

            this.lengthLatLng_1 = Inte.treering.viewer.mouseEventToLatLng(clickEvent);
            Inte.estimateVisualAssets.newMarker(this.lengthLatLng_1);

            $(Inte.treering.viewer.getContainer()).off('click');
            $(Inte.treering.viewer.getContainer()).off('mousemove');

            this.placeSecondWidthPoint(this.lengthLatLng_1);
        });
    }

    /**
     * Creates click event listener for placing second estimate point. 
     * @function
     * 
     * @param {object} prevLatLng - Leaflet location of previously placed point. Could be regular or break point (width_2). 
     */
    NewGeoEstimate.prototype.placeSecondWidthPoint = function(prevLatLng) {
        Inte.estimateVisualAssets.connectMouseToMarker(prevLatLng);

        $(Inte.treering.viewer.getContainer()).on("click", clickEvent => {
            // Prevent jQuery event error.
            if (!clickEvent.originalEvent) return

            // Check if break needs to be inserted in section. 
            if (Inte.breakGeoEstimate.enabled) { Inte.breakGeoEstimate.action(clickEvent, prevLatLng); return }

            this.clickCount++;

            this.lengthLatLng_2 = Inte.treering.viewer.mouseEventToLatLng(clickEvent);
            Inte.estimateVisualAssets.newMarker(this.lengthLatLng_2);
            Inte.estimateVisualAssets.connectMarkers(prevLatLng, this.lengthLatLng_2);

            Inte.estimateVisualAssets.clearMouseConnection();
            $(Inte.treering.viewer.getContainer()).off('click');
            $(Inte.treering.viewer.getContainer()).off('mousemove');

            this.placeMidPoint(this.lengthLatLng_2)
        });
    }

    /**
     * Creates click event listener for placing third estimate point (midpoint).
     * @function 
     * 
     * @param {object} prevLatLng - Leaflet location of previously placed point. Could be regular or break point. 
     */
    NewGeoEstimate.prototype.placeMidPoint = function(prevLatLng) {
        // Place true midpoint for visual purpose only. 
        let trueMidLatLng = L.latLng(
            (this.lengthLatLng_1.lat + this.lengthLatLng_2.lat) / 2,
            (this.lengthLatLng_1.lng + this.lengthLatLng_2.lng) / 2
        );
        Inte.estimateVisualAssets.newMarker(trueMidLatLng);
        
        // Want marker to snap to line? https://github.com/makinacorpus/Leaflet.Snap
        let lineOptions = {
            color: "#49c4d9",
            opacity: 1,
            dashArray: "4 8",
        }
        Inte.estimateVisualAssets.connectMouseToMarker(prevLatLng, lineOptions);

        $(Inte.treering.viewer.getContainer()).on("click", clickEvent => {
            // Prevent jQuery event error.
            if (!clickEvent.originalEvent) return;
            
            this.clickCount++;

            this.midLatLng = Inte.treering.viewer.mouseEventToLatLng(clickEvent);
            Inte.estimateVisualAssets.newMarker(this.midLatLng);

            Inte.estimateVisualAssets.clearMouseConnection();
            $(Inte.treering.viewer.getContainer()).off('click');
            $(Inte.treering.viewer.getContainer()).off('mousemove');
          
            this.placeHeightPoint(this.midLatLng);
        });
    }

    /**
     * Creates click event listener for palcing fourth (final) estimate point (height).
     * @function
     * 
     * @param {object} prevLatLng - Leaflet location of previously placed point. Could be regular or break point. 
     */
    NewGeoEstimate.prototype.placeHeightPoint = function(prevLatLng) {
        Inte.estimateVisualAssets.connectMouseToMarker(prevLatLng);

        $(Inte.treering.viewer.getContainer()).on("click", clickEvent => {
            // Prevent jQuery event error.
            if (!clickEvent.originalEvent) return;

            // Check if break needs to be inserted in section. 
            if (Inte.breakGeoEstimate.enabled) { Inte.breakGeoEstimate.action(clickEvent, prevLatLng); return }
            
            this.clickCount++;

            this.heightLatLng = Inte.treering.viewer.mouseEventToLatLng(clickEvent);
            Inte.estimateVisualAssets.newMarker(this.heightLatLng);
            Inte.estimateVisualAssets.connectMarkers(prevLatLng, this.heightLatLng);

            Inte.estimateVisualAssets.clearMouseConnection();
            $(Inte.treering.viewer.getContainer()).off('click');
            $(Inte.treering.viewer.getContainer()).off('mousemove');

            this.findLengths();
        });
    }

    /**
     * Calculated estimated year based on width and height measurements drawn by user. 
     * @function
     * 
     * @param {integer} numYears - Number of years to base growth rate.  
     */
    NewGeoEstimate.prototype.findYear = function(numYears) {
        let allDistances = Inte.treering.helper.findDistances();
        let twDistances = allDistances.tw.y;

        let totalGrowth = twDistances.slice(0, numYears).reduce((partialSum, x) => partialSum + x, 0);
        let growthRate = totalGrowth / numYears;
        let innerYear = this.innerRadius / growthRate;
        let estYear = Math.round(allDistances.tw.x[0] - innerYear);

        Inte.estimateData.saveGeoEstimateData(this.innerHeight, this.innerLength, this.innerRadius, growthRate, innerYear, estYear);
        
        return [estYear, growthRate];
    }

    /**
     * Finds lengths between user defined width and height points. Detracts distances created by breaks. Opens next dialog. 
     * @function
     */
    NewGeoEstimate.prototype.findLengths = function() {
        this.innerLength = Inte.treering.helper.trueDistance(this.lengthLatLng_1, this.lengthLatLng_2) - Inte.breakGeoEstimate.lengthBreakSectionWidth;
        this.innerHeight = Inte.treering.helper.trueDistance(this.midLatLng, this.heightLatLng) - Inte.breakGeoEstimate.heightBreakSectionWidth;
        // Equation found by Duncan in 1989 paper:
        this.innerRadius = ((this.innerLength**2) / (8*this.innerHeight)) + (this.innerHeight/2);
        
        this.openUserOptions();

        // Reset breakwidths after finding lengths. 
        Inte.breakGeoEstimate.resetWidths();
    }

    /**
     * Opens next view of dialog and arc depiction.
     * @function
     */
    NewGeoEstimate.prototype.openUserOptions = function() {
        Inte.estimateVisualAssets.clearMouseConnection();
        Inte.estimateVisualAssets.clearMarkers();

        let latLngObj = {
            lengthLatLng_1: this.lengthLatLng_1, 
            lengthLatLng_2: this.lengthLatLng_2, 
            heightLatLng: this.heightLatLng,
        }
        Inte.estimateVisualAssets.drawPithEstimateArc(this.midLatLng, null, latLngObj);
        Inte.newGeoEstimateDialog.openInterface(this.innerLength, this.innerHeight, this.innerRadius);
    }
}

/**
 * Generates dialog boxes related to creating new Geometric (Duncan) estimates. 
 * @constructor
 * 
 * @param {object} Inte - PithEstimateInterface object. Allows access to all other tools.
 */
function NewGeoEstimateDialog(Inte) {
    this.numYears = 0;
    this.numAvailableYears = 0;

    let minWidth = 350;
    let minHeight = 300;
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
    NewGeoEstimateDialog.prototype.openInstructions = function() {
        let content = document.getElementById("PithEstimate-duncanInstructionDialog-template").innerHTML;
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
    NewGeoEstimateDialog.prototype.openInterface = function(length, height, radius) {
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
            yearEst5: Inte.newGeoEstimate.findYear(5)[0],
            yearEst10: Inte.newGeoEstimate.findYear(10)[0],
            yearEst20: Inte.newGeoEstimate.findYear(20)[0],
            yearEst30: Inte.newGeoEstimate.findYear(30)[0],
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
    NewGeoEstimateDialog.prototype.close = function() {
        this.dialog.close();
        this.dialogOpen = false;
    }

    /**
     * Creates all event listeners for HTML elements in dialog window. 
     * @function
     */
    NewGeoEstimateDialog.prototype.createDialogEventListeners = function () {
        $("#PithEstimate-5-row").on("click", () => {
            this.highlightRow("#PithEstimate-5-row");
            this.numYears = 5;
        });

        $("#PithEstimate-10-row").on("click", () => {
            this.highlightRow("#PithEstimate-10-row");
            this.numYears = 10;
        });

        $("#PithEstimate-20-row").on("click", () => {
            this.highlightRow("#PithEstimate-20-row");
            this.numYears = 20;
        });

        $("#PithEstimate-30-row").on("click", () => {
            this.highlightRow("#PithEstimate-30-row");
            this.numYears = 30;
        });

        $("#PithEstimate-custom-row").on("click", () => {
            this.highlightRow("#PithEstimate-custom-row");
        });

        $("#PithEstimate-customYearInput").on("input", () => {
            this.numYears = parseInt($("#PithEstimate-customYearInput").val());

            if (this.numYears > this.numAvailableYears) {
                let yearDiff = this.numYears - this.numAvailableYears;
                alert(`Error: Need ${yearDiff} more measurements to use selected growth rate.`);
                return
            } else if (this.numYears < 1) {
                alert("Error: Growth rate must be calculated from >0 years.");
                return
            }

            let yearEst = Inte.newGeoEstimate.findYear(this.numYears)[0];
            $("#PithEstimate-customBtn-estimate").html(yearEst);
        })

        $("#PithEstimate-copy-btn").on("click", () => {
            let header = "growth_rate, year_est\n";
            let year5row = `5, ${$("#PithEstimate-5-estimate").html()}\n`;
            let year10row = `10, ${$("#PithEstimate-10-estimate").html()}\n`;
            let year20row = `20, ${$("#PithEstimate-20-estimate").html()}\n`;
            let year30row = `30, ${$("#PithEstimate-30-estimate").html()}\n`;

            let customHasVal = $("#PithEstimate-customYearInput").val().length;
            let customRate = (customHasVal) ? $("#PithEstimate-customYearInput").val() : "Custom";
            let customVal = (customHasVal) ? $("#PithEstimate-customBtn-estimate").html() : "NA";
            let yearCustomRow = `${customRate}, ${customVal}\n`;

            let text = header + year5row + year10row + year20row + year30row + yearCustomRow;
            navigator.clipboard.writeText(text);
            console.log(text);
        })

        $("#PithEstimate-geoConfirm-btn").on("click", () => {
            if (this.numYears > this.numAvailableYears) {
                let yearDiff = this.numYears - this.numAvailableYears;
                alert(`Error: Need ${yearDiff} more measurements to use selected growth rate.`);
                return
            } else if (this.numYears < 1) {
                alert("Error: Growth rate must be calculated from >0 years.");
                return
            }

            let [yearEst, growthRate] = Inte.newGeoEstimate.findYear(this.numYears);
            Inte.estimateData.updateShownValues(yearEst, growthRate);
            Inte.estimateVisualAssets.addArcPopup(yearEst);
            Inte.newGeoEstimate.disable();
        });
    }

    /**
     * Changes which row in 'Inner Year Estimate' table is highlighted.  
     * @function
     * 
     * @param {string} rowID - HTML element id of table row. 
     */
    NewGeoEstimateDialog.prototype.highlightRow = function (rowID) {
        let highlightColor = "#e6f0ce";
        
        $("#PithEstimate-5-row").css("background-color", "");
        $("#PithEstimate-10-row").css("background-color", "");
        $("#PithEstimate-20-row").css("background-color", "");
        $("#PithEstimate-30-row").css("background-color", "");
        $("#PithEstimate-custom-row").css("background-color", "");

        $(rowID).css("background-color", highlightColor);
    }
}

/**
 * Create break within length/height measurement. 
 * @constructor
 * 
 * @param {object} Inte - PithEstimateInterface object. Allows access to all other tools.  
 */
function BreakGeoEstimate(Inte) {
    this.enabled = false;
    this.btn = Inte.treering.createBreak.btn

    this.lengthBreakSectionWidth = 0;
    this.heightBreakSectionWidth = 0;

    this.lengthBreakSectionWidth_unCorrected = 0;
    this.heightBreakSectionWidth_unCorrected = 0;

    /**
     * Enable tool by activating button & starting event chain.
     * @function
     */
    BreakGeoEstimate.prototype.enable = function() {
        if (Inte.newGeoEstimate.clickCount < 1) {
            alert("Error: Cannot create break before first width boundary is estbalished.");
            return
        } else if (Inte.newGeoEstimate.clickCount == 2) {
            alert("Error: Must place midpoint before creating a break.")
        }
        
        this.btn.state('active');
        Inte.treering.viewer.getContainer().style.cursor = 'pointer';
        Inte.treering.collapseTools();

        this.enabled = true;
        // Action called in NEwEstimate placement functions. 
    }

    /**
     * Disable tool by removing all events & setting button to inactive.
     * @function 
     */
    BreakGeoEstimate.prototype.disable = function() {
        $(Inte.treering.viewer.getContainer()).off('click');
        this.btn.state('inactive');
        Inte.treering.viewer.dragging.enable();

        this.enabled = false;
    };

    /**
     * Creates event listeners for defining 2 break points.
     * @function
     * 
     * @param {click event} event - Click event from placement functions (in NewGeoEstimate).
     * @param {object} prevLatLng - Leaflet location of previously placed point. 
     */
    BreakGeoEstimate.prototype.action = function(event, prevLatLng) {
        $(Inte.treering.viewer.getContainer()).off('click');

        let breakLatLng_1, breakLatLng_2;
        let clickCount = Inte.newGeoEstimate.clickCount;

        breakLatLng_1 = Inte.treering.viewer.mouseEventToLatLng(event);
        Inte.estimateVisualAssets.newMarker(breakLatLng_1, true);
        Inte.estimateVisualAssets.connectMarkers(prevLatLng, breakLatLng_1);
        Inte.estimateVisualAssets.clearMouseConnection();

        $(Inte.treering.viewer.getContainer()).on("click", clickEvent => {
            // Prevent jQuery event error.
            if (!clickEvent.originalEvent) return

            breakLatLng_2 = Inte.treering.viewer.mouseEventToLatLng(clickEvent);
            Inte.estimateVisualAssets.newMarker(breakLatLng_2, true);

            this.disable();

            // Adjust length sbased on where break occured. 
            let breakLength = Inte.treering.helper.trueDistance(breakLatLng_1, breakLatLng_2);
            // Use distance equation directly to get unproject Leaflet length: 
            let breakLength_unCorrected = Math.sqrt(Math.pow(Math.abs(breakLatLng_1.lng - breakLatLng_2.lng), 2) + 
                                      Math.pow(Math.abs(breakLatLng_1.lat - breakLatLng_2.lat), 2));
            if (clickCount < 2) {
                this.lengthBreakSectionWidth += breakLength;
                this.lengthBreakSectionWidth_unCorrected += breakLength_unCorrected;
                Inte.newGeoEstimate.placeSecondWidthPoint(breakLatLng_2);
            } else if (clickCount > 2) {
                this.heightBreakSectionWidth += breakLength;
                this.heightBreakSectionWidth_unCorrected += breakLength_unCorrected;
                Inte.newGeoEstimate.placeHeightPoint(breakLatLng_2);
            }
        });
    }

    /**
     * Resets break widths (length & height).
     * @function
     */
    BreakGeoEstimate.prototype.resetWidths = function() {
        this.lengthBreakSectionWidth = 0;
        this.heightBreakSectionWidth = 0;
    }
}

/**
 * Create new inner year estimate with Concentric Circles method. 
 * @constructor
 * 
 * @param {object} Inte - PithEstimateInterface object. Allows access to all other tools.  
 */
function NewCcmEstimate(Inte) {
    this.btn = new Button (
        'track_changes',
        'Create inner year estimate with Concentric Circles method (Shift-c)',
        () => { Inte.treering.disableTools(); this.enable() },
        () => { this.disable() },
    );

    this.pithLatLng = null;
    this.innerMostRadiusLatLng = null;
    this.radius_corrected = null;
    this.radius_unCorrected = null;
    this.innerMeasurementsArr = [];
    this.innerRadiiArr = [];
    this.innerEstimatedRadiiArr = [];
    this.numShownCircles = 10;
    
    this.disableZoomMultiplier = false;
    this.movementAmount = 0.001;
    // There are 3 growth rate functions: 
    // 1) Linear (default)
    // 2) Exponential
    // 3) Saturating
    // Only Linear in use currently. 
    this.growthRateFunction = 1
    this.numInnerYearEst = 0;

    // Keyboard shortcut: 
    L.DomEvent.on(window, 'keydown', (e) => {
        if (e.keyCode == 67 && e.getModifierState("Shift") && !e.getModifierState("Control") && // 67 refers to 'c'
        window.name.includes('popout') && !Inte.treering.annotationAsset.dialogAnnotationWindow) { // Dialog windows w/ text cannot be active
           e.preventDefault();
           e.stopPropagation();
           Inte.treering.disableTools(); 
           this.enable();
        }
    });

    NewCcmEstimate.prototype.enable = function() {
        if (!Inte.treering.data.points.length) {
            alert("Error: Measurements must exist to estimate inner year.");
            return
        }

        this.btn.state('active');
        this.enabled = true;
        Inte.treering.viewer.getContainer().style.cursor = 'pointer';

        Inte.newCcmEstimateDialog.openInstructions();
        Inte.estimateVisualAssets.clearArcs();
        this.action();
    }

    NewCcmEstimate.prototype.disable = function() {
        this.btn.state('inactive');
        this.enabled = false;
        Inte.treering.viewer.getContainer().style.cursor = 'default';

        $(Inte.treering.viewer.getContainer()).off('click');
        $(Inte.treering.viewer.getContainer()).off('mousemove');

        Inte.estimateVisualAssets.clearMarkers();
        Inte.estimateVisualAssets.clearCircles();
        this.disablePithLocationMovement();
        Inte.newCcmEstimateDialog.close();
    }

    NewCcmEstimate.prototype.action = function() {
        this.pithLatLng = null;

        // Create click event for estimating pith location: 
        $(Inte.treering.viewer.getContainer()).on("click", clickEvent => {
            // Prevent jQuery event error.
            if (!clickEvent.originalEvent) return;

            this.pithLatLng = Inte.treering.viewer.mouseEventToLatLng(clickEvent);
            
            $(Inte.treering.viewer.getContainer()).off('click');
            $(Inte.treering.viewer.getContainer()).off('mousemove');
            
            // After point is placed:
            this.findCircleAnchors();
            this.findInnerMostRadius();
            this.findUncorrectedEstimatedRadii();
            this.createCcmVisuals();
            Inte.newCcmEstimateDialog.reload();
            this.enablePithLocationMovement();
        });
    }

    NewCcmEstimate.prototype.findCircleAnchors = function() {
        let measuredBackwards = !Inte.treering.measurementOptions.forwardDirection;
        let measuredAnnually = !Inte.treering.measurementOptions.subAnnual;
        let measuredSubAnnually = Inte.treering.measurementOptions.subAnnual;

        let points = JSON.parse(JSON.stringify(Inte.treering.data.points));
        if (measuredBackwards) points = points.reverse().slice(1); // Skip first pseudo-start point. 

        this.innerMeasurementsArr = [];
        for (let i = 0; i < points.length && this.innerMeasurementsArr.length < this.numShownCircles; i++) {
            let pt = points[i];

            if (
                pt && // Non-null check
                (pt?.year || pt?.year === 0) && // Measurement point (as opposed to start or break point) check
                (measuredAnnually || (measuredSubAnnually && !pt?.earlywood)) // Latewood check
            ) {
                this.innerMeasurementsArr.push(pt);
            }
        }
        
        this.innerRadiiArr = this.findUncorrectedRadii();
    }

    NewCcmEstimate.prototype.findInnerMostRadius = function() {
        this.innerMostRadiusLatLng = this.innerMeasurementsArr[0].latLng;

        this.radius_corrected = Inte.treering.helper.trueDistance(this.pithLatLng, this.innerMostRadiusLatLng);

        this.radius_unCorrected = this.findUncorrectedDistance(this.pithLatLng, this.innerMostRadiusLatLng); 
    }

    NewCcmEstimate.prototype.findUncorrectedRadii = function() {
        let arr = [];
        for (point of this.innerMeasurementsArr) {
            let latLng = point.latLng;
            let radius_unCorrected = this.findUncorrectedDistance(this.pithLatLng, latLng);
            arr.push(radius_unCorrected);
        }

        return arr
    }

    NewCcmEstimate.prototype.findUncorrectedEstimatedRadii = function() {
        let pt_A, pt_B, dist, ptDistances = [];
        for (let i = 1; i < this.innerMeasurementsArr.length; i++) {
            pt_A = this.innerMeasurementsArr[i-1];
            pt_B = this.innerMeasurementsArr[i];
            dist = this.findUncorrectedDistance(pt_A.latLng, pt_B.latLng);
            ptDistances.push(dist);
        }

        let totalGrowth = ptDistances.reduce((partialSum, x) => partialSum + x, 0);
        let n = this.numShownCircles;

        let growthRate = function(t) {return 0}
        switch(this.growthRateFunction) {
            case 1: // Linear function
                growthRate = function(t) {
                    let m = totalGrowth / n;
                    return m*t;
                }
                break;
            case 2: // Exponential (constants from Fritts 2001)
                growthRate = function(t) {
                    let a = 0;
                    let b = 0;
                    let k = 0;

                    return a * Math.exp(b*t) + k;
                }
        }

        this.innerEstimatedRadiiArr = [];
        let prevRadiusEstimate = Number.MAX_SAFE_INTEGER;
        let newRadiusEstimate = this.radius_unCorrected;

        let err = 1*(10**(-6));
        let t = 0;
        while (newRadiusEstimate > 0 && (prevRadiusEstimate - newRadiusEstimate > err)) {
            t++;

            prevRadiusEstimate = newRadiusEstimate;
            newRadiusEstimate = this.radius_unCorrected - growthRate(t);

            this.innerEstimatedRadiiArr.push(newRadiusEstimate);
        }

        this.numInnerYearEst = t;
        this.innerYearEst = this.innerMeasurementsArr[0].year - t;
    }

    NewCcmEstimate.prototype.createCcmVisuals = function() {
        // Draw pith marker:
        Inte.estimateVisualAssets.newMarker(this.pithLatLng);

        // Create radius line between pith estimate & innermost point: 
        //Inte.estimateVisualAssets.connectMarkers(this.pithLatLng, this.innerMostRadiusLatLng);

        // Draw circles orginating from pith to measurement points: 
        Inte.estimateVisualAssets.createCircles(this.pithLatLng, this.innerRadiiArr, "#49c4d9");

        // Draw circles from pith to estimated rings: 
        Inte.estimateVisualAssets.createCircles(this.pithLatLng, this.innerEstimatedRadiiArr);
    }

    NewCcmEstimate.prototype.reloadCcmVisuals = function() {
        // Reload center: 
        Inte.estimateVisualAssets.clearMarkers();
        Inte.estimateVisualAssets.newMarker(this.pithLatLng);

        // Reload circles: 
        this.findInnerMostRadius();
        this.innerRadiiArr = this.findUncorrectedRadii();
        this.findUncorrectedEstimatedRadii();

        Inte.estimateVisualAssets.clearCircles();
        Inte.estimateVisualAssets.createCircles(this.pithLatLng, this.innerRadiiArr, "#49c4d9");
        Inte.estimateVisualAssets.createCircles(this.pithLatLng, this.innerEstimatedRadiiArr);
    }

    NewCcmEstimate.prototype.findUncorrectedDistance = function(latLng1, latLng2) {
        let d = Math.sqrt(Math.pow(Math.abs(latLng1.lng - latLng2.lng), 2) + Math.pow(Math.abs(latLng1.lat - latLng2.lat), 2));
        return d
    }

    NewCcmEstimate.prototype.enablePithLocationMovement = function() {
        L.DomEvent.on(window, 'keydown', this.movePith, this);
    }

    NewCcmEstimate.prototype.disablePithLocationMovement = function() {
        L.DomEvent.off(window, 'keydown', this.movePith, this)
    }

    NewCcmEstimate.prototype.movePith = function(event) {
        let zoomPercentage = (Inte.treering.viewer.getZoom() - Inte.treering.viewer.getMinZoom()) / 
                             (Inte.treering.viewer.getMaxZoom() - Inte.treering.viewer.getMinZoom());
    
        let multiplier = (1 - zoomPercentage > 0) ? 1 - zoomPercentage : 0.01;
        let zoomMultiplier = (this.disableZoomMultiplier) ? 1 : multiplier;
        let movementAmount =  zoomMultiplier * this.movementAmount;

        switch(event.keyCode) {
            case(87): // "w"
                this.pithLatLng.lat += movementAmount;
                break;
            case(83): // "s"
                this.pithLatLng.lat -= movementAmount;
                break;
            case(65): // "a"
                this.pithLatLng.lng -= movementAmount;
                break; 
            case(68): // "d"
                this.pithLatLng.lng += movementAmount;
                break;
        }

        // Reload visuals: 
        this.reloadCcmVisuals();
        Inte.newCcmEstimateDialog.reload();
    }
}

/**
 * Generates dialog boxes related to creating new Conctric Circles estimates. 
 * @constructor
 * 
 * @param {object} Inte - PithEstimateInterface object. Allows access to all other tools.
 */
function NewCcmEstimateDialog(Inte) {
    let minWidth = 324;
    let minHeight = 400;
    this.size = [minWidth, minHeight];
    this.anchor = [50, 0];
    
    this.template = null;
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
    NewCcmEstimateDialog.prototype.openInstructions = function() {
        let distances = Inte.treering.helper.findDistances();
        this.totalDistance = distances.tw.y.reduce((sum, x) => {return sum + x}, 0);
        this.numRingsMeasured = distances.tw.y.length;

        let dbh = parseFloat(Inte.treering.meta.dbh)*10;
        this.length = ((dbh/2) - this.totalDistance).toFixed(3);
        this.radiusPercent = (this.length / (dbh/2) * 100).toFixed(1);

        Inte.treering.collapseTools();

        let content = document.getElementById("PithEstimate-ccmInstructionDialog-template").innerHTML;
        this.template = Handlebars.compile(content);
        let html = this.template(
            {
                defaultMovement: Inte.newCcmEstimate.movementAmount,
                pithDistance: "NA",
                numYearEst: "NA",
                numShownCircles: 5,
                innerYearEst: "NA",
                missingRadiusLen: this.length,
                missingRadiusPercent: this.radiusPercent,
                agePresentPercent: "NA",
                ageEstimatedPercent: "NA",
                distancePresentPercent: "NA",
                distanceEstimatedPercent: "NA",
            });

        this.dialog.setContent(html);
        this.dialog.open();
        this.dialogOpen = true;
        
        this.createEventListeners();
    }

    /**
     * Closes dialog window.
     * @function
     */
    NewCcmEstimateDialog.prototype.close = function() {
        this.dialog.close();
        this.dialogOpen = false;
    }

    NewCcmEstimateDialog.prototype.createEventListeners = function() {
        $("#PithEstimate-instruction-button").on("click", () => {
            $("#PithEstimate-instruction-container").toggle();
            $("#PithEstimate-instruction-icon-plus").toggle();
            $("#PithEstimate-instruction-icon-minus").toggle();
        });

        $("#PithEstimate-numShownCircles-input").on("input", () => {
            Inte.newCcmEstimate.numShownCircles = $("#PithEstimate-numShownCircles-input").val();
            
            // Reload circle measurements and visuals: 
            if (Inte.newCcmEstimate.pithLatLng) {
                Inte.newCcmEstimate.findCircleAnchors();
                Inte.newCcmEstimate.reloadCcmVisuals();
                this.reload();
            }
        });

        // $("#PithEstimate-linear-function").on("change", () => {
        //     if ($("#PithEstimate-linear-function").is(":checked")) {
        //         Inte.newCcmEstimate.growthRateFunction = 1; 
        //         Inte.newCcmEstimate.reloadCcmVisuals();
        //     }
        // });

        // $("#PithEstimate-exponential-function").on("change", () => {
        //     if ($("#PithEstimate-exponential-function").is(":checked")) {
        //         Inte.newCcmEstimate.growthRateFunction = 2; 
        //         Inte.newCcmEstimate.reloadCcmVisuals();
        //     }
        // });

        $("#PithEstimate-movement-input").on("input", () => {
            Inte.newCcmEstimate.movementAmount = $("#PithEstimate-movement-input").val();
        });

        $("#PithEstimate-zoomMultiplier-btn").on("change", () => {
            Inte.newCcmEstimate.disableZoomMultiplier = $("#PithEstimate-zoomMultiplier-btn").is(":checked");
        });

        $("#PithEstimate-ccmConfirm-btn").on("click", () => {           
            Inte.estimateData.updateShownValues(Inte.newCcmEstimate.innerYearEst, "CCM");
            Inte.estimateVisualAssets.drawPithEstimateArc(Inte.newCcmEstimate.pithLatLng, Inte.newCcmEstimate.radius_unCorrected);
            Inte.estimateVisualAssets.addArcPopup(Inte.newCcmEstimate.innerYearEst);
            Inte.newCcmEstimate.disable();
        })
    }

    NewCcmEstimateDialog.prototype.reload = function() {
        let ageDenominator = Inte.newCcmEstimate.radius_corrected + this.totalDistance;
        let agePresentPercent = 100*(this.totalDistance / ageDenominator);
        let ageEstimatedPercent = 100*(Inte.newCcmEstimate.radius_corrected / ageDenominator);

        let distanceDenominator = this.numRingsMeasured + Inte.newCcmEstimate.numInnerYearEst;
        let distancePresentPercent = 100*(this.numRingsMeasured / distanceDenominator);
        let distanceEstimatedPercent = 100*(Inte.newCcmEstimate.numInnerYearEst / distanceDenominator);

        let html = this.template(
            {
                defaultMovement: Inte.newCcmEstimate.movementAmount,
                pithDistance: Inte.newCcmEstimate.radius_corrected.toFixed(3),
                numYearEst: Inte.newCcmEstimate.numInnerYearEst,
                numShownCircles: Inte.newCcmEstimate.numShownCircles,
                innerYearEst: Inte.newCcmEstimate.innerYearEst,
                missingRadiusLen: this.length,
                missingRadiusPercent: this.radiusPercent,
                agePresentPercent: agePresentPercent.toFixed(1),
                ageEstimatedPercent: ageEstimatedPercent.toFixed(1),
                distancePresentPercent: distancePresentPercent.toFixed(1),
                distanceEstimatedPercent: distanceEstimatedPercent.toFixed(1),
            });

        this.dialog.setContent(html);
        this.createEventListeners();
    }
}
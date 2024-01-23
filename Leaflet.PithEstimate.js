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

    this.newEstimate = new NewEstimate(this);
    this.newEstimateDialog = new NewEstimateDialog(this);

    this.breakEstimate = new BreakEstimate(this);

    this.btns = [this.newEstimate.btn];
    this.tools = [this.newEstimate, this.breakEstimate];
}

/**
 * Storage of pith estimate data.
 * @constructor
 * 
 * @param {object} Inte - PithEstimateInterface object. Allows access to all other tools.  
 */
function EstimateData(Inte) {
    this.data = [];
    this.shownInner = null;
    this.shownGrowthRate = null;

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
     * @param {integer} growthRate - Calculated growth rate from which estYear was found. 
     */
    EstimateData.prototype.updateShownValues = function(estYear, growthRate) {
        this.shownInner = estYear;
        this.shownGrowthRate = growthRate;
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
        'Create inner year estimate (Shift-p)',
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
    NewEstimate.prototype.enable = function() {
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
        Inte.newEstimateDialog.openInstructions();
        this.action();
    }

    /**
     * Disable tool by removing all events & setting button to inactive.  
     * @function
     */
    NewEstimate.prototype.disable = function() {
        this.btn.state('inactive');
        this.enabled = false;
        Inte.treering.viewer.getContainer().style.cursor = 'default';

        $(Inte.treering.viewer.getContainer()).off('click');
        $(Inte.treering.viewer.getContainer()).off('mousemove');

        if (Inte.newEstimateDialog.dialogOpen) Inte.newEstimateDialog.close();
        Inte.estimateVisualAssets.clearMouseConnection();
        Inte.estimateVisualAssets.clearMarkers();
    }

    /**
     * Begins event chain for estimating pith. 
     * @function
     */
    NewEstimate.prototype.action = function() {
        // Begins event chain: 
        this.placeFirstWidthPoint();
    }

    /**
     * Creates click event listener for placing first estimate point (width_1). 
     * @function
     */
    NewEstimate.prototype.placeFirstWidthPoint = function() {
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
    NewEstimate.prototype.placeSecondWidthPoint = function(prevLatLng) {
        Inte.estimateVisualAssets.connectMouseToMarker(prevLatLng);

        $(Inte.treering.viewer.getContainer()).on("click", clickEvent => {
            // Prevent jQuery event error.
            if (!clickEvent.originalEvent) return

            // Check if break needs to be inserted in section. 
            if (Inte.breakEstimate.enabled) { Inte.breakEstimate.action(clickEvent, prevLatLng); return }

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
    NewEstimate.prototype.placeMidPoint = function(prevLatLng) {
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
    NewEstimate.prototype.placeHeightPoint = function(prevLatLng) {
        Inte.estimateVisualAssets.connectMouseToMarker(prevLatLng);

        $(Inte.treering.viewer.getContainer()).on("click", clickEvent => {
            // Prevent jQuery event error.
            if (!clickEvent.originalEvent) return;

            // Check if break needs to be inserted in section. 
            if (Inte.breakEstimate.enabled) { Inte.breakEstimate.action(clickEvent, prevLatLng); return }
            
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
    NewEstimate.prototype.findYear = function(numYears) {
        let allDistances = Inte.treering.helper.findDistances();
        let twDistances = allDistances.tw.y;

        let totalGrowth = twDistances.slice(0, numYears).reduce((partialSum, x) => partialSum + x, 0);
        let growthRate = totalGrowth / numYears;
        let innerYear = this.innerRadius / growthRate;
        let estYear = Math.round(allDistances.tw.x[0] - innerYear);

        Inte.estimateData.saveEstimateData(this.innerHeight, this.innerLength, this.innerRadius, growthRate, innerYear, estYear);
        
        return [estYear, growthRate];
    }

    /**
     * Finds lengths between user defined width and height points. Detracts distances created by breaks. 
     * @function
     */
    NewEstimate.prototype.findLengths = function() {
        console.log(Inte.breakEstimate.lengthBreakSectionWidth)

        this.innerLength = Inte.treering.helper.trueDistance(this.lengthLatLng_1, this.lengthLatLng_2) - Inte.breakEstimate.lengthBreakSectionWidth;
        this.innerHeight = Inte.treering.helper.trueDistance(this.midLatLng, this.heightLatLng) - Inte.breakEstimate.heightBreakSectionWidth;
        // Equation found by Duncan in 1989 paper:
        this.innerRadius = ((this.innerLength**2) / (8*this.innerHeight)) + (this.innerHeight/2);
        
        Inte.newEstimateDialog.openInterface(this.innerLength, this.innerHeight, this.innerRadius);

        // Reset breakwidths after finding lengths. 
        Inte.breakEstimate.resetWidths();
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
            yearEst5: Inte.newEstimate.findYear(5)[0],
            yearEst10: Inte.newEstimate.findYear(10)[0],
            yearEst20: Inte.newEstimate.findYear(20)[0],
            yearEst30: Inte.newEstimate.findYear(30)[0],
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

            let yearEst = Inte.newEstimate.findYear(this.numYears)[0];
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

        $("#PithEstimate-confirm-btn").on("click", () => {
            if (this.numYears > this.numAvailableYears) {
                let yearDiff = this.numYears - this.numAvailableYears;
                alert(`Error: Need ${yearDiff} more measurements to use selected growth rate.`);
                return
            } else if (this.numYears < 1) {
                alert("Error: Growth rate must be calculated from >0 years.");
                return
            }

            let [yearEst, growthRate] = Inte.newEstimate.findYear(this.numYears);
            Inte.estimateData.updateShownValues(yearEst, growthRate);
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
}

/**
 * Create break within length/height measurement. 
 * @constructor
 * 
 * @param {object} Inte - PithEstimateInterface object. Allows access to all other tools.  
 */
function BreakEstimate(Inte) {
    this.enabled = false;
    this.btn = Inte.treering.createBreak.btn

    this.lengthBreakSectionWidth = 0;
    this.heightBreakSectionWidth = 0;

    /**
     * Enable tool by activating button & starting event chain.
     * @function
     */
    BreakEstimate.prototype.enable = function() {
        if (Inte.newEstimate.clickCount < 1) {
            alert("Error: Cannot create break before first width boundary is estbalished.");
            return
        } else if (Inte.newEstimate.clickCount == 2) {
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
    BreakEstimate.prototype.disable = function() {
        $(Inte.treering.viewer.getContainer()).off('click');
        this.btn.state('inactive');
        Inte.treering.viewer.dragging.enable();

        this.enabled = false;
    };

    /**
     * Creates event listeners for defining 2 break points.
     * @function
     * 
     * @param {click event} event - Click event from placement functions (in NewEstimate).
     * @param {object} prevLatLng - Leaflet location of previously placed point. 
     */
    BreakEstimate.prototype.action = function(event, prevLatLng) {
        $(Inte.treering.viewer.getContainer()).off('click');

        let breakLatLng_1, breakLatLng_2;
        let clickCount = Inte.newEstimate.clickCount;

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
            if (clickCount < 2) {
                this.lengthBreakSectionWidth += breakLength;
                Inte.newEstimate.placeSecondWidthPoint(breakLatLng_2);
            } else if (clickCount > 2) {
                this.heightBreakSectionWidth += breakLength;
                Inte.newEstimate.placeHeightPoint(breakLatLng_2);
            }
        });
    }

    /**
     * Resets break widths (length & height).
     * @function
     */
    BreakEstimate.prototype.resetWidths = function() {
        this.lengthBreakSectionWidth = 0;
        this.heightBreakSectionWidth = 0;
    }
}
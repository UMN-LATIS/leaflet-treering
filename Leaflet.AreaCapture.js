/**
 * @file Leaflet Area Capture 
 * @author Jessica Thorne <thorn573@umn.edu>
 * @version 1.0.0
 */

/**
 * Interface for area capture tools. Instantiates & connects all area or supprting tools. 
 * @constructor
 * 
 * @param {object} Lt - LTreering object from leaflet-treering.js. 
 */
function AreaCaptureInterface(Lt) {
    this.treering = Lt;
    this.calculator = new Calculator(this);

    this.ellipseData = new EllipseData(this);
    this.ellipseVisualAssets = new EllipseVisualAssets(this);
    this.ellipseDialogs = new EllipseDialogs(this);

    this.newEllipse = new NewEllipse(this); 
    this.lassoEllipses = new LassoEllipses(this);
    
    this.btns = [this.newEllipse.btn, this.lassoEllipses.btn];
    this.tools = [this.newEllipse, this.lassoEllipses];
}

/**
 * Storage of ellipse points & related meta data.  
 * @constructor
 * 
 * @param {object} Inte - AreaCaptureInterface object. Allows access to all other tools.  
 */
function EllipseData(Inte) {
    this.year = 0;
    this.data = [];

    /**
     * Saves data entry for a new ellipse. 
     * @function
     * 
     * @param {object} centerLatLng - Location of center of ellipse. 
     * @param {object} majorLatLng - Location of edge along major axis. 
     * @param {object} minorLatLng - Location of edge along minor axis.
     * @param {float} degrees - Rotation of ellipse from west or -x axis. 
     */
    EllipseData.prototype.saveEllipseData = function(centerLatLng, majorLatLng, minorLatLng, degrees) {
        let majorRadius = Inte.treering.helper.trueDistance(centerLatLng, majorLatLng);
        let minorRadius = Inte.treering.helper.trueDistance(centerLatLng, minorLatLng);
        let area = Math.PI * majorRadius * minorRadius;
        
        let newDataElement = {
            "latLng": centerLatLng, 
            "majorLatLng": majorLatLng,
            "minorLatLng": minorLatLng, 
            "majorRadius": majorRadius,
            "minorRadius": minorRadius, 
            "degrees": degrees,
            "area": area,
            "year": this.year,
            "selected": false,
        }

        this.data.push(newDataElement);
    }
}

/**
 * Manage visual assets related to ellipses.  
 * @constructor
 * 
 * @param {object} Inte - AreaCaptureInterface object. Allows access to all other tools.  
 */
function EllipseVisualAssets(Inte) {
    this.elements = [];
    
    this.ellipseLayer = L.layerGroup().addTo(Inte.treering.viewer);
    this.guideMarkerLayer = L.layerGroup().addTo(Inte.treering.viewer);
    this.guideLineLayer = L.layerGroup().addTo(Inte.treering.viewer);

    this.ellipseColor = "#49C4D9"; // Light blue color. 

    EllipseVisualAssets.prototype.createEllipse = function(centerLatLng, majorLatLng, minorLatLng, degrees) {
        const latLngToMetersConstant = 111139;
        const majorRadius = Inte.calculator.distance(centerLatLng, majorLatLng) * latLngToMetersConstant;
        const minorRadius = Inte.calculator.distance(centerLatLng, minorLatLng) * latLngToMetersConstant;

        let ellipse = L.ellipse(centerLatLng, [majorRadius, minorRadius], degrees, {color: this.ellipseColor, weight: 5}); 
        let center = L.marker(centerLatLng, { icon: L.divIcon({className: "fa fa-plus guide"}) }); 
        this.ellipseLayer.addLayer(ellipse);
        this.ellipseLayer.addLayer(center);
        this.elements.push(ellipse);
    }

    /**
     * Creates mousemove event to create a guide line given an angle & line from the major axis. 
     * @function
     * 
     * @param {object} fromLatLng - Originating location of line to mouse. 
     * @param {float} [radiansFromMajorAxis = -1] - Optional, forces line to have a constant angle from the major axis. 
     * @param {object} [majorAxisLine = null] - Optional, informs direction of guideline (above or below major axis) with respect to mouse position. 
     */
    EllipseVisualAssets.prototype.createGuideLine = function(fromLatLng, radiansFromMajorAxis = -1, majorAxisLine = null) {
        $(Inte.treering.viewer.getContainer()).off("mousemove");
        $(Inte.treering.viewer.getContainer()).on("mousemove", e => {
            this.guideLineLayer.clearLayers();

            let eventLatLng = Inte.treering.viewer.mouseEventToLatLng(e);
            let toLatLngA = eventLatLng;
            let toLatLngB = eventLatLng;

            if (radiansFromMajorAxis > 0) {
                /* For a single guide line, direction of guide line is determined by if mouse is above or below the major axis. 
                let direction = (eventLatLng.lat > (majorAxisLine.slope * eventLatLng.lng + majorAxisLine.intercept)) ? 1 : -1;
                */

                let length = Inte.calculator.distance(fromLatLng, eventLatLng);

                toLatLngA = {
                    "lat": fromLatLng.lat + (1 * length * Math.sin(radiansFromMajorAxis)),
                    "lng": fromLatLng.lng + (1 * length * Math.cos(radiansFromMajorAxis)),
                };

                toLatLngB = {
                    "lat": fromLatLng.lat + (-1 * length * Math.sin(radiansFromMajorAxis)),
                    "lng": fromLatLng.lng + (-1 * length * Math.cos(radiansFromMajorAxis)),
                    };
            }
            
            let lineA = L.polyline([fromLatLng, toLatLngA], {color: 'red'});
            this.guideLineLayer.addLayer(lineA);

            let lineB = L.polyline([fromLatLng, toLatLngB], {color: 'red'});
            this.guideLineLayer.addLayer(lineB);

            let tipA = L.marker(toLatLngA, { icon: L.divIcon({className: "fa fa-plus guide"}) });
            this.guideLineLayer.addLayer(tipA);

            let tipB = L.marker(toLatLngB, { icon: L.divIcon({className: "fa fa-plus guide"}) });
            this.guideLineLayer.addLayer(tipB);
        })
    }

    /**
     * Creates a guide marker. 
     * @function
     * 
     * @param {object} latLng - Location to create marker. 
     * @returns {object} Created marker object. 
     */
    EllipseVisualAssets.prototype.createGuideMarker = function(latLng) {
        let marker = L.marker(latLng, { icon: L.divIcon({className: "fa fa-plus guide"}) });
        this.guideMarkerLayer.addLayer(marker);

        return marker;
    }

    /**
     * Draws line between two markers.  
     * @function
     * 
     * @param {object} fromLatLng - Starting location of line. 
     * @param {object} toLatLng - Ending location of line. 
     */
    EllipseVisualAssets.prototype.connectMarkerLatLngs = function(fromLatLng, toLatLng) {
        let line = L.polyline([fromLatLng, toLatLng], {color: 'red'});
        this.guideMarkerLayer.addLayer(line);
    }

    /**
     * Draw all ellipses to Leaflet map.  
     * @function
     */
    EllipseVisualAssets.prototype.reload = function() {
        this.clearEllipses();
        Inte.ellipseData.data.map(e => {
            this.createEllipse(e.latLng, e.majorLatLng, e.minorLatLng, e.degrees);
        })
    }

    /**
     * Clears all ellipses from Leaflet map. 
     * @function
     */
    EllipseVisualAssets.prototype.clearEllipses = function() {
        this.elements = [];
        this.ellipseLayer.clearLayers();
    }

    /**
     * Clears all guide markers (and related objects) from Leaflet map. 
     * @function
     */
    EllipseVisualAssets.prototype.clearGuideMarkers = function() {
        this.guideMarkerLayer.clearLayers();
    }

    /**
     * Clears all guide lines (and related objects) from Leaflet map.. 
     * @function
     */
    EllipseVisualAssets.prototype.clearGuideLines = function() {
        this.guideLineLayer.clearLayers();
    }
}

/**
 * Generates dialog boxes related to ellipses. 
 * @constructor
 * 
 * @param {object} Inte - AreaCaptureInterface object. Allows access to all other tools.
 */
function EllipseDialogs(Inte) {
    this.dialog = null;
    this.template = null;

    let minWidth = 170;
    let minHeight = 115;

    this.minSize = [minWidth, minHeight];
    this.size = [minWidth, minHeight];
    this.anchor = [50, 0];

    this.shortcutsEnabled = false;

    /**
     * Opens dialog window for ellipses. 
     * @function
     */
    EllipseDialogs.prototype.open = function() {
        let element = document.getElementById("AreaCapture-incrementDialog-template").innerHTML;
        this.template = Handlebars.compile(element);
        let content = this.template({
            "year": Inte.ellipseData.year,
        });
        
        this.dialog = L.control.dialog({
            "size": this.size,
            "anchor": this.anchor,
            "initOpen": true,
            'position': 'topleft',
            "maxSize": [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
            'minSize': this.minSize,
        }).setContent(content).addTo(Inte.treering.viewer);
        this.dialog.hideClose();

        this.createDialogEventListeners();

        if (!this.shortcutsEnabled) {
            // Only do once when instantiated.
            // Otherwise multiple listeners will be assigned. 
            this.createShortcutEventListeners();
            
            this.shortcutsEnabled = true;
        }
    }

    /**
     * Closes dialog window for ellipses. 
     * @function
     */
    EllipseDialogs.prototype.close = function() {
        if (this.dialog) this.dialog.destroy();
        this.dialog = null;
    }

    /**
     * Updates dialog window HTML content. 
     * @function
     */
    EllipseDialogs.prototype.update = function() {
        let content = this.template({
            "year": Inte.ellipseData.year,
        });

        this.dialog.setContent(content);
        this.createDialogEventListeners();
    }

    /**
     * Creates all event listeners for HTML elements in dialog window. 
     * @function
     */
    EllipseDialogs.prototype.createDialogEventListeners = function () {
        // Remeber dialog anchor position and size after changed. 
        $(this.dialog._map).on('dialog:resizeend', () => { this.size = this.dialog.options.size } );
        $(this.dialog._map).on('dialog:moveend', () => { this.anchor = this.dialog.options.anchor } );

        // Year editing buttons: 
        $("#AreaCapture-editYear-btn").on("click", () => {
            let element = document.getElementById("AreaCapture-newYearDialog-template").innerHTML;
            let template = Handlebars.compile(element);
            let content = template({
                "year": Inte.ellipseData.year,
            });
            this.dialog.setContent(content);

            $("#AreaCapture-confirmYear-btn").on("click", () => {
                let year = $("#AreaCapture-newYear-input").val();
                if (year) Inte.ellipseData.year = year;
                this.update();
            })
        });

        $("#AreaCapture-subtractYear-btn").on("click", () => {
            Inte.ellipseData.year--;
            this.update();
        });

        $("#AreaCapture-addYear-btn").on("click", () => {
            Inte.ellipseData.year++;
            this.update();
        });
    }

    /**
     * Creates all DOM event listeners - keyboard shortcuts.  
     * @function
     */
    EllipseDialogs.prototype.createShortcutEventListeners = function () {
        // Keyboard short cut for subtracting year: Ctrl - Q
        L.DomEvent.on(window, 'keydown', (e) => {
            if (e.keyCode == 81 && !e.shiftKey && e.ctrlKey && this.dialog) {
                Inte.ellipseData.year--;
                this.update();
            }
         }, this);

        // Keyboard short cut for adding year: Ctrl - E
        L.DomEvent.on(window, 'keydown', (e) => {
            if (e.keyCode == 69 && !e.shiftKey && e.ctrlKey && this.dialog) {
                Inte.ellipseData.year++;
                this.update();
            }
         }, this);         
    }
}

/**
 * Tool for capturing area with ellipses. 
 * @constructor
 * 
 * @param {object} Inte - AreaCaptureInterface object. Allows access to all other tools.
 */
function NewEllipse(Inte) {
    this.btn = new Button (
        'scatter_plot',
        'Create elliptical area measurements',
        () => { Inte.treering.disableTools(); this.enable() },
        () => { this.disable() },
    );
    
    /**
     * Enable tool by activating button & starting event chain. 
     * @function
     */
    NewEllipse.prototype.enable = function() {
        this.btn.state('active');
        Inte.treering.viewer.getContainer().style.cursor = 'pointer';

        Inte.ellipseDialogs.open();
        this.action();
    }

    /**
     * Disable tool by removing all events & setting button to inactive. 
     * @function
     */
    NewEllipse.prototype.disable = function() {
        this.btn.state('inactive');
        Inte.treering.viewer.getContainer().style.cursor = 'default';

        $(Inte.treering.viewer.getContainer()).off('click');
        Inte.ellipseVisualAssets.clearGuideMarkers();

        $(Inte.treering.viewer.getContainer()).off('mousemove');
        Inte.ellipseVisualAssets.clearGuideLines();

        Inte.ellipseDialogs.close();
    }

    /**
     * Drives events which create new ellipses. 
     * @function
     */
    NewEllipse.prototype.action = function() {
        let count = 0;
        let centerLatLng, majorLatLngA, majorLatLngB, minorLatLng;
        let radians, directionCorrection;

        $(Inte.treering.viewer.getContainer()).on("click", e => {
            // Prevent jQuery event error.
            if (!e.originalEvent) return;

            count++;
            switch (count) {
                case 1:
                    majorLatLngA = Inte.treering.viewer.mouseEventToLatLng(e);
                    Inte.ellipseVisualAssets.createGuideMarker(majorLatLngA);
                    Inte.ellipseVisualAssets.createGuideLine(majorLatLngA);
                    break;
                case 2:
                    majorLatLngB = Inte.treering.viewer.mouseEventToLatLng(e);
                    Inte.ellipseVisualAssets.createGuideMarker(majorLatLngB);
                    Inte.ellipseVisualAssets.connectMarkerLatLngs(majorLatLngA, majorLatLngB);

                    // Find center of major axis via midpoint: 
                    centerLatLng = L.latLng(
                        (majorLatLngA.lat + majorLatLngB.lat) / 2,
                        (majorLatLngA.lng + majorLatLngB.lng) / 2
                    );
                    Inte.ellipseVisualAssets.createGuideMarker(centerLatLng);

                    // Next guide line informs the minor axis. Minor axis must be 90 degrees from major axis. 
                    // Use CAH geometry rule to determine angle adjustment in radians: 
                    adjacentLatLng = L.latLng(centerLatLng.lat, majorLatLngB.lng);
                    radians = Math.acos(Inte.calculator.distance(centerLatLng, adjacentLatLng) / Inte.calculator.distance(centerLatLng, majorLatLngB));
                    // Returned radians value is always positive. If majorLatLngB is in the 2cd or 4th quadrent (in relation to centerLatLng),
                    // the radians must be multiplied by -1 to correct the rotation orientation. 
                    directionCorrection = (Inte.calculator.inSecondQuadrent(centerLatLng, majorLatLngB) || Inte.calculator.inFourthQuadrent(centerLatLng, majorLatLngB)) ? -1 : 1;
                    let rotatedRightRadians = (Math.PI / 2) + (directionCorrection * radians);

                    // Determine major axis line to calculate direction of minor axis guide line. 
                    let slope = (majorLatLngA.lat - majorLatLngB.lat) / (majorLatLngA.lng - majorLatLngB.lng);
                    let intercept = majorLatLngA.lat - (slope * majorLatLngA.lng);
                    let majorAxisLine = {
                        "slope": slope,
                        "intercept": intercept,
                    }

                    Inte.ellipseVisualAssets.createGuideLine(centerLatLng, rotatedRightRadians, majorAxisLine);
                    break;
                case 3:
                    minorLatLng = Inte.treering.viewer.mouseEventToLatLng(e);
                    Inte.ellipseVisualAssets.createGuideMarker(minorLatLng);

                    // Ellipse rotates from the -x axis, not the +x axis. Thus, the directionCorrection found above
                    // must be multipled by -1. 
                    let degrees = -directionCorrection * radians * (180 / Math.PI);

                    // Create ellipse & save meta data: 
                    Inte.ellipseVisualAssets.createEllipse(centerLatLng, majorLatLngB, minorLatLng, degrees);
                    Inte.ellipseData.saveEllipseData(centerLatLng, majorLatLngB, minorLatLng, degrees);

                    // Reset event series: 
                    count = 0;
                    $(Inte.treering.viewer.getContainer()).off('mousemove');
                    Inte.ellipseVisualAssets.clearGuideMarkers();
                    Inte.ellipseVisualAssets.clearGuideLines();
            }
        });
    }
}

/**
 * Tool for selecting (lassoing) one or more existing ellipses.  
 * @constructor
 * 
 * @param {object} Inte - AreaCaptureInterface object. Allows access to all other tools.
 */
function LassoEllipses(Inte) {
    this.selectedData = [];
    this.selectedElements = [];

    this.active = false;
    this.shortcutsEnabled = false;
    this.btn = new Button (
        "blur_circular",
        "Lasso existing ellipses",
        () => {
            Inte.treering.disableTools(); 
            Inte.treering.collapseTools(); 
            this.enable() 
        },
        () => { this.disable() },
    );

    this.lasso = L.lasso(Inte.treering.viewer, {
        intersect: true,
        polygon: {
            color: "#FF0000", // Red coloring. 
            fillRule: "nonzero",
        }
    });
    this.lassoEventFinished = true;

    /**
     * Enable tool & assign shotcuts upon first enable. 
     * @function
     */
    LassoEllipses.prototype.enable = function() {
        this.btn.state('active');
        this.active = true;
        Inte.treering.viewer.getContainer().style.cursor = 'pointer';

        if (!this.shortcutsEnabled) {
            // Only do once when instantiated.
            // Otherwise multiple listeners will be assigned. 
            this.createShortcutEventListeners();
            
            this.shortcutsEnabled = true;
        }

        this.action();
    }

    /**
     * Disable tool.  
     * @function
     */
    LassoEllipses.prototype.disable = function() {
        this.btn.state('inactive');
        this.active = false;
        Inte.treering.viewer.getContainer().style.cursor = 'default';

        this.lasso.disable();
    }

    /**
     * Creates keyboard shortcut event listeners. Based on file selection shortcuts.   
     * @function
     */
    LassoEllipses.prototype.createShortcutEventListeners = function() {
        // Keyboard short cut for deselection all points: Ctrl - Z 
        L.DomEvent.on(window, 'keydown', (e) => {
            if (e.keyCode == 90 && !e.shiftKey && e.ctrlKey && this.active) {
                this.dehighlightSelected();
                this.deselectEllipses();
            }
         }, this);

        // Keyboard short cut for selecting additional points: Holding Ctrl
        L.DomEvent.on(window, 'keydown', (e) => {
            if (e.keyCode == 17 && this.lassoEventFinished && !e.shiftKey && this.active) {
                this.action(e);
            }
        }, this); 
        L.DomEvent.on(window, 'keyup', (e) => {
            // Prevents extra action after Ctrl is released. 
            if (e.keyCode == 17 && this.active) {
                this.lasso.disable();
                this.lassoEventFinished = true;
            }
        }, this); 
    }

    /**
     * Enables lasso plugin to select ellipeses then highlights each one.   
     * @function
     */
    LassoEllipses.prototype.action = function() {
        this.lasso.enable();
        this.lassoEventFinished = false;

        Inte.treering.viewer.on('lasso.finished', lassoed => {
            // lasso.finished evnt fires multiple times. Need variable to prevent repeated firing. 
            if (!this.lassoEventFinished) {
                this.selectEllipses(lassoed.layers);
                this.highlightSelected();
    
                this.lassoEventFinished = true;
            }
        });
    }

    /**
     * Selects all data and elements based on which layers lassoed by user. 
     * @function
     * 
     * @param {array} layers - Array of Leaflet layers/HTML elements. 
     */
    LassoEllipses.prototype.selectEllipses = function(layers) {
        layers.map(layer => {
            // Finds saved JSON data of ellipse based on latLng. 
            let data = Inte.ellipseData.data.find(dat => dat.latLng.equals(layer.getLatLng()));
            if (data && !data.selected) {
                data.selected = true;
                this.selectedData.push(data);

                // Finds saved Leaflet element of ellipse based on latLng. 
                let element = Inte.ellipseVisualAssets.elements.find(ele => ele.getLatLng().equals(layer.getLatLng()));
                this.selectedElements.push(element);
            } else {
                this.deselectEllipses(layer);
            }
        });
    }

    /**
     * Deselects all data and elements based on which layers lassoed by user. 
     * @function
     * 
     * @param {array} [layer = null] - Optional Leaflet layer. Include if only a single layer is to be deselected. 
     */
    LassoEllipses.prototype.deselectEllipses = function(layer = null) {
        // Deselect specific layer if specified. 
        if (layer) {
            let index = this.selectedData.findIndex(dat => dat.latLng.equals(layer.getLatLng()));
            if (index > -1) {
                this.selectedData[index].selected = false;
                this.selectedData.splice(index, 1);
                this.selectedElements.splice(index, 1);
            }
            return
        }

        this.selectedData.map(dat => dat.selected = false);

        this.selectedData = [];
        this.selectedElements = [];
    }

    /**
     * Highlights (changes element style) selected ellipses. 
     * @function
     */
    LassoEllipses.prototype.highlightSelected = function() {
        // Remove highlight from all before applying new color. 
        Inte.ellipseVisualAssets.elements.map(ele => {
            ele.setStyle({
                color: Inte.ellipseVisualAssets.ellipseColor,
            });
        });

        this.selectedElements.map(ele => {
            ele.setStyle({
                color: "#FFF000"
            });
        });
    }

    /**
     * Deighlights (reverts element style) selected ellipses. 
     * @function
     */
    LassoEllipses.prototype.dehighlightSelected = function() {
        this.selectedElements.map(ele => {
            ele.setStyle({
                color: Inte.ellipseVisualAssets.ellipseColor,
            });
        });
    }
}

/**
 * Various calulation related helper functions.  
 * @constructor
 * 
 * @param {object} Inte - AreaCaptureInterface object. Allows access to all other tools.
 */
function Calculator(Inte) {
    /**
     * Calculates distance between two locations. 
     * @function
     * 
     * @param {object} fromLatLng - Starting location.
     * @param {object} toLatLng - Ending location. 
     * @returns {float} Distance between the given points. 
     */
    Calculator.prototype.distance = function(fromLatLng, toLatLng) {
        return Math.sqrt(Math.pow(fromLatLng.lat - toLatLng.lat, 2) + Math.pow(fromLatLng.lng - toLatLng.lng, 2));
    }

    /**
     * Determines if a location is in the first quadrent relative to a central location. 
     * @function
     * 
     * @param {object} centralLatLng - Central location. 
     * @param {object} otherLatLng - Location to test. 
     * @returns {boolean} Whether or not the test location is in the first quadrent. 
     */
    Calculator.prototype.inFirstQuadrent = function(centralLatLng, otherLatLng) {
        let standardizedLat = otherLatLng.lat - centralLatLng.lat;
        let standardizedLng = otherLatLng.lng - centralLatLng.lng;

        return standardizedLat > 0 && standardizedLng > 0;
    }

    /**
     * Determines if a location is in the second quadrent relative to a central location. 
     * @function
     * 
     * @param {object} centralLatLng - Central location. 
     * @param {object} otherLatLng - Location to test. 
     * @returns {boolean} Whether or not the test location is in the second quadrent. 
     */
    Calculator.prototype.inSecondQuadrent = function(centralLatLng, otherLatLng) {
        let standardizedLat = otherLatLng.lat - centralLatLng.lat;
        let standardizedLng = otherLatLng.lng - centralLatLng.lng;
        
        return standardizedLat > 0 && standardizedLng < 0;
    }

    /**
     * Determines if a location is in the third quadrent relative to a central location. 
     * @function
     * 
     * @param {object} centralLatLng - Central location. 
     * @param {object} otherLatLng - Location to test. 
     * @returns {boolean} Whether or not the test location is in the third quadrent. 
     */
    Calculator.prototype.inThirdQuadrent = function(centralLatLng, otherLatLng) {
        let standardizedLat = otherLatLng.lat - centralLatLng.lat;
        let standardizedLng = otherLatLng.lng - centralLatLng.lng;
        
        return standardizedLat < 0 && standardizedLng < 0;
    }

    /**
     * Determines if a location is in the fourth quadrent relative to a central location. 
     * @function
     * 
     * @param {object} centralLatLng - Central location. 
     * @param {object} otherLatLng - Location to test. 
     * @returns {boolean} Whether or not the test location is in the fourth quadrent. 
     */
    Calculator.prototype.inFourthQuadrent = function(centralLatLng, otherLatLng) {
        let standardizedLat = otherLatLng.lat - centralLatLng.lat;
        let standardizedLng = otherLatLng.lng - centralLatLng.lng;
        
        return standardizedLat < 0 && standardizedLng > 0;
    }
}
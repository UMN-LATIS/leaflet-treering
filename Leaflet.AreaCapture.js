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
    
    this.btns = [this.newEllipse.btn];
    this.tools = [this.newEllipse];
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

    EllipseVisualAssets.prototype.createEllipse = function(centerLatLng, majorLatLng, minorLatLng, degrees) {
        const latLngToMetersConstant = 111139;
        const majorRadius = Inte.calculator.distance(centerLatLng, majorLatLng) * latLngToMetersConstant;
        const minorRadius = Inte.calculator.distance(centerLatLng, minorLatLng) * latLngToMetersConstant;

        let ellipse = L.ellipse(centerLatLng, [majorRadius, minorRadius], degrees);
        this.ellipseLayer.addLayer(ellipse);
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
        $(Inte.treering.viewer.getContainer()).off('mousemove');
        $(Inte.treering.viewer.getContainer()).mousemove(e => {
            this.guideLineLayer.clearLayers();

            let eventLatLng = Inte.treering.viewer.mouseEventToLatLng(e);

            let toLatLng = eventLatLng;
            if (radiansFromMajorAxis > 0) {
                // Direction of guide line is determined by if mouse is above or below the major axis. 
                let direction = (eventLatLng.lat > (majorAxisLine.slope * eventLatLng.lng + majorAxisLine.intercept)) ? 1 : -1;
                let length = Inte.calculator.distance(fromLatLng, eventLatLng);
                toLatLng = {
                    "lat": fromLatLng.lat + (direction * length * Math.sin(radiansFromMajorAxis)),
                    "lng": fromLatLng.lng + (direction * length * Math.cos(radiansFromMajorAxis)),
                };
            }
            
            let line = L.polyline([fromLatLng, toLatLng], {color: 'red'});
            this.guideLineLayer.addLayer(line);

            let tip = L.marker(toLatLng, { icon: L.divIcon({className: "fa fa-plus guide"}) });
            this.guideLineLayer.addLayer(tip);
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

    this.size = [160, 90];
    this.anchor = [50, 0];

    EllipseDialogs.prototype.open = function() {
        let element = document.getElementById("editDialog-AreaCapture-template").innerHTML;
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
            'minSize': [0, 0]
        }).setContent(content).addTo(Inte.treering.viewer);
        this.dialog.hideClose();

        this.createEventListeners();
    }

    EllipseDialogs.prototype.close = function() {
        if (this.dialog) this.dialog.destroy();
    }

    EllipseDialogs.prototype.update = function() {
        let content = this.template({
            "year": Inte.ellipseData.year,
        });

        this.dialog.setContent(content);
        this.createEventListeners();
    }

    EllipseDialogs.prototype.createEventListeners = function () {
        // Remeber dialog anchor position and size after changed. 
        $(this.dialog._map).on('dialog:resizeend', () => { this.size = this.dialog.options.size } );
        $(this.dialog._map).on('dialog:moveend', () => { this.anchor = this.dialog.options.anchor } );

        // Year editing buttons: 
        $("#AreaCapture-editYearBtn").on("click", () => {
            console.log("Edit year");
        });

        $("#AreaCapture-subtractYearBtn").on("click", () => {
            Inte.ellipseData.year--;
            this.update();
        });

        $("#AreaCapture-addYearBtn").on("click", () => {
            Inte.ellipseData.year++;
            this.update();
        });
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
        () => { this.enable() },
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

        $(Inte.treering.viewer.getContainer()).click(e => {
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
                    centerLatLng = {
                        "lat": (majorLatLngA.lat + majorLatLngB.lat) / 2,
                        "lng": (majorLatLngA.lng + majorLatLngB.lng) / 2,
                    }
                    Inte.ellipseVisualAssets.createGuideMarker(centerLatLng);

                    // Next guide line informs the minor axis. Minor axis must be 90 degrees from major axis. 
                    // Use CAH geometry rule to determine angle adjustment in radians: 
                    adjacentLatLng = {
                        "lat": centerLatLng.lat,
                        "lng": majorLatLngB.lng,
                    }
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
 * Tool for capturing area with ellipses. 
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
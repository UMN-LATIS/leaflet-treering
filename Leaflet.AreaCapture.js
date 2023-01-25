/**
 * @file Leaflet Area Capture 
 * @author Jessica Thorne <thorn573@umn.edu>
 * @version 1.0.0
 */

/**
 * Interface for anatomy area capture tools.
 * @constructor
 * @param {object} LTreering - Lt
 */
function AreaCaptureInterface(Lt) {
    this.calculator = new Calculator(this);

    this.ellipseData = new EllipseData(this, Lt);
    this.newEllipse = new NewEllipse(this, Lt); 
    
    this.btns = [this.newEllipse.btn];
    this.tools = [this.newEllipse];
    this.ellipseLayer = L.layerGroup().addTo(Lt.viewer);
    this.guideMarkerLayer = L.layerGroup().addTo(Lt.viewer);
    this.guideLineLayer = L.layerGroup().addTo(Lt.viewer);
}

/**
 * Storage of ellipse points.  
 * @constructor
 * @param {object} AreaCaptureInterface - Inte
 * @param {object} LTreering - Lt
 */
function EllipseData(Inte, Lt) {
    this.elements = [];
}

/**
 * Tool for capturing area with ellipses. 
 * @constructor
 * @param {object} AreaCaptureInterface - Inte
 * @param {object} LTreering - Lt
 */
function NewEllipse(Inte, Lt) {
    this.btn = new Button (
        'scatter_plot',
        'Create elliptical area measurements',
        () => { this.enable() },
        () => { this.disable() },
    );
    
    /**
     * Enable tool. 
     * @function
     */
    NewEllipse.prototype.enable = function() {
        this.btn.state('active');
        Lt.viewer.getContainer().style.cursor = 'pointer';

        this.action();
    }

    /**
     * Disable tool. 
     * @function
     */
    NewEllipse.prototype.disable = function() {
        this.btn.state('inactive');
        Lt.viewer.getContainer().style.cursor = 'default';

        $(Lt.viewer.getContainer()).off('click');
        Inte.guideMarkerLayer.clearLayers();

        $(Lt.viewer.getContainer()).off('mousemove');
        Inte.guideLineLayer.clearLayers();
    }

    /**
     * Drives events which create a new ellipse. 
     * @function
     */
    NewEllipse.prototype.action = function() {
        let count = 0;
        let centerLatLng, majorLatLngA, majorLatLngB, minorLatLng;
        let majorMarkerA, majorMarkerB;
        let radians, directionCorrection;

        $(Lt.viewer.getContainer()).click(e => {
            // Prevent jQuery event error.
            if (!e.originalEvent) return;

            count++;
            switch (count) {
                case 1:
                    majorLatLngA = Lt.viewer.mouseEventToLatLng(e);
                    majorMarkerA = this.createGuideMarker(majorLatLngA);
                    this.createGuideLine(majorLatLngA, -1, null);
                    break;
                case 2:
                    majorLatLngB = Lt.viewer.mouseEventToLatLng(e);
                    majorMarkerB = this.createGuideMarker(majorLatLngB);
                    this.connectMarkers(majorMarkerA, majorMarkerB);

                    // Find center of major axis: 
                    centerLatLng = {
                        "lat": (majorLatLngA.lat + majorLatLngB.lat) / 2,
                        "lng": (majorLatLngA.lng + majorLatLngB.lng) / 2,
                    }
                    this.createGuideMarker(centerLatLng);

                    // Use CAH geometry rule to determine radians in radians: 
                    adjacentLatLng = {
                        "lat": centerLatLng.lat,
                        "lng": majorLatLngB.lng,
                    }
                    radians = Math.acos(Inte.calculator.distance(centerLatLng, adjacentLatLng) / Inte.calculator.distance(centerLatLng, majorLatLngB));
                    // Radians value is always positive. If majorLatLngB is in the 2cd or 4th quadrent (in relation to centerLatLng),
                    // the radians must be multiplied by -1 to correct the rotation orientation. 
                    directionCorrection = (Inte.calculator.inFirstQuadrent(centerLatLng, majorLatLngB) || Inte.calculator.inThirdQuadrent(centerLatLng, majorLatLngB)) ? 1 : -1;
                    let rightRotatedRadians = (Math.PI / 2) + (directionCorrection * radians);

                    let slope = (majorLatLngA.lat - majorLatLngB.lat) / (majorLatLngA.lng - majorLatLngB.lng);
                    let intercept = majorLatLngA.lat - (slope * majorLatLngA.lng);
                    let majorAxisLine = {
                        "slope": slope,
                        "intercept": intercept,
                    }

                    this.createGuideLine(centerLatLng, rightRotatedRadians, majorAxisLine);
                    break;
                case 3:
                    minorLatLng = Lt.viewer.mouseEventToLatLng(e);
                    this.createGuideMarker(minorLatLng);

                    const latLngToMetersConstant = 111139;
                    const majorRadius = Inte.calculator.distance(centerLatLng, majorLatLngB) * latLngToMetersConstant;
                    const minorRadius = Inte.calculator.distance(centerLatLng, minorLatLng) * latLngToMetersConstant;

                    // Ellipse rotates from the -x axis, not the +x axis. Thus, the directionCorrection found above
                    // must be multipled by -1. 
                    let degrees = -directionCorrection * radians * (180 / Math.PI);
                    let ellipse = L.ellipse(centerLatLng, [majorRadius, minorRadius], degrees);
                    Inte.ellipseLayer.addLayer(ellipse);

                    // Reset event series: 
                    count = 0;
                    $(Lt.viewer.getContainer()).off('mousemove');
                    Inte.guideMarkerLayer.clearLayers();
                    Inte.guideLineLayer.clearLayers();
            }
        });
    }

    /**
     * Creates mousemove event that create a guide line some given angle from a point to the mouse. 
     * @function
     * @param {object} LatLng - fromLatLng
     * @param {float} Radian - radiansFromMajorAxis
     */
    NewEllipse.prototype.createGuideLine = function(fromLatLng, radiansFromMajorAxis, majorAxisLine) {
        $(Lt.viewer.getContainer()).off('mousemove');
        $(Lt.viewer.getContainer()).mousemove(e => {
            Inte.guideLineLayer.clearLayers();

            let eventLatLng = Lt.viewer.mouseEventToLatLng(e);

            let toLatLng = eventLatLng;
            if (radiansFromMajorAxis > 0) {
                let direction = (eventLatLng.lat > (majorAxisLine.slope * eventLatLng.lng + majorAxisLine.intercept)) ? 1 : -1;
                let length = Inte.calculator.distance(fromLatLng, eventLatLng);
                toLatLng = {
                    "lat": fromLatLng.lat + (direction * length * Math.sin(radiansFromMajorAxis)),
                    "lng": fromLatLng.lng + (direction * length * Math.cos(radiansFromMajorAxis)),
                };
            }
            
            let line = L.polyline([fromLatLng, toLatLng], {color: 'red'});
            Inte.guideLineLayer.addLayer(line);

            let tip = L.marker(toLatLng, { icon: L.divIcon({className: "fa fa-plus guide"}) });
            Inte.guideLineLayer.addLayer(tip);
        })
    }

    /**
     * Creates click event to get center, major radius, and minor radius of new ellipse. 
     * @function
     */
    NewEllipse.prototype.createGuideMarker = function(latLng) {
        let marker = L.marker(latLng, { icon: L.divIcon({className: "fa fa-plus guide"}) });
        Inte.guideMarkerLayer.addLayer(marker);

        return marker;
    }

    /**
     * Draws line between two markers.  
     * @function
     */
    NewEllipse.prototype.connectMarkers = function(fromMarker, toMarker) {
        let fromLatLng = fromMarker.getLatLng();
        let toLatLng = toMarker.getLatLng();

        let line = L.polyline([fromLatLng, toLatLng], {color: 'red'});
        Inte.guideMarkerLayer.addLayer(line);
    }
}

/**
 * Tool for capturing area with ellipses. 
 * @constructor
 * @param {object} AreaCaptureInterface - Inte
 */
function Calculator(Inte) {
    Calculator.prototype.distance = function(fromLatLng, toLatLng) {
        return Math.sqrt(Math.pow(fromLatLng.lat - toLatLng.lat, 2) + Math.pow(fromLatLng.lng - toLatLng.lng, 2));
    }

    Calculator.prototype.inFirstQuadrent = function(centralLatLng, otherLatLng) {
        let standardizedLat = otherLatLng.lat - centralLatLng.lat;
        let standardizedLng = otherLatLng.lng - centralLatLng.lng;

        return standardizedLat > 0 && standardizedLng > 0;
    }

    Calculator.prototype.inSecondQuadrent = function(centralLatLng, otherLatLng) {
        let standardizedLat = otherLatLng.lat - centralLatLng.lat;
        let standardizedLng = otherLatLng.lng - centralLatLng.lng;
        
        return standardizedLat > 0 && standardizedLng < 0;
    }

    Calculator.prototype.inThirdQuadrent = function(centralLatLng, otherLatLng) {
        let standardizedLat = otherLatLng.lat - centralLatLng.lat;
        let standardizedLng = otherLatLng.lng - centralLatLng.lng;
        
        return standardizedLat < 0 && standardizedLng < 0;
    }

    Calculator.prototype.inFourthQuadrent = function(centralLatLng, otherLatLng) {
        let standardizedLat = otherLatLng.lat - centralLatLng.lat;
        let standardizedLng = otherLatLng.lng - centralLatLng.lng;
        
        return standardizedLat < 0 && standardizedLng > 0;
    }
}
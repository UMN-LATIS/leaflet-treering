/**
 * @file Leaflet BSI Analysis
 * @author Jessica Thorne <thorn573@umn.edu>
 * @version 1.0.0
 */

const { point } = require("leaflet");

/**
 * Interface for BSI analysis tools. 
 * @constructor
 * 
 * @param {object} Lt - LTreering object from leaflet-treering.js. 
 */
function BSIInterface(Lt) {
    this.treering = Lt;

    this.data = new Data(this);
    this.visualAssets = new VisualAssets(this);

    this.newBSIAnalysis = new NewBSIAnalysis(this);

    this.btns = [this.newBSIAnalysis.btn];
    this.tools = [this.newBSIAnalysis];
}

/**
 * Storage of BSI analysis data.
 * @constructor
 * 
 * @param {object} Inte - BSIInterface object. Allows access to all other tools.  
 */
function Data(Inte) {
    console.log("Data");
}

/**
 * Manage visual assets related to BSI.  
 * @constructor
 * 
 * @param {object} Inte - BSIInterface object. Allows access to all other tools.  
 */
function VisualAssets(Inte) {
    this.polygonLayer = L.layerGroup().addTo(Inte.treering.viewer);
    
    VisualAssets.prototype.drawPolygons = function(points) {
        let height = 20; // user option
        let width = 0;
        let angle = 0;

        let afterBoundaryPercent = 0.2 // user option
        let beforeBoundaryPercent = 0.5 // user option
        let afterBoundary, beforeBoundary;

        let pt, prevPt;
        let vertices, rotatedVertices;
        let polygon;

        // Skip inital start point. 
        for (let i = 1; i < points.length; i++) {
            if (points[i].year) {
                prevPt = Inte.treering.viewer.latLngToLayerPoint(points[i-1].latLng);
                pt = Inte.treering.viewer.latLngToLayerPoint(points[i].latLng);

                width = this.distanceCalc(pt, prevPt);
                afterBoundary = width*afterBoundaryPercent;
                beforeBoundary = width*beforeBoundaryPercent;

                // Step 1: Define rectangle width and height. 
                vertices = [
                    L.point(-beforeBoundary,-height),
                    L.point(-beforeBoundary,height),
                    L.point(afterBoundary,height),
                    L.point(afterBoundary,-height)
                ];

                // Step 2: Rotate rectangle about origin (0,0).
                angle = Math.atan2(pt.y - prevPt.y, pt.x - prevPt.x);
                rotatedVertices = vertices.map(v => this.rotatePoint(v, angle));

                // Step 3: Translate ratated rectangle to center at measurement point. 
                rotatedVertices = rotatedVertices.map(v => {
                    v.x += pt.x;
                    v.y += pt.y;
                    return Inte.treering.viewer.layerPointToLatLng(v);
                });

                polygon = L.polygon(rotatedVertices, {color: "red"});
                this.polygonLayer.addLayer(polygon);
            }
        }
    }

    VisualAssets.prototype.clearPolygons = function() {
        this.polygonLayer.clearLayers();
    }

    VisualAssets.prototype.rotatePoint = function(point, angle) {
        let x = Math.cos(angle)*point.x - Math.sin(angle)*point.y;
        let y = Math.sin(angle)*point.x + Math.cos(angle)*point.y;

        return L.point(x, y);
    }

    /**
    * Calculate the distance between 2 points.
    * @function 
    * @param {object} pointA
    * @param {object} pointB
    */
    VisualAssets.prototype.distanceCalc = function(pointA, pointB) {
      return Math.sqrt(Math.pow((pointB.x - pointA.x), 2) +
                       Math.pow((pointB.y - pointA.y), 2));
    };
}

/**
 * Create new BSI analysis of pixel ratios.  
 * @constructor
 * 
 * @param {object} Inte - BSIInterface object. Allows access to all other tools.  
 */
function NewBSIAnalysis(Inte) {
    this.btn = new Button (
        'grid_on',
        'Create new BSI analysis',
        () => { Inte.treering.disableTools(); this.enable() },
        () => { this.disable() },
    );

    this.anchors = [];

    /**
     * Enable tool by activating button. 
     * @function
     */
    NewBSIAnalysis.prototype.enable = function() {
        if (Inte.treering.data.points.length < 2) {
            alert("Error: Measurements must exist to perform BSI analysis.");
            return
        }

        this.btn.state('active');
        Inte.visualAssets.clearPolygons();
        this.action();
    }

    /**
     * Disable tool by removing all events & setting button to inactive.  
     * @function
     */
    NewBSIAnalysis.prototype.disable = function() {
        this.btn.state('inactive');
        this.enabled = false;
        Inte.treering.viewer.getContainer().style.cursor = 'default';
    }

    /**
     * Begins BSI analysis action chain. 
     * @function
     */
    NewBSIAnalysis.prototype.action = function() {
        this.getAnchors();
        Inte.visualAssets.drawPolygons(this.anchors);
    }

    NewBSIAnalysis.prototype.getAnchors = function() {
        let points = (Inte.treering.measurementOptions.forwardDirection) ? Inte.treering.data.points : Inte.treering.helper.reverseData();

        let annual = !Inte.treering.measurementOptions.subAnnual;
        let subAnnual = Inte.treering.measurementOptions.subAnnual;
        let anchors = points.filter(pt => 
            (annual || (subAnnual && !pt.earlywood)) // Boundry point check.
        );

        this.anchors = anchors;
    }
}
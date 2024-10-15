/**
 * @file Leaflet BSI Analysis
 * @author Jessica Thorne <thorn573@umn.edu>
 * @version 1.0.0
 */

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
    this.directionalPolygonLayer = L.layerGroup().addTo(Inte.treering.viewer);
    this.samplingPolygonLayer = L.layerGroup().addTo(Inte.treering.viewer);

    this.defaultZoom = 0;
    
    VisualAssets.prototype.drawDirectionalPolygons = function(points) {
        let sampleSpaceVertices = [];

        let height = 100; // user option
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

                sampleSpaceVertices.push(rotatedVertices);
                polygon = L.polygon(rotatedVertices, {color: "red"});
                this.directionalPolygonLayer.addLayer(polygon);
            }
        }

        return sampleSpaceVertices;
    }

    VisualAssets.prototype.drawSamplingPolygons = function(sampleSpaceVertices) {
        let searchSpaceVertices = [];
        let top, bottom, left, right;
        let polygon;

        let sampleVertices = [];
        for (let vertices of sampleSpaceVertices) {
            top = -Number.MAX_SAFE_INTEGER;
            bottom = Number.MAX_SAFE_INTEGER;
            left = Number.MAX_SAFE_INTEGER;
            right = -Number.MAX_SAFE_INTEGER;
            for (let v of vertices) {
                if (v.lat > top) top = v.lat;
                if (v.lat < bottom) bottom = v.lat;
                if (v.lng < left) left = v.lng;
                if (v.lng > right) right = v.lng;
            }

            sampleVertices = [
                L.latLng(top, left),
                L.latLng(top, right),
                L.latLng(bottom, right),
                L.latLng(bottom, left)
            ];

            searchSpaceVertices.push(sampleVertices);
            polygon = L.polygon(sampleVertices, {color: "white", fill: false, dashArray: [10, 10]});
            this.samplingPolygonLayer.addLayer(polygon);
        }

        return searchSpaceVertices;
    }

    VisualAssets.prototype.clearPolygons = function() {
        this.directionalPolygonLayer.clearLayers();
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

    VisualAssets.prototype.zoomIn = function() {
        this.defaultZoom = Inte.treering.viewer.getZoom();
        Inte.treering.viewer.zoomIn(999);
    }

    VisualAssets.prototype.zoomOut = function() {
        Inte.treering.viewer.setZoom(this.defaultZoom);
    }
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
    this.sampleSpaceVertices = [];
    this.searchSpaceVertices = [];
    this.sampleLatLngs = [];
    this.rgbValues = [];

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
        Inte.treering.viewer.on("zoomend", () => {
            Inte.treering.viewer.off("zoomend");

            this.getAnchors();
            this.sampleSpaceVertices = Inte.visualAssets.drawDirectionalPolygons(this.anchors);
            this.searchSpaceVertices = Inte.visualAssets.drawSamplingPolygons(this.sampleSpaceVertices);
            this.getSampleLatLngs();
            this.startTileCaterpillar();
        });
        Inte.visualAssets.zoomIn();
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

    NewBSIAnalysis.prototype.getSampleLatLngs = function() {
        let delta = 10; // user option

        let startPoint, endPoint, P;
        let startX, startY;
        let endX, endY;

        let searchSpace, sampleSpace;
        let A, B, C, D;
        let rectangleArea, triangleArea;

        let arr, latLng;
        this.sampleLatLngs = [];
        for (let i = 0; i < this.searchSpaceVertices.length; i++) {
            searchSpace = this.searchSpaceVertices[i];
            sampleSpace = this.sampleSpaceVertices[i];

            // Rotated rectangle to search in:
            A = Inte.treering.viewer.latLngToLayerPoint(sampleSpace[0]);
            B = Inte.treering.viewer.latLngToLayerPoint(sampleSpace[1]);
            C = Inte.treering.viewer.latLngToLayerPoint(sampleSpace[2]);
            D = Inte.treering.viewer.latLngToLayerPoint(sampleSpace[3]);
            ABDistance = this.findDistance(A, B);
            BCDistance = this.findDistance(B, C);
            // Add 5 pixel buffer to account for rounding errors. 
            rectangleArea = Math.ceil(ABDistance * BCDistance)+5;

            // All searchSpaceVertices elements start at the top-left point, then rotate clockwise around the rectangle.
            // Goal is to traverse from top-left to bottom-right and collect RGB values.  
            startPoint = Inte.treering.viewer.latLngToLayerPoint(searchSpace[0]);
            startX = startPoint.x;
            startY = startPoint.y

            endPoint = Inte.treering.viewer.latLngToLayerPoint(searchSpace[2]);
            endX = endPoint.x;
            endY = endPoint.y;

            // Use triangle geometry to detemrine if the search point is which the sample space. 
            arr = [];
            for (let x = startX; x < endX; x += delta) {
                for (let y = startY; y < endY; y += delta) {
                    // Point to check:
                    P = L.point(x, y);

                    // Must find areas of △APD, △DPC, △CPB, △PBA.
                    APDArea = this.findTriangleArea(A, P, D);
                    DPCArea = this.findTriangleArea(D, P, C);
                    CPBArea = this.findTriangleArea(C, P, B);
                    PBAArea = this.findTriangleArea(P, B, A);
                    triangleArea = APDArea + DPCArea + CPBArea + PBAArea;


                    if (triangleArea <= rectangleArea) {
                        latLng = Inte.treering.viewer.layerPointToLatLng(P);
                        arr.push(latLng);
                    }
                }
            }
            this.sampleLatLngs.push(arr);
        }
    }
    
    NewBSIAnalysis.prototype.findDistance = function(A, B) {
        return Math.sqrt(Math.pow((A.x - B.x), 2) + Math.pow((A.y - B.y), 2));
    }

    NewBSIAnalysis.prototype.findTriangleArea = function(A, B, C) {
        return Math.abs((B.x * A.y - A.x * B.y) + (C.x * B.y - B.x * C.y) + (A.x * C.y - C.x * A.y)) / 2;
    }

    NewBSIAnalysis.prototype.startTileCaterpillar = function() {
        let i = 1;
        let length = this.anchors.length;
        let anchor = Inte.newBSIAnalysis.anchors[i];
        let val, count = 0;
        let j;
        $(Inte.treering.tileLayer).bind("load mouveend", () => {
            count = 0
            if (this.sampleLatLngs[i]?.length) {
                for (let latLng of this.sampleLatLngs[i]) {
                    Inte.treering.baseLayer['GL Layer'].getColor(latLng);
                    // val = Inte.treering.baseLayer['GL Layer'].getColor(latLng);
                    
                    // j = 0;
                    // while (!val && j < 10) {
                    //     val = Inte.treering.baseLayer['GL Layer'].getColor(latLng);
                    //     j++;
                    // }
                    // count++;
                    
                    // this.rgbValues.push(val);
                }
                console.log(count, this.sampleLatLngs[i].length);
            }

            i++;
            if (i < length) {
                anchor = Inte.newBSIAnalysis.anchors[i];
                Inte.treering.viewer.setView(anchor.latLng);
            };
        });
        Inte.treering.viewer.setView(anchor.latLng);
    }
}
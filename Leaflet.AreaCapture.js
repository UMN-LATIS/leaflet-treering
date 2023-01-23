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
    this.ellipticalCapture = new EllipticalCapture(this, Lt); 
    
    this.layer = L.layerGroup().addTo(Lt.viewer);
    this.btns = [this.ellipticalCapture.btn];
    this.tools = [this.ellipticalCapture];
}

/**
 * Tool for capturing area with ellipses. 
 * @constructor
 * @param {object} AreaCaptureInterface - Inte
 * @param {object} LTreering - Lt
 */
function EllipticalCapture(Inte, Lt) {
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
    EllipticalCapture.prototype.enable = function() {
        this.btn.state('active');
        Lt.viewer.getContainer().style.cursor = 'pointer';

        this.action();
    }

    /**
     * Disable tool. 
     * @function
     */
    EllipticalCapture.prototype.disable = function() {
        this.btn.state('inactive');
        Lt.viewer.getContainer().style.cursor = 'default';
        $(Lt.viewer.getContainer()).off('click');
    }

    /**
     * Tools action.  
     * @function
     */
    EllipticalCapture.prototype.action = function() {
        this.createGeometry();
    }

    /**
     * Creates click event to get center, major radius, and minor radius of new ellipse. 
     * @function
     */
    EllipticalCapture.prototype.createGeometry = function() {
        let count = 0;
        let centerLatLng, majorLatLng, minorLatLng;

        $(Lt.viewer.getContainer()).click(e => {
            // Prevent jQuery event error.
            if (!e.originalEvent) return;

            count++;
            switch (count) {
                case 1:
                    centerLatLng = Lt.viewer.mouseEventToLatLng(e);
                    break;
                case 2:
                    majorLatLng = Lt.viewer.mouseEventToLatLng(e);
                    break;
                case 3:
                    minorLatLng = Lt.viewer.mouseEventToLatLng(e);

                    const latLngToMetersConstant = 111139;
                    const majorRadius = Math.sqrt(Math.pow(centerLatLng.lat - majorLatLng.lat, 2) + Math.pow(centerLatLng.lng - majorLatLng.lng, 2)) * latLngToMetersConstant;
                    const minorRadius = Math.sqrt(Math.pow(centerLatLng.lat - minorLatLng.lat, 2) + Math.pow(centerLatLng.lng - minorLatLng.lng, 2)) * latLngToMetersConstant;

                    let ellipse = L.ellipse(centerLatLng, [majorRadius, minorRadius]);
                    ellipse.addTo(Lt.viewer);
                    count = 0;
            }
        });
    }
}
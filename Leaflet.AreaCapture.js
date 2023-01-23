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
    this.ellipticalCapture = new EllipticalCapture(this); 
    
    this.btns = [this.ellipticalCapture.btn];
  }

/**
 * Tool for capturing area with ellipses. 
 * @constructor
 * @param {object} AreaCaptureInterface - Inte
 */
function EllipticalCapture(Inte) {
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
        this.action();
    }

    /**
     * Disable tool. 
     * @function
     */
    EllipticalCapture.prototype.disable = function() {
        this.btn.state('inactive');
    }

    /**
     * Perform tools action.  
     * @function
     */
    EllipticalCapture.prototype.action = function() {
        helloWorldTest();
    };
}
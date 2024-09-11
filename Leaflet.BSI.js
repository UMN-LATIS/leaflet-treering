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
    console.log("Visual assets");
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
        console.log("bsi action")
    }

    NewBSIAnalysis.prototype.getAnchors = function() {
        console.log("anchors")
    }
}
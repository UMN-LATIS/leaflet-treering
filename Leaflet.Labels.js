/**
 * @file Leaflet Labels 
 * @author Jessica Thorne <thorn573@umn.edu>
 * @version 1.0.0
 */

/**
 * Interface for labeling tools. Instantiates & connects all area or supporting tools. 
 * @constructor
 * 
 * @param {object} Lt - LTreering object from leaflet-treering.js. 
 */
function LabelsInterface(Lt) {
    this.treering = Lt;
    
    // Order in btns array dictates order in button dropdown in browser. 
    this.btns = [];
    this.tools = [];
}
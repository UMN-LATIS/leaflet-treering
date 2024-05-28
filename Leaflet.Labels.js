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

    this.labelsData = new LabelsData(this);
    this.labelsVisualAssets = new LabelsVisualAssets(this);

    this.labelColors = new LabelColors(this);
    this.deleteLabel = new DeleteLabel(this);

    let circleLabel = new NewLabel(this, "circle", "circle", "Add circular label");
    let squareLabel = new NewLabel(this, "square", "crop_square", "Add square label");
    let triangleLabel = new NewLabel(this, "triangle", "change_history", "Add triangular label");
    
    // Order in btns array dictates order in button dropdown in browser. 
    this.btns = [
        circleLabel.btn, 
        squareLabel.btn,
        triangleLabel.btn
    ];
    this.tools = [
        circleLabel,
        squareLabel,
        triangleLabel
    ];
}

function LabelsData(Inte) {
    this.data = [];

    LabelsData.prototype.saveLabelData = function(latLng, iconClass) {
        let newDataElement = {
            "latLng": latLng,
            "iconClass": iconClass,
            "color": Inte.labelColors.color,
        }

        this.data.push(newDataElement);
    }

    LabelsData.prototype.removeLabelData = function(index) {
        this.data.splice(index, 1);
    }
}

function LabelsVisualAssets(Inte) {
    this.elements = [];
    this.labelLayer = L.layerGroup().addTo(Inte.treering.viewer);

    LabelsVisualAssets.prototype.createLabel = function(latLng, iconClass) {
        let divIcon = L.divIcon({
            className: iconClass + " " + Inte.labelColors.color,
        });
        
        let marker = L.marker(latLng, {
            icon: divIcon,
            draggable: true,
            riseOnHover: true,
          });
        this.labelLayer.addLayer(marker);
        this.elements.push(marker);
        
        // Add event for deleting label. 
        let index = this.elements.length - 1;
        marker.on('click', event => {
            if (Inte.treering.universalDelete.btn.active) {
                Inte.deleteLabel.action(index);
            };
        });
    }

    LabelsVisualAssets.prototype.removeLabel = function(index) {
        this.labelLayer.removeLayer(this.elements[index]);
    }
}

function NewLabel(Inte, iconClass, materialIcon, hoverText) {
    this.iconClass = iconClass;

    this.btn = new Button (
        materialIcon,
        hoverText,
        () => { Inte.treering.disableTools(); this.enable() },
        () => { this.disable() },
    );

    NewLabel.prototype.enable = function() {
        this.btn.state('active');
        Inte.treering.viewer.getContainer().style.cursor = 'pointer';

        // Push change to undo stack: 
        // Inte.treering.undo.push();

        this.action();
    }

    NewLabel.prototype.disable = function() {
        this.btn.state('inactive');
        Inte.treering.viewer.getContainer().style.cursor = 'default';
        $(Inte.treering.viewer.getContainer()).off('click');
    }

    NewLabel.prototype.action = function() {
        $(Inte.treering.viewer.getContainer()).on("click", event => {
            // Prevent jQuery event error.
            if (!event.originalEvent) return;

            let latLng = Inte.treering.viewer.mouseEventToLatLng(event);
            Inte.labelsVisualAssets.createLabel(latLng, this.iconClass);
            Inte.labelsData.saveLabelData(latLng, this.iconClass);
        });
    }
}

function DeleteLabel(Inte) {
    DeleteLabel.prototype.action = function(index) {
        Inte.labelsVisualAssets.removeLabel(index);
        Inte.labelsData.removeLabelData(index);

        console.log(Inte.labelsData.data);
    }
}

function LabelColors(Inte) {
    this.color = "red";

    this.btn = new Button (
        "colors",
        "Change next label color",
        () => { Inte.treering.disableTools(); this.enable() },
        () => { this.disable() },
    );

    LabelColors.prototype.enable = function() {
        console.log("enable")
    }

    LabelColors.prototype.disable = function() {
        console.log("disable")
    }
}
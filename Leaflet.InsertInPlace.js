/**
 * Interface for zero growth years and core breaks. Instantiates & connects all area or supporting tools. 
 * @constructor
 * 
 * @param {object} Lt - LTreering object from leaflet-treering.js. 
 */
function InsertInPlaceInterface(Lt) {
    this.treering = Lt;
    this.insertCoreBreak = new InsertCoreBreak(this);
    this.insertZeroGrowth = new InsertZeroGrowth(this);
}

/**
 * Insert a zero growth measurement in the middle of a chronology
 * @constructor
 * @param {Ltrering} Lt - Leaflet treering object
 */
function InsertZeroGrowth(Inte) {
  this.title = "Insert zero width year: ";
  this.desc = "To insert a zero width year, you must adjust the dating of earlier or later points.";
  this.optA = "shift dating of later points forward in time";
  this.optB = "shift dating of earlier points back in time";
  this.size = [312, 230];
  this.adjustOuter = false;
  this.selectedAdjustment = false;
  this.maintainAdjustment = false;

  this.active = false;
  this.btn = new Button(
    'exposure_zero',
    'Insert a year with 0 mm width between two other points ',
    () => { Inte.treering.disableTools(); this.enable() },
    () => { this.disable() }
  );

  /**
   * Insert a zero growth year after point i
   * @function action
   * @param i int - index of a point to add a zero growth year after
   */
  InsertZeroGrowth.prototype.action = function(i) {
    var latLng = Inte.treering.data.points[i].latLng;

    Inte.treering.undo.push();

    var k = Inte.treering.data.insertZeroGrowth(i, latLng);
    if (k !== null) {
      Inte.treering.visualAsset.reload();
    }

    this.disable();
  };

  /**
   * Open dialog for user to choose shift direction
   * @function openDialog
   */
  InsertZeroGrowth.prototype.openDialog = function(e, i) {
    if (this.maintainAdjustment) {
      this.action(i);
    } else {
      Inte.treering.helper.createEditToolDialog(e.containerPoint.x, e.containerPoint.y, i, "insertZeroGrowth");
    }
  };

  /**
   * Enable adding a zero growth year
   * @function enable
   */
  InsertZeroGrowth.prototype.enable = function() {
    this.btn.state('active');
    this.active = true;
    this.selectedAdjustment = false;
    Inte.treering.viewer.getContainer().style.cursor = 'pointer';
  };

  /**
   * Disable adding a zero growth year
   * @function disable
   */
  InsertZeroGrowth.prototype.disable = function() {
    $(Inte.treering.viewer.getContainer()).off('click');
    this.btn.state('inactive');
    Inte.treering.viewer.getContainer().style.cursor = 'default';
    this.active = false;
    this.selectedAdjustment = false;
    Inte.treering.viewer.dragging.enable();
    Inte.treering.mouseLine.disable();
  };

}

/**
 * Insert a core break indicator in the middle of a chronology
 * @constructor
 * @param {Ltrering} Lt - Leaflet treering object
 */
function InsertCoreBreak(Inte) {
  this.title = "Insert a core break: ";
  this.desc = "To insert a core break, you must adjust the dating of earlier or later points.";
  this.optA = "shift dating of later points forward in time";
  this.optB = "shift dating of earlier points back in time";
  this.size = [312, 230];
  this.adjustOuter = false;
  this.selectedAdjustment = false;
  this.maintainAdjustment = false;

  this.active = false;
  this.btn = new Button(
    'exposure_neg_1',
    'Insert a year with -1 mm width between two other points to denote a core break ',
    () => { Inte.treering.disableTools(); this.enable() },
    () => { this.disable() }
  );

  /**
   * Insert a core break indicator after point i
   * @function action
   * @param i int - index of a point to add a zero growth year after
   */
  InsertCoreBreak.prototype.action = function(i) {
    var latLng = Inte.treering.data.points[i].latLng;

    Inte.treering.undo.push();

    //Core breaks have the same logic for creaating points as zero growth years
    var k = Inte.treering.data.insertZeroGrowth(i, latLng);
    if (k !== null) {
      this.setMeasurement(i);
      Inte.treering.visualAsset.reload();

      if (Inte.treering.dataAccessInterface.viewDataDialog.dialogOpen) {
        Inte.treering.dataAccessInterface.viewDataDialog.reload()
      }
    }

  };

  /**
   * Open dialog for user to choose shift direction
   * @function openDialog
   */
  InsertCoreBreak.prototype.openDialog = function(e, i) {
    if (this.maintainAdjustment) {
      this.action(i);
    } else {
      Inte.treering.helper.createEditToolDialog(e.containerPoint.x, e.containerPoint.y, i, "insertCoreBreak");
    }
  };

  /**
   * Give a point object a property indicating there is a core break present
   * @param {*} i int - index of a point to add a zero growth year after
   */
  InsertCoreBreak.prototype.setMeasurement = function(i) {
    let forward = Inte.treering.measurementOptions.forwardDirection;
    if (forward) { 
      Inte.treering.data.points[i+1].corebreak = true; 
      //ew and lw points must be set as core breaks
      if (Inte.treering.measurementOptions.subAnnual) {
        Inte.treering.data.points[i+2].corebreak = true; 
      }
    }
    if (!forward) { 
      Inte.treering.data.points[i].corebreak = true;
      //ew and lw points must be set as core breaks
      if (Inte.treering.measurementOptions.subAnnual) {
        Inte.treering.data.points[i+1].corebreak = true; 
      }
    }

    console.log(Inte.treering.data.points)
  };

  /**
   * Enable adding a zero growth year
   * @function enable
   */
  InsertCoreBreak.prototype.enable = function() {
    this.btn.state('active');
    this.active = true;
    this.selectedAdjustment = false;
    Inte.treering.viewer.getContainer().style.cursor = 'pointer';
  };

  /**
   * Disable adding a zero growth year
   * @function disable
   */
  InsertCoreBreak.prototype.disable = function() {
    $(Inte.treering.viewer.getContainer()).off('click');
    this.btn.state('inactive');
    Inte.treering.viewer.getContainer().style.cursor = 'default';
    this.active = false;
    this.selectedAdjustment = false;
    Inte.treering.viewer.dragging.enable();
    Inte.treering.mouseLine.disable();
  };

  }


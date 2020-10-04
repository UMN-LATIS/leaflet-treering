/**
 * @file Leaflet Treering
 * @author Malik Nusseibeh <nusse007@umn.edu>
 * @version 1.0.0
 */

// 'use strict';

/**
 * A leaflet treering object
 * @constructor
 * @param {Leaflet Map Object} viewer - the leaflet map object that will used
 *   as a viewer for treering image.
 * @param {string} basePath - this is a path to the treering image folder
 * @param {object} options -
 */
function LTreering (viewer, basePath, options) {
  this.viewer = viewer;
  this.basePath = basePath;

  //options
  this.meta = {
    'ppm': options.ppm || 468,
    'saveURL': options.saveURL || '',
    'savePermission': options.savePermission || false,
    'popoutUrl': options.popoutUrl || null,
    'assetName': options.assetName || 'N/A',
  }

  this.preferences = { // catch for if forwardDirection or subAnnual are undefined/null on line ~2830
    'forwardDirection': options.initialData.forwardDirection,
    'subAnnual': options.initialData.subAnnual
  }

  this.measurementOptions = new MeasurementOptions(this);

  this.data = new MeasurementData(options.initialData, this);
  this.aData = new AnnotationData(options.initialData.annotations);
  if (options.initialData.ppm) {
    this.meta.ppm = options.initialData.ppm;
  }

  //error alerts in 'measuring' mode aka popout window
  //will not alert in 'browsing' mode aka DE browser window
  if (window.name.includes('popout') && options.ppm === 0 && !options.initialData.ppm) {
    alert('Calibration needed: set ppm in asset metadata or use calibration tool.');
  }

  this.autoscroll = new Autoscroll(this.viewer);
  this.mouseLine = new MouseLine(this);
  this.visualAsset = new VisualAsset(this);
  this.annotationAsset = new AnnotationAsset(this);
  this.panhandler = new Panhandler(this);

  this.scaleBarCanvas = new ScaleBarCanvas(this);

  this.popout = new Popout(this);
  this.undo = new Undo(this);
  this.redo = new Redo(this);

  this.viewData = new ViewData(this);

  this.imageAdjustment = new ImageAdjustment(this);
  this.calibration = new Calibration(this);

  this.createAnnotation = new CreateAnnotation(this);
  this.deleteAnnotation = new DeleteAnnotation(this);
  this.editAnnotation = new EditAnnotation(this);

  this.dating = new Dating(this);

  this.createPoint = new CreatePoint(this);
  this.zeroGrowth = new CreateZeroGrowth(this);
  this.createBreak = new CreateBreak(this);

  this.deletePoint = new DeletePoint(this);
  this.cut = new Cut(this);
  this.insertPoint = new InsertPoint(this);
  this.insertZeroGrowth = new InsertZeroGrowth(this);
  this.insertBreak = new InsertBreak(this);

  this.saveLocal = new SaveLocal(this);
  this.loadLocal = new LoadLocal(this);
  var ioBtns = [this.saveLocal.btn, this.loadLocal.btn];
  if (options.savePermission) {
    this.saveCloud = new SaveCloud(this);
    ioBtns.push(this.saveCloud.btn);
  }


  this.undoRedoBar = new L.easyBar([this.undo.btn, this.redo.btn]);
  this.annotationTools = new ButtonBar(this, [this.createAnnotation.btn, this.deleteAnnotation.btn, this.editAnnotation.btn], 'comment', 'Manage annotations');
  this.createTools = new ButtonBar(this, [this.createPoint.btn, this.zeroGrowth.btn, this.createBreak.btn], 'straighten', 'Create new measurements');
  // add this.insertBreak.btn below once fixed
  this.editTools = new ButtonBar(this, [this.deletePoint.btn, this.cut.btn, this.insertPoint.btn, this.insertZeroGrowth.btn], 'edit', 'Edit measurements');
  this.ioTools = new ButtonBar(this, ioBtns, 'folder_open', 'Manage JSON data');
  if (window.name.includes('popout'))
    this.settings = new ButtonBar(this, [this.imageAdjustment.btn, this.measurementOptions.btn, this.calibration.btn], 'settings', 'Change image, measurement, and calibration settings');
  else
    this.settings = new ButtonBar(this, [this.imageAdjustment.btn, this.measurementOptions.btn], 'settings', 'Change image and measurement settings');

  this.tools = [this.viewData, this.calibration, this.createAnnotation, this.deleteAnnotation, this.editAnnotation, this.dating, this.createPoint, this.createBreak, this.deletePoint, this.cut, this.insertPoint, this.insertZeroGrowth, this.insertBreak, this.imageAdjustment, this.measurementOptions];

  this.baseLayer = {
    'Tree Ring': layer
  };

  this.overlay = {
    'Points': this.visualAsset.markerLayer,
    'H-bar': this.mouseLine.layer,
    'Lines': this.visualAsset.lineLayer,
    'Annotations': this.annotationAsset.markerLayer
  };

  /**
   * Load the interface of the treering viewer
   * @function loadInterface
   */
  LTreering.prototype.loadInterface = function() {
    console.log(this);

    this.autoscroll.on();
    this.viewer.on('resize', () => {
      this.autoscroll.reset();
    });

    $('#map').css('cursor', 'default');

    L.control.layers(this.baseLayer, this.overlay).addTo(this.viewer);

    // if popout is opened display measuring tools
    if (window.name.includes('popout')) {
      this.viewData.btn.addTo(this.viewer);
      this.annotationTools.bar.addTo(this.viewer);
      this.dating.btn.addTo(this.viewer);
      this.createTools.bar.addTo(this.viewer);
      this.editTools.bar.addTo(this.viewer);
      this.ioTools.bar.addTo(this.viewer);
      this.settings.bar.addTo(this.viewer);
      this.undoRedoBar.addTo(this.viewer);
    } else {
      this.popout.btn.addTo(this.viewer);
      this.viewData.btn.addTo(this.viewer);
      this.ioTools.bar.addTo(this.viewer);
      this.settings.bar.addTo(this.viewer);
      //defaults overlay 'points' option to disabled
      map.removeLayer(this.visualAsset.markerLayer);
    }

    // right and left click controls
    this.viewer.on('contextmenu', () => {
      if (!this.createPoint.active && this.data.points[0] !== undefined &&
          this.createTools.btn._currentState.stateName === 'expand') {
        this.disableTools();
        this.createPoint.startPoint = false;
        this.createPoint.active = true;
        this.createPoint.enable();
        this.mouseLine.from(points[index - 1].latLng);
      } else {
        this.disableTools();
      }
    });

    this.scaleBarCanvas.load();

    if ( this.meta.savePermission ) {
      // initialize cloud save
      this.saveCloud.initialize();
    }

    this.loadData();

  };

  /**
   * Load the JSON data attached to the treering image
   * @function loadData
   */
  LTreering.prototype.loadData = function() {
    this.measurementOptions.preferencesInfo();
    this.visualAsset.reload();
    this.annotationAsset.reload();
    if ( this.meta.savePermission ) {
      // load the save information in buttom left corner
      this.saveCloud.displayDate();
    }
  };

  /**
   * Disable any tools
   * @function disableTools
   */
  LTreering.prototype.disableTools = function() {
    this.tools.forEach(e => { e.disable() });
  };

  LTreering.prototype.collapseTools = function() {
    this.annotationTools.collapse();
    this.createTools.collapse();
    this.editTools.collapse();
    this.ioTools.collapse();
    this.settings.collapse();
  };

  // we need the max native zoom, which is set on the tile layer and not the map. getMaxZoom will return a synthetic value which is no good for measurement
  LTreering.prototype.getMaxNativeZoom = function () {
      var maxNativeZoom = null;
      this.viewer.eachLayer(function (l) {
        if (l.options.maxNativeZoom) {
          maxNativeZoom = l.options.maxNativeZoom;
        }
      });
      return maxNativeZoom;
  };
}

/*******************************************************************************/

/**
 * A measurement data object
 * @constructor
 * @param {object} dataObject
 * @param {object} LTreeRing - Lt
 */
function MeasurementData (dataObject, Lt) {
  var measurementOptions = Lt.measurementOptions
  this.saveDate = dataObject.saveDate || dataObject.SaveDate || {};
  this.index = dataObject.index || 0;
  this.year = dataObject.year || 0;
  this.earlywood = dataObject.earlywood || true;
  this.points = dataObject.points || [];
  this.annotations = dataObject.annotations || {};

  const forwardInTime = 'forward';
  const backwardInTime = 'backward';

  function directionCheck () {
    const forwardString = 'forward';
    const backwardString = 'backward';
    if (measurementOptions.forwardDirection) { // check if years counting up
      return forwardString;
    } else { // otherwise years counting down
      return backwardString;
    };
  }

 /**
  * Add a new point into the measurement data
  * @function newPoint
  */
  MeasurementData.prototype.newPoint = function(start, latLng) {
    let direction = directionCheck();

    if (start) {
      this.points[this.index] = {'start': true, 'skip': false, 'break': false, 'latLng': latLng};
    } else {
      this.points[this.index] = {'start': false, 'skip': false, 'break': false, 'year': this.year, 'earlywood': this.earlywood, 'latLng': latLng};
      if (measurementOptions.subAnnual) { // check if points alternate ew & lw
        if (this.earlywood) {
          this.earlywood = false;
        } else {
          this.earlywood = true;
          if (direction == forwardInTime) {
            this.year++;
          } else if (direction == backwardInTime) {
            this.year--;
          };
        }
      } else {
        if (direction == forwardInTime) {
          this.year++;
        } else if (direction == backwardInTime) {
          this.year--;
        };
      };
    };
    this.index++;
  };

  /**
   * delete a point from the measurement data
   * @function deletePoint
   */
  MeasurementData.prototype.deletePoint = function(i) {
    let direction = directionCheck();

    var second_points;
    if (this.points[i].start) {
      if (this.points[i - 1] != undefined && this.points[i - 1].break) {
        i--;
        second_points = this.points.slice().splice(i + 2, this.index - 1);
        second_points.map(e => {
          this.points[i] = e;
          i++;
        });
        this.index -= 2;
        delete this.points[this.index];
        delete this.points[this.index + 1];
      } else {
        second_points = this.points.slice().splice(i + 1, this.index - 1);
        second_points.map(e => {
          if (!i) {
            this.points[i] = {'start': true, 'skip': false, 'break': false,
              'latLng': e.latLng};
          } else {
            this.points[i] = e;
          }
          i++;
        });
        this.index--;
        delete this.points[this.index];
      }
    } else if (this.points[i].break) {
      second_points = this.points.slice().splice(i + 2, this.index - 1);
      second_points.map(e => {
        this.points[i] = e;
        i++;
      });
      this.index -= 2;
      delete this.points[this.index];
      delete this.points[this.index + 1];
    } else {
      var new_points = this.points;
      var k = i;
      second_points = this.points.slice().splice(i + 1, this.index - 1);
      second_points.map(e => {
        if (e && !e.start && !e.break) {
          if (measurementOptions.subAnnual) {
            e.earlywood = !e.earlywood;
            if (!e.earlywood) {
              if (direction == forwardInTime) {
                e.year--;
              } else if (direction == backwardInTime) {
                e.year++;
              };
            };
          } else {
            if (direction == forwardInTime) {
              e.year--;
            } else if (direction == backwardInTime) {
              e.year++;
            };
          }
        }
        new_points[k] = e;
        k++;
      });

      this.points = new_points;
      this.index--;
      delete this.points[this.index];
      this.earlywood = !this.earlywood;
      if (this.points[this.index - 1].earlywood) {
        this.year--;
      }
    }
  };

  /**
   * remove a range of points from the measurement data
   * @function cut
   */
  MeasurementData.prototype.cut = function(i, j) {
    if (i > j) {
      var trimmed_points = this.points.slice().splice(i, this.index - 1);
      var k = 0;
      this.points = {};
      trimmed_points.map(e => {
        if (!k) {
          this.points[k] = {'start': true, 'skip': false, 'break': false,
            'latLng': e.latLng};
        } else {
          this.points[k] = e;
        }
        k++;
      });
      this.index = k;
    } else if (i < j) {
      this.points = this.points.slice().splice(0, i);
      this.index = i;
    } else {
      alert('You cannot select the same point');
    }
  };

  /**
   * insert a point in the middle of the measurement data
   * @function insertPoint
   */
  MeasurementData.prototype.insertPoint = function(latLng) {
    let direction = directionCheck();
    var disList = [];

    /**
    * calculate the distance between 2 points
    * @function distanceCalc
    * @param {first point.latLng} pointA
    * @param {second point.latLng} pointB
    */
    function distanceCalc (pointA, pointB) {
      return Math.sqrt(Math.pow((pointB.lng - pointA.lng), 2) +
                       Math.pow((pointB.lat - pointA.lat), 2));
    };

    // finds point with smallest abs. distance
    for (i = 0; i <= this.points.length; i++) {
      var distance = Number.MAX_SAFE_INTEGER;
      if (this.points[i] && this.points[i].latLng) {
         var currentPoint = this.points[i].latLng;
         distance = distanceCalc(currentPoint, latLng);
      disList.push(distance);
      }
    };

    var minDistance = Math.min(...disList);
    i = disList.indexOf(minDistance)

    if (this.points[i] == null) {
      alert('New point must be within existing points. Use the create toolbar to add new points to the series.');
      return;
    }

    // define 4 points: points[i], points[i - 1], points[i + 1], & inserted point
    var pt_i = this.points[i].latLng;

    if (this.points[i - 1]) {
      var pt_i_minus = this.points[i - 1].latLng;
    } else {
      var pt_i_minus = L.latLng(-2 * (pt_i.lat), -2 * (pt_i.lng));
    };

    if (this.points[i + 1]) {
      var pt_i_plus = this.points[i + 1].latLng;
    } else {
      var pt_i_plus = L.latLng(2 * (pt_i.lat), 2 * (pt_i.lng));
    };

    var pt_insert = latLng;

    // distance: point[i] to point[i + 1]
    var dis_i_to_plus = distanceCalc(pt_i, pt_i_plus);
    // distance: point[i} to point[i - 1]
    var dis_i_to_minus = distanceCalc(pt_i, pt_i_minus);
    // distance: point[i] to inserted point
    var dis_i_to_insert= distanceCalc(pt_i, pt_insert);
    // distance: point[i + 1] to inserted point
    var dis_plus_to_insert = distanceCalc(pt_i_plus, pt_insert);
    // distance: point[i - 1] to inserted point
    var dis_minus_to_insert = distanceCalc(pt_i_minus, pt_insert);

    /* Law of cosines:
       * c = distance between inserted point and points[i + 1] or points[i - 1]
       * b = distance between points[i] and points[i + 1] or points[i - 1]
       * a = distance between inserted points and points[i]
       Purpose is to find angle C for triangles formed:
       * Triangle [i + 1] = points[i], points[i + 1], inserted point
       * Triangle [i - 1] = points[i], points[i - 1], inserted point
       Based off diagram from: https://www2.clarku.edu/faculty/djoyce/trig/formulas.html#:~:text=The%20law%20of%20cosines%20generalizes,cosine%20of%20the%20opposite%20angle.
    */
    // numerator and denominator for calculating angle C using Law of cosines (rearranged original equation)
    var numeratorPlus = (dis_plus_to_insert ** 2) - ((dis_i_to_insert ** 2) + (dis_i_to_plus ** 2));
    var denominatorPlus = -2 * dis_i_to_insert * dis_i_to_plus;
    var numeratorMinus = (dis_minus_to_insert ** 2) - ((dis_i_to_insert ** 2) + (dis_i_to_minus ** 2));
    var denominatorMinus = -2 * dis_i_to_insert * dis_i_to_minus;
    var anglePlus = Math.acos(numeratorPlus/denominatorPlus);
    var angleMinus = Math.acos(numeratorMinus/denominatorMinus);

    // smaller angle determines connecting lines
    if (anglePlus < angleMinus) {
      i++;
    };

    var new_points = this.points;
    var second_points = this.points.slice().splice(i, this.index - 1);
    var k = i;
    var year_adjusted;
    var earlywood_adjusted = true;

    if (this.points[i - 1]) {
      if (this.points[i - 1].earlywood && measurementOptions.subAnnual) { // case 1: subAnnual enabled & previous point ew
        earlywood_adjusted = false;
        if (direction == forwardInTime) {
          year_adjusted = this.points[i - 1].year;
        } else if (direction == backwardInTime) {
          year_adjusted = this.points[i].year;
        };

      } else if (this.points[i - 1].start || this.points[i].start) { // case 2: previous or closest point is start
          year_adjusted = this.points[i].year;
          if ((this.points[i - 2] && this.points[i - 2].earlywood && measurementOptions.subAnnual) || direction == backwardInTime) {
            earlywood_adjusted = false;
          };

      } else { // case 3: subAnnual disabled or previous point lw
        if (direction == forwardInTime) {
          year_adjusted = this.points[i - 1].year + 1;
        } else if (direction == backwardInTime) {
          year_adjusted = this.points[i].year;
        };
      };
    } else {
      alert('Please insert new point closer to connecting line.')
    };

    if (year_adjusted === undefined) {
      return;
    };

    new_points[k] = {'start': false, 'skip': false, 'break': false,
      'year': year_adjusted, 'earlywood': earlywood_adjusted,
      'latLng': latLng};

    var tempK = k;

    k++;

    second_points.map(e => {
      if(!e) {
       return;
      }
      if (!e.start && !e.break) {
        if (measurementOptions.subAnnual) { // case 1: subAnnual enabled
          e.earlywood = !e.earlywood;
          if (e.earlywood) {
            if (direction == forwardInTime) {
              e.year++;
            } else if (direction == backwardInTime) {
              e.year--;
            };
          };

        } else { // case 2: subAnnual disabled
          if (direction == forwardInTime) {
            e.year++;
          } else if (direction == backwardInTime) {
            e.year--;
          };
        };
      };
      new_points[k] = e;
      k++;
    });

    this.points = new_points;
    this.index = k;
    if (measurementOptions.subAnnual) {
      this.earlywood = !this.earlywood;
    };
    if (!this.points[this.index - 1].earlywood || !measurementOptions.subAnnual) {
      this.year++;
    };

    return tempK;
  };

  /**
   * insert a zero growth year in the middle of the measurement data
   * @function insertZeroGrowth
   */
  MeasurementData.prototype.insertZeroGrowth = function(i, latLng) {
    let direction = directionCheck();
    var new_points = this.points;
    var second_points = this.points.slice().splice(i + 1, this.index - 1);
    var k = i + 1;

    var subAnnualIncrement = Lt.measurementOptions.subAnnual == true;
    var annualIncrement = Lt.measurementOptions.subAnnual == false;

    // ensure correct inserted point order
    if (direction == forwardInTime) {
      var firstEWCheck = true;
      var secondEWCheck = false;
      var firstYearAdjusted = this.points[i].year + 1;
      var secondYearAdjusted = firstYearAdjusted;
    } else if (direction == backwardInTime) {
      var firstEWCheck = false;
      var secondEWCheck = true;
      var firstYearAdjusted = this.points[i].year;
      var secondYearAdjusted = this.points[i].year - 1;
      if (annualIncrement) {
        var firstEWCheck = true;
        var firstYearAdjusted = secondYearAdjusted;
      }
    }

    new_points[k] = {'start': false, 'skip': false, 'break': false,
      'year': firstYearAdjusted, 'earlywood': firstEWCheck, 'latLng': latLng};

    k++;

    if (subAnnualIncrement) {
      new_points[k] = {'start': false, 'skip': false, 'break': false,
        'year': secondYearAdjusted, 'earlywood': secondEWCheck, 'latLng': latLng};
      k++;
    }

    var tempK = k-1;

    second_points.map(e => {
      if (e && !e.start && !e.break) {
        if (direction == forwardInTime) {
          e.year++;
        } else if (direction == backwardInTime) {
          e.year--;
        };
      };
      new_points[k] = e;
      k++;
    });

    this.points = new_points;
    this.index = k;

    if (direction == forwardInTime) {
      this.year++;
    } else if (direction == backwardInTime) {
      this.year--;
    };

    return tempK;
  };

  /**
   * remove any entries in the data
   * @function clean
   */
  MeasurementData.prototype.clean =function() {
    for (var i in this.points) {
      if (this.points[i] === null || this.points[i] === undefined) {
        delete this.points[i];
      }
    }
  };

  /**
   * getter for all data
   * @function data
   */
  MeasurementData.prototype.data = function() {
    return {'saveDate': this.saveDate, 'year': this.year,
        'earlywood': this.earlywood, 'index': this.index, 'points': this.points,
        'annotations': this.annotations};
  };
}

function AnnotationData (annotations) {
  if (annotations !== undefined) {
    this.annotations = annotations.annotations || annotations;
    this.index = annotations.index || 0;
  } else {
    this.annotations = {};
    this.index = 0;
  }

  AnnotationData.prototype.deleteAnnotation = function(i) {
    delete this.annotations[i];
  }
}

/**
 * Autoscroll feature for mouse
 * @constructor
 * @param {Leaflet Map Object} viewer - a refrence to the leaflet map object
 */
function Autoscroll (viewer) {

  /**
   * Turn on autoscroll based on viewer dimmensions
   * @function on
   */
  Autoscroll.prototype.on = function() {
    var mapSize = viewer.getSize();   // Map size used for map scrolling
    var mousePos = 0;                 // An initial mouse position

    viewer.on('mousemove', (e) => {
      var modifierState = event.getModifierState("Shift");
      // Don't autopan if shift is held
      if(modifierState) {
        return;
      }
      var oldMousePos = mousePos;     // Save the old mouse position
      mousePos = e.containerPoint;    // Container point of the mouse

      //left bound of the map
      if (mousePos.x <= 40 && mousePos.y > 60 && oldMousePos.x > mousePos.x) {
        viewer.panBy([-200, 0]);
      }
      //right bound of the map
      if (mousePos.x + 40 > mapSize.x && mousePos.y > 100 && oldMousePos.x < mousePos.x) {
        viewer.panBy([200, 0]);
      }
      //upper bound of the map
      if (mousePos.x > 390 && mousePos.x + 60 < mapSize.x && mousePos.y < 40 && oldMousePos.y > mousePos.y) {
        viewer.panBy([0, -70]);
      }
      //lower bound of the map
      if (mousePos.x >= 40 && mousePos.y > mapSize.y - 40 && oldMousePos.y < mousePos.y) {
        viewer.panBy([0, 70]);
      }
    });
  };

  /**
   * Turn off autoscroll
   * @function off
   */
  Autoscroll.prototype.off = function() {
    viewer.off('mousemove');
  };

  /**
   * Reset autoscroll when the viewer's dimmensions are resized
   * @function reset
   */
  Autoscroll.prototype.reset = function() {
    this.off();
    this.on();
  };
}

/**
 * A function that returns a leaflet icon given a particular color
 * @function
 * @param {string} color - a color string
 * @param {string} LtBasePath - the base path of the asset
 */
function MarkerIcon(color, imagePath) {

  var colors = {
    'light_blue': { 'path': imagePath + 'images/light_blue_rect_circle_dot_crosshair.png',
                    'size': [32, 48] },
    'dark_blue' : { 'path': imagePath + 'images/dark_blue_rect_circle_dot_crosshair.png',
                    'size': [32, 48] },
    'white_start'   : { 'path': imagePath + 'images/white_tick_icon.png',
                    'size': [32, 48] },
    'white_break'   : { 'path': imagePath + 'images/white_rect_circle_dot_crosshair.png',
                    'size': [32, 48] },
    'red'       : { 'path': imagePath + 'images/red_dot_icon.png',
                    'size': [12, 12] },
    'light_red'  : { 'path': imagePath + 'images/cb_light_red_tick_icon.png',
                    'size': [32, 48] },
    'pale_red' : { 'path': imagePath + 'images/cb_pale_red_tick_icon.png',
                    'size': [32, 48] },
  };

  return L.icon({
    iconUrl : colors[color].path,
    iconSize: colors[color].size
  });
}

/**
 * The mouse line created between a click location and the cursor
 * @constructor
 * @param {LTreering} Lt - a refrence to the leaflet treering object
 */
function MouseLine (Lt) {
  this.layer = L.layerGroup().addTo(Lt.viewer);
  this.active = false;

  /**
   * Enable the mouseline
   * @function enable
   */
  MouseLine.prototype.enable = function() {
    this.active = true;
  }

  /**
   * Disable the mouseline
   * @function disable
   */
  MouseLine.prototype.disable = function() {
    this.active = false;
    $(Lt.viewer._container).off('mousemove');
    this.layer.clearLayers();
  }

  /**
   * A method to create a new line from a given latLng
   * @function from
   * @param {Leatlet LatLng Object} latLng - the latLng coordinate on the viewer
   *   to create a line from
   */
  MouseLine.prototype.from = function(latLng) {
    var newX, newY;

    function newCoordCalc (pointA, coefficientB, pointB, pointC, coefficientTrig) {
      return pointA + ((coefficientB * (pointB - pointC)) * Math.sin(coefficientTrig * Math.PI / 2));
    };

    $(Lt.viewer._container).mousemove(e => {
      if (this.active) {
        this.layer.clearLayers();
        var mousePoint = Lt.viewer.mouseEventToLayerPoint(e);
        var mouseLatLng = Lt.viewer.mouseEventToLatLng(e);
        var point = Lt.viewer.latLngToLayerPoint(latLng);

        /* Getting the four points for the h bars, this is doing 90 degree rotations on mouse point */
        newX = newCoordCalc(mousePoint.x, -1, point.y, mousePoint.y, 1);
        newY = newCoordCalc(mousePoint.y, 1, point.x, mousePoint.x, 1);
        var topRightPoint = Lt.viewer.layerPointToLatLng([newX, newY]);

        newX = newCoordCalc(mousePoint.x, -1, point.y, mousePoint.y, 3);
        newY = newCoordCalc(mousePoint.y, 1, point.x, mousePoint.x, 3);
        var bottomRightPoint = Lt.viewer.layerPointToLatLng([newX, newY]);

        //doing rotations 90 degree rotations on latlng
        newX = newCoordCalc(point.x, -1, mousePoint.y, point.y, 1);
        newY = newCoordCalc(point.y, 1, mousePoint.x, point.x, 1);
        var topLeftPoint = Lt.viewer.layerPointToLatLng([newX, newY]);

        newX = point.x - (mousePoint.y - point.y) * Math.sin(Math.PI / 2 * 3);
        newY = point.y + (mousePoint.x - point.x) * Math.sin(Math.PI / 2 * 3);
        var bottomLeftPoint = Lt.viewer.layerPointToLatLng([newX, newY]);

        //color for h-bar
        var color;
        if (Lt.data.earlywood || !Lt.measurementOptions.subAnnual) {
          color = '#00BCD4';
        } else {
          color = '#00838f';
        }

        this.layer.addLayer(L.polyline([latLng, mouseLatLng],
            {interactive: false, color: color, opacity: '.75',
              weight: '3'}));
        this.layer.addLayer(L.polyline([topLeftPoint, bottomLeftPoint],
            {interactive: false, color: color, opacity: '.75',
              weight: '3'}));
        this.layer.addLayer(L.polyline([topRightPoint, bottomRightPoint],
            {interactive: false, color: color, opacity: '.75',
              weight: '3'}));
      }
    });
  }
}

/**
  * Method to reduce MarkerIcon usage
  * @function getMarker
  * @param {Leaflet latlng} iconLatLng
  * @param {Marker icon} color
  * @param {Icon imagepath} iconImagePath
  * @param {Drag ability} iconDrag
  * @param {Marker title} title
  */
function getMarker(iconLatLng, color, iconImagePath, iconDrag, title) {
  return L.marker(iconLatLng, {
        icon: new MarkerIcon(color, iconImagePath),
        draggable: iconDrag,
        title: title,
        riseOnHover: true
      })
  };

/**
 * Visual assets on the map such as markers and lines
 * @constructor
 * @param {LTreering} Lt - a refrence to the leaflet treering object
 */
function VisualAsset (Lt) {
  this.markers = new Array();
  this.lines = new Array();
  this.markerLayer = L.layerGroup().addTo(Lt.viewer);
  this.lineLayer = L.layerGroup().addTo(Lt.viewer);
  this.previousLatLng = undefined;

  /**
   * Reload all visual assets on the viewer
   * @function reload
   */
  VisualAsset.prototype.reload = function() {
    //erase the markers
    this.markerLayer.clearLayers();
    this.markers = new Array();
    //erase the lines
    this.lineLayer.clearLayers();
    this.lines = new Array();

    //plot the data back onto the map
    if (Lt.data.points !== undefined) {
      Object.values(Lt.data.points).map((e, i) => {
        if (e != undefined) {
          this.newLatLng(Lt.data.points, i, e.latLng);
        }
      });
    }
  }

  /**
   * A method used to create new markers and lines on the viewer
   * @function newLatLng
   * @param {Array} points -
   * @param {int} i - index of points
   * @param {Leaflet LatLng Object} latLng -
   */
  VisualAsset.prototype.newLatLng = function(pts, i, latLng) {
    var leafLatLng = L.latLng(latLng);

    var draggable = false;
    if (window.name.includes('popout')) {
      draggable = true;
    }

    var marker;

    if (pts[i].start) { //check if index is the start point
      marker = getMarker(leafLatLng, 'white_start', Lt.basePath, draggable, 'Start');
    } else if (pts[i].break) { //check if point is a break
      marker = getMarker(leafLatLng, 'white_break', Lt.basePath, draggable, 'Break');
    } else if (Lt.measurementOptions.subAnnual) { //check if point subAnnual
        if (pts[i].earlywood) { //check if point is earlywood
          if (pts[i].year % 10 == 0) {
            // which marker asset is used depends on measurement direction
            if (Lt.measurementOptions.forwardDirection) { // check if years counting up
              marker = getMarker(leafLatLng, 'pale_red', Lt.basePath, draggable, 'Year ' + pts[i].year + ', earlywood');
            } else { // otherwise years counting down & marker assets need to be flipped
              marker = getMarker(leafLatLng, 'light_red', Lt.basePath, draggable, 'Year ' + pts[i].year + ', latewood');
            };
          } else {
            if (Lt.measurementOptions.forwardDirection) {
              marker = getMarker(leafLatLng, 'light_blue', Lt.basePath, draggable, 'Year ' + pts[i].year + ', earlywood');
            } else {
              marker = getMarker(leafLatLng, 'dark_blue', Lt.basePath, draggable, 'Year ' + pts[i].year + ', latewood');
            }
          }
        } else { //otherwise it's latewood
            if (pts[i].year % 10 == 0) {
              if (Lt.measurementOptions.forwardDirection) { // check if years counting up
                marker = getMarker(leafLatLng, 'light_red', Lt.basePath, draggable, 'Year ' + pts[i].year + ', latewood');
              } else { // otherwise years counting down
                marker = getMarker(leafLatLng, 'pale_red', Lt.basePath, draggable, 'Year ' + pts[i].year + ', earlywood');
              };
            } else {
              if (Lt.measurementOptions.forwardDirection) {
                marker = getMarker(leafLatLng, 'dark_blue', Lt.basePath, draggable, 'Year ' + pts[i].year + ', latewood');
              } else {
                marker = getMarker(leafLatLng, 'light_blue', Lt.basePath, draggable, 'Year ' + pts[i].year + ', earlywood');
              }
            }
        }
    } else {
      if (pts[i].year % 10 == 0) {
        marker = getMarker(leafLatLng, 'light_red', Lt.basePath, draggable, 'Year ' + pts[i].year)
      } else {
        marker = getMarker(leafLatLng, 'light_blue', Lt.basePath, draggable, 'Year ' + pts[i].year)
      }
    };

    this.markers[i] = marker;   //add created marker to marker_list

    //tell marker what to do when being dragged
    this.markers[i].on('drag', (e) => {
      if (!pts[i].start) {
        this.lineLayer.removeLayer(this.lines[i]);
        this.lines[i] =
            L.polyline([this.lines[i]._latlngs[0], e.target._latlng],
            { color: this.lines[i].options.color,
              opacity: '.75', weight: '3'});
        this.lineLayer.addLayer(this.lines[i]);
      }
      if (this.lines[i + 1] !== undefined) {
        this.lineLayer.removeLayer(this.lines[i + 1]);
        this.lines[i + 1] =
            L.polyline([e.target._latlng, this.lines[i + 1]._latlngs[1]],
            { color: this.lines[i + 1].options.color,
              opacity: '.75',
              weight: '3'
            });
        this.lineLayer.addLayer(this.lines[i + 1]);
      } else if (this.lines[i + 2] !== undefined && !pts[i + 1].start) {
        this.lineLayer.removeLayer(this.lines[i + 2]);
        this.lines[i + 2] =
            L.polyline([e.target._latlng, this.lines[i + 2]._latlngs[1]],
            { color: this.lines[i + 2].options.color,
              opacity: '.75',
              weight: '3' });
        this.lineLayer.addLayer(this.lines[i + 2]);
      }
    });

    //tell marker what to do when the draggin is done
    this.markers[i].on('dragend', (e) => {
      Lt.undo.push();
      pts[i].latLng = e.target._latlng;
    });

    //tell marker what to do when clicked
    this.markers[i].on('click', (e) => {
      if (Lt.deletePoint.active) {
        Lt.deletePoint.action(i);
      }

      if (Lt.cut.active) {
        if (Lt.cut.point != -1) {
          Lt.cut.action(i);
        } else {
          Lt.cut.fromPoint(i);
        }
      }
      if (Lt.insertZeroGrowth.active) {
        var subAnnual = Lt.measurementOptions.subAnnual;
        var pointEW = pts[i].earlywood == true;
        var pointLW = pts[i].earlywood == false;
        var yearsIncrease = Lt.measurementOptions.forwardDirection == true;
        var yearsDecrease = Lt.measurementOptions.forwardDirection == false;

        if ((subAnnual && ((pointEW && yearsIncrease) || (pointLW && yearsDecrease)))
            || pts[i].start || pts[i].break) {
              alert('Missing year can only be placed at the end of a year!');
        } else {
          Lt.insertZeroGrowth.action(i);
        }
      }
      if (Lt.insertBreak.active) {
        Lt.insertBreak.action(i);
      }
      if (Lt.dating.active) {
        Lt.dating.action(i);
      }
    });

    //drawing the line if the previous point exists
    if (pts[i - 1] != undefined && !pts[i].start) {
      var opacity = '.5';
      var weight = '3';
      if (pts[i].earlywood || !Lt.measurementOptions.subAnnual ||
          (!pts[i - 1].earlywood && pts[i].break)) {
        var color = '#17b0d4'; // original = #00BCD4 : actual = #5dbcd
      } else {
        var color = '#026d75'; // original = #00838f : actual = #14848c
      };

      var comparisonPt = null;
      if (Lt.measurementOptions.forwardDirection) { // years counting up
        comparisonPt = pts[i].year
      } else { // years counting down
        comparisonPt = pts[i - 1].year;
      };

      //mark decades with red line
      if (comparisonPt % 10 == 0 && !pts[i].break) {
        var opacity = '.6';
        var weight = '5';
        if (Lt.measurementOptions.subAnnual && pts[i].earlywood) {
          var color = '#e06f4c' // actual pale_red = #FC9272
        } else {
          var color = '#db2314' // actual light_red = #EF3B2C
        };
      };

      this.lines[i] =
          L.polyline([pts[i - 1].latLng, leafLatLng],
          {color: color, opacity: opacity, weight: weight});
      this.lineLayer.addLayer(this.lines[i]);
    }

    this.previousLatLng = leafLatLng;
    //add the marker to the marker layer
    this.markerLayer.addLayer(this.markers[i]);
  };
}

function AnnotationAsset(Lt) {
  this.markers = new Array();
  this.markerLayer = L.layerGroup().addTo(Lt.viewer);

  AnnotationAsset.prototype.reload = function() {
    this.markerLayer.clearLayers();
    this.markers = new Array();
    Lt.aData.index = 0;
    if (Lt.aData.annotations != undefined) {
      var reduced = Object.values(Lt.aData.annotations).filter(e => e != undefined);
      Lt.aData.annotations = {};
      reduced.map((e, i) => Lt.aData.annotations[i] = e);

      Object.values(Lt.aData.annotations).map((e, i) => {
        this.newAnnotation(Lt.aData.annotations, i);
        Lt.aData.index++;
      });
    }
  };

  AnnotationAsset.prototype.popupMouseover = function(e) {
    this.openPopup();
  };

  AnnotationAsset.prototype.popupMouseout = function(e) {
    this.closePopup();
  };

  AnnotationAsset.prototype.newAnnotation = function(ants, i) {
    var ref = ants[i];

    if (ref.text == '') {
      Lt.aData.deleteAnnotation(i);
      return;
    }

    var draggable = false;
    if (window.name.includes('popout')) {
      draggable = true;
    }

    var circle = L.marker(ref.latLng, {
      icon: new MarkerIcon('red', Lt.basePath),
      draggable: draggable,
      riseOnHover: true
    });

    circle.bindPopup(ref.text, {closeButton: false});
    this.markers[i] = circle;
    this.markers[i].clicked = false;

    this.markers[i].on('dragend', (e) => {
      ants[i].latLng = e.target._latlng;
    });

    $(this.markers[i]).click(e => {
      if (Lt.editAnnotation.active) {
        this.editAnnotation(i);
      } else if (Lt.deleteAnnotation.active) {
        Lt.deleteAnnotation.action(i);
      }
    });

    $(this.markers[i]).mouseover(this.popupMouseover);
    $(this.markers[i]).mouseout(this.popupMouseout);

    this.markerLayer.addLayer(this.markers[i]);
  };

  AnnotationAsset.prototype.editAnnotation = function(i) {
    let marker = this.markers[i];

    $(marker).off('mouseover');
    $(marker).off('mouseout');

    marker.setPopupContent('<textarea id="comment_input" name="message"' +
        'rows="2" cols="15">' + Lt.aData.annotations[i].text + '</textarea>');
    marker.openPopup();
    document.getElementById('comment_input').select();

    $(document).keypress(e => {
      var key = e.which || e.keyCode;
      if (key === 13) {
        if ($('#comment_input').val() != undefined) {
          let string = ($('#comment_input').val()).slice(0);

          if (string != '') {
            Lt.aData.annotations[i].text = string;
            marker.setPopupContent(string);
            $(marker).mouseover(this.popupMouseover);
            $(marker).mouseout(this.popupMouseout);
          } else {
            Lt.deleteAnnotation.action(i);
          }
        }
        Lt.editAnnotation.disable();
      }
    });
  };
}

/**
 * Scale bar for orientation & screenshots
 * @constructor
 * @param {LTreering} - Lt
 */
function ScaleBarCanvas (Lt) {
  var scaleBarDiv = document.createElement('div');
  var nativeWindowWidth = document.getElementById("map").clientWidth;

  scaleBarDiv.innerHTML =
      '<div id="scale-bar-div"> \
       <canvas id="scale-bar-canvas" width="' + nativeWindowWidth + '" height="100"></canvas> \
       </div>';
  document.getElementsByClassName('leaflet-bottom leaflet-left')[0].appendChild(scaleBarDiv);

  var canvas = document.getElementById("scale-bar-canvas");
  var ctx = canvas.getContext("2d");

  var map = Lt.viewer;

  ScaleBarCanvas.prototype.load = function () {
    var pixelWidth;
    map.eachLayer(function (layer) {
      if (layer.options.maxNativeZoom) {
        var leftMostPt = layer.options.bounds._southWest;
        var rightMostPt = layer.options.bounds._northEast;
        pixelWidth = map.project(rightMostPt, Lt.getMaxNativeZoom()).x;
      }
    });

    var windowZoom = true; // used to set initial zoom level
    function modifyScaleBar() {
      ctx.clearRect(0, 0, nativeWindowWidth, 100);

      if (windowZoom) {
        this.initialZoomLevel = map.getZoom();
        windowZoom = false;
      }

      var metricWidth = pixelWidth / Lt.meta.ppm;
      var currentZoomLevel = map.getZoom();
      var zoomExponentialChange = Math.pow(Math.E, -0.693 * (currentZoomLevel - this.initialZoomLevel)); // -0.693 found from plotting zoom level with respect to length in excel then fitting expoential eq.

      var tenth_metricLength = (metricWidth * zoomExponentialChange) / 10;

      this.value = 'Error';
      this.unit = ' nm';
      this.mmValue = 0;
      this.maxValue = Math.round(tenth_metricLength / 10000);

      this.unitTable =
        {
          row: [
            {
              begin: 10000,
              end: Number.MAX_SAFE_INTEGER,
              value: this.maxValue * 10,
              mmValue: this.maxValue * 1000,
              unit: ' m',
            },

            {
              begin: 5000,
              end: 10000,
              value: 10,
              mmValue: 10000,
              unit: ' m',
            },

            {
              begin: 1000,
              end: 5000,
              value: 5,
              mmValue: 5000,
              unit: ' m',
            },

            {
              begin: 500,
              end: 1000,
              value: 1,
              mmValue: 1000,
              unit: ' m',
            },

            {
              begin: 200,
              end: 500,
              value: 50,
              mmValue: 500,
              unit: ' cm',
            },

            {
              begin: 50,
              end: 200,
              value: 10,
              mmValue: 100,
              unit: ' cm',
            },

            {
              begin: 30,
              end: 50,
              value: 5,
              mmValue: 50,
              unit: ' cm',
            },

            {
              begin: 8,
              end: 30,
              value: 10,
              mmValue: 10,
              unit: ' mm',
            },

            {
              begin: 3,
              end: 8,
              value: 5,
              mmValue: 5,
              unit: ' mm',
            },

            {
              begin: 1,
              end: 3,
              value: 1,
              mmValue: 1,
              unit: ' mm',
            },

            {
              begin: 0.3,
              end: 1,
              value: 0.5,
              mmValue: 0.5,
              unit: ' mm',
            },

            {
              begin: 0.05,
              end: 0.3,
              value: 0.1,
              mmValue: 0.1,
              unit: ' mm',
            },

            {
              begin: 0.03,
              end: 0.05,
              value: 0.05,
              mmValue: 0.05,
              unit: ' mm',
            },

            {
              begin: 0.005,
              end: 0.03,
              value: 0.01,
              mmValue: 0.01,
              unit: ' mm',
            },

            {
              begin: 0.003,
              end: 0.005,
              value: 5,
              mmValue: 0.005,
              unit: ' um',
            },

            {
              begin: 0.0005,
              end: 0.003,
              value: 1,
              mmValue: 0.001,
              unit: ' um',
            },

            {
              begin: Number.MIN_SAFE_INTEGER,
              end: 0.0005,
              value: 0.5,
              mmValue: 0.0005,
              unit: ' um',
            },
          ]
        };

      var table = this.unitTable;
      var i;
      for (i = 0; i < table.row.length; i++) {
        if (table.row[i].end > tenth_metricLength && tenth_metricLength >= table.row[i].begin) {
          this.value = table.row[i].value;
          this.unit = table.row[i].unit;
          this.mmValue = table.row[i].mmValue;
        };
      };

      var stringValue_tenthMetric_ratio = this.mmValue / tenth_metricLength;
      var pixelLength = stringValue_tenthMetric_ratio * (nativeWindowWidth / 10);
      var rounded_metricLength = '~' + String(this.value) + this.unit;

      ctx.fillStyle = '#f7f7f7'
      ctx.globalAlpha = .7;
      ctx.fillRect(0, 70, pixelLength + 70, 30); // background

      ctx.fillStyle = '#000000';
      ctx.globalAlpha = 1;
      ctx.font = "12px Arial"
      ctx.fillText(rounded_metricLength, pixelLength + 15, 90); // scale bar length text

      ctx.fillRect(10, 90, pixelLength, 3); // bottom line
      ctx.fillRect(10, 80, 3, 10); // left major line
      ctx.fillRect(pixelLength + 7, 80, 3, 10); // right major line

      var i;
      for (i = 0; i < 4; i++) {
        var distanceBetweenTicks = pixelLength / 5
        var x = (distanceBetweenTicks) * i;
        ctx.fillRect(x + distanceBetweenTicks + 10, 85, 1, 5); // 10 = initial canvas x value
      };
    }

    map.on("resize", modifyScaleBar);
    map.on("zoom", modifyScaleBar);
  };
};

/*****************************************************************************/

/**
 * A wrapper object around leaflet buttons
 * @constructor
 * @param {string} icon - a material design icon name
 * @param {string} toolTip - a tool tip message
 * @param {function} enable - the function for onClick events
 * @param {function} disable - this is an option function for stateful buttons
 */
function Button(icon, toolTip, enable, disable) {
  var states = [];
  states.push({
    stateName: 'inactive',
    icon: '<i class="material-icons md-18">'+icon+'</i>',
    title: toolTip,
    onClick: enable
  });
  if (disable !== null) {
    states.push({
      stateName: 'active',
      icon: '<i class="material-icons md-18">clear</i>',
      title: 'Cancel',
      onClick: disable
    })
  }
  return L.easyButton({states: states});
}

/**
 * A collapsable button bar
 * @constructor
 * @param {LTreering} Lt - a leaflet treering object
 * @param {Button[]} btns - a list of Buttons that belong to the button bar
 * @param {string} icon - a material design icon name
 * @param {string} toolTip - a tool tip message
 */
function ButtonBar(Lt, btns, icon, toolTip) {
  this.btns = btns;

  this.btn = L.easyButton({
    states: [
      {
        stateName: 'collapse',
        icon: '<i class="material-icons md-18">'+icon+'</i>',
        title: toolTip,
        onClick: () => {
          Lt.disableTools();
          Lt.collapseTools();
          this.expand();
        }
      },
      {
        stateName: 'expand',
        icon: '<i class="material-icons md-18">expand_less</i>',
        title: 'Collapse',
        onClick: () => {
          this.collapse();
        }
      }]
  });

  this.bar = L.easyBar([this.btn].concat(this.btns));

  /**
   * Expand the menu bar
   * @function expand
   */
  ButtonBar.prototype.expand = function() {
    this.btn.state('expand');
    this.btns.forEach(e => { e.enable() });
  }

  /**
   * Collapse the menu bar
   * @function collapse
   */
  ButtonBar.prototype.collapse = function() {
    this.btn.state('collapse');
    this.btns.forEach(e => { e.disable() });
  }

  this.collapse();
}

/*****************************************************************************/

/**
 * A popout of the leaflet viewer
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function Popout(Lt) {
  this.btn = new Button('launch', 'Popout to annotate & measure', () => {
    window.open(Lt.meta.popoutUrl, 'popout' + Math.round(Math.random()*10000),
                'location=yes,height=600,width=800,scrollbars=yes,status=yes');
  });
}

/**
 * Undo actions
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function Undo(Lt) {
  this.stack = new Array();
  this.btn = new Button('undo', 'Undo', () => { this.pop() });
  this.btn.disable();

  /**
   * Push the current state into stack to retrieve in the case of an undo event
   * @function push
   */
  Undo.prototype.push = function() {
    this.btn.enable();
    Lt.redo.btn.disable();
    Lt.redo.stack.length = 0;
    var restore_points = JSON.parse(JSON.stringify(Lt.data.points));
    this.stack.push({'year': Lt.data.year, 'earlywood': Lt.data.earlywood,
      'index': Lt.data.index, 'points': restore_points });
  };

  /**
   * Pop the last state from the stack, update the data, and push to the redo stack
   * @function pop
   */
  Undo.prototype.pop = function() {
    if (this.stack.length > 0) {
      if (Lt.data.points[Lt.data.index - 1].start) {
        Lt.createPoint.disable();
      } else {
        Lt.mouseLine.from(Lt.data.points[Lt.data.index - 2].latLng);
      }

      Lt.redo.btn.enable();
      var restore_points = JSON.parse(JSON.stringify(Lt.data.points));
      Lt.redo.stack.push({'year': Lt.data.year, 'earlywood': Lt.data.earlywood,
        'index': Lt.data.index, 'points': restore_points});
      var dataJSON = this.stack.pop();

      Lt.data.points = JSON.parse(JSON.stringify(dataJSON.points));

      Lt.data.index = dataJSON.index;
      Lt.data.year = dataJSON.year;
      Lt.data.earlywood = dataJSON.earlywood;

      Lt.visualAsset.reload();

      if (this.stack.length == 0) {
        this.btn.disable();
      }
    }
  };
}

/**
 * Redo actions
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function Redo(Lt) {
  this.stack = new Array();
  this.btn = new Button('redo', 'Redo', () => { this.pop()});
  this.btn.disable();

  /**
   * Pop the last state in the stack and update data
   * @function pop
   */
  Redo.prototype.pop = function() {
    Lt.undo.btn.enable();
    var restore_points = JSON.parse(JSON.stringify(Lt.data.points));
    Lt.undo.stack.push({'year': Lt.data.year, 'earlywood': Lt.data.earlywood,
      'index': Lt.data.index, 'points': restore_points});
    var dataJSON = this.stack.pop();

    Lt.data.points = JSON.parse(JSON.stringify(dataJSON.points));

    Lt.data.index = dataJSON.index;
    Lt.data.year = dataJSON.year;
    Lt.data.earlywood = dataJSON.earlywood;

    Lt.visualAsset.reload();

    if (this.stack.length == 0) {
      this.btn.disable();
    }
  };
}

/**
 * Calibrate the ppm using a known measurement
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function Calibration(Lt) {
  this.active = false;
  this.popup = L.popup({closeButton: false}).setContent(
              '<input type="number" style="border:none; width:50px;"' +
              'value="10" id="length"></input> mm')
  this.btn = new Button(
    'space_bar',
    'Calibrate the ppm using a known measurement on the image',
    () => { Lt.disableTools(); this.enable() },
    () => { this.disable() }
  );

  Calibration.prototype.calculatePPM = function(p1, p2, length) {
    var startPoint = Lt.viewer.project(p1, Lt.getMaxNativeZoom());
    var endPoint = Lt.viewer.project(p2, Lt.getMaxNativeZoom());
    var pixel_length = Math.sqrt(Math.pow(Math.abs(startPoint.x - endPoint.x), 2) +
        Math.pow(Math.abs(endPoint.y - startPoint.y), 2));
    var pixelsPerMillimeter = pixel_length / length;
    var retinaFactor = 1;
    // if (L.Browser.retina) {
    //   retinaFactor = 2; // this is potentially incorrect for 3x+ devices
    // }
    Lt.meta.ppm = pixelsPerMillimeter / retinaFactor;
    Lt.meta.ppmCalibration = true;
    console.log(Lt.meta.ppm);
  }

  Calibration.prototype.enable = function() {
    this.btn.state('active');
    Lt.mouseLine.enable();


    document.getElementById('map').style.cursor = 'pointer';

    $(document).keyup(e => {
      var key = e.which || e.keyCode;
      if (key === 27) {
        this.disable();
      }
    });

    var latLng_1 = null;
    var latLng_2 = null;
    $(Lt.viewer._container).click(e => {
      document.getElementById('map').style.cursor = 'pointer';


      if (latLng_1 === null) {
        latLng_1 = Lt.viewer.mouseEventToLatLng(e);
        Lt.mouseLine.from(latLng_1);
      } else if (latLng_2 === null) {
        latLng_2 = Lt.viewer.mouseEventToLatLng(e);

        this.popup.setLatLng(latLng_2).openOn(Lt.viewer);
        Lt.mouseLine.disable();

        document.getElementById('length').select();

        $(document).keypress(e => {
          var key = e.which || e.keyCode;
          if (key === 13) {
            var length = parseFloat(document.getElementById('length').value);
            this.calculatePPM(latLng_1, latLng_2, length);
            this.disable();
          }
        });
      } else {
        var length = parseFloat(document.getElementById('length').value);
        this.calculatePPM(latLng_1, latLng_2, length);
        this.disable();
      }
    });
  };

  Calibration.prototype.disable = function() {
    $(document).off('keyup');
    // turn off the mouse clicks from previous function
    $(Lt.viewer._container).off('click');
    this.btn.state('inactive');
    this.active = false;
    Lt.mouseLine.disable();
    document.getElementById('map').style.cursor = 'default';
    this.popup.remove(Lt.viewer);
  };
}

/**
 * Set date of chronology
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function Dating(Lt) {
  this.active = false;
  this.btn = new Button(
    'access_time',
    'Set the year of any point and adjust all other points',
    () => { Lt.disableTools(); Lt.collapseTools(); this.enable() },
    () => { this.disable() }
  );

  /**
   * Open a text container for user to input date
   * @function action
   */
  Dating.prototype.action = function(i) {
    if (Lt.data.points[i].year != undefined) {
      var popup = L.popup({closeButton: false})
          .setContent(
          '<input type="number" style="border:none;width:50px;" value="' +
          Lt.data.points[i].year + '" id="year_input"></input>')
          .setLatLng(Lt.data.points[i].latLng)
          .openOn(Lt.viewer);

      document.getElementById('year_input').select();

      $(Lt.viewer._container).click(e => {
        popup.remove(Lt.viewer);
        this.disable();
      });

      $(document).keypress(e => {
        var key = e.which || e.keyCode;
        if (key === 13) {
          var new_year = parseInt(document.getElementById('year_input').value);
          popup.remove(Lt.viewer);

          var date = new Date();
          var max = date.getFullYear();

          if (new_year > max) {
            alert('Year cannot exceed ' + max + '!');
          } else {
            Lt.undo.push();

            var shift = new_year - Lt.data.points[i].year;

            Object.values(Lt.data.points).map((e, i) => {
              if (Lt.data.points[i] && Lt.data.points[i].year != undefined) {
                Lt.data.points[i].year += shift;
              }
            });
            Lt.data.year += shift;
            Lt.visualAsset.reload();
          }
          this.disable();
        }
      });
    }
  };

  /**
   * Enable dating
   * @function enable
   */
  Dating.prototype.enable = function() {
    this.btn.state('active');
    this.active = true;
  };

  /**
   * Disable dating
   * @function disable
   */
  Dating.prototype.disable = function() {
    this.btn.state('inactive');
    $(Lt.viewer._container).off('click');
    $(document).off('keypress');
    this.active = false;
  };
}

/**
 * \eate measurement points
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function CreatePoint(Lt) {
  this.active = false;
  this.startPoint = true;
  this.btn = new Button(
    'linear_scale',
    'Create measurable points (Control-m)',
    () => { Lt.disableTools(); this.enable() },
    () => { this.disable() }
  );

  L.DomEvent.on(window, 'keydown', (e) => {
     if (e.keyCode == 77 && e.getModifierState("Control")) {
       if (!this.active) {
         Lt.disableTools();
         this.enable();
       } else {
         this.disable();
       }
     }
  }, this);


  /**
   * Enable creating new points on click events
   * @function enable
   */
  CreatePoint.prototype.enable = function() {
    this.btn.state('active');

    if (Lt.data.points.length == 0 && Lt.measurementOptions.userSelectedPref == false) {
      this.disable();
      Lt.measurementOptions.enable();
      return;
    };

    Lt.mouseLine.enable();

    document.getElementById('map').style.cursor = 'pointer';

    $(document).keyup(e => {
      var key = e.which || e.keyCode;
      if (key === 27) {
        this.disable();
      }
    });

    $(Lt.viewer._container).click(e => {
      document.getElementById('map').style.cursor = 'pointer';

      var latLng = Lt.viewer.mouseEventToLatLng(e);

      Lt.undo.push();

      if (this.startPoint) {
        var popup = L.popup({closeButton: false}).setContent(
            '<input type="number" style="border:none; width:50px;"' +
            'value="' + Lt.data.year + '" id="year_input"></input>')
            .setLatLng(latLng)
            .openOn(Lt.viewer);

        document.getElementById('year_input').select();

        $(document).keypress(e => {
          var key = e.which || e.keyCode;
          if (key === 13) {
            Lt.data.year = parseInt(document.getElementById('year_input').value);
            popup.remove(Lt.viewer);
          }
        });
        Lt.data.newPoint(this.startPoint, latLng);
        this.startPoint = false;
      } else {
        Lt.data.newPoint(this.startPoint, latLng);
      }

      //call newLatLng with current index and new latlng
      Lt.visualAsset.newLatLng(Lt.data.points, Lt.data.index-1, latLng);

      //create the next mouseline from the new latlng
      Lt.mouseLine.from(latLng);

      this.active = true;   //activate dataPoint after one point is made
    });
  };

  /**
   * Disable creating new points
   * @function disable
   */
  CreatePoint.prototype.disable = function() {
    $(document).off('keyup');
    // turn off the mouse clicks from previous function
    $(Lt.viewer._container).off('click');
    this.btn.state('inactive');
    this.active = false;
    Lt.mouseLine.disable();
    document.getElementById('map').style.cursor = 'default';
    this.startPoint = true;
  };
}

/**
 * Add a zero growth measurement
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function CreateZeroGrowth(Lt) {
  this.btn = new Button('exposure_zero', 'Add a zero growth year', () => {
    this.add()
  });

  /**
   * Use previous point to add point in the same location to mimic zero growth
   * @function add
   */
  CreateZeroGrowth.prototype.add = function() {
    if (Lt.data.index) {
      var latLng = Lt.data.points[Lt.data.index - 1].latLng;

      Lt.undo.push();

      var yearsIncrease = Lt.measurementOptions.forwardDirection == true;
      var yearsDecrease = Lt.measurementOptions.forwardDirection == false;
      var previousPointEW = Lt.data.points[Lt.data.index - 1].earlywood == true;
      var previousPointLW = Lt.data.points[Lt.data.index - 1].earlywood == false;
      var subAnnualIncrement = Lt.measurementOptions.subAnnual == true;
      var annualIncrement = Lt.measurementOptions.subAnnual == false;

      // ensure point only inserted at end of year
      if (annualIncrement || (yearsIncrease && previousPointLW)) {
        var firstEWCheck = true;
        var secondEWCheck = false;
        var yearAdjustment = Lt.data.year;
      } else if (yearsDecrease && previousPointEW) {
        var firstEWCheck = false;
        var secondEWCheck = true;
        var yearAdjustment = Lt.data.year - 1;
      } else {
        alert('Must be inserted at end of year.');
        return;
      };

      Lt.data.points[Lt.data.index] = {'start': false, 'skip': false, 'break': false,
        'year': Lt.data.year, 'earlywood': firstEWCheck, 'latLng': latLng};
      Lt.visualAsset.newLatLng(Lt.data.points, Lt.data.index, latLng);
      Lt.data.index++;
      if (subAnnualIncrement) {
        Lt.data.points[Lt.data.index] = {'start': false, 'skip': false, 'break': false,
          'year': yearAdjustment, 'earlywood': secondEWCheck, 'latLng': latLng};
        Lt.visualAsset.newLatLng(Lt.data.points, Lt.data.index, latLng);
        Lt.data.index++;
      };

      if (yearsIncrease) {
        Lt.data.year++;
      } else if (yearsDecrease){
        Lt.data.year--;
      };

    } else {
      alert('First year cannot be missing!');
    }
  };
}

/**
 * Add a break in a measurement
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function CreateBreak(Lt) {
  this.btn = new Button(
    'broken_image',
    'Create a break point',
    () => {
      Lt.disableTools();
      this.enable();
      Lt.mouseLine.from(Lt.data.points[Lt.data.index - 1].latLng);
    },
    () => { this.disable }
  );

  /**
   * Enable adding a break point from the last point
   * @function enable
   */
  CreateBreak.prototype.enable = function() {
    this.btn.state('active');

    Lt.mouseLine.enable();

    document.getElementById('map').style.cursor = 'pointer';

    $(Lt.viewer._container).click(e => {
      document.getElementById('map').style.cursor = 'pointer';

      var latLng = Lt.viewer.mouseEventToLatLng(e);

      Lt.mouseLine.from(latLng);

      Lt.undo.push();

      Lt.viewer.dragging.disable();
      Lt.data.points[Lt.data.index] = {'start': false, 'skip': false, 'break': true,
        'latLng': latLng};
      Lt.visualAsset.newLatLng(Lt.data.points, Lt.data.index, latLng);
      Lt.data.index++;
      this.disable();

      Lt.createPoint.enable();
    });
  };

  /**
   * Disable adding breaks
   * @function disable
   */
  CreateBreak.prototype.disable = function() {
    $(Lt.viewer._container).off('click');
    this.btn.state('inactive');
    Lt.viewer.dragging.enable();
    Lt.mouseLine.disable();
  };

}

/**
 * Delete a measurement point
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function DeletePoint(Lt) {
  this.active = false;
  this.btn = new Button(
    'delete',
    'Delete a point',
    () => { Lt.disableTools(); this.enable() },
    () => { this.disable() }
  );

  /**
   * Delete a point
   * @function action
   * @param i int - delete the point at index i
   */
  DeletePoint.prototype.action = function(i) {
    Lt.undo.push();

    Lt.data.deletePoint(i);

    Lt.visualAsset.reload();
  };

  /**
   * Enable deleting points on click
   * @function enable
   */
  DeletePoint.prototype.enable = function() {
    this.btn.state('active');
    this.active = true;
    document.getElementById('map').style.cursor = 'pointer';
  };

  /**
   * Disable deleting points on click
   * @function disable
   */
  DeletePoint.prototype.disable = function() {
    $(Lt.viewer._container).off('click');
    this.btn.state('inactive');
    this.active = false;
    document.getElementById('map').style.cursor = 'default';
  };
}

/**
 * Delete several points on either end of a chronology
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function Cut(Lt) {
  this.active = false;
  this.point = -1;
  this.btn = new Button(
    'content_cut',
    'Delete from selected point to beginning or end of series',
    () => { Lt.disableTools(); this.enable() },
    () => { this.disable() }
  );

  /**
   * Defined the point to cut from
   * @function fromPoint
   * @param i int - index of the point to cut from
   */
  Cut.prototype.fromPoint = function(i) {
    this.point = i;
  };

  /**
   * Remove all points from the side of point i
   * @funciton action
   * @param i int - index of a point that will decide which side to cut
   */
  Cut.prototype.action = function(i) {
    Lt.undo.push();

    Lt.data.cut(this.point, i);

    Lt.visualAsset.reload();
    this.disable();
  };

  /**
   * Enable cutting
   * @function enable
   */
  Cut.prototype.enable = function() {
    this.btn.state('active');
    this.active = true;
    document.getElementById('map').style.cursor = 'pointer';
    this.point = -1;
  };

  /**
   * Disable cutting
   * @function disable
   */
  Cut.prototype.disable = function() {
    $(Lt.viewer._container).off('click');
    this.btn.state('inactive');
    this.active = false;
    document.getElementById('map').style.cursor = 'default';
    this.point = -1;
  };

}

/**
 * Insert a new measurement point in the middle of chronology
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function InsertPoint(Lt) {
  this.active = false;
  this.btn = new Button(
    'add_circle_outline',
    'Add a point in the middle of the series',
    () => { Lt.disableTools(); this.enable() },
    () => { this.disable() }
  );

  /**
   * Insert a point on click event
   * @function action
   */
  InsertPoint.prototype.action = function() {
    document.getElementById('map').style.cursor = 'pointer';

    $(Lt.viewer._container).click(e => {
      var latLng = Lt.viewer.mouseEventToLatLng(e);

      Lt.undo.push();

      var k = Lt.data.insertPoint(latLng);
      if (k != null) {
        Lt.visualAsset.newLatLng(Lt.data.points, k, latLng);
        Lt.visualAsset.reload();
      }

      //Uncommenting line below will disable tool after one use
      //Currently it will stay enabled until user manually disables tool
      //this.disable();
    });
  };

  /**
   * Enable inserting points
   * @function enable
   */
  InsertPoint.prototype.enable = function() {
    this.btn.state('active');
    this.action();
    this.active = true;
  };

  /**
   * Disable inserting points
   * @function disable
   */
  InsertPoint.prototype.disable = function() {
    $(document).keyup(e => {
          var key = e.which || e.keyCode;
          if (key === 27) { // 27 = esc
            this.disable();
          }
        });

    $(Lt.viewer._container).off('click');
    this.btn.state('inactive');
    this.active = false;
    document.getElementById('map').style.cursor = 'default';
  };
}

/**
 * Insert a zero growth measurement in the middle of a chronology
 * @constructor
 * @param {Ltrering} Lt - Leaflet treering object
 */
function InsertZeroGrowth(Lt) {
  this.active = false;
  this.btn = new Button(
    'exposure_zero',
    'Add a zero growth year in the middle of the series',
    () => { Lt.disableTools(); this.enable() },
    () => { this.disable() }
  );

  /**
   * Insert a zero growth year after point i
   * @function action
   * @param i int - index of a point to add a zero growth year after
   */
  InsertZeroGrowth.prototype.action = function(i) {
    var latLng = Lt.data.points[i].latLng;

    Lt.undo.push();

    var k = Lt.data.insertZeroGrowth(i, latLng);
    if (k !== null) {
      if (Lt.measurementOptions.subAnnual) Lt.visualAsset.newLatLng(Lt.data.points, k-1, latLng);
      Lt.visualAsset.newLatLng(Lt.data.points, k, latLng);
      Lt.visualAsset.reload();
    }

    this.disable();
  };

  /**
   * Enable adding a zero growth year
   * @function enable
   */
  InsertZeroGrowth.prototype.enable = function() {
    this.btn.state('active');
    this.active = true;
    document.getElementById('map').style.cursor = 'pointer';
  };

  /**
   * Disable adding a zero growth year
   * @function disable
   */
  InsertZeroGrowth.prototype.disable = function() {
    $(Lt.viewer._container).off('click');
    this.btn.state('inactive');
    document.getElementById('map').style.cursor = 'default';
    this.active = false;
    Lt.viewer.dragging.enable();
    Lt.mouseLine.disable();
  };

}

/**
 * Insert a break in the middle of a chronology
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function InsertBreak(Lt) {
  this.active = false;
  this.btn = new Button(
    'broken_image',
    'Add a break in the series',
    () => { Lt.disableTools(); this.enable() },
    () => { this.disable() }
  );

  /**
   * Insert a break after point i
   * @function action
   * @param i int - add the break point after index i
   */
  InsertBreak.prototype.action = function(i) {
    var new_points = Lt.data.points;
    var second_points = Object.values(Lt.data.points).splice(i + 1, Lt.data.index - 1);
    var first_point = true;
    var second_point = false;
    var k = i + 1;

    Lt.mouseLine.enable();
    Lt.mouseLine.from(Lt.data.points[i].latLng);

    $(Lt.viewer._container).click(e => {
      var latLng = Lt.viewer.mouseEventToLatLng(e);
      Lt.viewer.dragging.disable();

      if (first_point) {
        Lt.mouseLine.from(latLng);
        new_points[k] = {'start': false, 'skip': false, 'break': true,
          'latLng': latLng};
        Lt.visualAsset.newLatLng(new_points, k, latLng);
        k++;
        first_point = false;
        second_point = true;
      } else if (second_point) {
        this.disable();
        second_point = false;
        this.active = false;
        Lt.mouseLine.layer.clearLayers();

        new_points[k] = {'start': true, 'skip': false, 'break': false,
          'latLng': latLng};
        Lt.visualAsset.newLatLng(new_points, k, latLng);
        k++;

        var popup = L.popup({closeButton: false}).setContent(
            '<input type="number" style="border:none;width:50px;"' +
            'value="' + second_points[0].year +
            '" id="year_input"></input>').setLatLng(latLng)
            .openOn(Lt.viewer);

        document.getElementById('year_input').select();

        $(document).keypress(e => {
          var key = e.which || e.keyCode;
          if (key === 13) {
            var new_year = parseInt(document.getElementById('year_input').value);
            popup.remove(Lt.viewer);

            var shift = new_year - second_points[0].year;

            second_points.map(e => {
              e.year += shift;
              new_points[k] = e;
              k++;
            });
            Lt.data.year += shift;

            $(Lt.viewer._container).off('click');

            Lt.undo.push();

            Lt.data.points = new_points;
            Lt.data.index = k;

            Lt.visualAsset.reload();
            this.disable();
          }
        });
      } else {
        this.disable();
        Lt.visualAsset.reload();
      }
    });
  };

  /**
   * Enable inserting a break point
   * @function enable
   */
  InsertBreak.prototype.enable = function() {
    this.btn.state('active');
    this.active = true;
    document.getElementById('map').style.cursor = 'pointer';
  };

  /**
   * Disable inserting a break point
   * @function disable
   */
  InsertBreak.prototype.disable = function() {
    $(Lt.viewer._container).off('click');
    this.btn.state('inactive');
    this.active = false;
    document.getElementById('map').style.cursor = 'default';
    Lt.viewer.dragging.enable();
    Lt.mouseLine.disable();
  };
}

/**
 * View data and download data
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function ViewData(Lt) {
  this.btn = new Button(
    'view_list',
    'Calibrated measurement data',
    () => { Lt.disableTools(); this.enable() },
    () => { this.disable() }
  );

  this.dialog = L.control.dialog({'size': [200, 275], 'anchor': [50, 0], 'initOpen': false})
    .setContent('<h5>No Measurement Data</h5>')
    .addTo(Lt.viewer);

  /**
   * Calculate distance from p1 to p2
   * @function distance
   * @param p1 leaflet point - first point
   * @param p2 leaflet point - second point
   */
  ViewData.prototype.distance = function(p1, p2) {
    var lastPoint = Lt.viewer.project(p1, Lt.getMaxNativeZoom());
    var newPoint = Lt.viewer.project(p2, Lt.getMaxNativeZoom());
    var length = Math.sqrt(Math.pow(Math.abs(lastPoint.x - newPoint.x), 2) +
        Math.pow(Math.abs(newPoint.y - lastPoint.y), 2));
    var pixelsPerMillimeter = 1;
    Lt.viewer.eachLayer((layer) => {
      if (layer.options.pixelsPerMillimeter > 0 || Lt.meta.ppm > 0) {
        pixelsPerMillimeter = Lt.meta.ppm;
      }
    });
    length = length / pixelsPerMillimeter;
    var retinaFactor = 1;
    // if (L.Browser.retina) {
    //   retinaFactor = 2; // this is potentially incorrect for 3x+ devices
    // }
    return length * retinaFactor;
  }

  /**
   * Format data to have years ascending
   * @function reverseData
   */
  ViewData.prototype.reverseData = function() {
    var pref = Lt.measurementOptions; // preferences
    var pts = JSON.parse(JSON.stringify(Lt.data.points)); // deep copy of points

    var i; // index
    var lastIndex = pts.length - 1;
    var before_lastIndex = pts.length - 2;

    // reformatting done in seperate for-statements for code clarity/simplicity

    if (pref.subAnnual) { // subannual earlywood and latewood values swap cycle
      for (i = 0; i < pts.length; i++) {
        if (pts[i]) {
          if (pts[i].earlywood) {
            pts[i].earlywood = false;
          } else {
            pts[i].earlywood = true;
          };
        };
      };
    };

    for (i = 0; i < pts.length; i++) { // swap start & break point cycle
      if (pts[i + 1] && pts[i]) {
        if (pts[i].break && pts[i + 1].start) {
          pts[i].start = true;
          pts[i].break = false;
          pts[i + 1].start = false;
          pts[i + 1].break = true;
        };
      };
    };

    for (i = 0; i < pts.length; i++) { // swap start & end point cycle
      if (pts[i + 2] && pts[i + 1] && pts[i]) {
        if (pts[i].year && pts[i + 1].start && !pts[i + 2].break) { // many conditions so prior cycle is not undone
          pts[i + 1].start = false;
          pts[i + 1].year = pts[i].year;
          pts[i + 1].earlywood = pts[i].earlywood;
          pts[i].start = true;
          delete pts[i].year;
          delete pts[i].earlywood;
        };
      };
    };

    // reverse array order so years ascending
    pts.reverse();

    // change last point from start to end point
    if (pts[lastIndex] && pts[before_lastIndex]) {
      pts[lastIndex].start = false;

      if (pts[before_lastIndex].earlywood) {
        pts[lastIndex].year = pts[before_lastIndex].year;
        pts[lastIndex].earlywood = false;
      } else { // otherwise latewood or annual increment
        pts[lastIndex].year = pts[before_lastIndex].year + 1
        pts[lastIndex].earlywood = true;
      };
    };

    for (i = lastIndex; i >= 0; i--) { // remove any null points
      if (pts[i] == null) {
        pts.splice(i, 1);
      };
    };

    // change first point to start point
    if (pts.length > 0) {
      pts[0].start = true;
      delete pts[0].year;
      delete pts[0].earlywood;
    };

    return pts;
  }

  /**
   * Format and download data in Dan's archaic format
   * @function download
   */
  ViewData.prototype.download = function() {

    var toFourCharString = function(n) {
      var string = n.toString();

      if (string.length == 1) {
        string = '   ' + string;
      } else if (string.length == 2) {
        string = '  ' + string;
      } else if (string.length == 3) {
        string = ' ' + string;
      } else if (string.length == 4) {
        string = string;
      } else if (string.length >= 5) {
        alert('Value exceeds 4 characters');
        throw 'error in toFourCharString(n)';
      } else {
        alert('toSixCharString(n) unknown error');
        throw 'error';
      }
      return string;
    };

    var toSixCharString = function(n) {
      var string = n.toString();

      if (string.length == 1) {
        string = '     ' + string;
      } else if (string.length == 2) {
        string = '    ' + string;
      } else if (string.length == 3) {
        string = '   ' + string;
      } else if (string.length == 4) {
        string = '  ' + string;
      } else if (string.length == 5) {
        string = ' ' + string;
      } else if (string.length >= 6) {
        alert('Value exceeds 5 characters');
        throw 'error in toSixCharString(n)';
      } else {
        alert('toSixCharString(n) unknown error');
        throw 'error';
      }
      return string;
    };

    var toEightCharString = function(n) {
      var string = n.toString();
      if (string.length == 0) {
        string = string + '        ';
      } else if (string.length == 1) {
        string = string + '       ';
      } else if (string.length == 2) {
        string = string + '      ';
      } else if (string.length == 3) {
        string = string + '     ';
      } else if (string.length == 4) {
        string = string + '    ';
      } else if (string.length == 5) {
        string = string + '   ';
      } else if (string.length == 6) {
        string = string + '  ';
      } else if (string.length == 7) {
        string = string + ' ';
      } else if (string.length >= 8) {
        alert('Value exceeds 7 characters');
        throw 'error in toEightCharString(n)';
      } else {
        alert('toSixCharString(n) unknown error');
        throw 'error';
      }
      return string;
    };

    if (Lt.measurementOptions.forwardDirection) { // years ascend in value
      var pts = Lt.data.points;
    } else { // otherwise years descend in value
      var pts = this.reverseData();
    }

    if (Lt.data.points != undefined && Lt.data.points[1] != undefined) {

      var sum_points;
      var sum_string = '';
      var last_latLng;
      var break_length;
      var length_string;

      if (Lt.measurementOptions.subAnnual) {

        var sum_string = '';
        var ew_string = '';
        var lw_string = '';

        y = pts[1].year;
        var sum_points = pts.filter(e => {
          if (e.earlywood != undefined) {
            return !(e.earlywood);
          } else {
            return true;
          }
        });

        if (sum_points[1].year % 10 > 0) {
          sum_string = sum_string.concat(
              toEightCharString(Lt.meta.assetName) +
              toFourCharString(sum_points[1].year));
        }

        var break_point = false;
        sum_points.map((e, i, a) => {
          if (e.start) {
            last_latLng = e.latLng;
          } else if (e.break) {
            break_length =
              Math.round(this.distance(last_latLng, e.latLng) * 1000);
              break_point = true;
          } else {
            if (e.year % 10 == 0) {
              if(sum_string.length > 0) {
                sum_string = sum_string.concat('\n');
              }
              sum_string = sum_string.concat(
                  toEightCharString(Lt.meta.assetName) +
                  toFourCharString(e.year));
            }
            while (e.year > y) {
              sum_string = sum_string.concat('    -1');
              y++;
              if (y % 10 == 0) {
                sum_string = sum_string.concat('\n' +
                    toFourCharString(e.year));
              }
            }

            if (!last_latLng) {
              last_latLng = e.latLng;
            };

            var length = Math.round(this.distance(last_latLng, e.latLng) * 1000);
            if (break_point) {
              length += break_length;
              break_point = false;
            }
            if (length == 9999) {
              length = 9998;
            }
            if (length == 999) {
              length = 998;
            }

            length_string = toSixCharString(length);

            sum_string = sum_string.concat(length_string);
            last_latLng = e.latLng;
            y++;
          }
        });

        // if we ended at the end of a decade, we need to add a new line
        if (y % 10 == 0) {
          sum_string = sum_string.concat('\n' +
          toEightCharString(Lt.meta.assetName) +
          toFourCharString(y));
        }
        sum_string = sum_string.concat(' -9999');

        y = pts[1].year;

        if (pts[1].year % 10 > 0) {
          ew_string = ew_string.concat(
              toEightCharString(Lt.meta.assetName) +
              toFourCharString(pts[1].year));
          lw_string = lw_string.concat(
              toEightCharString(Lt.meta.assetName) +
              toFourCharString(pts[1].year));
        }

        break_point = false;
        pts.map((e, i, a) => {
          if (e.start) {
            last_latLng = e.latLng;
          } else if (e.break) {
            break_length =
              Math.round(this.distance(last_latLng, e.latLng) * 1000);
            break_point = true;
          } else {
            if (e.year % 10 == 0) {
              if (e.earlywood) {
                if (ew_string.length >0) {
                  ew_string = ew_string.concat('\n');
                }
                ew_string = ew_string.concat(
                    toEightCharString(Lt.meta.assetName) +
                    toFourCharString(e.year));
              } else {
                if (lw_string.length >0) {
                  lw_string = lw_string.concat('\n');
                }
                lw_string = lw_string.concat(
                    toEightCharString(Lt.meta.assetName) +
                    toFourCharString(e.year));
              }
            }
            while (e.year > y) {
              ew_string = ew_string.concat('    -1');
              lw_string = lw_string.concat('    -1');
              y++;
              if (y % 10 == 0) {
                ew_string = ew_string.concat('\n' +
                    toEightCharString(Lt.meta.assetName) +
                    toFourCharString(e.year));
                lw_string = lw_string.concat('\n' +
                    toEightCharString(Lt.meta.assetName) +
                    toFourCharString(e.year));
              }
            }

            length = Math.round(this.distance(last_latLng, e.latLng) * 1000);
            if (break_point) {
              length += break_length;
              break_point = false;
            }
            if (length == 9999) {
              length = 9998;
            }
            if (length == 999) {
              length = 998;
            }

            length_string = toSixCharString(length);

            if (e.earlywood) {
              ew_string = ew_string.concat(length_string);
              last_latLng = e.latLng;
            } else {
              lw_string = lw_string.concat(length_string);
              last_latLng = e.latLng;
              y++;
            }
          }
        });

        if (y % 10 == 0) {
          ew_string = ew_string.concat('\n' +
            toEightCharString(Lt.meta.assetName) +
            toFourCharString(y));
          lw_string = lw_string.concat('\n' +
            toEightCharString(Lt.meta.assetName) +
            toFourCharString(y));
        }
        ew_string = ew_string.concat(' -9999');
        lw_string = lw_string.concat(' -9999');

        console.log(sum_string);
        console.log(ew_string);
        console.log(lw_string);

        var zip = new JSZip();
        zip.file((Lt.meta.assetName + '.raw'), sum_string);
        zip.file((Lt.meta.assetName + '.lwr'), lw_string);
        zip.file((Lt.meta.assetName + '.ewr'), ew_string);

      } else {

        var y = pts[1].year;
        sum_points = pts;

        if (sum_points[1].year % 10 > 0) {
          sum_string = sum_string.concat(
              toEightCharString(Lt.meta.assetName) +
              toFourCharString(sum_points[1].year));
        }
        sum_points.map((e, i, a) => {
          if(e.start) {
              last_latLng = e.latLng;
            }
            else if (e.break) {
              break_length =
                Math.round(this.distance(last_latLng, e.latLng) * 1000);
              break_point = true;
            } else {
            if (e.year % 10 == 0) {
              if(sum_string.length > 0) {
                sum_string = sum_string.concat('\n');
              }
              sum_string = sum_string.concat(
                  toEightCharString(Lt.meta.assetName) +
                  toFourCharString(e.year));
            }
            while (e.year > y) {
              sum_string = sum_string.concat('    -1');
              y++;
              if (y % 10 == 0) {
                sum_string = sum_string.concat('\n' +
                    toFourCharString(e.year));
              }
            }

            length = Math.round(this.distance(last_latLng, e.latLng) * 1000);
            if (break_point) {
              length += break_length;
              break_point = false;
            }
            if (length == 9999) {
              length = 9998;
            }
            if (length == 999) {
              length = 998;
            }

            length_string = toSixCharString(length);

            sum_string = sum_string.concat(length_string);
            last_latLng = e.latLng;
            y++;
          }
        });

        if (y % 10 == 0) {
          sum_string = sum_string.concat('\n' +
            toEightCharString(Lt.meta.assetName) +
            toFourCharString(y));
        }
        sum_string = sum_string.concat(' -9999');

        var zip = new JSZip();
        zip.file((Lt.meta.assetName + '_rwl.raw'), sum_string);
      }

      zip.generateAsync({type: 'blob'})
          .then((blob) => {
            saveAs(blob, (Lt.meta.assetName + '_rwl.zip'));
          });
    } else {
      alert('There is no data to download');
    }
  };

  /**
   * Open the data viewer box
   * @function enable
   */
  ViewData.prototype.enable = function() {
    this.btn.state('active');
    var stringSetup; // buttons & table headers
    var stringContent = ''; // years and lengths

    if (Lt.measurementOptions.forwardDirection) { // years ascend in value
      var pts = Lt.data.points;
    } else { // otherwise years descend in value
      var pts = this.reverseData();
    };

    if (pts[0] != undefined) {
      var y = pts[1].year;
      stringSetup = '<div class="button-set">' +
      '<button id="copy-data-button"' +
      'class="icon-button" title="Copy Data to Clipboard, Tab Delimited Column Format"'+
      '><i class="material-icons md-18-data-view">content_copy</i></button><br>  ' +
      '<button id="download-tab-button"' +
      'class ="text-button" title="Download Measurements, Tab Deliminated Format"' +
      '>TAB</button><br>  '+ 
      '<button id="download-csv-button"' +
      'class="text-button" title="Download Measurements, Common Separated Column Format"' +
      '>CSV</button><br>  '+
      '<button id="download-ltrr-button"' +
      'class ="text-button" title="Download Measurements, LTRR Ring Width Format"' +
      '>RWL</button><br>  '+
      '<button id="refresh-button"' +
      'class="icon-button" title="Refresh"' +
      '><i class="material-icons md-18-data-view">refresh</i></button><br>  '+
      '<button id="delete-button"' +
      'class="icon-button delete" title="Delete All Measurement Point Data"' +
      '><i class="material-icons md-18-data-view">delete</i></button></div><table><tr>' +
      '<th style="width: 45%;">Year<br><br></th>' +
      '<th style="width: 70%;">Width (mm)</th></tr>';

      var break_point = false;
      var last_latLng;
      var break_length;
      var break_point;
      var length;
      var copyDataString = Lt.measurementOptions.subAnnual? "Year\t   "+Lt.meta.assetName+"_ew\t"+Lt.meta.assetName+"_lw\t"+Lt.meta.assetName+"_tw\n": "\nYear\t"+Lt.meta.assetName+"_tw\n";
      var EWTabDataString = "Year\t" + Lt.meta.assetName + "_EW\n";
      var LWTabDataString ="Year\t" + Lt.meta.assetName + "_LW\n";
      var TWTabDataString = 'Year\t' + Lt.meta.assetName + "_TW\n";
      var EWoodcsvDataString = "Year," + Lt.meta.assetName + "_EW\n";
      var LWoodcsvDataString ="Year," + Lt.meta.assetName + "_LW\n";
      var TWoodcsvDataString = 'Year,' + Lt.meta.assetName + "_TW\n";
      var lengthAsAString;
      var  totalWidthString = String(totalWidth);
      var totalWidth = 0;
      Lt.data.clean();
      pts.map((e, i, a) => {

        if (e.start) {
          last_latLng = e.latLng;
        } else if (e.break) {
          break_length =
            Math.round(this.distance(last_latLng, e.latLng) * 1000) / 1000;
          break_point = true;
        } else {
          while (e.year > y) {
            stringContent = stringContent.concat('<tr><td>' + y +
                '-</td><td>N/A</td></tr>');
            y++;
          }
          length = Math.round(this.distance(last_latLng, e.latLng) * 1000) / 1000;
          if (break_point) {
            length += break_length;
            length = Math.round(length * 1000) / 1000;
            break_point = false;
          }
          if (length == 9.999) {
            length = 9.998;
          }

          //Format length number into a string with trailing zeros
          lengthAsAString = String(length);
          lengthAsAString = lengthAsAString.padEnd(5,'0');

          if(lengthAsAString.includes('.999'))
          {
              lengthAsAString = lengthAsAString.substring(0,lengthAsAString.length-1);
              lengthAsAString+='8';

          }

          if (Lt.measurementOptions.subAnnual) {
            var wood;
            var row_color;
            if (e.earlywood) {
              wood = 'E';
              row_color = '#00d2e6';
            } else {
              wood = 'L';
              row_color = '#00838f';
              y++;
            };
            if(e.year%10===0)
            {
              if(wood === 'E')
              {
                row_color='E06F4C';
              }
              else{
                row_color= '#db2314';
              }
            }

            stringContent = stringContent.concat('<tr style="color:' + row_color + ';">');
            stringContent = stringContent.concat('<td>' + e.year + wood + '</td><td>'+ lengthAsAString + '</td></tr>');
          } else {
            y++;
            row_color = e.year%10===0? 'red':'#00d2e6';
            stringContent = stringContent.concat('<tr style="color:' + row_color +';">' + '<td>' + e.year + '</td><td>'+ lengthAsAString + '</td></tr>');
          }
          last_latLng = e.latLng;
          
          //Set up CSV files to download later
          //For subannual measurements
          if(Lt.measurementOptions.subAnnual)
          {
            //Copies data to a string that can be copied to the clipboard
            
          if(wood=='E')
          {
            EWTabDataString += e.year + "\t" + lengthAsAString+ "\n";
            copyDataString += e.year + "\t   "+ lengthAsAString +"   \t";
            EWoodcsvDataString += e.year+","+lengthAsAString+"\n";
            totalWidth+=length;
          }
          else
          {
            LWoodcsvDataString += e.year+","+lengthAsAString+"\n";
            //adding two parts of the year together
            totalWidth+=length;
            totalWidth=Math.round(totalWidth * 1000) / 1000;
            totalWidthString = String(totalWidth);
            totalWidthString = totalWidthString.padEnd(5,'0');
            if(totalWidthString.includes('.999'))
          {
              totalWidthString = totalWidthString.substring(0,totalWidthString.length-1);
              totalWidthString+='8';

          }
            TWoodcsvDataString += e.year+","+totalWidthString+"\n";
            LWTabDataString += e.year + "\t" + lengthAsAString+ "\n";
            TWTabDataString += e.year + "\t" + totalWidthString+ "\n";
            copyDataString += lengthAsAString +"   \t"+totalWidthString +"\n";
            //set to zero only after latewood has been added and totalWidth is in csv
            totalWidth = 0;
          }
        }
        //For annual measurements
        else{
          TWoodcsvDataString+= e.year+","+lengthAsAString+"\n";
           //Copies data to a string that can be copied to the clipboard
           TWTabDataString += e.year + "\t" + totalWidthString+ "\n";
          copyDataString += String(e.year) + "\t"+ lengthAsAString +"\n";
        }
          
        }
      });
      this.dialog.setContent(stringSetup + stringContent + '</table>');
    } else {
      stringSetup = '<div class ="button-set"><button id="download-ltrr-button"' +
      'class ="text-button disabled" title="Download Measurements, LTRR Ring Width Format"' +
      'disabled>RWL</button><br>'+ 
      '<button id="download-csv-button" class="text-button disabled" title="Download Measurements, Common Separated Column Format"' +
      'disabled>CSV</button><br>'+
      '<button id="download-tab-button"' +
      'class ="text-button disabled" title="Download Measurements, Tab Deliminated Format"' +
      'disabled>TAB</button><br>'+
      '<button id="copy-data-button" class="icon-button disabled"  title="Copy Data to Clipboard, Tab Delimited Column Format"'+
      '><i class="material-icons md-18-data-view">content_copy</i></button><br>'+
      '<button id="refresh-button" class="icon-button" title="Refresh"' +
      '><i class="material-icons md-18-data-view">refresh</i></button><br>' +
      '<button id="delete-button"' +
      'class="icon-button delete" title="Delete All Measurement Point Data"' +
      '><i class="material-icons md-18-data-view">delete</i></button></div>' +
          '<h5>No Measurement Data</h5>';
      this.dialog.setContent(stringSetup);
      document.getElementById("copy-data-button").disabled=true;
    }
    this.dialog.lock();
    this.dialog.open();
    $('#download-ltrr-button').click(() => this.download());
    $('#copy-data-button').click(()=> copyToClipboard(copyDataString));
    $('#download-csv-button').click(() => {
     if(Lt.measurementOptions.subAnnual)
     {
       downloadCSVFiles(Lt, TWoodcsvDataString,EWoodcsvDataString, LWoodcsvDataString);
     } 
     else{
      downloadCSVFiles(Lt, TWoodcsvDataString);
     }
    }
    );
    $('#download-tab-button').click(() => {
          if(Lt.measurementOptions.subAnnual)
          {
            downloadTabFiles(Lt, TWTabDataString,EWTabDataString, LWTabDataString);
          } 
          else{
           downloadTabFiles(Lt, TWTabDataString);
          }
         }
       );
    $('#refresh-button').click(() => {
      this.disable();
      this.enable();
    });
    $('#delete-button').click(() => {
      this.dialog.setContent(
          '<p>This action will delete all data points.' +
          'Annotations will not be effected.' +
          'Are you sure you want to continue?</p>' +
          '<p><button id="confirm-delete"' +
          'class="mdc-button mdc-button--unelevated mdc-button-compact"' +
          '>confirm</button><button id="cancel-delete"' +
          'class="mdc-button mdc-button--unelevated mdc-button-compact"' +
          '>cancel</button></p>');

      $('#confirm-delete').click(() => {
        Lt.undo.push();

        Lt.data.points = [];
        Lt.data.year = 0;
        if (Lt.measurementOptions.forwardDirection || Lt.measurementOptions.subAnnual == false) { // if years counting up or annual increments, need ew first
          Lt.data.earlywood = true;
        } else if (Lt.measurementOptions.forwardDirection == false){ // if year counting down, need lw first
          Lt.data.earlywood = false;
        };
        Lt.data.index = 0;

        Lt.visualAsset.reload();

        this.disable();
      });
      $('#cancel-delete').click(() => {
        this.disable();
        this.enable();
      });
    });
  },

  /**
   * close the data viewer box
   * @function disable
   */
  ViewData.prototype.disable = function() {
    $(Lt.viewer._container).off('click');
    this.btn.state('inactive');
    $('#confirm-delete').off('click');
    $('#cancel-delete').off('click');
    $('#download-ltrr-button').off('click');
    $('#download-csv-button').off('click');
    $('#download-tab-button').off('click');
    $('#copy-data-button').off('click');
    $('#refresh-button').off('click');
    $('#delete-button').off('click');
    this.dialog.close();
  };
}

/**
 * Create annotations
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function CreateAnnotation(Lt) {
  this.active = false;
  this.input = L.circle([0, 0], {radius: .0001, color: 'red', weight: '6'})
      .bindPopup('<textarea class="comment_input" name="message" rows="2"' +
      'cols="15"></textarea>', {closeButton: false});
  this.btn = new Button(
    'comment',
    'Create annotations (Control-a)',
    () => { Lt.disableTools(); this.enable() },
    () => { this.disable() }
  );

  L.DomEvent.on(window, 'keydown', (e) => {
    if (e.keyCode == 65 && e.getModifierState("Control")) {
      if(!this.active) {
        Lt.disableTools();
        this.enable();
      }
      else {
        this.disable();
      }
    }
  }, this);

  /**
   * Enable creating annotations on click
   * @function enable
   */
  CreateAnnotation.prototype.enable = function() {
    this.btn.state('active');
    this.active = true;
    document.getElementById('map').style.cursor = 'pointer';

    Lt.viewer.doubleClickZoom.disable();
    $(Lt.viewer._container).click(e => {
      $(Lt.viewer._container).click(e => {
        this.disable();
        this.enable();
      });
      var latLng = Lt.viewer.mouseEventToLatLng(e);
      this.input.setLatLng(latLng);
      this.input.addTo(Lt.viewer);
      this.input.openPopup();

      document.getElementsByClassName('comment_input')[0].select();

      $(document).keypress(e => {
        var key = e.which || e.keyCode;
        if (key === 13) {
          var string = ($('.comment_input').val()).slice(0);

          this.input.remove();

          if (string != '') {
            Lt.aData.annotations[Lt.aData.index] = {'latLng': latLng, 'text': string};
            Lt.annotationAsset.newAnnotation(Lt.aData.annotations, Lt.aData.index);
            Lt.aData.index++;
          }

          this.disable();
          this.enable();
        }
      });
    });
  };

  /**
   * Disable creating annotations on click
   * @function enable
   */
  CreateAnnotation.prototype.disable = function() {
    this.btn.state('inactive');
    Lt.viewer.doubleClickZoom.enable();
    $(Lt.viewer._container).off('dblclick');
    $(Lt.viewer._container).off('click');
    $(document).off('keypress');
    document.getElementById('map').style.cursor = 'default';
    this.input.remove();
    this.active = false;
  };

}

/**
 * Delete annotations
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function DeleteAnnotation(Lt) {
  this.btn = new Button(
    'delete',
    'Delete annotations',
    () => { Lt.disableTools(); this.enable() },
    () => { this.disable() }
  );
  this.active = false;

    /**
   * Delete a point
   * @function action
   * @param i int - delete the annotation at index i
   */
  DeleteAnnotation.prototype.action = function(i) {
    Lt.undo.push();

    Lt.aData.deleteAnnotation(i);

    Lt.annotationAsset.reload();
  };

  /**
   * Enable deleting annotations on click
   * @function enable
   */
  DeleteAnnotation.prototype.enable = function() {
    this.btn.state('active');
    this.active = true;
    document.getElementById('map').style.cursor = 'pointer';
  };

  /**
   * Disable deleting annotations on click
   * @function disable
   */
  DeleteAnnotation.prototype.disable = function() {
    $(Lt.viewer._container).off('click');
    this.btn.state('inactive');
    this.active = false;
    document.getElementById('map').style.cursor = 'default';
  };
}

/**
 * Edit annotations
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function EditAnnotation(Lt) {
  this.btn = new Button(
    'edit',
    'Edit annotations',
    () => { Lt.disableTools(); this.enable() },
    () => { this.disable() }
  );
  this.active = false;

  /**
   * Enable editing annotations on click
   * @function enable
   */
  EditAnnotation.prototype.enable = function() {
    this.btn.state('active');
    this.active = true;
    document.getElementById('map').style.cursor = 'pointer';
  };

  /**
   * Disable editing annotations on click
   * @function disable
   */
  EditAnnotation.prototype.disable = function() {
    $(Lt.viewer._container).off('click');
    this.btn.state('inactive');
    this.active = false;
    document.getElementById('map').style.cursor = 'default';
  };
}

/**
 * Change color properties of image
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function ImageAdjustment(Lt) {
  this.btn = new Button(
    'brightness_6',
    'Adjust the image exposure, color, and contrast',
    () => { Lt.disableTools(); this.enable() },
    () => { this.disable() }
  );

  this.dialog = L.control.dialog({
    'size': [340, 280],
    'anchor': [50, 5],
    'initOpen': false
  }).setContent(
    '<div><label style="text-align:center;display:block;">Brightness</label> \
    <input class="imageSlider" id="brightness-slider" value=100 min=0 max=300 type=range> \
    <label style="text-align:center;display:block;">Contrast</label> \
    <input class="imageSlider" id="contrast-slider" type=range min=50 max=350 value=100></div> \
    <label style="text-align:center;display:block;">Saturation</label> \
    <input class="imageSlider" id="saturation-slider" type=range min=0 max=350 value=100></div> \
    <label style="text-align:center;display:block;">Hue Rotation</label> \
    <input class="imageSlider" id="hue-slider" type=range min=0 max=360 value=0> \
     <div class = "checkbox" style = "text-align:center; margin-left:auto; margin-right:auto; margin-top: 5px;display:block;"> <label> <input type = "checkbox" id = "invert-checkbox" > Invert </label></div> \
    <button id="reset-button" style="margin-left:auto; margin-right:auto; margin-top: 5px;display:block;" class="mdc-button mdc-button--unelevated mdc-button-compact">reset</button></div>').addTo(Lt.viewer);

  /**
   * Update the image filter to reflect slider values
   * @function updateFilters
   */
  ImageAdjustment.prototype.updateFilters = function() {
    var brightnessSlider = document.getElementById("brightness-slider");
    var contrastSlider = document.getElementById("contrast-slider");
    var saturationSlider = document.getElementById("saturation-slider");
    var hueSlider = document.getElementById("hue-slider");
    var invert = $("#invert-checkbox").prop('checked')?1:0;
    document.getElementsByClassName("leaflet-pane")[0].style.filter =
      "contrast(" + contrastSlider.value + "%) " +
      "brightness(" + brightnessSlider.value + "%) " +
      "saturate(" + saturationSlider.value + "%) " +
      "invert(" + invert + ")" +
      "hue-rotate(" + hueSlider.value + "deg)";

  };

  /**
   * Open the filter sliders dialog
   * @function enable
   */
  ImageAdjustment.prototype.enable = function() {
    this.dialog.lock();
    this.dialog.open();
    var brightnessSlider = document.getElementById("brightness-slider");
    var contrastSlider = document.getElementById("contrast-slider");
    var saturationSlider = document.getElementById("saturation-slider");
    var hueSlider = document.getElementById("hue-slider");
    this.btn.state('active');
    $(".imageSlider").change(() => {
      this.updateFilters();
    });
    $("#invert-checkbox").change(() => {
      this.updateFilters();
    });
    $("#reset-button").click(() => {
      $(brightnessSlider).val(100);
      $(contrastSlider).val(100);
      $(saturationSlider).val(100);
      $(hueSlider).val(0);
      this.updateFilters();
    });
    $("#invert-button").click(() => {
      $(brightnessSlider).val(100);
      $(contrastSlider).val(100);
      $(saturationSlider).val(100);
      $(hueSlider).val(0);
      this.updateFilters();
    });
  };

  /**
   * Close the filter sliders dialog
   * @function disable
   */
  ImageAdjustment.prototype.disable = function() {
    this.dialog.unlock();
    this.dialog.close();
    this.btn.state('inactive');
  };

}

/**
* Change measurement options (set subAnnual, previously hasLatewood, and direction)
* @constructor
* @param {Ltreeing} Lt - Leaflet treering object
*/
function MeasurementOptions(Lt) {
  this.userSelectedPref = false;
  this.btn = new Button(
    'timeline',
    'Change measurement direction and annual/sub-annual mode',
    () => { Lt.disableTools(); this.enable() },
    () => { this.disable() }
  );

  /**
  * Data from Lt.preferences
  * @function preferencesInfo
  */
  MeasurementOptions.prototype.preferencesInfo = function () {
    if (Lt.preferences.forwardDirection == false) { // direction object
      this.forwardDirection = false;
    } else {
      this.forwardDirection = true;
    }

    var pts = Lt.data.points;
    let ewFalse = pts.filter(pt => pt && pt.earlywood == false);
    if (ewFalse.length > 0) {
      this.hasLatewood = true;
    } else {
      this.hasLatewood = false;
    };

    if (Lt.preferences.subAnnual == undefined) {
      this.subAnnual = this.hasLatewood;
    } else {
      this.subAnnual = Lt.preferences.subAnnual;
    };
  };

  /**
  * Creates dialog box with preferences
  * @function displayDialog
  */
MeasurementOptions.prototype.displayDialog = function () {
  return L.control.dialog({
     'size': [510, 420],
     'anchor': [50, 5],
     'initOpen': false
   }).setContent(
     '<div><h4 style="text-align:left">Select Preferences for Time-Series Measurement:</h4></div> \
     <hr style="height:2px;border-width:0;color:gray;background-color:gray"> \
      <div><h4>Measurement Direction:</h4></div> \
      <div><input type="radio" name="direction" id="forward_radio"> Measure forward in time (e.g., 1257 &rArr; 1258 &rArr; 1259 ... 2020)</input> \
       <br><input type="radio" name="direction" id="backward_radio"> Measure backward in time (e.g., 2020 &rArr; 2019 &rArr; 2018 ... 1257)</input></div> \
     <br> \
      <div><h4>Measurement Interval:</h4></div> \
      <div><input type="radio" name="increment" id="annual_radio"> One increment per year (e.g., total-ring width)</input> \
       <br><input type="radio" name="increment" id="subannual_radio"> Two increments per year (e.g., earlywood- & latewood-ring width)</input></div> \
     <hr style="height:2px;border-width:0;color:gray;background-color:gray"> \
      <div><p style="text-align:right;font-size:20px">&#9831; &#9831; &#9831;  &#9831; &#9831; &#9831; &#9831; &#9831; &#9831; &#9831;<button type="button" id="confirm-button" class="preferences-button"> Save & close </button></p></div> \
      <div><p style="text-align:left;font-size:12px">Please note: Once measurements are initiated, these preferences are set. To modify, delete all existing points for this asset and initiate a new set of measurements.</p></div>').addTo(Lt.viewer);
  };

  /**
  * Based on initial data, selects buttons/dialog text
  * @function selectedBtns
  */
  MeasurementOptions.prototype.selectedBtns = function () {
    if (this.forwardDirection == true) {
      document.getElementById("forward_radio").checked = true;
    } else {
      document.getElementById("backward_radio").checked = true;
    };

    if (this.subAnnual == true) {
      document.getElementById("subannual_radio").checked = true;
    } else {
      document.getElementById("annual_radio").checked = true;
    };
  };

  /**
  * Changes direction & increment object to be saved
  * @function prefBtnListener
  */
  MeasurementOptions.prototype.prefBtnListener = function () {
    document.getElementById("forward_radio").addEventListener('change', (event) => {
      if (event.target.checked == true) {
        this.forwardDirection = true;
        Lt.data.earlywood = true;
      };
    });

    document.getElementById("backward_radio").addEventListener('change', (event) => {
      if (event.target.checked == true) {
        this.forwardDirection = false;
        Lt.data.earlywood = false;
      };
    });

    document.getElementById("annual_radio").addEventListener('change', (event) => {
      if (event.target.checked == true) {
        this.subAnnual = false;
      };
    });

    document.getElementById("subannual_radio").addEventListener('change', (event) => {
      if (event.target.checked == true) {
        this.subAnnual = true
      };
    });
  };

  /**
  * Open measurement options dialog
  * @function enable
  */
  MeasurementOptions.prototype.enable = function() {
    if (!this.dialog) {
      this.dialog = this.displayDialog();
    };

    this.selectedBtns();

    var forwardRadio = document.getElementById("forward_radio");
    var backwardRadio = document.getElementById("backward_radio");
    var annualRadio = document.getElementById("annual_radio");
    var subAnnualRadio = document.getElementById("subannual_radio");
    if ((Lt.data.points.length === 0 || !Lt.data.points[0]) && window.name.includes('popout')) {
      forwardRadio.disabled = false;
      backwardRadio.disabled = false;
      annualRadio.disabled = false;
      subAnnualRadio.disabled = false;
      this.prefBtnListener();
    } else { // lets users see preferences without being able to change them mid-measurement
      forwardRadio.disabled = true;
      backwardRadio.disabled = true;
      annualRadio.disabled = true;
      subAnnualRadio.disabled = true;
    };

    this.dialog.lock();
    this.dialog.open();
    this.btn.state('active');

    $("#confirm-button").click(() => {
      if (this.userSelectedPref == false) {
        this.userSelectedPref = true;
        Lt.createPoint.enable();
      };
      this.disable();
    });
  };

  /**
  * Close measurement options dialog
  * @function disable
  */
  MeasurementOptions.prototype.disable = function() {
    if (this.dialog) {
      this.dialog.unlock();
      this.dialog.close();
    };

    this.btn.state('inactive');
  };

}

/**
 * Save a local copy of the measurement data
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function SaveLocal(Lt) {
  this.btn = new Button(
    'save',
    'Save a local copy',
    () => { this.action() }
  );

  /**
   * Save a local copy of the measurement data
   * @function action
   */
  SaveLocal.prototype.action = function() {
    Lt.data.clean();
    var dataJSON = {'SaveDate': Lt.data.saveDate, 'year': Lt.data.year,
      'forwardDirection': Lt.measurementOptions.forwardDirection,
      'subAnnual': Lt.measurementOptions.subAnnual,
      'earlywood': Lt.data.earlywood, 'index': Lt.data.index,
      'points': Lt.data.points, 'annotations': Lt.aData.annotations};

    // don't serialize our default value
    if(Lt.meta.ppm != 468 || Lt.meta.ppmCalibration) {
      dataJSON.ppm = Lt.meta.ppm;
    }

    var file = new File([JSON.stringify(dataJSON)],
        (Lt.meta.assetName + '.json'), {type: 'text/plain;charset=utf-8'});
    saveAs(file);
  };
}

/**
 * Save a copy of the measurement data to the cloud
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function SaveCloud(Lt) {
  this.btn = new Button(
    'cloud_upload',
    'Save to elevator cloud',
    () => { this.action() }
  );

  this.date = new Date(),

  /**
   * Update the save date & meta data
   * @function updateDate
   */
  SaveCloud.prototype.updateDate = function() {
    this.date = new Date();
    var day = this.date.getDate();
    var month = this.date.getMonth() + 1;
    var year = this.date.getFullYear();
    var minute = this.date.getMinutes();
    var hour = this.date.getHours();
    Lt.data.saveDate = {'day': day, 'month': month, 'year': year, 'hour': hour,
      'minute': minute};
  };

  /**
   * Display the save date in the bottom left corner
   * @function displayDate
   */
  SaveCloud.prototype.displayDate = function() {
    if (Lt.measurementOptions.subAnnual) { // if 2 increments per year
      var increment = 'sub-annual increments &nbsp;|&nbsp; ';
    } else { // otherwise 1 increment per year
      var increment  = 'annual increments &nbsp;|&nbsp; ';
    };
    if (Lt.measurementOptions.forwardDirection) { // if years counting up
      var direction = 'Measuring forward, ';
    } else { // otherwise years counting down
      var direction = 'Measuring backward, '
    };

    var date = Lt.data.saveDate;
    console.log(date);
    if (date.day != undefined && date.hour != undefined) {
      var am_pm = 'am';
      if (date.hour >= 12) {
        date.hour -= 12;
        am_pm = 'pm';
      }
      if (date.hour == 0) {
        date.hour += 12;
      }
      var minute_string = date.minute;
      if (date.minute < 10) {
        minute_string = '0' + date.minute;
      }

      document.getElementById('leaflet-save-time-tag').innerHTML =
          direction + increment + 'Saved to cloud ' + date.year + '/' + date.month + '/' + date.day + ' ' + date.hour + ':' + minute_string + am_pm;
    } else if (date.day != undefined) {
      document.getElementById('leaflet-save-time-tag').innerHTML =
          direction + increment +  'Saved to cloud ' + date.year + '/' + date.month + '/' + date.day;
    } else {
      document.getElementById('leaflet-save-time-tag').innerHTML =
          direction + increment + 'No data saved to cloud';
    }
    Lt.data.saveDate;
  };

  /**
   * Save the measurement data to the cloud
   * @function action
   */
  SaveCloud.prototype.action = function() {
    if (Lt.meta.savePermission && Lt.meta.saveURL != "") {
      Lt.data.clean();
      this.updateDate();
      var dataJSON = {'saveDate': Lt.data.saveDate, 'year': Lt.data.year,
        'forwardDirection': Lt.measurementOptions.forwardDirection,
        'subAnnual': Lt.measurementOptions.subAnnual,
        'earlywood': Lt.data.earlywood, 'index': Lt.data.index,
        'points': Lt.data.points, 'annotations': Lt.aData.annotations};
      // don't serialize our default value
      if (Lt.meta.ppm != 468 || Lt.meta.ppmCalibration) {
        dataJSON.ppm = Lt.meta.ppm;
      }
      $.post(Lt.meta.saveURL, {sidecarContent: JSON.stringify(dataJSON)})
          .done((msg) => {
            this.displayDate();
          })
          .fail((xhr, status, error) => {
            alert('Error: failed to save changes');
          });
    } else {
      alert(
        'Authentication Error: save to cloud permission not granted');
    }
  };

  /**
   * Initialize the display date
   * @function initialize
   */
  SaveCloud.prototype.initialize = function() {
    var saveTimeDiv = document.createElement('div');
    saveTimeDiv.innerHTML =
        '<div class="leaflet-control-attribution leaflet-control">' +
        '<p id="leaflet-save-time-tag"></p></div>';
    document.getElementsByClassName('leaflet-bottom leaflet-left')[0]
        .appendChild(saveTimeDiv);
  };

}

/**
 * Load a local copy of the measurement data
 * @constructor
 * @param {Ltreering} Lt - Leaflet treering object
 */
function LoadLocal(Lt) {
  this.btn = new Button(
    'file_upload',
    'Load a local copy',
    () => { this.input() }
  );

  /**
   * Create an input div on the ui and click it
   * @function input
   */
  LoadLocal.prototype.input = function() {
    var input = document.createElement('input');
    input.type = 'file';
    input.id = 'file';
    input.style = 'display: none';
    input.addEventListener('change', () => {this.action(input)});
    input.click();
  };

  /**
   * Load the file selected in the input
   * @function action
   */
  LoadLocal.prototype.action = function(inputElement) {
    var files = inputElement.files;
    console.log(files);
    if (files.length <= 0) {
      return false;
    }

    var fr = new FileReader();

    fr.onload = function(e) {
      let newDataJSON = JSON.parse(e.target.result);

      Lt.preferences = {
        'forwardDirection': newDataJSON.forwardDirection,
        'subAnnual': newDataJSON.subAnnual,
      };

      Lt.data = new MeasurementData(newDataJSON, Lt);
      Lt.aData = new AnnotationData(newDataJSON.annotations);

      // if the JSON has PPM data, use that instead of loaded data.
      if(newDataJSON.ppm) {
        Lt.meta.ppm = newDataJSON.ppm;
      }

      Lt.loadData();
    };

    fr.readAsText(files.item(0));
  };

}

function Panhandler(La) {
  this.panHandler = L.Handler.extend({
    panAmount: 120,
    panDirection: 0,
    isPanning: false,
    slowMotion: false,

    addHooks: function () {
      L.DomEvent.on(window, 'keydown', this._startPanning, this);
      L.DomEvent.on(window, 'keyup', this._stopPanning, this);
    },

    removeHooks: function () {
      L.DomEvent.off(window, 'keydown', this._startPanning, this);
      L.DomEvent.off(window, 'keyup', this._stopPanning, this);
    },

    _startPanning: function (e) {
      if (e.keyCode == '38') {
        this.panDirection = 'up';
      } else if (e.keyCode == '40') {
        this.panDirection = 'down';
      } else if (e.keyCode == '37') {
        this.panDirection = 'left';
      } else if (e.keyCode == '39') {
        this.panDirection = 'right';
      } else {
        this.panDirection = null;
      }

      if (e.getModifierState("Shift")) {
        this.slowMotion = true;
      }
      else {
        this.slowMotion = false;
      }

      if (this.panDirection) {
        e.preventDefault();
      }

      if (this.panDirection && !this.isPanning) {
        this.isPanning = true;
        requestAnimationFrame(this._doPan.bind(this));
      }
      return false;
    },

    _stopPanning: function (ev) {
      // Treat Gamma angle as horizontal pan (1 degree = 1 pixel) and Beta angle as vertical pan
      this.isPanning = false;

    },

    _doPan: function () {

      var panArray = [];

      var adjustedPanAmount = this.panAmount;
      if(this.slowMotion) {
        adjustedPanAmount = 30;
      }

      switch (this.panDirection) {
        case "up":
          panArray = [0, -1 * adjustedPanAmount];
          break;
        case "down":
          panArray = [0, adjustedPanAmount];
          break;
        case "left":
          panArray = [-1 * adjustedPanAmount, 0];
          break;
        case "right":
          panArray = [adjustedPanAmount, 0];
          break;
      }


      map.panBy(panArray, {
        animate: true,
        delay: 0
      });
      if (this.isPanning) {
        requestAnimationFrame(this._doPan.bind(this));
      }

    }
  });

  La.viewer.addHandler('pan', this.panHandler);
  La.viewer.pan.enable();
}
/**
   * copy text to clipboard
   * @function enable
   */
  function copyToClipboard(allData){
    console.log('copying...', allData);
    const el = document.createElement('textarea');
    el.value = allData;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }

  /**
   * Download CSV ZIP file
   * @function
   */
  function downloadCSVFiles(Lt,TWoodcsvDataString,EWoodcsvDataString,LWoodcsvDataString)
  {
    var zip = new JSZip();
    if(Lt.measurementOptions.subAnnual)
    {
    zip.file((Lt.meta.assetName + '_LW.csv'), LWoodcsvDataString);
    zip.file((Lt.meta.assetName + '_EW.csv'), EWoodcsvDataString);
    }
    zip.file((Lt.meta.assetName + '_TW.csv'), TWoodcsvDataString)
    zip.generateAsync({type: 'blob'})
          .then((blob) => {
            saveAs(blob, (Lt.meta.assetName + '_csv.zip'));
          });
    }
    function downloadTabFiles(Lt,TWTabDataString,EWTabDataString,LWTabDataString)
  {
    var zip = new JSZip();
    if(Lt.measurementOptions.subAnnual)
    {
    zip.file((Lt.meta.assetName + '_LW.txt'), LWTabDataString);
    zip.file((Lt.meta.assetName + '_EW.txt'), EWTabDataString);
    }
    zip.file((Lt.meta.assetName + '_TW.txt'), TWTabDataString)
    zip.generateAsync({type: 'blob'})
          .then((blob) => {
            saveAs(blob, (Lt.meta.assetName + '_tab.zip'));
          });
        }
    
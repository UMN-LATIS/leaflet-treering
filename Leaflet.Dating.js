/**
 * @file Leaflet Dating
 * @author Jessica Thorne <thorn572@umn.edu>
 * @version 1.0.0
 */

/**
 * Interface for dating tools. 
 * @constructor
 * 
 * @param {object} Lt - LTreering object from leaflet-treering.js. 
 */
function DatingInterface(Lt) {
    this.treering = Lt;

    this.dating = new Dating(this);
    this.datingPopup = new DatingPopup(this);

    this.btns = [this.dating.btn];
    this.tools = [this.dating];
}

/**
 * Set date of chronology.
 * @constructor
 * 
 * @param {object} Inte - DatingInterface objects. Allows access to DataAccess tools.
 */
function Dating(Inte) {
    this.active = false;
    this.btn = new Button(
      'access_time',
      'Edit measurement point dating (Shift-d)',
      () => { Inte.treering.disableTools(); Inte.treering.collapseTools(); this.enable() },
      () => { this.disable() }
    );
  
    // Enable with shift-d
    L.DomEvent.on(window, 'keydown', (e) => {
       if (e.keyCode == 68 && e.getModifierState("Shift") && !e.getModifierState("Control") && // 68 refers to 'd'
       window.name.includes('popout') && !Inte.treering.annotationAsset.dialogAnnotationWindow) { // Dialog windows w/ text cannot be active 
         e.preventDefault();
         e.stopPropagation();
         Inte.treering.disableTools();
         this.enable();
       }
    }, this);

    /**
     * Enable dating.
     * @function enable
     */
    Dating.prototype.enable = function() {
        this.btn.state('active');
        this.active = true;
        Inte.treering.viewer.getContainer().style.cursor = 'pointer';
      };
    
      /**
       * Disable dating.
       * @function disable
       */
      Dating.prototype.disable = function() {
        this.btn.state('inactive');
        $(Inte.treering.viewer.getContainer()).off('click');
        $(document).off('keypress');
        this.active = false;
        Inte.treering.viewer.getContainer().style.cursor = 'default';
      };
  
    /**
     * Open a text container for user to input date
     * @function action
     */
    Dating.prototype.action = function(i) {
        // Check if selected point valid for dating. 
        if (Inte.treering.data.points[i] != undefined) {
        // Start points are "measurement" points when measuring backwards.
        // Need to provide way for users to "re-date" them.
        let pt_forLocation = Inte.treering.data.points[i];
        if (i == 0 || !Inte.treering.data.points[i - 1]) {
            alert("Cannot date first point. Select a different point to adjust dating");
            return;
        } else if (Inte.treering.data.points[i].break || (Inte.treering.data.points[i].start && Inte.treering.data.points[i - 1].break)) {
            alert("Cannot date break points. Select a different point to adjust dating");
            return;
        } else if (Inte.treering.data.points[i].start) {
            i--;
            if (!Inte.treering.measurementOptions.forwardDirection) pt_forLocation = Inte.treering.data.points[i + 1];
        }

            this.index = i;
            Inte.datingPopup.openPopup(Inte.treering.data.points[i].year, pt_forLocation.latLng);
        }
    };
  
    /**
     * Dating action after new year entered
     * @function keypressAction
     */
    Dating.prototype.keypressAction = function(e) {
      let key = e.which || e.keyCode;
      if (key === 13) {
        this.active = false;

        let year = Inte.treering.data.points[this.index].year;
        let newYear = Inte.datingPopup.yearInput;
        Inte.datingPopup.closePopup();
  
        if (!newYear && newYear != 0) {
            alert("Entered year must be a number");
            return;
        }
  
        Inte.treering.undo.push();

        // There are 3 shift options: 
        // 1 = Shift all points
        // 2 = Shift chronologically earlier points
        // 3 = Shift chronologically later points
        switch(Inte.datingPopup.shiftOption) {
            case 1: 
                this.shiftAll(year, newYear);
                break;
            case 2:
                this.shiftEarlier(year, newYear);
                break;
            case 3:
                this.shiftLater(year, newYear);
                break;
        }
        
        Inte.treering.visualAsset.reload();
        // Updates once user hits enter.
        Inte.treering.helper.updateFunctionContainer(true);
        this.disable();
      }
    }

    Dating.prototype.checkIncrementYear = function(pt) {
        let annual = !Inte.treering.measurementOptions.subAnnual; // Measured annually. 
        let subAnnual = Inte.treering.measurementOptions.subAnnual; // Measured subannually (distinguish between early- and late-wood).
        let forward = Inte.treering.measurementOptions.forwardDirection; // Measured forward in time (1900 -> 1901 -> 1902).
        let backward = !Inte.treering.measurementOptions.forwardDirection// Measured backward in time (1902 -> 1901 -> 1900).

        // Increment year if annual, latewood when measuring forward in time, or earlywood when measuring backward in time.
        return (annual || (forward && !pt.earlywood) || (backward && pt.earlywood));
    }

    Dating.prototype.shiftAll = function(year, newYear) {
        let shift = newYear - year;
        let pointsBefore = Inte.treering.data.points.slice(0, this.index + 1);
        let yearDifference = pointsBefore.filter(point => point.year && this.checkIncrementYear(point)).length;
        let pointsAfter = Inte.treering.data.points.slice(this.index + 1);
        let directionConstant = (Inte.treering.measurementOptions.forwardDirection) ? 1 : -1;

        // Delta is the starting count value. Need "jump start" value if...
        // ... expected to increment on next value. Special case if any ...
        // values before point are 0, then do not "jump start".
        let numOfZeroYears = pointsBefore.filter(e => e.year === 0).length;
        let delta = 0;
        if (numOfZeroYears && year != 0 && !this.checkIncrementYear(Inte.treering.data.points[this.index])) delta = -1;
        else if (!numOfZeroYears && this.checkIncrementYear(Inte.treering.data.points[this.index])) delta = 1;
        pointsBefore.map((point, j) => {
          if (point.year || point.year == 0) {
            point.year = newYear - directionConstant * (yearDifference - delta);
            if (this.checkIncrementYear(point)) {
              delta++;
            }
          }
        })
  
        // Special case does not apply to after points.
        delta = 0;
        if (this.checkIncrementYear(Inte.treering.data.points[this.index])) delta = 1;
        pointsAfter.map((point, k) => {
          if (point.year || point.year == 0) {
            point.year = newYear + directionConstant * (delta);
            if (this.checkIncrementYear(point)) {
              delta++;
            }
          }
        })
  
        Inte.treering.data.year += shift;
    }

    Dating.prototype.shiftEarlier = function(year, newYear) {
        console.log("early")
    }

    Dating.prototype.shiftLater = function(year, newYear) {
        console.log("later")
    }
}



/**
 * Generates popup related to cdating chronologies. 
 * @constructor
 * 
 * @param {object} Inte - DatingInterface objects. Allows access to DataAccess tools.
 */
function DatingPopup(Inte) {
    this.popup = null;
    this.yearInput = 0;
    // There are 3 shift options: 
    // 1 = Shift all points
    // 2 = Shift chronologically earlier points
    // 3 = Shift chronologically later points
    this.shiftOption = 1;

    DatingPopup.prototype.openPopup = function(year, location) {
        // Handlebars from templates.html
        let content = document.getElementById("Dating-template").innerHTML;
        let template = Handlebars.compile(content);
        let html = template({ date_year: year });
  
        this.popup = L.popup({closeButton: false})
            .setContent(html)
            .setLatLng(location)
            .openOn(Inte.treering.viewer);
        
        this.yearInput = year;
        this.setDefaults();
        this.createEventListeners();
    }

    DatingPopup.prototype.closePopup = function() {
        this.popup.remove(Inte.treering.viewer);
    }

    DatingPopup.prototype.createEventListeners = function() {
        $("#Dating-year-input").on("input", () => {
            this.yearInput = parseInt($("#Dating-year-input").val());
        });

        $("#Dating-shiftAll-radio").on("change", () => {
            this.shiftOption = 1;
        });

        $("#Dating-shiftEarlier-radio").on("change", () => {
            this.shiftOption = 2;
        });

        $("#Dating-shiftLater-radio").on("change", () => {
            this.shiftOption = 3;
        });
    }

    DatingPopup.prototype.setDefaults = function() {
        // Select previous option: 
        switch(this.shiftOption) {
            case 1: 
                $("#Dating-shiftAll-radio").trigger("click");
                break;
            case 2: 
                $("#Dating-shiftEarlier-radio").trigger("click");
                break;
            case 3: 
                $("#Dating-shiftLater-radio").trigger("click");
                break;
        }

        // Let year input be already selected. 
        document.getElementById("Dating-year-input").select();
    }
}
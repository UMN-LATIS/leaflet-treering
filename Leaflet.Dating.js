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
     * Open a text container for user to input date
     * @function action
     */
    Dating.prototype.action = function(i) {
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
  
        // Handlebars from templates.html
        this.index = i;
        let year = Inte.treering.data.points[i].year;
        let content = document.getElementById("Dating-template").innerHTML;
        let template = Handlebars.compile(content);
        let html = template({ date_year: year });
  
        this.popup = L.popup({closeButton: false})
            .setContent(html)
            .setLatLng(pt_forLocation.latLng)
            .openOn(Inte.treering.viewer);
  
        document.getElementById('Dating-year-input').select();
  
        // $(Inte.treering.viewer.getContainer()).click(e => {
        //   this.popup.remove(Inte.treering.viewer);
        //   this.disable();
        // });
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
        let input = document.getElementById('Dating-year-input');
        let i = this.index;
        let year = Inte.treering.data.points[i].year;
  
        var new_year = parseInt(input.value);
        this.popup.remove(Inte.treering.viewer);
  
        if (!new_year && new_year != 0) {
          alert("Entered year must be a number");
          return
        }
  
        Inte.treering.undo.push();
  
        function incrementYear(pt) {
          // Increment year if annual,                 latewood when measuring forward in time,                 or earlywood when measuring backward in time
          return (!Inte.treering.measurementOptions.subAnnual || (Inte.treering.measurementOptions.forwardDirection && !pt.earlywood) || (!Inte.treering.measurementOptions.forwardDirection && pt.earlywood));
        }
  
        let shift = new_year - year;
        let pts_before = Inte.treering.data.points.slice(0, i + 1);
        let year_diff = pts_before.filter(pb => pb.year && incrementYear(pb)).length;
        let pts_after = Inte.treering.data.points.slice(i + 1);
        let dir_constant = (Inte.treering.measurementOptions.forwardDirection) ? 1 : -1;
  
        // Delta is the starting count value. Need "jump start" value if...
        // ... expected to increment on next value. Special case if any ...
        // values before point are 0, then do not "jump start".
        let numOfZeroYears = pts_before.filter(e => e.year === 0).length;
        let delta = 0;
        if (numOfZeroYears && year != 0 && !incrementYear(Inte.treering.data.points[i])) delta = -1;
        else if (!numOfZeroYears && incrementYear(Inte.treering.data.points[i])) delta = 1;
        pts_before.map((pb, j) => {
          if (pb.year || pb.year == 0) {
            pb.year = new_year - dir_constant * (year_diff - delta);
            if (incrementYear(pb)) {
              delta++;
            }
          }
        })
  
        // Special case does no apply to after points.
        delta = 0;
        if (incrementYear(Inte.treering.data.points[i])) delta = 1;
        pts_after.map((pa, k) => {
          if (pa.year || pa.year == 0) {
            pa.year = new_year + dir_constant * (delta);
            if (incrementYear(pa)) {
              delta++;
            }
          }
        })
  
        Inte.treering.data.year += shift;
        Inte.treering.visualAsset.reload();
  
        // Updates once user hits enter.
        Inte.treering.helper.updateFunctionContainer(true);
  
        this.disable();
      }
    }
  
    /**
     * Enable dating
     * @function enable
     */
    Dating.prototype.enable = function() {
      this.btn.state('active');
      this.active = true;
      Inte.treering.viewer.getContainer().style.cursor = 'pointer';
    };
  
    /**
     * Disable dating
     * @function disable
     */
    Dating.prototype.disable = function() {
      this.btn.state('inactive');
      $(Inte.treering.viewer.getContainer()).off('click');
      $(document).off('keypress');
      this.active = false;
      Inte.treering.viewer.getContainer().style.cursor = 'default';
    };
  }
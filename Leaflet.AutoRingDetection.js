/**
 * Interface for auto ring detection and related tools
 * @constructor
 * 
 * @param {object} Lt - LTreering object from leaflet-treering.js. 
 */
function AutoRingDetectionInterface(Lt) {
    this.treering = Lt;
    this.autoRingDetection = new AutoRingDetection(this);
}

/**
 * Use GL Layer filters and ring detection algorithms to automatically
 * place points.
 * @constructor
 * 
 * @param {LTreering} Lt - Leaflet treering object
 */
function AutoRingDetection(Inte) {
    this.active = false;
    this.userImageSettings = {};
  
    this.markers = [];  //Temporary markers for adjusting automatic detection settings
    this.edgeLines = [];
    this.firstLatLng = null;
    this.secondLatLng = null;
    this.detectionHeight = 0;
    this.detectionAreaOutline = [L.polyline([])];
    this.detectionImageSettings = false;

    //Expandable list of detection methods and their inputs
    this.detectionMethods = [
      {
        method: "classification",
        divId: "auto-ring-detection-classification-settings",
        functionCall: (data, algoSettings) => {return this.classificationDetection(data, algoSettings)},
        options: [
          {
            name: 'globalThreshold',
            label: "Threshold",
            id: 'auto-ring-detection-globalThreshold',
            min: 0,
            max: 255,
            step: 1,
            defaultValue: 90,
            description: "An estimate for the average RGB (intensity) to separate earlywood and latewood segments. Low values represent darker segments, and high values represent light segements."
          },
        ],
        radioLabel: "Global Threshold",
        radioInfo: "Classifies pixels as low or high intensity, based on the threshold input."
      },
    ]
  
    this.btn = new Button(
      'search',
      'Auto ring detection',
      () => { Inte.treering.disableTools(); this.enable() },
      () => { this.disable() }
    );
  
    /**
     * Turn on tool, either set preferences or outline area to detect from
     * @function
     */
    AutoRingDetection.prototype.enable = function () {
      this.active = true;
      //Save user's settings before changing to detection settings
      this.userImageSettings = Inte.treering.imageAdjustmentInterface.imageAdjustment.getCurrentViewJSON();
      this.btn.state('active');

      $(document).on('keyup', e => {
        var key = e.which || e.key;
        if (key === 'Escape') {
          this.disable();
        }
      });
  
      //Only need to get annual/subannual, forward/backward measurements if not already set
      if (Inte.treering.data.points.length == 0) {
        this.setMeasurementPreferences();
      } 
      else {
        this.detectionAreaPlacement(false)
      }
    }

    /**
     * Turn off tool, remove/revert visuals
     * @function
     */
    AutoRingDetection.prototype.disable = function () {
      if (this.active) {
        if (this.dialog) {
          this.dialog.remove();
        };
  
        this.active = false;
        this.btn.state('inactive');
        Inte.treering.viewer.getContainer().style.cursor = 'default';
        if (Inte.treering.imageAdjustmentInterface.imageAdjustment.open) {
          Inte.treering.imageAdjustmentInterface.imageAdjustment.disable()
        }

        //Remove visuals
        for (let line of this.detectionAreaOutline) {
          line.remove()
        }
        if (this.firstPointMarker) {this.firstPointMarker.remove()}
        if (this.secondPointMarker) {this.secondPointMarker.remove()}
        for (let pointMarker of this.markers) { pointMarker.remove()};
  
        //Change back to user's saved settings
        this.tuneGLLayer(true);

        //Remove visuals/event listeners from detectionAreaPlacement
        if (Inte.treering.mouseLine.active) { Inte.treering.mouseLine.disable(); }
        $(Inte.treering.viewer.getContainer()).off("click")
      }
    }

    /**
     * Displays dialog of given page number (see html file)
     * @function
     * 
     * @param {Integer} pageNumber - Integer 1-3 references which dialog to be loaded
     * @param {Array} size - Size of dialog in form [width, height]
     * @param {Array} anchor - Placement of dialog on map in form [x, y] (distance from top left)
     * @returns displayed dialog and its settings
     */
    AutoRingDetection.prototype.displayDialog = function (pageNumber, size, anchor) {
      let contentId = "AutoRingDetection-page-" + pageNumber; //Different dialog templates for different steps in the process
      let content = document.getElementById(contentId).innerHTML;

      let html;
      if (pageNumber == 2) {
        let template = Handlebars.compile(content);
        let subAnnual = Inte.treering.measurementOptions.subAnnual
        html = template({subAnnual: subAnnual})
      } else if (pageNumber == 3) {
        let template = Handlebars.compile(content);
        html = template({detectionMethods: this.detectionMethods}) 
      } else {
        html = content
      }

      this.dialog = L.control.dialog({
        'size': size,
        'maxSize': [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
        'anchor': anchor,
        'initOpen': true,
        'position': 'topleft',
        'minSize': [0, 0]
      }).setContent(html).addTo(Inte.treering.viewer);

       //Set recommended method
       if (Inte.treering.measurementOptions.subAnnual) {
        $("#exponential-smoothing-rec").hide();
        $("#classification-rec").show();
       } else {
        $("#exponential-smoothing-rec").show();
        $("#classification-rec").hide();
       }
      return this.dialog;
    };

    /**
     * Adjusts image settings to preset settings
     * @function
     * 
     * @param {Boolean} reset - Reverts to user's selected settings if true, uses preset settings if false
     */
    AutoRingDetection.prototype.tuneGLLayer = function (reset) {
      if (reset) {
        //Reset back to saved settings
        Inte.treering.imageAdjustmentInterface.imageAdjustment.loadImageSettings(this.userImageSettings);
      } else {
        //Set image settings, there are default and user-saved settings
        Inte.treering.imageAdjustmentInterface.imageAdjustment.setDetectionSettings(this.detectionImageSettings);
      }
    };

    /**
     * Saves measurement preferences (annual vs. subannual, forward vs. backward)
     * @function
     */
    AutoRingDetection.prototype.setMeasurementPreferences = function () {
      this.displayDialog(1, [275, 275], [50, 50])
      $("#auto-ring-detection-page-turn-1").on("click", () => {
        if (!Inte.treering.measurementOptions.forwardDirection && !Inte.treering.measurementOptions.subAnnual) {
          Inte.treering.data.year = parseInt($("#auto-ring-detection-start-year-input").val()) - 1;
        } else {
          Inte.treering.data.year = parseInt($("#auto-ring-detection-start-year-input").val());
        }

        if ($('#auto-ring-detection-forward-radio').is(":checked")) {
          Inte.treering.measurementOptions.forwardDirection = true;
          Inte.treering.data.earlywood = true;
        } else {
          Inte.treering.measurementOptions.forwardDirection = false;
          Inte.treering.data.earlywood = true;
        }

        if ($('#auto-ring-detection-subannual-radio').is(":checked")) {
          Inte.treering.measurementOptions.subAnnual = true;
        } else {
          Inte.treering.measurementOptions.subAnnual = false;
        }
        Inte.treering.metaDataText.updateText();
        this.detectionAreaPlacement()
      })
    }

    /**
     * Determine area to search for boundaries through user input
     * @function
     */
    AutoRingDetection.prototype.detectionAreaPlacement = async function() {
      if (this.dialog) {
        this.dialog.remove()
      }
      this.displayDialog(2, [305, 260], [50, 50]);
      Inte.treering.viewer.getContainer().style.cursor = 'pointer';
      this.tuneGLLayer(false); //Turn on default detection image settings

      $("#auto-ring-detection-img-adjust-toggle").on("click", () => {
        if (Inte.treering.imageAdjustmentInterface.imageAdjustment.open) {
          Inte.treering.imageAdjustmentInterface.imageAdjustment.disable();
          this.dialog._container.style.left = "50px"
        } else {
          Inte.treering.imageAdjustmentInterface.imageAdjustment.enable();
          this.dialog._container.style.left = "300px"          
        }
      })

      $("#auto-ring-detection-directions-toggle").on("click", () => {
        if ($("#auto-ring-detection-directions-text").is(":hidden")) {
          $("#auto-ring-detection-directions-toggle").css("color", "#005fff")
          $("#auto-ring-detection-directions-text").show()
        } else {
          $("#auto-ring-detection-directions-toggle").css("color", "black")
          $("#auto-ring-detection-directions-text").hide()
        }
      })

      this.firstLatLng = null;
      this.secondLatLng = null;

      var clickCount = 0;
      let zoom = Math.round(Inte.treering.viewer.getZoom());
      Inte.treering.viewer.setZoom(zoom, {animate: true})

      $(Inte.treering.viewer.getContainer()).on("click", e => {
        clickCount++;
        switch(clickCount) {
          //Place first point, store latlng, and turn on hbar
          case 1: {
            first = e;
            this.firstLatLng = Inte.treering.viewer.mouseEventToLatLng(first);
            this.firstPointMarker = L.marker(this.firstLatLng, {
              icon: L.icon({
                iconUrl: "../images/AutoStartPoint.png",
                iconSize: [24, 24]
              }),
              draggable: true
            }).addTo(Inte.treering.viewer)
    
            Inte.treering.mouseLine.enable();
            Inte.treering.mouseLine.from(this.firstLatLng)
            break;
          }
          //Place second point, store latlng, turn off hbar, create area outline
          case 2: {
            $("#auto-ring-detection-page-turn-2").prop("disabled", false);
            Inte.treering.viewer.getContainer().style.cursor = 'default';
            Inte.treering.mouseLine.disable();

            second = e;
            this.secondLatLng = Inte.treering.viewer.mouseEventToLatLng(second);
            if (this.firstLatLng.lng > this.secondLatLng.lng) {
              this.secondLatLng = this.firstLatLng;
              this.firstLatLng = Inte.treering.viewer.mouseEventToLatLng(second);

              this.firstPointMarker.remove();
              this.firstPointMarker = L.marker(this.firstLatLng, {
                icon: L.icon({
                  iconUrl: "../images/AutoStartPoint.png",
                  iconSize: [24, 24]
                }),
                draggable: true
              }).addTo(Inte.treering.viewer)
            }

            this.secondPointMarker = L.marker(this.secondLatLng, {
              icon: L.icon({
                iconUrl : "../images/AutoEarlywoodPoint.png",
                iconSize: [24, 24]
              }), 
              draggable: true
            }).addTo(Inte.treering.viewer);

            this.detectionHeight = $("#auto-ring-detection-height-input").val()
            let corners = this.getDetectionGeometry(this.detectionHeight, zoom).corners;
            this.detectionAreaOutline = this.createOutline(corners);
  
            //Event listeners for moving first & second point, height input
            this.firstPointMarker.on("dragend", () => {
              for (let line of this.detectionAreaOutline) {
                line.remove()
              }
              this.firstLatLng = this.firstPointMarker._latlng;
              corners = this.getDetectionGeometry(this.detectionHeight, zoom).corners;
              this.detectionAreaOutline = this.createOutline(corners);
            });

            this.secondPointMarker.on("dragend", () => {
              for (let line of this.detectionAreaOutline) {
                line.remove()
              }
              this.secondLatLng = this.secondPointMarker._latlng;
              corners = this.getDetectionGeometry(this.detectionHeight, zoom).corners;
              this.detectionAreaOutline = this.createOutline(corners);
            });

            $("#auto-ring-detection-height-input").on("change", () => {
              for (let line of this.detectionAreaOutline) {
                line.remove()
              }

              let input = document.getElementById("auto-ring-detection-height-input");
              let val = parseInt(input.value);
              let max = parseInt(input.max);
              let min = parseInt(input.min);
              if (val > max) {
                this.detectionHeight = max
                input.value = input.max
              }
              else if (val < min) {
                this.detectionHeight = min;
                input.value = input.min;
              }
              else {
                this.detectionHeight = val
              }

              corners = this.getDetectionGeometry(this.detectionHeight, zoom).corners;
              this.detectionAreaOutline = this.createOutline(corners);
            })
            break;
          }
        }
      })

      //Button event listeners
      $("#auto-ring-detection-path-reset").on("click", () => {
        this.firstLatLng = null;
        this.secondLatLng = null;

        if (this.firstPointMarker) {this.firstPointMarker.remove()};
        if (this.secondPointMarker) {this.secondPointMarker.remove()};
        
        for (let line of this.detectionAreaOutline) {
          line.remove()
        }
        clickCount = 0;

        $("#auto-ring-detection-page-turn-2").prop("disabled", true);
        $("#auto-ring-detection-area-error").hide();
        Inte.treering.viewer.getContainer().style.cursor = 'pointer';
        Inte.treering.mouseLine.disable();
      })

      //Get max and min zoom values for slider
      $("#auto-ring-detection-zoom-input").prop('max', Inte.treering.getMaxNativeZoom())
      $("#auto-ring-detection-zoom-input").prop('min', Inte.treering.viewer.getMinZoom())
      $("#auto-ring-detection-zoom-input").prop('value', zoom)

      $("#auto-ring-detection-zoom-input").on('change', () => {
        zoom = Math.round($("#auto-ring-detection-zoom-input").val())
        if ($("#auto-ring-detection-zoom-change-check").is(':checked')) {
          Inte.treering.viewer.setZoom(zoom)
        }

        for (let line of this.detectionAreaOutline) {
          line.remove()
        }

        if (this.firstLatLng && this.secondLatLng) {
          corners = this.getDetectionGeometry(this.detectionHeight, zoom).corners;
          this.detectionAreaOutline = this.createOutline(corners);          
        }
      })
      
      $("#auto-ring-detection-page-turn-2").on("click", async () => {
        $("#auto-ring-detection-layer-tip").hide();
        let detectionGeometry = this.getDetectionGeometry(this.detectionHeight, zoom);
        $("#auto-ring-detection-load-fix").show()

        //Hide image adjust for less clutter
        Inte.treering.imageAdjustmentInterface.imageAdjustment.disable();
        this.dialog._container.style.left = "50px"

        //Disable buttons
        this.toggleDialogTools(true);

        let cssFilters = Inte.treering.imageAdjustmentInterface.imageAdjustment.getCSSAdjustments()

        //Save the user's view
        let viewCenter = Inte.treering.baseLayer["GL Layer"]._map.getCenter();
        let viewZoom = Inte.treering.baseLayer["GL Layer"]._map.getZoom();

        //Save the user's image adjustments, specific to auto detection
        this.detectionImageSettings = Inte.treering.imageAdjustmentInterface.imageAdjustment.getCurrentViewJSON();

        let data = await Inte.treering.baseLayer["GL Layer"].getImageData(detectionGeometry.corners, detectionGeometry.angle, zoom, cssFilters);

        if (data === "sizeError") {//data returns false if area size too big
          $("#auto-ring-detection-area-error").show()
          $("auto-ring-detection-load-fix").hide()
          thiss.toggleDialogTools(false); //Enable buttons
        } else if (data === "exitError") {
          this.toggleDialogTools(false);
          $("auto-ring-detection-load-fix").hide()
        }
        else {
          this.tuneGLLayer(true); //Return to user's saved  image settings

          //Remove visuals and image adjust dialog
          this.firstPointMarker.remove();
          this.secondPointMarker.remove();

          if (Inte.treering.imageAdjustmentInterface.imageAdjustment.open) {
            Inte.treering.imageAdjustmentInterface.imageAdjustment.disable()
          }

          Inte.treering.viewer.getContainer().style.cursor = 'default';
          // let bData = this.medianBlur(data, 3);
          this.adjustAutoPlacements(data, zoom)
          Inte.treering.baseLayer["GL Layer"]._map.flyTo(viewCenter, viewZoom, {animate: false}) //Return to view settings
          // this.getDist(data)
        }
      });
    }

    /**
     * 
     * @param {Array} rawData - 2 Dimensional matrix of RGB data
     * @param {Integer} zoom - Zoom level from user input in previous step
     */
    AutoRingDetection.prototype.adjustAutoPlacements = function(rawData, zoom) {
      this.dialog.remove()

      dialogSize = Inte.treering.measurementOptions.subAnnual ? [280, 280] : [280, 320];
      this.displayDialog(3, dialogSize, [50, 50]);
      let u = this.getUnitVector(this.firstLatLng, this.secondLatLng, zoom);
      let currentAlgo;
      let boundaryPlacements;

      let data = this.medianBlur(rawData, 3)
      $("#auto-ring-detection-blur-input").on("change", () => {
        for (pointMarker of this.markers) { pointMarker.remove() };
        this.markers = [];

        let blurRadius = $("#auto-ring-detection-blur-input").val();
        data = this.medianBlur(rawData, blurRadius);

        if (currentAlgo) {
          let algoSettings = {
            subAnnual: Inte.treering.measurementOptions.subAnnual,
            zoom: zoom,
          };
          for (let option of currentAlgo.options) {
            algoSettings[option.name] = $("#"+option.id).val();
            $("#"+ option.id + "-text").html($("#" + option.id).val()); //Issue here
          }
  
          boundaryPlacements = currentAlgo.functionCall(data, algoSettings);
          this.showAutomaticPlacements(u, boundaryPlacements);
  
          if (boundaryPlacements && boundaryPlacements.length > 0) {
            $("#auto-ring-detection-page-turn-3").prop("disabled", false)
          } else {
            $("#auto-ring-detection-page-turn-3").prop("disabled", true)
          }
        }
      })

      $(".auto-ring-detection-slider-info-toggle").on("click", (e) => {
        let textId = "#" + e.currentTarget.id + "-text";
        let iconId = "#" + e.currentTarget.id;
        if ($(textId).is(":hidden")) {
          $(textId).show()
          $(iconId).css("color", "#005fff")
        } else {
          $(textId).hide();
          $(iconId).css("color", "black")
        }
      })

      //Radio Event Listener
      $(".auto-ring-detection-algo-radio").on("change", (algoRadioTarget) => {
        for (pointMarker of this.markers) { pointMarker.remove() };
        this.markers = [];

        for (let method of this.detectionMethods) { //Find chosen detection method & show correct settings
          if (method.method == algoRadioTarget.currentTarget.value) {
            currentAlgo = method;
            $("#"+method.divId).show()
          } else {
            $("#"+method.divId).hide()
          }
        }

        let algoSettings = {subAnnual: Inte.treering.measurementOptions.subAnnual, zoom: zoom};
        for (let option of currentAlgo.options) {
          algoSettings[option.name] = $("#"+option.id).val()
        }
        boundaryPlacements = currentAlgo.functionCall(data, algoSettings, u);
        this.showAutomaticPlacements(u, boundaryPlacements);

        if (boundaryPlacements && boundaryPlacements.length > 0) {
          $("#auto-ring-detection-page-turn-3").prop("disabled", false)
        } else {
          $("#auto-ring-detection-page-turn-3").prop("disabled", true)
        }
      })

      //Settings event listeners
      $(".auto-ring-detection-algo-settings").on("change", () => {
        for (pointMarker of this.markers) { pointMarker.remove() };
        this.markers = [];

        let algoSettings = {
          subAnnual: Inte.treering.measurementOptions.subAnnual,
          zoom: zoom,
        };
        for (let option of currentAlgo.options) {
          algoSettings[option.name] = $("#"+option.id).val();
          $("#"+ option.id + "-text").html($("#" + option.id).val());
        }
        boundaryPlacements = currentAlgo.functionCall(data, algoSettings);
        this.showAutomaticPlacements(u, boundaryPlacements);

        if (boundaryPlacements && boundaryPlacements.length > 0) {
          $("#auto-ring-detection-page-turn-3").prop("disabled", false)
        } else {
          $("#auto-ring-detection-page-turn-3").prop("disabled", true)
        }
      });

      $("#auto-ring-detection-point-toggle").on("change", () => {
        if ($("#auto-ring-detection-point-toggle").is(":checked")) {
          for (let marker of this.markers) {
            if (marker._radius) {marker.addTo(Inte.treering.viewer)}
          }
        } else {
          for (let marker of this.markers) {
            if (marker._radius) {marker.remove()}
          }
        }
      })

      $("#auto-ring-detection-edge-toggle").on("change", () => {
        if ($("#auto-ring-detection-edge-toggle").is(":checked")) {
          for (let marker of this.markers) {
            if (marker._latlngs) {marker.addTo(Inte.treering.viewer)}
          }
        } else {
          for (let marker of this.markers) {
            if (marker._latlngs) {marker.remove()}
          }
        }
      })

      //Save placements button listener
      $("#auto-ring-detection-page-turn-3").on("click", () => {
        for (let line of this.detectionAreaOutline) {
          line.remove();
        }
        for (let marker of this.markers) {
          marker.remove()
        }
        this.placePoints(u, boundaryPlacements)
      });
    }

    /**
     * Creates rectangle showing detection area, with its color based on brightness
     * @function
     * 
     * @param {Array} corners - Array with 4 latLng objects
     * @returns - Leaflet polygon, for future removal
     */
    AutoRingDetection.prototype.createOutline = function(corners) {
      let rectColor = $("#brightness-slider").val() > 150 ? "black" : "white"
      return [L.polygon(corners, {color: rectColor, weight: 3}).addTo(Inte.treering.viewer)]
    }

    /**
     * Finds corners of detection area and angle between start/end points
     * 
     * @param {Integer} detectionHeight - Height of detection area
     * @param {Integer} zoom - Map zoom level
     * @returns - Object with corners, angle of detection area
     */
    AutoRingDetection.prototype.getDetectionGeometry = function (detectionHeight, zoom) {
      let firstPixelCoords = Inte.treering.baseLayer["GL Layer"]._map.project(this.firstLatLng, zoom).floor();
      let secondPixelCoords = Inte.treering.baseLayer["GL Layer"]._map.project(this.secondLatLng, zoom).floor();

      let deltaX = secondPixelCoords.x - firstPixelCoords.x;
      let deltaY = secondPixelCoords.y - firstPixelCoords.y;
      let latLngPerPixel, angle;
      if (deltaX === 0) {
        latLngPerPixel = (this.secondLatLng.lat - this.firstLatLng.lat) / deltaY;
        angle = (deltaY > 0) ? Math.PI/2 : -Math.PI/2
      } else {
        latLngPerPixel = (this.secondLatLng.lng - this.firstLatLng.lng) / deltaX;
        angle = Math.atan(deltaY/deltaX);
      }
      
      let corners = [];
      let cornerLat = this.firstLatLng.lat - (detectionHeight / 2) * Math.cos(angle) * latLngPerPixel;
      let cornerLng = this.firstLatLng.lng - (detectionHeight / 2) * Math.sin(angle) * latLngPerPixel;
      corners.push(L.latLng(cornerLat, cornerLng))
      
      cornerLat = this.firstLatLng.lat + (detectionHeight / 2) * Math.cos(angle) * latLngPerPixel;
      cornerLng = this.firstLatLng.lng + (detectionHeight / 2) * Math.sin(angle) * latLngPerPixel;
      corners.push(L.latLng(cornerLat, cornerLng))
      
      cornerLat = this.secondLatLng.lat + (detectionHeight / 2) * Math.cos(angle) * latLngPerPixel;
      cornerLng = this.secondLatLng.lng + (detectionHeight / 2) * Math.sin(angle) * latLngPerPixel;
      corners.push(L.latLng(cornerLat, cornerLng))
      
      cornerLat = this.secondLatLng.lat - (detectionHeight / 2) * Math.cos(angle) * latLngPerPixel;
      cornerLng = this.secondLatLng.lng - (detectionHeight / 2) * Math.sin(angle) * latLngPerPixel;
      corners.push(L.latLng(cornerLat, cornerLng))

      return {corners: corners, angle: -angle}
    }

    /**
     * Classifies each pixel as light or dark, uses the count of each column to find boundaries
     * 
     * @param {Array} imageData - Processed (blurred) 2-D array of pixels, represented by avg rgb
     * @param {Object} algorithmSettings - Contains detection settings relevant to algorithm
     * @returns Array of boundary placements
     */
    AutoRingDetection.prototype.classificationDetection = function(imageData, algorithmSettings) {
      let globalThreshold = algorithmSettings.globalThreshold;

      let l = imageData[0].length;
      let h = imageData.length;

      let transitions = [];
      let trs = {};
      let prevClass, currentClass;
      for (let i = 0; i < h; i++) {
        prevClass = imageData[i][0] <= globalThreshold ? "dark" : "bright"
        for (let j = 1; j < l; j++) {
          let intensity = imageData[i][j];
          currentClass = intensity <= globalThreshold ? "dark" : "bright";
          if (currentClass !== prevClass) {
            transitions.push([i, j]);
            trs[[i,j]] = currentClass
          }
          prevClass = currentClass;
        }
      }

      for (let j = 0; j < l; j++) {
        prevClass = imageData[0][j] <= globalThreshold ? "dark" : "bright";
        for (let i = 1; i < h; i++) {
          let intensity = imageData[i][j];
          currentClass = intensity <= globalThreshold ? "dark" : "bright";
          if (currentClass !== prevClass && !transitions.includes([i,j])) {
            transitions.push([i, j]);
            trs[[i,j]] = currentClass
          }
          prevClass = currentClass;
        }
      }

      let boundarySets = [];
      let edges;
      for (let point of transitions) {
        if (point[0] <= 1 || point[0] >= h - 1) {
          edges = this.traceEdge(trs, point, h)
          if (edges.length > 0) {
            for (let edge of edges) {
              for (let point of edge) {
                delete trs[point];
              }
            }
            boundarySets = boundarySets.concat(edges);
          }
          
        }
      }

      let u = this.getUnitVector(this.firstLatLng, this.secondLatLng, algorithmSettings.zoom);
      let leftLatLng = this.firstLatLng;  

      for (let marker of this.markers) {
        marker.remove()
      }

      this.markers = [];

      // for (let point of transitions) {
      //   let lat = leftLatLng.lat + point[1] * u.y + (-point[0] + h/2) * u.x;
      //   let lng = leftLatLng.lng + point[1] * u.x - (-point[0] + h/2) * u.y;
      //   let latLng = L.latLng(lat, lng);
      //   this.markers.push(L.circleMarker(latLng, {color: "yellow", radius: "1"}).addTo(Inte.treering.viewer))
      // }

      //show ring boundaries
      for (let edge of boundarySets) {
        let edgeLatLngs = [];
        for (let point of edge) {
          let lat = leftLatLng.lat + point[1] * u.y + (-point[0] + h/2) * u.x;
          let lng = leftLatLng.lng + point[1] * u.x - (-point[0] + h/2) * u.y;
          let latLng = L.latLng(lat, lng);

          edgeLatLngs.push(latLng)

        }
        this.markers.push(L.polyline(edgeLatLngs, {color: "#029effff"}).addTo(Inte.treering.viewer))
      }

      let boundaryPlacements = [];
      let y = Math.floor(h/2);
      for (let edge of boundarySets) {
        for (let x = 0; x < l; x++) {
          for (let point of edge) {
            if (x == point[1] && y == point[0]) {
              boundaryPlacements.push([y,x]);
              x = l;
            }
          }
        }
      }
      return boundaryPlacements;
    }
    
    /**
     * Places temporary markers representing boundary placements
     * @function
     * 
     * @param {Object} u - unit vector of form {x: x, y: y} that represents direction from start to end point
     * @param {Array} boundaryPlacements - Boundary placements from detection algorithms
     */
    AutoRingDetection.prototype.showAutomaticPlacements = function(u, boundaryPlacements) {
      let leftLatLng = this.firstLatLng;

      for (let point of boundaryPlacements) {
        let lat = leftLatLng.lat + point[1] * u.y + (-point[0] + this.detectionHeight/2) * u.x;
        let lng = leftLatLng.lng + point[1] * u.x - (-point[0] + this.detectionHeight/2) * u.y;
        let latlng = L.latLng(lat, lng);

        this.markers.push(L.circleMarker(latlng, {color: "#ffff01ff", radius: 2}).addTo(Inte.treering.viewer))
      }
    }

    /**
     * Saves boundary placements and saves accompanying data
     * @function
     * 
     * @param {Object} u - unit vector of form {x: x, y: y} that represents direction from start to end point
     * @param {Array} boundaryPlacements - Boundary placements from detection algorithms
     */
    AutoRingDetection.prototype.placePoints = function(u, boundaryPlacements) {
      Inte.treering.undo.push();

      if (!Inte.treering.measurementOptions.forwardDirection) {
        boundaryPlacements = boundaryPlacements.reverse()
      }

      let leftLatLng = this.firstLatLng;

      let i = 0;
      for (let point of boundaryPlacements) {
        let lat = leftLatLng.lat + point[1] * u.y + (-point[0] + this.detectionHeight/2) * u.x;
        let lng = leftLatLng.lng + point[1] * u.x - (-point[0] + this.detectionHeight/2) * u.y;
        let latLng = L.latLng(lat, lng);

        let start = (i === 0) ? true : false;
        Inte.treering.data.newPoint(start, latLng, true);
        Inte.treering.visualAsset.newLatLng(Inte.treering.data.points, Inte.treering.data.index-1, latLng);
        i++;
      }
      Inte.treering.visualAsset.reload();
      this.disable()
    }
  
    /**
     * Calculates the unit vector with direction from first to second point
     * @function
     * 
     * @param {Integer} zoom - Zoom level from user input
     * @returns object in the form {x: int, y: int} representing the unit vector with the direction from the first to the second placed point
     */
    AutoRingDetection.prototype.getUnitVector = function(ll1, ll2, zoom) {
      let firstPixelCoords = Inte.treering.baseLayer["GL Layer"]._map.project(ll1, zoom).floor();
      let secondPixelCoords = Inte.treering.baseLayer["GL Layer"]._map.project(ll2, zoom).floor();
  
      let deltaX = secondPixelCoords.x - firstPixelCoords.x;
      let deltaY = secondPixelCoords.y - firstPixelCoords.y;
      let numPixels = (deltaX**2 + deltaY**2)**(1/2);
      let latLngPerPixel = (this.secondLatLng.lng - this.firstLatLng.lng) / deltaX
  
      let dx = -deltaX/numPixels * latLngPerPixel;
      let dy = deltaY/numPixels * latLngPerPixel;
  
      return {x: -dx, y: -dy}
    }

    /**
     * Uses a median blur on the image data to reduce noise when searching for boundaries
     * @function
     * 
     * @param {Array} data - Matrix of pixels in image, with each pixel represented by (r, g, b)
     * @param {Integer} r - Blur radius for kernel size, r=1 uses a 3x3 kernel, r=2 uses 5x5 etc.
     * @returns 2D matrix of pixels, represented by avg rgb after blurring
     */
    AutoRingDetection.prototype.medianBlur = function (data, r) {
      let h = data.length;
      let w = data[0].length;

      let intensityData = [];
      for (let i = 0; i < h; i++) {
        let row = [];
        for (let j = 0; j < w; j++) {
          let pixel = data[i][j]
          row.push((pixel[0] + pixel[1] + pixel[2]) / 3)
          // row.push(pixel[0])
        }
        intensityData.push(row)
      }

      let blurData = []
      for (let i = 0; i < h; i++) {
        let row = [];
        for (let j = 0; j < w; j++) {
          let window = [];
          for (let ry = -r; ry <= r; ry++) {
            for (let rx = -r; rx <= r; rx++) {
              let ny = i + ry;
              if (ny < 0) {
                ny = 0;
              } else if (ny >= h) {
                ny = h - 1
              }

              let nx = j + rx;
              if (nx < 0) {
                nx = 0
              } else if (nx >= w) {
                nx = w - 1
              }

              window.push(intensityData[ny][nx])
            }
          }

          window.sort((a,b) => a - b)
          let median = window[window.length/2 - 0.5];
          row.push(median)
        }
        blurData.push(row)
      }

      return blurData
    }

    /**
     * Disables or enables tools for detectionAreaPlacement, used when collecting image data
     * @function
     * 
     * @param {Boolean} disableState - Boolean stating whether or not dialog tools are to be enabled or disabled
     */
    AutoRingDetection.prototype.toggleDialogTools = function(disableState) {
      toolIDs = ["zoom-input", "zoom-change-check", "height-input", "page-turn-2", "path-reset"];
      for (let id of toolIDs) {
        $("#auto-ring-detection-" + id).prop('disabled', disableState);
      }

      if (disableState) {
        $("#auto-ring-detection-img-adjust-toggle").off("click")
      } else {
        $("#auto-ring-detection-img-adjust-toggle").on("click", () => {
          if (Inte.treering.imageAdjustmentInterface.imageAdjustment.open) {
            Inte.treering.imageAdjustmentInterface.imageAdjustment.disable();
            this.dialog._container.style.left = "50px"
          } else {
            Inte.treering.imageAdjustmentInterface.imageAdjustment.enable();
            this.dialog._container.style.left = "300px"          
          }
        })
      }
    }

    AutoRingDetection.prototype.traceEdge = function(transitions, start, h) {
      let edge = {};
      edge[start] = 0;
      let o2 = {0: start}
      let graph = [];
      let paths = [];
      let point = start;
      let edgeEnd = false;
      let sources = [];
      let destinations = [];
      let currentIndex = 0;
      let nextIndex = 1;

      while (!edgeEnd) {
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            let check = [point[0] + y, point[1] + x]
            //If the check is a transition:
            // add the connection to the array (ie show that 0 is connected to 1), but don't connect to itself
            //Add the coordinates to the object to store the index of the point, if it hasn't already been added
            if (transitions[check]) {
              if (typeof(edge[check]) !== "number") {
                edge[check] = nextIndex;
                o2[nextIndex] = check
                paths.push(check)
                if (check[0] < 2) {sources.push(nextIndex)}
                if (check[0] > h - 2) {destinations.push(nextIndex)}
                nextIndex++
              }

              if (graph[currentIndex] && edge[check] != currentIndex) {
                graph[currentIndex].push(edge[check])
              } else if (edge[check] != currentIndex) {
                graph[currentIndex] = [edge[check]]
              }
            }

 
          }
        }
        if (paths.length == 0) {
          edgeEnd = true;
        } else {
          point = paths.pop();
          currentIndex = edge[point]
        }
      }

      let search = false;
      let s,d;
      // let split = false;

      if (sources.length > 0 && destinations.length > 0) {
        search = true;
        s = sources[0];
        d = destinations[0];
      }
      //  else if (sources.length > 1) {
      //   // console.log('ss')
      //   search = true;
      //   split = true;
      //   s = Math.min(...sources);
      //   d = Math.max(...sources);
      //   console.log('ss', s, d)
      // } else if (destinations.length > 1) {
      //   // console.log('dd')
      //   search = true;
      //   split = true;
      //   s = Math.min(...destinations);
      //   d = Math.max(...destinations);
      //   console.log('dd', s, d)
      // }

      if (search) {
        let vertexCount = nextIndex;
        
        let par = Array(vertexCount).fill(-1);
        let distance = Array(vertexCount).fill(Infinity)

        let q = [];
        distance[s] = 0;
        q.push(s);

        while (q.length > 0) {
          let node = q.shift();

          for (let neighbor of graph[node]) {
            if (distance[neighbor] === Infinity) {
              par[neighbor] = node;
              distance[neighbor] = distance[node] + 1;
              q.push(neighbor)
            }
          }
        }

        let path = [d];
        let currentNode = d;
        while (par[currentNode] !== -1) {
          path.push(par[currentNode]);
          currentNode = par[currentNode]
        }
        path.push(s)

        let optimalPath = []
        for (let point of path) {
          optimalPath.push(o2[point])
        }
        return [optimalPath]
      } else {
        return [[]]
      }
    }

    AutoRingDetection.prototype.shortestPath = function(graph, S, par, dist) {
      let q = [];
      dist[S] = 0;
      q.push(S);

      while (q.length > 0) {
        let node = q.shift();

        for (let neighbor of graph[node]) {
          if (dist[neighbor] === Infinity) {
            par[neighbor] = node;
            dist[neighbor] = dist[node] + 1;
            q.push(neighbor)
          }
        }
      }
    }
  }
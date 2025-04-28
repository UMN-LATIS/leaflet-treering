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
    this.firstLatLng = null;
    this.secondLatLng = null;
    this.detectionHeight = 0;
    this.detectionAreaOutline = [L.polyline([])];

    //Expandable list of detection methods and their inputs
    this.detectionMethods = [
      {
        method: "classification",
        divId: "auto-ring-detection-classification-settings",
        functionCall: (data, algoSettings) => {return this.classificationDetection(data, algoSettings)},
        options: [
          {
            name: 'boundaryBrightness',
            label: "Boundary Intensity",
            id: 'auto-ring-detection-boundary-brightness',
            min: 0,
            max: 255,
            step: 1,
            defaultValue: 50,
            description: "An estimate for the average RGB (intensity) to separate earlywood and latewood segments."
          },
          {
            name: "classColPercentile",
            label: "Column Percentile",
            id: "auto-ring-detection-class-col-percentile",
            min: 0,
            max: 1,
            step: 0.01,
            defaultValue: 0.25,
            description: "The number of lines that indicate a change in intensity, as a percent of the area height, required to place a boundary. Typically works best form 0.10-0.25 and 0.75 to 0.90.",
          }
        ],
        radioLabel: "Pixel Classification",
        radioInfo: "Classifies pixels as low or high intensity, based on the intensity input. Searches for changes in intensity to place boundary points."
      },
      {
        method: "exponential-smoothing",
        divId: "auto-ring-detection-exp-detection-settings",
        functionCall: (data, algoSettings) => {return this.exponentialSmoothingDetection(data, algoSettings)},
        options: [
          {
            name: "alpha",
            label: "Smoothing Factor",
            id: "auto-ring-detection-edge-alpha",
            min: 0,
            max: 1,
            step: 0.01,
            defaultValue: 0.75,
            description: "A coefficient to determine the 'smoothness' of data when searching for edges. Values closer to 0 create smoother data."
          },
          {
            name: "expExtremaThresh",
            label: "Brightness Change Threshold",
            id: "auto-ring-detection-exp-extrema-threshold",
            min: 0,
            max: 1,
            step: 0.01,
            defaultValue: 0.2,
            description: "Determines the magnitude of change in intensity required to detect an edge."
          },
          {
            name: "expColPercentile",
            label: "Edge Count",
            id: "auto-ring-detection-exp-col-percentile",
            min: 0,
            max: 50,
            step: 1,
            defaultValue: 20,
            description: "The number of detected edges to indicate a boundary point.",
          }
        ],
        radioLabel: "Edge Detection",
        radioInfo: "Uses exponential smoothing to perform edge detection along the axis defined by the start/end points. Searches for areas with high number of edges"
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
        this.detectionAreaSelection(false)
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

        //Remove visuals/event listeners from detectionAreaSelection
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
      // console.log(Inte.treering.measurementOptions.subAnnual)

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
        //Set pre-determined image settings (pretty arbitrary)
        Inte.treering.imageAdjustmentInterface.imageAdjustment.setDetectionSettings();
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
        this.detectionAreaSelection()
      })
    }

    /**
     * Determine area to search for boundaries through user input
     * @function
     */
    AutoRingDetection.prototype.detectionAreaSelection = async function() {
      if (this.dialog) {
        this.dialog.remove()
      }
      this.displayDialog(2, [260, 275], [50, 50]);
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
        // Inte.treering.baseLayer["GL Layer"].getImageData(detectionGeometry.corners, detectionGeometry.angle, zoom, cssFilters)
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
          this.tuneGLLayer(true); //Return to user's saved settings

          //Remove visuals and image adjust dialog
          this.firstPointMarker.remove();
          this.secondPointMarker.remove();

          if (Inte.treering.imageAdjustmentInterface.imageAdjustment.open) {
            Inte.treering.imageAdjustmentInterface.imageAdjustment.disable()
          }

          Inte.treering.viewer.getContainer().style.cursor = 'default';
          this.bounaryPlacementAdjustments(data, zoom)
        }
      });
    }

    /**
     * 
     * @param {Array} rawData - 2 Dimensional matrix of RGB data
     * @param {Integer} zoom - Zoom level from user input in previous step
     */
    AutoRingDetection.prototype.bounaryPlacementAdjustments = function(rawData, zoom) {
      this.dialog.remove()
      this.displayDialog(3, [280, 340], [50, 50]);
      let u = this.getDirectionVector(zoom);
      let currentAlgo;
      let boundaryPlacements;

      let data = this.medianBlur(rawData, 1)
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
      let boundaryBrightness = algorithmSettings.boundaryBrightness;
      let colPercentile = algorithmSettings.classColPercentile;

      let l = imageData[0].length;
      let h = imageData.length;

      let colMap = [];
      for (let j = 0; j < l; j++) {
        let colSum = 0;
        for (let i = 0; i < h; i++) {
          let avg = imageData[i][j];
          let classification;
          if (avg >= boundaryBrightness + 10) {
            classification = 1;
          } else if (avg <= boundaryBrightness - 10) {
            classification = 0
          } else {
            classification = 0.5
          }
          colSum += classification;
        }
        let colClass = colSum >= colPercentile * h ? 1 : 0;
        colMap.push(colClass);
      }
      
      let minDist = 18 - 4 *(Inte.treering.getMaxNativeZoom() - algorithmSettings.zoom);
      minDist = minDist < 4 ? 4 : minDist;

      let boundaryPlacements = [];
      let nextTransitionDTL = null;
      let lastTransitionIndex = 1;
      for (let i = 1; i < l; i++) {
        if (algorithmSettings.subAnnual) {
          if (colMap[i] != colMap[i-1]) {
            if (i - lastTransitionIndex > minDist) {
              lastTransitionIndex = i;
              if (colMap[i] == 1 && (nextTransitionDTL || nextTransitionDTL == null)) {
                boundaryPlacements.push(i)
                nextTransitionDTL = false;
              } else if (colMap[i] == 0 && (!nextTransitionDTL || nextTransitionDTL == null)) {
                boundaryPlacements.push(i)
                nextTransitionDTL = true;
              }              
            } else {
              lastTransitionIndex = i;
            }
          }
        } else if (colMap[i] == 0 && colMap[i-1] != 0) {
          i += 20 - 2 * (Inte.treering.getMaxNativeZoom() - algorithmSettings.zoom);
          boundaryPlacements.push(i)
        }
      }

      return boundaryPlacements
    }

    /**
     * Uses exponential smoothing across rows to find edges, counts edges vertically to detect boundaries
     * @function
     * 
     * @param {Array} imageData - Processed (blurred) 2-D array of pixels, represented by avg rgb
     * @param {*} algorithmSettings - Contains detection settings relevant to algorithm
     * @returns Array of boundary placements
     */
    AutoRingDetection.prototype.exponentialSmoothingDetection = function(imageData, algorithmSettings) {
      let alpha = algorithmSettings.alpha;
      let invert = Inte.treering.imageAdjustmentInterface.imageAdjustment.invert;

      let l = imageData[0].length;
      let h = imageData.length;

      let ts = [];
      for (let i = 0; i < h; i ++) {
        let f = [imageData[0][0]], d1 = [0], d2 = [0];
        for (let j = 1; j < l; j++) {

          let avg = imageData[i][j]
          f.push(avg)

          let diff = avg - f[j-1];
          let smoothDiff = alpha * diff + (1 - alpha) * d1[j-1];
          d1.push(smoothDiff)

          diff = smoothDiff - d1[j-1]
          smoothDiff = alpha * diff + (1 - alpha) * d2[j - 1]
          d2.push(smoothDiff)
        }

        let expExtremaThresh = algorithmSettings.expExtremaThresh;

        let minT = Math.min(...d1.slice(5))* expExtremaThresh * 0.75;
        let maxT = Math.max(...d1.slice(5))* expExtremaThresh * 0.75;
        for (let j = 6; j < l; j++) {
          if (d2[j-1] * d2[j] < 0) {
            if (algorithmSettings.subAnnual) {
              if (d1[j] <= minT || d1[j] >= maxT) {
                ts.push([i, j-1])
                j += 3;
              }
            } else {
              if (invert && d1[j] >= maxT) {
                ts.push([i, j-1]);
                j += 3;
              } else if (!invert && d1[j] <= minT) {
                ts.push([i, j-1])
                j += 3;
              }
            }
          }
        }
      }

      let counter = {}
      for (let coord of ts) {
        let xVal = coord[1];
        if (counter[xVal]) {
          counter[xVal]++;
        } else {
          counter[xVal] = 1;
        }
      }

      let minDist = 40 - 5 *(Inte.treering.getMaxNativeZoom() - algorithmSettings.zoom);
      minDist = minDist < 8 ? 8 : minDist;

      let bounaryPlacements = []
      let localStart = 0, localMax = [0, 0];
      for (let x = 7; x < l - 2; x++) {
        let sum = 0;
        for (let c = -2; c <= 2; c++) {
          let count = (counter[x + c] !== undefined) ? counter[x] : 0;
          sum += count
        }
        sum /= 5;


        if (sum >= algorithmSettings.expColPercentile) {
          if (localStart === 0) {
            localStart = x;
            localMax = [x, sum]
          } else if (x > localStart + minDist) {
            bounaryPlacements.push(localMax[0])
            localStart = x;
            localMax = [x, sum]
          } else if (x < localStart + 30 && sum >= localMax[1]) {
            localMax = [x, sum]
          }
        }
      }
      bounaryPlacements.push(localMax[0])

      return bounaryPlacements
    }

    
    /**
     * Places temporary markers representing boundary placements
     * @function
     * 
     * @param {Object} u - unit vector of form {x: x, y: y} that represents direction from start to end point
     * @param {Array} boundaryPlacements - Boundary placements from detection algorithms
     */
    AutoRingDetection.prototype.showAutomaticPlacements = function(u, boundaryPlacements) {
      let base;
      if (this.firstLatLng.lng > this.secondLatLng.lng) {
        base = this.secondLatLng
      } else {
        base = this.firstLatLng
      }

      if ((boundaryPlacements[0] * u.x) < 0) { //If point placed left of leftmost point of selection area
        u = {x: -u.x, y: -u.y}
      }

      let lng, lat, latLng, pointMarker;
      for (let point of boundaryPlacements) {
        lng = base.lng + point * u.x;
        lat = base.lat + point * u.y;

        latLng = L.latLng(lat, lng);
        pointMarker = L.circleMarker(latLng, {radius: 2, color: 'yellow'});
        this.markers.push(pointMarker);
        pointMarker.addTo(Inte.treering.viewer)
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
      // let anchor = this.dialog.options.anchor;
      this.dialog.remove();
      // this.displayDialog(4, [280, 320], anchor)
      this.dialog = null;

      if (!Inte.treering.measurementOptions.forwardDirection) {
        boundaryPlacements = boundaryPlacements.reverse()
      }


      let base;
      if (this.firstLatLng.lng > this.secondLatLng.lng) {
        base = this.secondLatLng
      } else {
        base = this.firstLatLng
      }

      if ((boundaryPlacements[0] * u.x) < 0) { //If point placed left of leftmost point of selection area
        u = {x: -u.x, y: -u.y}
      }

      let lng, lat, latLng;
      let i = 0;
      for (let point of boundaryPlacements) {
        lng = base.lng + point *u.x;
        lat = base.lat + point * u.y;
        latLng = L.latLng(lat, lng);

        let start = (i == 0) ? true : false;
        Inte.treering.data.newPoint(start, latLng, true);
        Inte.treering.visualAsset.newLatLng(Inte.treering.data.points, Inte.treering.data.index-1, latLng)
        i++;
      }
      Inte.treering.visualAsset.reload()

      this.disable();
    }
  
    /**
     * Calculates the unit vector with direction from first to second point
     * @function
     * 
     * @param {Integer} zoom - Zoom level from user input
     * @returns object in the form {x: int, y: int} representing the unit vector with the direction from the first to the second placed point
     */
    AutoRingDetection.prototype.getDirectionVector = function(zoom) {
      let firstPixelCoords = Inte.treering.baseLayer["GL Layer"]._map.project(this.firstLatLng, zoom).floor();
      let secondPixelCoords = Inte.treering.baseLayer["GL Layer"]._map.project(this.secondLatLng, zoom).floor();
  
      let deltaX = secondPixelCoords.x - firstPixelCoords.x;
      let deltaY = secondPixelCoords.y - firstPixelCoords.y;
      let numPixels = (deltaX**2 + deltaY**2)**(1/2);
      let latLngPerPixel = (this.secondLatLng.lng - this.firstLatLng.lng) / deltaX
  
      let dx = (firstPixelCoords < secondPixelCoords) ? deltaX/numPixels * latLngPerPixel : -(deltaX/numPixels * latLngPerPixel)
      let dy = (firstPixelCoords < secondPixelCoords) ? -(deltaY/numPixels * latLngPerPixel) : deltaY/numPixels * latLngPerPixel
  
      return {x: dx, y: dy}
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
     * Disables or enables tools for detectionAreaSelection, used when collecting image data
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
  }
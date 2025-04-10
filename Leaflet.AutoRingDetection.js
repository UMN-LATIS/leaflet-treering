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
 * @param {LTreering} Lt - Leaflet treering object
 */
function AutoRingDetection(Inte) {
    this.active = false;
    this.userImageSettings = {};
  
    this.markers = [];
    this.firstLatLng = null;
    this.secondLatLng = null;
    this.detectionHeight = 0;
    this.detectionAreaOutline = [L.polyline([])];

    this.detectionMethods = [
      {
        method: "classification",
        divId: "auto-ring-detection-classification-settings",
        functionCall: (data, algoSettings) => {return this.classificationDetection(data, algoSettings)},
        options: [
          {
            name: 'boundaryBrightness',
            label: "Boundary Brightness",
            id: 'auto-ring-detection-boundary-brightness',
            min: 0,
            max: 255,
            step: 1,
            defaultValue: 50,
            description: "An estimate for the average RGB of a boundary or latewood segment."
          },
          {
            name: "classColPercentile",
            label: "Column Percentile",
            id: "auto-ring-detection-class-col-percentile",
            min: 0,
            max: 1,
            step: 0.01,
            defaultValue: 0.25,
            description: "The number of edges that indicate a change in brightness, based on the area height. Typically works best form 0.10-0.25 and 0.75 to 0.90.",
          }
        ],
        radioLabel: "Pixel Classification"
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
            defaultValue: 0.35,
            description: "A coefficient to determine the 'smoothness' of each 1D line. Values closer to 0 create smoother data."
          },
          {
            name: "expExtremaThresh",
            label: "Brightness Change Threshold",
            id: "auto-ring-detection-exp-extrema-threshold",
            min: 0,
            max: 1,
            step: 0.01,
            defaultValue: 0.2,
            description: "A threshold to determine the magnitude of a change in brightness to detect an edge."
          },
          {
            name: "expColPercentile",
            label: "Column Percentile",
            id: "auto-ring-detection-exp-col-percentile",
            min: 0,
            max: 1,
            step: 0.01,
            defaultValue: 0.30,
            description: "The number of edges that indicate a change in brightness, based on the area height. Typically works best form 0.10-0.25 and 0.75 to 0.90.",
          }
        ],
        radioLabel: "Exp Smoothing Edge Detection"
      },
      {
        method: "gaussian-smoothing",
        divId: "auto-ring-detection-gauss-detection-settings",
        radioLabel: "Gaussian Edge Detection",
        functionCall: (data, algoSettings) => {return this.gaussSmoothingDetection(data, algoSettings)},
        options: [
          {
            name: "gaussKernelSize",
            label: "Kernel Size",
            id: "auto-ring-detection-gauss-kernel-size",
            min: 3,
            max: 20,
            step: 1,
            defaultValue: 5,
            description: "The size of the kernel used for gaussian bluring."
          },
          {
            name: "sigma",
            label: "Blue Standard Deviation",
            id: "auto-ring-detection-gauss-sigma",
            min: 1,
            max: 30,
            step: 1,
            defaultValue: 5,
            description: "Standard deviation used in the calculation of kernel values."
          },
          {
            name: "gaussExtremaThresh",
            label: "Brightness Change Threshold",
            id: "auto-ring-detection-gauss-extrema-threshold",
            min: 0,
            max: 1,
            step: 0.01,
            defaultValue: 0.2,
            description: "A threshold to determine the magnitude of a change in brightness to detect an edge."
          },
          {
            name: "gaussColPercentile",
            label: "Column Percentile",
            id: "auto-ring-detection-gauss-col-percentile",
            min: 0,
            max: 1,
            step: 0.01,
            defaultValue: 0.30,
            description: "The number of edges that indicate a change in brightness, based on the area height. Typically works best form 0.10-0.25 and 0.75 to 0.90.",
          }
        ]
      }
    ]
  
    this.btn = new Button(
      'search',
      'Auto ring detection',
      () => { Inte.treering.disableTools(); this.enable() },
      () => { this.disable() }
    );
  
    AutoRingDetection.prototype.enable = function () {
      // let kernel = this.gaussianKernel(7, 1);
      // console.log(kernel, kernel[0])
      this.active = true;
      this.userImageSettings = Inte.treering.imageAdjustmentInterface.imageAdjustment.getCurrentViewJSON()
      this.btn.state('active');
      Inte.treering.viewer.getContainer().style.cursor = 'pointer';

      $(document).on('keyup', e => {
        var key = e.which || e.key;
        if (key === 'Escape') {
          this.disable();
        }
      });
  
      if (Inte.treering.data.points.length == 0) {
        this.setMeasurementPreferences();
      } 
      else {
        this.selectPoints(false)
      }
    }

    AutoRingDetection.prototype.disable = function () {
      if (this.active) {
        if (this.dialog) {
          // this.dialog.unlock();
          // this.dialog.close();
          this.dialog.remove();
        };
  
        this.active = false;
        this.btn.state('inactive');
        Inte.treering.viewer.getContainer().style.cursor = 'default';
        if (Inte.treering.imageAdjustmentInterface.imageAdjustment.open) {
          Inte.treering.imageAdjustmentInterface.imageAdjustment.disable()
        }

        // Inte.treering.viewer.getContainer().removeEventListener("click", autoDetectPlacment)
        for (let line of this.detectionAreaOutline) {
          line.remove()
        }
        if (this.firstPointMarker) {this.firstPointMarker.remove()}
        if (this.secondPointMarker) {this.secondPointMarker.remove()}
        for (let pointMarker of this.markers) { pointMarker.remove()};
  
        this.tuneGLLayer(true);
      }
    }

    AutoRingDetection.prototype.displayDialog = function (pageNumber, size = [280, 320], anchor = [50, 50]) {
      let contentId = "AutoRingDetection-page-" + pageNumber;
      let content = document.getElementById(contentId).innerHTML;

      let html;
      if (pageNumber == 3) { //only need Handlebars for detection page
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
      return this.dialog;
    };

    AutoRingDetection.prototype.tuneGLLayer = function (reset) {
      if (reset) {
        Inte.treering.imageAdjustmentInterface.imageAdjustment.loadImageSettings(this.userImageSettings);
      } else {
        Inte.treering.imageAdjustmentInterface.imageAdjustment.setDetectionSettings();
      }
    };

    AutoRingDetection.prototype.displayDirections = function (pageNumber) {
      this.displayDialog(pageNumber)
      $(".auto-ring-detection-page-turn").on("click", () => {
        pageNumber++;
        this.dialog.remove()
        this.displayDirections(pageNumber);
      }) 
    }

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
        this.selectPoints()
      })
    }

    AutoRingDetection.prototype.selectPoints = async function() {
      if (this.dialog) {
        this.dialog.remove()
      }
      this.displayDialog(2, [260, 230], [50, 50])
      this.tuneGLLayer(false);

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
      let zoom = Math.floor(Inte.treering.viewer.getZoom());
      // let zoom = Inte.treering.getMaxNativeZoom() - 1
  
      // var clickCount = 0;
      $(Inte.treering.viewer.getContainer()).on("click", e => {
        clickCount++;
        switch(clickCount) {
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
    
            break;
          }
          case 2: {
            $("#auto-ring-detection-page-turn-2").prop("disabled", false);
            Inte.treering.viewer.getContainer().style.cursor = 'default';

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
      })

      $("#auto-ring-detection-zoom-input").prop('max', Inte.treering.getMaxNativeZoom())
      $("#auto-ring-detection-zoom-input").prop('min', Inte.treering.viewer.getMinZoom())
      $("#auto-ring-detection-zoom-input").prop('value', zoom)

      $("#auto-ring-detection-zoom-input").on('change', () => {
        zoom = $("#auto-ring-detection-zoom-input").val()
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
        let detectionGeometry = this.getDetectionGeometry(this.detectionHeight, zoom);
        $("#auto-ring-detection-load-fix").show()

        let cssFilters = Inte.treering.imageAdjustmentInterface.imageAdjustment.getCSSAdjustments()
        let data = await Inte.treering.baseLayer["GL Layer"].getImageData(detectionGeometry.corners, detectionGeometry.angle, zoom, cssFilters);

        if (!data) {//data returns false if area size too big
          $("#auto-ring-detection-area-error").show()
          $("auto-ring-detection-load-fix").hide()
        }
        else {
          this.tuneGLLayer(true);
          this.firstPointMarker.remove();
          this.secondPointMarker.remove();

          if (Inte.treering.imageAdjustmentInterface.imageAdjustment.open) {
            Inte.treering.imageAdjustmentInterface.imageAdjustment.disable()
          }

          Inte.treering.viewer.getContainer().style.cursor = 'default';
          this.automaticDetection(data, zoom)
        }
      });
    }

    AutoRingDetection.prototype.automaticDetection = function(data, zoom) {
      // let anchor = this.dialog.options.anchor;
      this.dialog.remove()
      this.displayDialog(3, [280, 340], [50, 50]);
      let u = this.getDirectionVector(zoom);
      let currentAlgo;
      let boundaryPlacements;

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
        /**
         *         if ($("#auto-ring-detection-directions-text").is(":hidden")) {
          $("#auto-ring-detection-directions-toggle").css("color", "#005fff")
          $("#auto-ring-detection-directions-text").show()
        } else {
          $("#auto-ring-detection-directions-toggle").css("color", "black")
          $("#auto-ring-detection-directions-text").hide()
        }
         */
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
        boundaryPlacements = currentAlgo.functionCall(data, algoSettings);
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
          $("#"+ option.id + "-text").html($("#" + option.id).val()); //Issue here
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

    AutoRingDetection.prototype.createOutline = function(corners, rect = false) {
      if (rect) {
        return [L.polygon(corners, {color: "white", weight: 3})]
      }

      else {
        let startPointBar = L.polyline([corners[0], corners[1]], {color: "white", weight: 3}).addTo(Inte.treering.viewer);
        let endPointBar = L.polyline([corners[2], corners[3]], {color: "black", weight: 3}).addTo(Inte.treering.viewer);
        let mainBar = L.polyline([this.firstLatLng, this.secondLatLng], {color: "gray", weight: 3}).addTo(Inte.treering.viewer);

        return [startPointBar, endPointBar, mainBar]
      }

    }

    AutoRingDetection.prototype.getDetectionGeometry = function (detectionHeight, zoom) {
      let firstPixelCoords = Inte.treering.baseLayer["GL Layer"]._map.project(this.firstLatLng, zoom).floor();
      let secondPixelCoords = Inte.treering.baseLayer["GL Layer"]._map.project(this.secondLatLng, zoom).floor();

      let deltaX = secondPixelCoords.x - firstPixelCoords.x;
      let deltaY = secondPixelCoords.y - firstPixelCoords.y;
      let latLngPerPixel = (this.secondLatLng.lng - this.firstLatLng.lng) / deltaX;
      let angle = Math.atan(deltaY/deltaX); //+y axis upward for lat, downward for pixels
      
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

    AutoRingDetection.prototype.classificationDetection = function(imageData, algorithmSettings) {
      let boundaryBrightness = algorithmSettings.boundaryBrightness;
      let colPercentile = algorithmSettings.classColPercentile;

      let l = imageData[0].length;
      let h = imageData.length;
      let r,g,b, avg;
      // let avgCounts = {};
      
      let imgMap = []
      for (let i = 0; i < h; i++) {
        let row = []
        for (let j = 0; j < l; j++) {
          r = imageData[i][j][0];
          g = imageData[i][j][1];
          b = imageData[i][j][2];
          avg = Math.round((r + g + b)/3);
          row.push(avg)
        }
        imgMap.push(row);
      }

      let colMap = [];
     for (let j = 0; j < l; j++) {
        let colSum = 0;
        for (let i = 0; i < h; i++) {
          let avg = imgMap[i][j];
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
      

      let boundaryPlacements = [];
      let nextTransitionDTL = null;
      let lastTransitionIndex = 1;
      for (let i = 1; i < l; i++) {
        if (algorithmSettings.subAnnual) {
          if (colMap[i] != colMap[i-1]) {
            if (i - lastTransitionIndex > 10) {
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

    AutoRingDetection.prototype.gaussSmoothingDetection = function(imageData, algorithmSettings) {
      let size = algorithmSettings.gaussKernelSize;
      let sigma = algorithmSettings.sigma;

      //Get kernel given size and SD
      let width = size % 2 == 0 ? size / 2 : Math.floor(size / 2)
      let kernel = new Array(width * 2 + 1)
      let sum = 0;
      let x;

      for (x = -width; x <= width; x++) {
        kernel[width + x] = (1 / (Math.sqrt(2*Math.PI) * sigma)) * Math.exp(-1 * x**2 / (2 * sigma**2))
        sum += kernel[width + x]
      }

      for (x = 0; x < kernel.length; x++) {
        kernel[x] /= sum
      }

      let l = imageData[0].length;
      let h = imageData.length;

      //Horizontal blur
      let r,g,b;
      let smoothedVal = 0;
      let hBlurData = []
      for (let i = 0; i < h; i ++) {
        let row = imageData[i];

        let rawRow = [];
        let blurRow = [];
        for (let j = 0; j < l; j++) {
          r = row[j][0];
          g = row[j][1];
          b = row[j][2];
          rawRow.push((r + g + b) / 3)
        }

        for (let j = width; j < l - width; j++) {
          smoothedVal = 0;
          for (x = -width; x <= width; x++) {
            smoothedVal += rawRow[j + x] * kernel[width + x];
          }
          blurRow.push(smoothedVal)
        }
        hBlurData.push(blurRow)
      }

      //Vertical blur
      let fullBlurData = [];
      for (let j = 0; j < l - 2 * width; j++) {
        for (let i = width; i < h - width; i++) {
          smoothedVal = 0;
          for (x = -width; x <= width; x++) {
            smoothedVal += hBlurData[i + x][j] * kernel[width + x];
          }
          if (fullBlurData[i - width]) {
            fullBlurData[i - width].push(smoothedVal)
          } else {
            fullBlurData[i - width] = [smoothedVal]
          }
        }
      }

      let startVal = Inte.treering.imageAdjustmentInterface.imageAdjustment.invert ? 1 : 0;
      let transitionExtremaPairs = {};
      for (let i = 0; i < fullBlurData.length; i++) {
        let d1 = [0];
        let d2 = [0];
        for (let j = 1; j < fullBlurData[0].length; j++) {
          let diff = fullBlurData[i][j] - fullBlurData[i][j-1];
          d1.push(diff);
          d2.push(diff - d1[j-1]);
        }
        let extremaThreshold = algorithmSettings.gaussExtremaThresh;

        let minT = Math.min(...d1) * extremaThreshold;
        let maxT = Math.max(...d1) * extremaThreshold;
        for (let j = 1; j < d1.length; j++) {
          if (d2[j-1] * d2[j] < 0) {
            if (d1[j] <= minT || d1[j] >= maxT) {
              transitionExtremaPairs[[i, j]] = d1[j]
            }
          }
        }
      }

      let imgMap = [];
      for (let i = 0; i < fullBlurData.length; i++) {
        let rowMap = [null];
        for (let j = 1; j < fullBlurData[0].length; j++) {
          if (transitionExtremaPairs[[i, j]]) {
            if (transitionExtremaPairs[[i, j]] > 0) {
              rowMap.push(1)
            } else {
              rowMap.push(0)
            }
          } else {
            rowMap.push(rowMap[j - 1])
          }
        }
        imgMap.push(rowMap);
      }

      let colPercentile = algorithmSettings.gaussColPercentile
      let colMap = [null];
      for (let j = 1; j < fullBlurData[0].length; j++) {
        let lightCount = 0, darkCount = 0;
        for (let i = 0; i < fullBlurData.length; i++) {
          if (imgMap[i][j] == 1) {
            lightCount++;
          } else if (imgMap[i][j] == 0) {
            darkCount++
          }
        }

        if (lightCount >= colPercentile * h) {
          colMap.push(1)
        } else if (darkCount >= colPercentile * h) {
          colMap.push(0)
        } else {
          colMap.push(colMap[j - 1]);
        }
      }

      let boundaryPlacements = [];
      let lastTransitionIndex = 1;
      for (let c = 1; c < colMap.length; c++) {
        if (colMap[c] != colMap[c - 1]) {
          if (algorithmSettings.subAnnual) {
            if (c - lastTransitionIndex > 10) {
              lastTransitionIndex = c;
              boundaryPlacements.push(c + width)
            } else {
              lastTransitionIndex = c;
            }            
          } else if (colMap[c] == 1) {
            if (c - lastTransitionIndex > 10) {
              lastTransitionIndex = c;
              boundaryPlacements.push(c + width)
            } else {
              lastTransitionIndex = c;
            }
          }
        }
      }
      return boundaryPlacements
    }

    AutoRingDetection.prototype.exponentialSmoothingDetection = function(imageData, algorithmSettings) {
      let alpha = algorithmSettings.alpha

      let l = imageData[0].length;
      let h = imageData.length;

      let r,g,b,avg
      transitionExtremaPairs = {};
      for (let i = 0; i < h; i ++) {
        let row = imageData[i];

        r = row[0][0];
        g = row[0][1];
        b = row[0][2];
        avg = (r + g + b)/3
        let f = [avg], d1 = [0], d2 = [0]
        for (let j = 1; j < l; j++) {
          r = row[j][0];
          g = row[j][1];
          b = row[j][2];
          avg = (r + g + b)/3
          f.push(avg)

          let diff = avg - f[j-1];
          let smoothDiff = alpha * diff + (1 - alpha) * d1[j-1];
          d1.push(smoothDiff)

          diff = smoothDiff - d1[j-1]
          smoothDiff = alpha * diff + (1 - alpha) * d2[j - 1]
          d2.push(smoothDiff)
        }

        let expExtremaThresh = algorithmSettings.expExtremaThresh;

        let minT = Math.min(...d1)* expExtremaThresh;
        let maxT = Math.max(...d1)* expExtremaThresh;
        for (let j = 1; j < l; j++) {
          if (d2[j-1] * d2[j] < 0) {
            if (d1[j] <= minT || d1[j] >= maxT) {
              // transitions.push([this.detectionHeight/2 - i, j])
              transitionExtremaPairs[[i, j]] = d1[j]
            }
          }
        }
      }

      let imgMap = [];
      for (let i = 0; i < h; i++) {
        let rowMap = [null];
        for (let j = 1; j < l; j++) {
          if (transitionExtremaPairs[[i, j]]) {
            if (transitionExtremaPairs[[i, j]] > 0) {
              rowMap.push(1)
            } else {
              rowMap.push(0)
            }
          } else {
            rowMap.push(rowMap[j - 1])
          }
        }
        imgMap.push(rowMap);
      }

      let startVal = Inte.treering.imageAdjustmentInterface.imageAdjustment.invert ? 1 : 0;
      let colPercentile = algorithmSettings.expColPercentile
      let colMap = [startVal];
      for (let j = 1; j < l; j++) {
        let lightCount = 0, darkCount = 0;
        for (let i = 0; i < h; i++) {
          if (imgMap[i][j] == 1) {
            lightCount++;
          } else if (imgMap[i][j] == 0) {
            darkCount++
          }
        }

        if (lightCount >= colPercentile * h) {
          colMap.push(1)
        } else if (darkCount >= colPercentile * h) {
          colMap.push(0)
        } else {
          colMap.push(colMap[j - 1])
        }
      }

      let boundaryPlacements = [];
      let lastTransitionIndex = 1;
      for (let c = 1; c < l; c++) {
        if (colMap[c] != colMap[c - 1]) {
          if (c - lastTransitionIndex > 10) {
            lastTransitionIndex = c;
            boundaryPlacements.push(c)
          } else {
            lastTransitionIndex = c;
          }
        }
      }
      return boundaryPlacements
    }

    AutoRingDetection.prototype.showAutomaticPlacements = function(u, transitions) {
      let base;
      if (this.firstLatLng.lng > this.secondLatLng.lng) {
        base = this.secondLatLng
      } else {
        base = this.firstLatLng
      }

      let lng, lat, latLng, pointMarker;
      for (let point of transitions) {
        lng = base.lng + point * u.x;
        lat = base.lat + point * u.y;

        latLng = L.latLng(lat, lng);
        pointMarker = L.circleMarker(latLng, {radius: 2, color: 'yellow'});
        this.markers.push(pointMarker);
        pointMarker.addTo(Inte.treering.viewer)
      }
    }

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
  }
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
  
    this.markers = [];
    this.firstLatLng = null;
    this.secondLatLng = null;
    this.detectionHeight = 0;
    // this.detectionAreaOutline = L.polyline([]);
  
    this.btn = new Button(
      'search',
      'Auto ring detection',
      () => { Inte.treering.disableTools(); this.enable() },
      () => { this.disable() }
    );
    // this.currentImageSettings = Inte.treering.imageAdjustmentInterface.imageAdjustment.getCurrentViewJSON();
  
    AutoRingDetection.prototype.enable = function () {
      this.active = true;
      this.btn.state('active');
      Inte.treering.viewer.getContainer().style.cursor = 'pointer';
      console.log(Inte.treering.data)   

      $(document).on('keyup', e => {
        var key = e.which || e.key;
        if (key === 'Escape') {
          this.disable();
        }
      });
  
      if (Inte.treering.data.points.length == 0) {
        this.setMeasurementPreferences();
        // this.displayDirections(1)
      } 
      else {
        this.selectPoints(false)
        // this.displayDirections(2)
      }
      // this.selectPoints();
    }

    AutoRingDetection.prototype.disable = function () {
      if (this.active) {
        // if (this.dialog) {
        //   this.dialog.unlock();
        //   this.dialog.close();
        // };
  
        this.active = false;
        this.btn.state('inactive');
        Inte.treering.viewer.getContainer().style.cursor = 'default';
  
        // this.tuneGLLayer(true);
      }
    }

    AutoRingDetection.prototype.displayDialog = function (pageNumber, size = [280, 320], anchor = [50, 50]) {
      let contentId = "AutoRingDetection-page-" + pageNumber;
      let content = document.getElementById(contentId).innerHTML;
      this.dialog = L.control.dialog({
        'size': size,
         'maxSize': [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
        'anchor': anchor,
         'initOpen': true,
         'position': 'topleft',
         'minSize': [0, 0]
       }).setContent(content).addTo(Inte.treering.viewer);
      return this.dialog;
    };

    AutoRingDetection.prototype.setMeasurementPreferences = function () {
      let currentDialog = this.displayDialog(1, [275, 275], [50, 50])
      $("#auto-ring-detection-page-turn-1").on("click", () => {
        Inte.treering.measurementOptions.forwardDirection = $('input[name="auto-ring-detection-measurement-direction"]:checked').val()
        Inte.treering.measurementOptions.subAnnual = $('input[name="auto-ring-detection-measurement-interval"]:checked').val()

        if (!Inte.treering.measurementOptions.forwardDirection && !Inte.treering.measurementOptions.subAnnual) {
          Inte.treering.data.year = parseInt($("#auto-ring-detection-start-year-input").val()) - 1;
        } else {
          Inte.treering.data.year = parseInt($("#auto-ring-detection-start-year-input").val());
        }
        this.selectPoints(currentDialog)
      })
    }

    AutoRingDetection.prototype.selectPoints = async function(preferencesDialog) {
      let currentDialog;
      let anchor = [50, 50];
      if (preferencesDialog) {
        anchor = preferencesDialog.options.anchor;
        preferencesDialog.remove()
      }
      currentDialog = this.displayDialog(2, [260, 230], anchor)

      var clickCount = 0;
      let areaOutline = [L.polyline([])];
      let zoom = Math.floor(Inte.treering.viewer.getZoom());
  
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
            $("#auto-ring-detection-path-step-1").css('font-weight', 'normal')
            $("#auto-ring-detection-path-step-2").css('font-weight', 'bold')
            $("#auto-ring-detection-page-turn-2").prop("disabled", false);

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
            areaOutline = this.createOutline(corners)
  
            this.firstPointMarker.on("dragend", () => {
              for (let line of areaOutline) {
                line.remove()
              }
              this.firstLatLng = this.firstPointMarker._latlng;
              corners = this.getDetectionGeometry(this.detectionHeight, zoom).corners;
              areaOutline = this.createOutline(corners)
            });

            this.secondPointMarker.on("dragend", () => {
              for (let line of areaOutline) {
                line.remove()
              }
              this.secondLatLng = this.secondPointMarker._latlng;
              corners = this.getDetectionGeometry(this.detectionHeight, zoom).corners;
              areaOutline = this.createOutline(corners)
            });

            $("#auto-ring-detection-height-input").on("change", () => {
              for (let line of areaOutline) {
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
              areaOutline = this.createOutline(corners)
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
        
        for (let line of areaOutline) {
          line.remove()
        }
        clickCount = 0;

        $("#auto-ring-detection-path-step-1").css('font-weight', 'bold')
        $("#auto-ring-detection-path-step-2").css('font-weight', 'normal')
        $("#auto-ring-detection-page-turn-2").prop("disabled", true);
        $("#auto-ring-detection-area-error").hide()
      })

      $("#auto-ring-detection-zoom-input").prop('max', Inte.treering.getMaxNativeZoom())
      $("#auto-ring-detection-zoom-input").prop('min', Inte.treering.viewer.getMinZoom())
      $("#auto-ring-detection-zoom-input").prop('value', Inte.treering.viewer.getZoom())

      $("#auto-ring-detection-zoom-input").on('change', () => {
        zoom = $("#auto-ring-detection-zoom-input").val()
        if ($("#auto-ring-detection-zoom-change-check").is(':checked')) {
          Inte.treering.viewer.setZoom(zoom)
        }
      })
      
      $("#auto-ring-detection-page-turn-2").on("click", async () => {
        let detectionGeometry = this.getDetectionGeometry(this.detectionHeight, zoom);
        $("#auto-ring-detection-load-fix").show()
        let data = await Inte.treering.baseLayer["GL Layer"].getImageData(detectionGeometry.corners, detectionGeometry.angle, zoom);

        if (!data) {//data returns false if area size too big
          $("#auto-ring-detection-area-error").show()
          $("auto-ring-detection-load-fix").hide()
        }
        else {

          this.firstPointMarker.remove();
          this.secondPointMarker.remove();
          this.automaticDetection(data, currentDialog, areaOutline, zoom)
        }
      });
    }

    AutoRingDetection.prototype.tuneGLLayer = function (reset) {
      if (this.active) {
        this.currentImageSettings = Inte.treering.imageAdjustmentInterface.imageAdjustment.getCurrentViewJSON()
      }
  
      if (reset && this.currentImageSettings != {}) {
        Inte.treering.imageAdjustmentInterface.imageAdjustment.loadCurrentViewJSON(this.currentImageSettings)
      }
      else if (!reset) {
        Inte.treering.imageAdjustmentInterface.imageAdjustment.setDetectionSettings()
      }
    };
  
  
  
    AutoRingDetection.prototype.displayDirections = function (pageNumber) {
      let currentDialog = this.displayDialog(pageNumber);
      this.executeDirectionFunctions(pageNumber)
      $(".auto-ring-detection-page-turn").on("click", () => {
        pageNumber++;
        currentDialog.remove(Inte.treering.viewer);
        this.displayDirections(pageNumber);
      }) 
    }


    AutoRingDetection.prototype.automaticDetection = function(data, selectionDialog, areaOutline, zoom) {
      let anchor = selectionDialog.options.anchor;
      selectionDialog.remove()
      let currentDialog = this.displayDialog(3, [280, 320], anchor)
      //idea: put algo settings into object, then all functions take data and settings as params
      // let detectionGeometry = this.getDetectionGeometry(this.detectionHeight);

      let u = this.getDirectionVector(zoom);
      let algoChoice = "pc";
      let algorithmSettings = {
        earlyWood: Inte.treering.data.earlyWood,
        winSize: 11,
        extremaThreshold: 0.3,
        edgeColPercentile: 0.75,
        classColPercentile: 0.75,
        boundaryBrightness: 50
      }
      let boundaryPlacements = this.classificationDetection(data, algorithmSettings);
      this.showAutomaticPlacements(u, boundaryPlacements)

      $(".auto-ring-detection-algo-radio").on("change", (e) => {
        algoChoice = e.currentTarget.value;
        if (algoChoice === "pc") {
          $("#edge-detection-settings").hide()
          $("#classification-settings").show()
          boundaryPlacements = this.classificationDetection(data, algorithmSettings);
          this.showAutomaticPlacements(u, boundaryPlacements)
        }
        else if (algoChoice === "ed") {
          $("#edge-detection-settings").show()
          $("#classification-settings").hide()
          let boundaryPlacements = this.sgEdgeDetection(data, algorithmSettings);
          this.showAutomaticPlacements(u, boundaryPlacements)
        }
      })

      $(".auto-ring-detection-algo-settings").on("change", () => {
        if (algoChoice === "pc") {
          $("#edge-detection-settings").hide()
          $("#classification-settings").show()

          algorithmSettings.classColPercentile = parseFloat($("#auto-ring-detection-class-col-percentile").val());
          algorithmSettings.boundaryBrightness = parseInt($("#auto-ring-detection-boundary-brightness").val());

          $("#auto-ring-detection-boundary-brightness-text").html($("#auto-ring-detection-boundary-brightness").val());
          $("#auto-ring-detection-class-col-percentile-text").html($("#auto-ring-detection-class-col-percentile").val());

          boundaryPlacements = this.classificationDetection(data, algorithmSettings);
          this.showAutomaticPlacements(u, boundaryPlacements)
        }
        else if (algoChoice === "ed") {
          $("#edge-detection-settings").show()
          $("#classification-settings").hide()

          algorithmSettings.winSize = parseInt($("#auto-ring-detection-window-size").val());
          algorithmSettings.extremaThreshold = parseFloat($("#auto-ring-detection-extrema-threshold").val());
          algorithmSettings.edgeColPercentile = parseFloat($("#auto-ring-detection-edge-col-percentile").val());

          $("#auto-ring-detection-window-size-text").html($("#auto-ring-detection-window-size").val());
          $("#auto-ring-detection-extrema-threshold-text").html($("#auto-ring-detection-extrema-threshold").val());
          $("#auto-ring-detection-edge-col-percentile-text").html($("#auto-ring-detection-edge-col-percentile").val());

          boundaryPlacements = this.sgEdgeDetection(data, algorithmSettings);
          this.showAutomaticPlacements(u, boundaryPlacements)
        }
      })

      $("#auto-ring-detection-page-turn-3").on("click", () => {
        for (let line of areaOutline) {
          line.remove();
        }
        
        for (let marker of this.markers) {
          marker.remove()
        }

        this.placePoints(u, boundaryPlacements, currentDialog)
      })
    }


    AutoRingDetection.prototype.printData = function(data) {
      let out = "point\tavg\n"
      let r, g, b, avg;
      let i = 0
      for (let point of data[0]) {
        r = point[0]
        g = point[1]
        b = point[2]
        avg = (r + g + b) / 3;

        out += i + "\t" + avg + "\n"
        i++
      }
      console.log(out)
    }

    AutoRingDetection.prototype.createOutline = function(corners, rect = false) {
      if (rect) {
        return [L.polygon(corners, {color: "red", weight: 3})]
      }

      else {
        let startPointBar = L.polyline([corners[0], corners[1]], {color: "red", weight: 3}).addTo(Inte.treering.viewer);
        let endPointBar = L.polyline([corners[2], corners[3]], {color: "red", weight: 3}).addTo(Inte.treering.viewer);
        let mainBar = L.polyline([this.firstLatLng, this.secondLatLng], {color: "red", weight: 3}).addTo(Inte.treering.viewer);

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

    AutoRingDetection.prototype.classificationDetection = function(data, algorithmSettings) {
      let boundaryBrightness = algorithmSettings.boundaryBrightness;
      let colPercentile = algorithmSettings.classColPercentile;

      for (pointMarker of this.markers) { pointMarker.remove() };
      this.markers = [];
      let l = data[0].length, h = data.length;

      let r,g,b, avg;
      let avgCounts = {};
      
      let imgMap = []
      for (let i = 0; i < h; i++) {
        let row = []
        for (let j = 0; j < l; j++) {
          r = data[i][j][0];
          g = data[i][j][1];
          b = data[i][j][2];
          avg = Math.round((r + g + b)/3);
          row.push(avg)

          if (!avgCounts[avg]) {
            avgCounts[avg] = 1;
          }
          else {
            avgCounts[avg] += 1;
          }
        }
        imgMap.push(row);
      }

      // let raw = [];
      // let dist = [];
      // for (let t = 0; t <= 255; t++) {
      //   for (n = 0; n < avgCounts[t]; n++) {
      //     raw.push(avgCounts[t])
      //   }
      //   if (avgCounts[t]) {
      //     dist.push(avgCounts[t]);
      //   }
      //   else {
      //     dist.push(0)
      //   }
      // }

      // let med;
      // if (raw.length % 2 == 1) {
      //   med = raw[(raw.length - 1)/2]
      // }
      // else {
      //   med = (raw[raw.length/2 - 1] + raw[raw.length/2])/2;
      // }
      // let medindex = Object.keys(avgCounts).find(e => {
      //   return avgCounts[e] === med
      // })

      // // let lowerMode = Math.max(...dist.slice(0, medindex));
      // let lowerMode = Object.keys(avgCounts).find(e => {
      //   return avgCounts[e] === Math.max(...dist.slice(0, medindex));
      // })

      // let upperMode = Object.keys(avgCounts).find(e => {
      //   return avgCounts[e] === Math.max(...dist.slice(medindex));
      // })

      // // let out = ""
      // let colMap = [];
      // for (let j = 0; j < l; j++) {
      //   let colSum = 0;
      //   for (let i = 0; i < h; i++) {
      //     let avg = imgMap[i][j];
      //     // let classification = Math.abs((avg - lowerMode)) > Math.abs((avg - upperMode)) ? 0 : 1;
      //     let classification = avg >= boundaryBrightness ? 1 : 0;
      //     colSum += classification;
      //   }
      //   let colClass = (colSum / h) > colPercentile ? 1 : 0;
      //   colMap.push(colClass)
      //   // out += colClass + "\t"
      // }
      // // console.log(out)

      let colMap = [];
      for (let j = 0; j < l; j++) {
        let colSum = 0;
        for (let i = 0; i < h; i++) {
          let avg = imgMap[i][j];
          let classification = (avg >= boundaryBrightness) ? 1 : 0;
          colSum += classification;
        }
        let colClass = (colSum / h) > colPercentile ? 1 : 0;
        colMap.push(colClass);
      }
      


      let boundaryPlacements = [];
      for (let i = 1; i < l; i++) {
        if (algorithmSettings.earlyWood) {
          if (colMap[i] != colMap[i-1] && colMap[i] == 1) {
            boundaryPlacements.push(i)
          }
        }
        else if (colMap[i] != colMap[i-1]) {
          boundaryPlacements.push(i)
        }
      }
      return boundaryPlacements



      // let u = this.getDirectionVector();
      // let marker = L.circleMarker(L.latLng(0, 0)), lng, lat, latLng;
      // $("#auto-ring-detection-placement-input").on("change", () => {
      //   marker.remove();
      //   let pt = parseInt($("#auto-ring-detection-placement-input").val());
      //   lng = this.firstLatLng.lng + pt * u.x;
      //   lat = this.firstLatLng.lat + pt * u.y;
      //   latLng = L.latLng(lat, lng);
      //   marker = L.circleMarker(latLng, {radius: 3, color: "red"}).addTo(Inte.treering.viewer)
      // })
    }

    AutoRingDetection.prototype.sgEdgeDetection =  function (imageData, algorithmSettings) {
      let winSize = algorithmSettings.winSize;
      let extremaThreshold = algorithmSettings.extremaThreshold;
      let colPercentile = algorithmSettings.edgeColPercentile;

      for (pointMarker of this.markers) { pointMarker.remove() };
      this.markers = [];
      let l = imageData[0].length;
      let h = imageData.length;
  
  
      let firstDerivSggOptions = {
        windowSize: winSize,
        derivative: 1,
        polynomial: 3,
      };  
  
      let secondDerivSggOptions = {
        windowSize: winSize,
        derivative: 2,
        polynomial: 3,
      };  
  
      
      let r, g, b;
      let transitions = {};
  
      //Horizontal Pass
      for (let i = 0; i < h; i ++) {
        let row = imageData[i];
        let rowData = [];
        for (let pixel of row) {
          r = pixel[0];
          g = pixel[1];
          b = pixel[2];
          rowData.push((r + b + g) / 3);
        }
  
        let firstDeriv = sgg(rowData, 1, firstDerivSggOptions);
        let secondDeriv = sgg(rowData, 1, secondDerivSggOptions);
  
        let minThreshold = Math.min(...firstDeriv)*extremaThreshold;
        let maxThreshold = Math.max(...firstDeriv)*extremaThreshold; 
  
  
        for (let j = 1; j < l; j++) {
          if (secondDeriv[j-1] * secondDeriv[j] < 0) {
            if (firstDeriv[j] <= minThreshold || firstDeriv[j] >= maxThreshold) {
              transitions[[i,j]] = firstDeriv[j];
            }
          }
        }
      }

      let nextTransitionDark = null;
      let imgMap = [];
      for (let i = 0; i < h; i++) {
        let rowMap = [];
        for (let j = 0; j < l; j++) {
          rowMap.push(0);
        }
        imgMap.push(rowMap);
      }

      // let boundaryPlacements = [];
      let colMap = [];
      for (let j = 1; j < l; j++) {
        // let lightCount = 0, darkCount = 0;
        let lightCount = 0;
        for (let i = 0; i < h; i++) {
          let transitionKey = i + "," + j;
          if (transitions[transitionKey] < 0) {
            imgMap[i][j] = 0;
          }
          else if (transitions[transitionKey] > 0) {
            imgMap[i][j] = 1;
          }
          else {
            imgMap[i][j] = imgMap[i][j-1];
          }

          // if (imgMap[i][j] == 0) {
          //   darkCount++;
          // }
          // else if (imgMap[i][j] == 1) {
          //   lightCount++;
          // }
          if (imgMap[i][j] === 1) {
            lightCount++;
          }
        }

        if (lightCount >= colPercentile * h) {
          colMap.push(1)
        }
        else {
          colMap.push(0)
        }

        // if (algorithmSettings.earlyWood) {
        //   if (darkCount >= colPercentile * h && (nextTransitionDark || nextTransitionDark === null)) {
        //     nextTransitionDark = false;
        //     boundaryPlacements.push(j)
        //   }

        //   if (lightCount >= colPercentile * h && (!nextTransitionDark || nextTransitionDark === null)) {
        //     nextTransitionDark = true;
        //     boundaryPlacements.push(j);
        //   }          
        // }
        // else {
        //   if (lightCount >= colPercentile * h) {
        //     boundaryPlacements.push(j);
        //   }       
        // }

      }

      let boundaryPlacements = []
      for (let i = 1; i < l; i++) {
        if (algorithmSettings.earlyWood) {
          if (colMap[i] != colMap[i-1]) {
            boundaryPlacements.push(i);
          }
        }
        else if (colMap[i] != colMap[i-1] && colMap[i] == 1) {
          boundaryPlacements.push(i)
        }
      }

      let newb = []
      if (this.firstLatLng.lng > this.secondLatLng.lng) {
        for (let point of boundaryPlacements) {
          newb.push(Math.abs(point - l))
        }
      } else {
        newb = boundaryPlacements
      }

      // return boundaryPlacements;
      return newb
    }

    AutoRingDetection.prototype.showAutomaticPlacements = function(u, transitions) {
      // for (pointMarker of this.markers) { pointMarker.remove() };
      // this.markers = [];

      // if (this.firstLatLng.lng > this.secondLatLng.lng && Inte.treering.measurementOptions.forwardDirection) {
      //   console.log('1>2 & forwards: reversed')
      //   transitions = transitions.reverse()
      // } else if (this.firstLatLng.lng < this.secondLatLng.lng && !Inte.treering.measurementOptions.forwardDirection) {
      //   console.log('2 > 1 & backwards: reversed')
      //   transitions = transitions.reverse()
      // }

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

      // let lng, lat, latLng;
      // if (Inte.treering.measurementOptions.forwardDirection) {
      //   transitions = transitions.reverse()
      // }
      // for (point of transitions) {
      //   lng = this.firstLatLng.lng + point * u.x;
      //   lat = this.firstLatLng.lat + point * u.y;
      //   latLng = L.latLng(lat, lng);

      //   // Inte.treering.data.newPoint(false, latLng)
      //   pointMarker = L.circleMarker(latLng, {radius: 2, color: 'yellow'});
      //   this.markers.push(pointMarker);
      //   pointMarker.addTo(Inte.treering.viewer)


      //   Inte.treering.data.points[Inte.treering.data.index] = {"start": false, 'skip': false, 'break': false, 'latLng': latLng, 'year': Inte.treering.data.year}
      //   if (Inte.treering.measurementOptions.forwardDirection) {Inte.treering.data.year++}
      //   else {Inte.treering.data.year--}
      //   Inte.treering.visualAsset.newLatLng(Inte.treering.data.points, Inte.treering.data.index, latLng);
      //   Inte.treering.data.index++
      //   // Inte.treering.data.newPoint(false, latLng)
      //   Inte.treering.visualAsset.reload()
      // }  
      // console.log(Inte.treering.data)   
    }

    AutoRingDetection.prototype.placePoints = function(u, boundaryPlacements, autoPlacementDialog) {
      let anchor = autoPlacementDialog.options.anchor;
      autoPlacementDialog.remove()
      let currentDialog = this.displayDialog(4, [280, 320], anchor)

      // if (this.firstLatLng.lng > this.secondLatLng.lng && Inte.treering.measurementOptions.forwardDirection) {
      //   boundaryPlacements = boundaryPlacements.reverse()
      // } else if (this.firstLatLng.lng < this.secondLatLng.lng && !Inte.treering.measurementOptions.forwardDirection) {
      //   boundaryPlacements = boundaryPlacements.reverse()
      // }
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
        lng = base.lng + point * u.x;
        lat = base.lat + point * u.y;
        latLng = L.latLng(lat, lng);

        let start = (i == 0) ? true : false;
        Inte.treering.data.newPoint(start, latLng, true);
        Inte.treering.visualAsset.newLatLng(Inte.treering.data.points, Inte.treering.data.index-1, latLng)
        i++;
      }
      Inte.treering.visualAsset.reload()


      // let i = 0, forward = Inte.treering.measurementOptions.forwardDirection;
      // for (let point of boundaryPlacements) {
      //   lng = this.firstLatLng.lng + point * u.x;
      //   lat = this.firstLatLng.lat + point * u.y;
      //   latLng = L.latLng(lat, lng);

      //   if ((i == 0 && forward) || (i == boundaryPlacements.length - 1 && !forward)) {
      //     Inte.treering.data.newPoint(true, latLng, true)
      //     Inte.treering.visualAsset.newLatLng(Inte.treering.data.points, Inte.treering.data.index-1, latLng);     
      //   }
      //   else {
      //     Inte.treering.data.newPoint(false, latLng, true)
      //     Inte.treering.visualAsset.newLatLng(Inte.treering.data.points, Inte.treering.data.index-1, latLng);     
      //   }
      // }
      // Inte.treering.visualAsset.reload()



      // if (Inte.treering.measurementOptions.forwardDirection) {
      //   boundaryPlacements = boundaryPlacements.reverse()
      // }
      // if ((this.firstLatLng.lng < this.secondLatLng.lng) && !Inte.treering.measurementOptions.forwardDirection) {
      //   boundaryPlacements = boundaryPlacements.reverse();
      // }

      // // console.log(boundaryPlacements)
      // let start = true
      // for (point of boundaryPlacements) {
      //   lng = this.firstLatLng.lng + point * u.x;
      //   lat = this.firstLatLng.lat + point * u.y;
      //   latLng = L.latLng(lat, lng);

      //   Inte.treering.data.points[Inte.treering.data.index] = {"start": start, 'skip': false, 'break': false, 'latLng': latLng, 'auto': true}
      //   // if (Inte.treering.measurementOptions.forwardDirection) {Inte.treering.data.year++}
      //   // else {Inte.treering.data.year--}
      //   Inte.treering.visualAsset.newLatLng(Inte.treering.data.points, Inte.treering.data.index, latLng);
      //   Inte.treering.data.index++
      //   // Inte.treering.data.newPoint(false, latLng)
      //   Inte.treering.visualAsset.reload()
      //   start = false;
      // }  
    }

    AutoRingDetection.prototype.rowAnalysis = function(data) {
      let length = data[0].length;
      let height = data.length;

      let out = "point\tr\tg\tb\tavg\n"
      let r,g,b
      for (let i = 0; i < length; i++) {
        let rColSum = 0;
        let gColSum = 0;
        let bColSum = 0;
        let avgColSum = 0;

        for (let j = 0; j < height; j++) {
          r = data[j][i][0]
          g = data[j][i][1]
          b = data[j][i][2];

          rColSum += r;
          gColSum += g;
          bColSum += b;
          avgColSum += (r+g+b)/3;
        }
        out += i + "\t" + rColSum/height + "\t" + gColSum/height + "\t" + bColSum/height + "\t" + avgColSum/height + "\n";
      }
      console.log(out)
    }

    AutoRingDetection.prototype.rgbFrequencyCSV = function(data) {
      let l = data[0].length, h = data.length;
      let x = l * h;
      let counts = {
        "r": {},
        "g": {},
        "b": {},
        "avg": {}
      }

      let r,g,b,avg
      for (let row of data) {
        for (let pt of row) {
          r = pt[0];
          g = pt[1];
          b = pt[2];
          avg = Math.round((r + g + b)/3)

          if (!counts["avg"][avg]) {
            counts["avg"][avg] = 1;
          }
          else {
            counts["avg"][avg] += 1;
          }

          if (!counts["r"][r]) {
            counts["r"][r] = 1;
          }
          else {
            counts["r"][r] += 1;
          }

          if (!counts["g"][g]) {
            counts["g"][g] = 1;
          }
          else {
            counts["g"][g] += 1;
          }

          if (!counts["b"][b]) {
            counts["b"][b] = 1;
          }
          else {
            counts["b"][b] += 1;
          }
        }
      }

      // console.log(counts)
      let out = "val\tr\tg\tb\tavg\n"
      for (let c = 0; c <= 255; c++) {
        let avgProp = counts["avg"][c] ? counts["avg"][c]/x : 0
        let rProp = counts["r"][c] ? counts["r"][c]/x : 0
        let gProp = counts["g"][c] ? counts["g"][c]/x : 0
        let bProp = counts["b"][c] ? counts["b"][c]/x : 0


        out += c + "\t" + rProp + "\t" + gProp + "\t" + bProp + "\t" + avgProp + "\n";
      }
      console.log(out)

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
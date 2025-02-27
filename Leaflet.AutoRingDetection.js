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
    this.tilesInPath = [];
    this.dataSets = [];
  
    this.btn = new Button(
      'search',
      'Auto ring detection',
      () => { Inte.treering.disableTools(); this.enable() },
      () => { this.disable() }
    );
    // this.currentImageSettings = Inte.treering.imageAdjustmentInterface.imageAdjustment.getCurrentViewJSON();
  
    AutoRingDetection.prototype.displayDialog = function (pageNumber, size = [250, 200], anchor = [50, 50]) {
      let contentId = "AutoRingDetection-page-" + pageNumber;
      let content = document.getElementById(contentId).innerHTML;
      this.dialog = L.control.dialog({
        //  'size': [200, 200],
        'size': size,
         'maxSize': [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
        //  'anchor': [50, 50],
        'anchor': anchor,
         'initOpen': true,
         'position': 'topleft',
         'minSize': [0, 0]
       }).setContent(content).addTo(Inte.treering.viewer);
    
      // var canvas = document.getElementById("ard-canvas")
      // this.context = canvas.getContext('2d');
      return this.dialog;
    };
  
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
  
    AutoRingDetection.prototype.enable = function () {
      this.active = true;
      this.btn.state('active');
      Inte.treering.viewer.getContainer().style.cursor = 'pointer';
  
      for (pointMarker of this.markers) {
        pointMarker.remove()
      }
      // this.tuneGLLayer(false);
  
      this.displayDirections(3);
      this.selectPoints();
      // if (Inte.treering.data.points.length = 0) {
      //   this.displayDirections(1)
      // } 
      // else {
      //   this.displayDirections(2)
      // }
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
  
    AutoRingDetection.prototype.displayDirections = function (pageNumber) {
      let currentDialog = this.displayDialog(pageNumber);
      this.executeDirectionFunctions(pageNumber)
      $(".auto-ring-detection-page-turn").on("click", () => {
        pageNumber++;
        currentDialog.remove(Inte.treering.viewer);
        this.displayDirections(pageNumber);
      }) 
    }
  
    AutoRingDetection.prototype.executeDirectionFunctions = function (pageNumber) {
      switch (pageNumber) {
        //Measurement Settings
        case 1:
          
          break;
        //Set Detection Path
        case 2:
          this.selectPoints()
          break;
        //Adjust auto placements
        case 3:
          break;
        //Adj. individual points and confirm
        case 4:
          break;
      }
    }
  
    AutoRingDetection.prototype.selectPoints = function() {
      this.firstLatLng = null;
      this.secondLatLng = null;
  
      $(document).on('keyup', e => {
        var key = e.which || e.key;
        if (key === 'Escape') {
          this.disable();
        }
      });
  
      var clickCount = 0;
      $(Inte.treering.viewer.getContainer()).on("click", e => {

        //Tests
        let ll = Inte.treering.viewer.mouseEventToLatLng(e);
        let p = Inte.treering.viewer.project(ll, Inte.treering.getMaxNativeZoom());
        // console.log('point: ', p)
        p = p.unscaleBy({x: 255, y: 255}).floor()
        // console.log('tile:', p)


        // let canvas = document.getElementById("ard-canvas1");
        // let ctx = canvas.getContext("2d");
        // console.log(ctx)
        // p.z = Inte.treering.getMaxNativeZoom()
        // // var tile = this._tiles[this._tileCoordsToKey(coords)]
        // let glo = Inte.treering.baseLayer["GL Layer"]
        // let tile = glo._tiles[glo._tileCoordsToKey(p)]
        // console.log(tile)
        // ctx.drawImage(tile.el, 0 ,0)



        //Tests

        clickCount++;
        switch(clickCount) {
          case 1: {
            first = e;
            this.firstLatLng = Inte.treering.viewer.mouseEventToLatLng(first);
            this.firstPointMarker = L.circleMarker(this.firstLatLng, {radius: 3, color: 'red'}).addTo(Inte.treering.viewer);
            // this.firstPointMarker = L.marker()
  
            $("#auto-ring-detection-path-step-1").css('font-weight', 'normal')
            $("#auto-ring-detection-path-step-2").css('font-weight', 'bold')
  
            break;
          }
          case 2: {
            second = e;
            this.secondLatLng = Inte.treering.viewer.mouseEventToLatLng(second);
            this.secondPointMarker = L.circleMarker(this.secondLatLng, {radius: 3, color: "red"}).addTo(Inte.treering.viewer);
            // this.secondPointMarker = L.marker(this.secondLatLng, {
            //   icon: L.icon({
            //     iconUrl : "../images/AutoEarlywoodPoint.png",
            //     iconSize: [32, 32]
            //   }), 
            //   draggable: true}).addTo(Inte.treering.viewer)
  
            // let detectionHeight = $("#auto-ring-detection-height-input").val()
  
            this.rect = this.drawRect(300)
            // this.detectionSetup(300)
  
            $("#auto-ring-detection-path-step-2").css('font-weight', 'normal')
            $("#auto-ring-detection-path-step-3").css('font-weight', 'bold')
            // $(".auto-ring-detection-page-turn").on("click", () => {
            //   let detectionHeight = $("#auto-ring-detection-height-input").val()
            //   this.detectionSetup(detectionHeight);
            //   this.disable();
            // });
            break;
          }
          // case 3: {
          //   $("#auto-ring-detection-path-step-3").css('font-weight', 'normal')
          //   $("#auto-ring-detection-path-step-1").css('font-weight', 'bold')
  
          //   this.rect.removeFrom(Inte.treering.viewer);
          //   this.firstPointMarker.removeFrom(Inte.treering.viewer);
          //   this.secondPointMarker.removeFrom(Inte.treering.viewer);
          //   this.selectPoints();
          // }
        }
      })
    }
  
    AutoRingDetection.prototype.detectionSetup = async function (detectionHeight) {
      // this.drawRect(detectionHeight)
      let imageData = await Inte.treering.baseLayer['GL Layer'].getColorMatrix(this.firstLatLng, this.secondLatLng, detectionHeight);
      let u = this.findDirectionVector();
  
      let winSize = 11;
      let extremaThreshold = 0.3;
      let columnThreshold = 0.75;
      let transitions = this.findTransitions(imageData, winSize, extremaThreshold);
      this.placePoints(u, imageData, transitions, columnThreshold);
  
      //Update based on sliders
      $("#auto-ring-detection-window-size").on("change", () => {
        $("#auto-ring-detection-window-size-text").html($("#auto-ring-detection-window-size").val());
        winSize = parseInt($("#auto-ring-detection-window-size").val());
        extremaThreshold = parseFloat($("#auto-ring-detection-extrema-threshold").val());
        columnThreshold = parseFloat($("#auto-ring-detection-column-threshold").val());
  
        transitions = this.findTransitions(imageData, winSize, extremaThreshold);
        this.placePoints(u, imageData, transitions, columnThreshold)
      });
  
      $("#auto-ring-detection-extrema-threshold").on("change", () => {
        $("#auto-ring-detection-extrema-threshold-text").html($("#auto-ring-detection-extrema-threshold").val());
        winSize = parseInt($("#auto-ring-detection-window-size").val());
        extremaThreshold = parseFloat($("#auto-ring-detection-extrema-threshold").val());
        columnThreshold = parseFloat($("#auto-ring-detection-column-threshold").val());
  
        transitions = this.findTransitions(imageData, winSize, extremaThreshold);
        this.placePoints(u, imageData, transitions, columnThreshold)
      });
  
      $("#auto-ring-detection-column-threshold").on("change", () => {
        $("#auto-ring-detection-column-threshold-text").html($("#auto-ring-detection-column-threshold").val());
        columnThreshold = parseFloat($("#auto-ring-detection-column-threshold").val());
  
        this.placePoints(u, imageData, transitions, columnThreshold)
      })
    }
  
    AutoRingDetection.prototype.findTransitions =  function (imageData, winSize, extremaThreshold) {
      for (pointMarker of this.markers) { pointMarker.remove() };
      this.markers = [];
  
  
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
      for (let i = 0; i < imageData.length; i ++) {
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
  
  
        for (let j = 1; j < firstDeriv.length; j++) {
          if (secondDeriv[j-1] * secondDeriv[j] < 0) {
            if (firstDeriv[j] <= minThreshold || firstDeriv[j] >= maxThreshold) {
              transitions[[i,j]] = firstDeriv[j];
            }
          }
        }
      }
  
      return transitions;
    }
  
    AutoRingDetection.prototype.placePoints = function(u, imageData, transitions, columnThreshold) {
      for (pointMarker of this.markers) { pointMarker.remove() };
      this.markers = [];
      let nextTransitionDark = null;
  
      let imgMap = [];
      for (let i = 0; i < imageData.length; i++) {
        let rowMap = [];
        for (let j = 0; j < imageData[0].length; j++) {
          rowMap.push(false);
        };
        imgMap.push(rowMap)
      }
  
      for (let j = 1; j < imageData[0].length; j++) {
        let lightCount = 0;
        let darkCount = 0;
        for (let i = 0; i < imageData.length; i ++) {
          let transitionKey = i + "," + j;
          if (transitions[transitionKey] < 0) {
            imgMap[i][j] = "dark";
          }
          else if (transitions[transitionKey] > 0) {
            imgMap[i][j] = "light";
          }
          else {
            imgMap[i][j] = imgMap[i][j-1]
          }
  
          if (imgMap[i][j] === "dark") {
            darkCount++;
          }
          else if (imgMap[i][j] === "light") {
            lightCount++;
          }
        }
  
  
        // Inte.treering.data.newPoint(this.startPoint, latLng);
        // Inte.treering.visualAsset.newLatLng(Inte.treering.data.points, Inte.treering.data.index-1, latLng);
  
        let areaHeight = imgMap.length;
        if (darkCount >= columnThreshold * areaHeight && (nextTransitionDark || nextTransitionDark === null)) {
          nextTransitionDark = false;
  
          let lng = this.firstLatLng.lng + j*u.x;
          let lat = this.firstLatLng.lat + j*u.y;
          let latLng = L.latLng(lat, lng);
          let pointMarker = L.circleMarker(latLng, {radius: 2, color: 'yellow'});
          this.markers.push(pointMarker)
          pointMarker.addTo(Inte.treering.viewer)
  
          // Inte.treering.data.newPoint(false, latLng);
          // Inte.treering.visualAsset.newLatLng(Inte.treering.data.points, Inte.treering.data.index-1, latLng);
        }
  
        if (lightCount >= columnThreshold * areaHeight && (!nextTransitionDark || nextTransitionDark === null)) {
          nextTransitionDark = true;
  
          let lng = this.firstLatLng.lng + j*u.x;
          let lat = this.firstLatLng.lat + j*u.y;
          let latLng = L.latLng(lat, lng);
          let pointMarker = L.circleMarker(latLng, {radius: 2, color: 'yellow'});
          this.markers.push(pointMarker)
          pointMarker.addTo(Inte.treering.viewer)
  
          // Inte.treering.data.newPoint(false, latLng)
          // Inte.treering.visualAsset.newLatLng(Inte.treering.data.points, Inte.treering.data.index-1, latLng);
        }
      }
    }
  
  
    AutoRingDetection.prototype.findDirectionVector = function() {
      let firstPixelCoords = Inte.treering.baseLayer["GL Layer"]._map.project(this.firstLatLng, Inte.treering.getMaxNativeZoom()).floor();
      let secondPixelCoords = Inte.treering.baseLayer["GL Layer"]._map.project(this.secondLatLng, Inte.treering.getMaxNativeZoom()).floor();
  
      let deltaX = secondPixelCoords.x - firstPixelCoords.x;
      let deltaY = secondPixelCoords.y - firstPixelCoords.y;
      let numPixels = (deltaX**2 + deltaY**2)**(1/2);
      let latLngPerPixel = (this.secondLatLng.lng - this.firstLatLng.lng) / deltaX
  
      let dx = deltaX/numPixels * latLngPerPixel
      let dy = -(deltaY/numPixels * latLngPerPixel)
  
      return {x: dx, y: dy}
    }
    
    AutoRingDetection.prototype.drawRect = async function(areaHeight) {
      let firstPixelCoords = Inte.treering.baseLayer["GL Layer"]._map.project(this.firstLatLng, Inte.treering.getMaxNativeZoom()).floor();
      let secondPixelCoords = Inte.treering.baseLayer["GL Layer"]._map.project(this.secondLatLng, Inte.treering.getMaxNativeZoom()).floor();
      // console.log(firstPixelCoords, secondPixelCoords)

      let deltaX = secondPixelCoords.x - firstPixelCoords.x;
      let deltaY = secondPixelCoords.y - firstPixelCoords.y;
  
      let latLngPerPixel = (this.secondLatLng.lng - this.firstLatLng.lng) / deltaX;
      let angle = Math.atan(deltaY/deltaX);
  
      let corner1Lat = this.firstLatLng.lat - (areaHeight / 2) * Math.sin((Math.PI / 2) - angle) * latLngPerPixel;
      let corner1Lng = this.firstLatLng.lng - (areaHeight / 2) * Math.cos((Math.PI / 2) - angle) * latLngPerPixel;
      let corner1 = L.latLng(corner1Lat, corner1Lng);
  
      let corner2Lat = this.firstLatLng.lat + (areaHeight / 2) * Math.sin((Math.PI / 2) - angle) * latLngPerPixel;
      let corner2Lng = this.firstLatLng.lng + (areaHeight / 2) * Math.cos((Math.PI / 2) - angle) * latLngPerPixel;
      let corner2 = L.latLng(corner2Lat, corner2Lng);
      
      let corner3Lat = this.secondLatLng.lat + (areaHeight / 2) * Math.sin((Math.PI / 2) - angle) * latLngPerPixel;
      let corner3Lng = this.secondLatLng.lng + (areaHeight / 2) * Math.cos((Math.PI / 2) - angle) * latLngPerPixel;
      let corner3 = L.latLng(corner3Lat, corner3Lng);
  
      let corner4Lat = this.secondLatLng.lat - (areaHeight / 2) * Math.sin((Math.PI / 2) - angle) * latLngPerPixel;
      let corner4Lng = this.secondLatLng.lng - (areaHeight / 2) * Math.cos((Math.PI / 2) - angle) * latLngPerPixel;
      let corner4 = L.latLng(corner4Lat, corner4Lng);
  
      let rect = L.polygon([corner1, corner2, corner3, corner4], {color: 'red', weight: 2});
      rect.addTo(Inte.treering.viewer);

      let data = await Inte.treering.baseLayer["GL Layer"].getImageData([corner1, corner2, corner3, corner4], -angle)
      console.log(data)

      // console.log(-angle*180/(Math.PI))
      // Inte.treering.baseLayer["GL Layer"].getRGBMatrix([corner1, corner2, corner3, corner4], -angle)

      return rect;
    }
  }
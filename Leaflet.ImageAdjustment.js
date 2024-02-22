
function ImageAdjustmentInterface(Lt) {
    this.treering = Lt;
    this.imageAdjustment = new ImageAdjustment(this);
}


/**
 * Change color properties of image
 * @constructor
 * @param {object} Inte - ImageAdjustment Interface object. Allows access to all other tools.
 */
function ImageAdjustment(Inte) {
    this.open = false;
    this.eventListenersEnabled = false;
  
    this.btn = new Button(
      'brightness_6',
      'Adjust image appearance settings',
      () => { Inte.treering.disableTools(); this.enable() },
      () => { this.disable() }
    );
  
    let presetList = [
    {
      presetName: "Griffin",
      presetID: "Griffin"
    },
    {
      presetName: "User 1",
      presetID: "User-1"
    },
    {
      presetName: "User 2",
      presetID: "User-2"
    }
    ];

    let filterList = [
      {
        filterType: "brightness",
        value: "100",
        defaultValue: "100",
        inputID: "brightness-input",
        sliderID: "brightness-slider",
        min: "0",
        max: "300",
        step: "1",
        label: "Brightness (0-300)",
        CSSFilter: true
      },
      { 
        filterType: "contrast",
        value: "100",
        defaultValue: "100",
        inputID: "contrast-input",
        sliderID: "contrast-slider",
        min: "50",
        max: "350",
        step: "1",
        label: "Contrast (50-350)",
        CSSFilter: true
      },
      { 
        filterType: "saturate",
        value: "100",
        defaultValue: "100",
        inputID: "saturate-input",
        sliderID: "saturate-slider",
        min: "0",
        max: "350",
        step: "1",
        label: "Saturation (0-350)",
        CSSFilter: true
      },
      { 
        filterType: "emboss",
        value: "0",
        defaultValue: "0",
        inputID: "emboss-input",
        sliderID: "emboss-slider",
        min: "0",
        max: "1",
        step: "0.01",
        label: "Emboss (0-1)",
        CSSFilter: false,
        GLName: "emboss"
      },
      { 
        filterType: "edge-detect",
        value: "0",
        defaultValue: "0",
        inputID: "edge-detect-input",
        sliderID: "edge-detect-slider",
        min: "0",
        max: "1",
        step: "0.01",
        label: "edge-detect (0-1)",
        CSSFilter: false,
        GLName: "edgeDetect3"
      },
      { 
        filterType: "sharpness",
        value: "0",
        defaultValue: "0",
        inputID: "sharpness-input",
        sliderID: "sharpness-slider",
        min: "0",
        max: "1",
        step: "0.01",
        label: "Sharpness (0-1)",
        CSSFilter: false,
        GLName: "unsharpen"
      }
     ];

     let invert = {
      value: false,
      flipValue: function() {
        invert.value = !invert.value;
      }
     }
  
    // handlebars from templates.ImageAdjustment.html
    let content = document.getElementById("ImageAdjustment-dialog-template").innerHTML;
    let template = Handlebars.compile(content);
    let html = template({filterList: filterList, presetList: presetList});
  
    this.dialog = L.control.dialog({
      'size': [290, 400],
      'anchor': [50, 5],
      'initOpen': false,
      'position': 'topleft',
      'minSize': [0, 0],
      'className': 'image-adjust-custom'
    }).setContent(html).addTo(Inte.treering.viewer);

    ImageAdjustment.prototype.updateFilters = function() {
      updateCSSFilterString = ""
      let invertValue = (invert.value) ? "1" : "0";
      updateCSSFilterString += "invert(" + invertValue + ")";

      let updateGLFilterObjs = []
      
      for(filter of filterList) {
        var slider = document.getElementById(filter.sliderID);
        if(filter.CSSFilter) {
          updateCSSFilterString += filter.filterType + "(" + slider.value + "%) ";
        } else {
          updateGLFilterObjs.push({
            "name": filter.GLName,
            "strength": slider.value
          });
        }
      }

      document.getElementsByClassName("leaflet-pane")[0].style.filter = updateCSSFilterString;
      Inte.treering.baseLayer['GL Layer'].setKernelsAndStrength(updateGLFilterObjs);
    };

    ImageAdjustment.prototype.watchFilter = function(filterName) {
      let sliderID = filterName.toLowerCase() + "-slider";
      let inputID = filterName.toLowerCase() + "-input";

      let slider = document.getElementById(sliderID);
      let input = document.getElementById(inputID);

      slider.oninput = function () {
        input.value = slider.value;
        Inte.imageAdjustment.updateFilters();
      }

      input.oninput = function() {
        // checks if input is between min and max, slider & input reset to default value when input is invalid
        if ((parseFloat(input.value) >= parseFloat(input.min) && parseFloat(input.value) <= parseFloat(input.max)) && !(input.value == "")) {
          slider.value = input.value;
        } else {
          slider.value = input.defaultValue;
        }
        Inte.imageAdjustment.updateFilters();
      }
    }
  
    ImageAdjustment.prototype.createEventListeners = function() {
      //Close view if user clicks anywhere outside of slider window
      $(Inte.treering.viewer.getContainer()).on("click",() => {
        this.disable();
      });

      $("#image-adjustment-reset-button").on("click", () => {
        for(filter of filterList) {
          let sliderID = filter.filterType.toLowerCase() + "-slider";
          let inputID = filter.filterType.toLowerCase() + "-input";
          let slider = document.getElementById(sliderID);
          let input = document.getElementById(inputID);

          slider.value = slider.defaultValue;
          input.value = input.defaultValue;
        }
        invert.value = false;
        this.updateFilters();
      });

      $("#image-adjustment-invert-button").on("click", () => {
        invert.flipValue();
        this.updateFilters();
      });
    }

    ImageAdjustment.prototype.createPresetListeners = function(presetName) {
      let presetID = presetName.replace(" ", "-");
      let preset = document.getElementById(presetID);

      preset.onclick = function () {
        console.log(presetName);
      }
    }

    /**
     * Open the filter sliders dialog
     * @function enable
     */
    ImageAdjustment.prototype.enable = function() {
      this.open = true;
  
      this.dialog.lock();
      this.dialog.open();

      this.btn.state('active');
      if(!this.eventListenersEnabled) {
        this.createEventListeners();
        this.eventListenersEnabled = true;
      }

      for(filter of filterList) {
        this.watchFilter(filter.filterType);
      };

      for(preset of presetList) {
        this.createPresetListeners(preset.presetName);
      }
    };
  
    /**
     * Close the filter sliders dialog
     * @function disable
     */
    ImageAdjustment.prototype.disable = function() {
      if (this.open) {
        this.dialog.unlock();
        this.dialog.close();
      }
      
      this.btn.state('inactive');
      this.open = false;
    };
  
  }
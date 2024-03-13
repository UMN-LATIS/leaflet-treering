
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
  
    // List of presets, can be expanded
    let presetList = [
    {
      presetName: "User 1",
      presetID: "User-1"
    },
    {
      presetName: "User 2",
      presetID: "User-2"
    }
    ];

    // List of filters & their properties
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

     // Stores info of whether or not image is inverted (filter determined by bool)
     let invert = {
      value: false,
      flipValue: () => {
        invert.value = !invert.value;
      }
     }

     //Stores info of whether or not preset save checkbox is on or off
     let presetSaveCheck = {
      value: false,
      flipValue: () => {
        presetSaveCheck.value = !presetSaveCheck.value
      },
     }

     //List containing image settings of presets if saved
     this.presets = [];
  
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

    /**
     * Applies filter settings to image
     * @function
     */
    ImageAdjustment.prototype.updateFilters = function() {
      updateCSSFilterString = "";
      let invertValue = (invert.value) ? "1" : "0";
      updateCSSFilterString += "invert(" + invertValue + ")";

      let updateGLFilterObjs = [];
      
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

    /**
     * Creates listeners to check for input of sliders and number inputs
     * @param {String} filterName - Name of filter
     */
    ImageAdjustment.prototype.createFilterListener = function(filterName) {
      let sliderID = filterName.toLowerCase() + "-slider";
      let inputID = filterName.toLowerCase() + "-input";

      let slider = document.getElementById(sliderID);
      let input = document.getElementById(inputID);

      $("#" + sliderID).on("input", () => {
        input.value = slider.value;
        Inte.imageAdjustment.updateFilters();
      });

      $("#" + inputID).on("input", () => {
        // checks if input is between min and max, slider & input reset to default value when input is invalid
        if ((parseFloat(input.value) >= parseFloat(input.min) && parseFloat(input.value) <= parseFloat(input.max)) && !(input.value == "")) {
          slider.value = input.value;
        } else {
          slider.value = input.defaultValue;
        }
        Inte.imageAdjustment.updateFilters();
      });
    }

    /**
     * Creates listeners for user presets
     * @param {Object} preset - from presetList
     * @param {Integer} presetIndex - Index of preset in presetList and this.presets
     * @param {Object} saveBox - HTML element of preset save checkbox
     */
    ImageAdjustment.prototype.createPresetListeners = function(preset, presetIndex, saveBox) {
      $("#" + preset.presetID).on("click", () => {
        //Saves preset to button clicked if checkbox is checked
        if (presetSaveCheck.value) {
          let presetSettings = {}
          for (filter of filterList) {
            presetSettings[filter.filterType] = document.getElementById(filter.sliderID).value;
          }
          presetSettings["invert"] = invert.value;
          this.presets[presetIndex] = presetSettings;

          presetSaveCheck.flipValue();
          saveBox.style.color = "black";
        } 
        
        //Applies saved settings if they have previously been saved (does nothing otherwise)
        else if (this.presets.length != 0 && this.presets[presetIndex].length != 0) {
          for(filter of filterList) {
            let sliderID = filter.filterType.toLowerCase() + "-slider";
            let inputID = filter.filterType.toLowerCase() + "-input";
            let slider = document.getElementById(sliderID);
            let input = document.getElementById(inputID);
  
            slider.value = this.presets[presetIndex][filter.filterType];
            input.value = slider.value;
          }
          invert.value = this.presets[presetIndex]["invert"];
          this.updateFilters();
        }
      });
    }
    
    /**
     * Creates event listeners for all buttons/sliders in image settings dialog
     */
    ImageAdjustment.prototype.createEventListeners = function() {
      //Close view if user clicks anywhere outside of slider window
      $(Inte.treering.viewer.getContainer()).on("click",() => {
        this.disable();
      });

      //Resets image settings to defauts
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

      //Inverts image
      $("#image-adjustment-invert-button").on("click", () => {
        invert.flipValue();
        this.updateFilters();
      });

      //Creates filter listener for all filters
      for(filter of filterList) {
        this.createFilterListener(filter.filterType);
      };

      //Changes color/highlighting of save checkbox
      let saveBox = document.getElementById("preset-save-checkbox")
      $("#preset-save-checkbox").on("click", () => {
        presetSaveCheck.flipValue();
        if (presetSaveCheck.value) {
          saveBox.style.color = "#0c8a1c";
          saveBox.style.backgroundColor = "#90EE90";
        } else {
          saveBox.style.color = "black";
          saveBox.style.backgroundColor = "#C0C0C0";
        }
      });

      $("#preset-save-checkbox").on("mouseover", () => {
        if (presetSaveCheck.value) {
          saveBox.style.backgroundColor = "#90EE90";
        } else {
          saveBox.style.backgroundColor = "#C0C0C0";
        }
      });

      $("#preset-save-checkbox").on("mouseout", () => {
        saveBox.style.backgroundColor = "transparent";
      });

      //Creates listeners for all presets
      let presetIndex = 0;
      for (preset of presetList) {
        this.createPresetListeners(preset, presetIndex, saveBox);
        presetIndex++;
      }
      
      // add comment
      $("#Griffin").on("click", () => {
        for(filter of filterList) {
          let sliderID = filter.filterType.toLowerCase() + "-slider";
          let inputID = filter.filterType.toLowerCase() + "-input";
          let slider = document.getElementById(sliderID);
          let input = document.getElementById(inputID);

          if (sliderID == "emboss-slider") {
            slider.value = 0.15;
            input.value = 0.15;
          } else if (sliderID == "sharpness-slider") {
            slider.value = 0.2;
            input.value = 0.2;
          } else {
            slider.value = slider.defaultValue;
            input.value = input.defaultValue;            
          }
        }
        invert.value = false;
        this.updateFilters(); 
      });
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

    ImageAdjustment.prototype.getJSON = function() {
      return this.presets;
    };

    ImageAdjustment.prototype.loadJSON = function(JSONdata) {
      this.presets = JSON.parse(JSON.stringify(JSONdata));
    }
  }
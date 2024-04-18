/**
 * Interface for image adjustment tools. Instantiates & connects all area or supporting tools. 
 * @constructor
 * 
 * @param {object} Lt - LTreering object from leaflet-treering.js. 
 */
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
      filterType: "edgeDetect",
      value: "0",
      defaultValue: "0",
      inputID: "edgeDetect-input",
      sliderID: "edgeDetect-slider",
      min: "0",
      max: "1",
      step: "0.01",
      label: "Edge Detect (0-1)",
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

  // Stores info of whether or not image is inverted
  this.invert = false;

  //Store if the auto preset is loaded
  this.auto_preset_loaded = false;

  //List containing image settings of presets if saved
  this.presets = [];

  // handlebars from templates.ImageAdjustment.html
  let content = document.getElementById("ImageAdjustment-dialog-template").innerHTML;
  let template = Handlebars.compile(content);
  let html = template({filterList: filterList});

  this.dialog = L.control.dialog({
    'size': [290, 400],
    'anchor': [50, 5],
    'initOpen': false,
    'position': 'topleft',
    'minSize': [0, 0],
    'className': 'image-adjust-custom'
  }).setContent(html).addTo(Inte.treering.viewer);
  
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
    };
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

  /**
   * Applies filter settings to image
   * @function
   */
  ImageAdjustment.prototype.updateFilters = function() {
    updateCSSFilterString = "";
    let invertValue = (this.invert) ? "1" : "0";
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
    let sliderID = filterName + "-slider";
    let inputID = filterName + "-input";

    let slider = document.getElementById(sliderID);
    let input = document.getElementById(inputID);

    $("#" + sliderID).on("input", () => {
      input.value = slider.value;
      Inte.imageAdjustment.updateFilters();

      //turn off auto-preset highlight upon settings changes
      this.auto_preset_loaded = false;
      this.toggleButtonColor('image-adjustment-auto-button', this.auto_preset_loaded);
    });

    $("#" + inputID).on("input", () => {
      // checks if input is between min and max, slider & input reset to default value when input is invalid
      if ((parseFloat(input.value) >= parseFloat(input.min) && parseFloat(input.value) <= parseFloat(input.max)) && !(input.value == "")) {
        slider.value = input.value;
      } else {
        slider.value = input.defaultValue;
      }
      Inte.imageAdjustment.updateFilters();

      //turn off auto-preset highlight upon settings changes
      this.auto_preset_loaded = false;
      this.toggleButtonColor('image-adjustment-auto-button', this.auto_preset_loaded);
    });
  }

  ImageAdjustment.prototype.toggleButtonColor = function(buttonID, buttonState) {
    let button = document.getElementById(buttonID)
    if (buttonState) {
      button.style.backgroundColor = '#aec8f4'
    }
    else {
      button.style.backgroundColor = '#dcdcdc'
    }
  }
  
  /**
   * Creates event listeners for all buttons/sliders in image settings dialog
   */
  ImageAdjustment.prototype.createEventListeners = function() {
    //Close view if user clicks anywhere outside of slider window
    $(Inte.treering.viewer.getContainer()).on("click",() => {
      this.disable();
    });

    //Inverts image
    $("#image-adjustment-invert-button").on("click", () => {
      this.invert = !this.invert;
      this.updateFilters();

      this.toggleButtonColor("image-adjustment-invert-button", this.invert);
    });

    $("#image-adjustment-auto-button").on("click", () => {
      for(filter of filterList) {
        let sliderID = filter.filterType + "-slider";
        let inputID = filter.filterType + "-input";
        let slider = document.getElementById(sliderID);
        let input = document.getElementById(inputID);

        if (filter.filterType == "emboss") {
          slider.value = 0.15
          input.value = slider.value
        } else if (filter.filterType == "sharpness") {
          slider.value = 0.2
          input.value = slider.value
        } else {
          slider.value = slider.defaultValue;
          input.value = input.defaultValue;
        }
      }
      this.updateFilters();

      this.auto_preset_loaded = true;
      this.toggleButtonColor('image-adjustment-auto-button', this.auto_preset_loaded);
    });

    $("#image-adjustment-reset-button").on("click", () => {
      for(filter of filterList) {
        let sliderID = filter.filterType + "-slider";
        let inputID = filter.filterType + "-input";
        let slider = document.getElementById(sliderID);
        let input = document.getElementById(inputID);

        slider.value = slider.defaultValue;
        input.value = input.defaultValue;
      }
      this.invert = false;
      this.updateFilters();

      this.invert = false;
      this.auto_preset_loaded = false;
      this.toggleButtonColor('image-adjustment-invert-button', this.invert);
      this.toggleButtonColor('image-adjustment-auto-button', this.auto_preset_loaded);
    })

    //Creates filter listener for all filters
    for(filter of filterList) {
      this.createFilterListener(filter.filterType);
    };
  }

  /**
   * Saves current image settings when JSON is saved
   * @returns object containing current image settings
   */
  ImageAdjustment.prototype.getCurrentViewJSON = function() {
    currentSettings = {}
    for (filter of filterList) {
      let sliderID = filter.filterType + "-slider";
      let slider = document.getElementById(sliderID);
      currentSettings[filter.filterType] = slider.value
    }
    currentSettings["invert"] = this.invert
    return currentSettings
  }

  /**
   * 
   * @param {object} JSONdata - object containing current image settings
   */
  ImageAdjustment.prototype.loadCurrentViewJSON = function(JSONdata) {
    for (filter of filterList) {
      let sliderID = filter.filterType + "-slider";
      let inputID = filter.filterType + "-input";
      let slider = document.getElementById(sliderID);
      let input = document.getElementById(inputID);

      slider.value = JSONdata[filter.filterType];
      input.value = JSONdata[filter.filterType];
    }
    this.invert = JSONdata["invert"];
    this.updateFilters();
    }
  }
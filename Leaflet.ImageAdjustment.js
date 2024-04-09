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

  //List of user saveable presets
  let userPresetList = [
    {
      value: 
      {userPreset: true,
      brightness: 100,
      contrast: 100,
      saturate: 100,
      emboss: 0,
      edgeDetect: 0,
      sharpness: 0,
      invert: false
      },
      presetID: "User-1",
      displayText: "User 1"
    },
    {
      value: 
      {userPreset: true,
      brightness: 100,
      contrast: 100,
      saturate: 100,
      emboss: 0,
      edgeDetect: 0,
      sharpness: 0,
      invert: false
      },
      presetID: "User-2",
      displayText: "User 2"
    },    {
      value: 
      {userPreset: true,
      brightness: 100,
      contrast: 100,
      saturate: 100,
      emboss: 0,
      edgeDetect: 0,
      sharpness: 0,
      invert: false
      },
      presetID: "User-3",
      displayText: "User 3"
    },
  ];

  //List of premade presets, plus user presets
  let presetList = [
    {
      value: 
      {userPreset: false,
      brightness: 100,
      contrast: 100,
      saturate: 100,
      emboss: 0,
      edgeDetect: 0,
      sharpness: 0,
      invert: false
      },
      presetID: "default",
      displayText: "Default Settings"
    },
    {
      value: {userPreset: false,
      brightness: 100,
      contrast: 100,
      saturate: 100,
      emboss: 0.15,
      edgeDetect: 0,
      sharpness: 0.20,
      invert: false
      },
      presetID: "True-Color-1",
      displayText: "True Color 1"
    },
    {
      value: {userPreset: false,
      brightness: 100,
      contrast: 100,
      saturate: 100,
      emboss: 0.15,
      edgeDetect: 0,
      sharpness: 0.20,
      invert: true
      },
      presetID: "False-Color-1",
      displayText: "False Color 1"
    },
    ].concat(userPresetList);

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

  // Stores info of whether or not image is inverted (filter determined by bool)
  let invert = {
  value: false,
  flipValue: () => {
    invert.value = !invert.value;
  }
  }

  //List containing image settings of presets if saved
  this.presets = [];

  // handlebars from templates.ImageAdjustment.html
  let content = document.getElementById("ImageAdjustment-dialog-template").innerHTML;
  let template = Handlebars.compile(content);
  let html = template({filterList: filterList, userPresetList: userPresetList, presetList: presetList});

  this.dialog = L.control.dialog({
    'size': [290, 415],
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
    let sliderID = filterName + "-slider";
    let inputID = filterName + "-input";

    let slider = document.getElementById(sliderID);
    let input = document.getElementById(inputID);

    $("#" + sliderID).on("input", () => {
      input.value = slider.value;
      Inte.imageAdjustment.updateFilters();

      //Switches dropdown to none selected, hides saved popup
      document.getElementById("image-adjustment-preset-dropdown").value = "unsaved";
      $("#save-success-text").attr("hidden", true)
    });

    $("#" + inputID).on("input", () => {
      // checks if input is between min and max, slider & input reset to default value when input is invalid
      if ((parseFloat(input.value) >= parseFloat(input.min) && parseFloat(input.value) <= parseFloat(input.max)) && !(input.value == "")) {
        slider.value = input.value;
      } else {
        slider.value = input.defaultValue;
      }
      Inte.imageAdjustment.updateFilters();

      //Switches dropdown to none selected, hides saved popup
      document.getElementById("image-adjustment-preset-dropdown").value = "unsaved";
      $("#save-success-text").attr("hidden", true)
    });
  }

  /**
   * Creates listeners for changes to main preset dropdown and button to save settings
   */
  ImageAdjustment.prototype.createPresetListeners = function() {
    //Listeners for changing presets
    $("#image-adjustment-preset-dropdown").on("change", () => {
      let currentPreset = presetList.find(this.checkPresetID);

      for (filter of filterList) {
        let sliderID = filter.filterType + "-slider";
        let inputID = filter.filterType + "-input";
        let slider = document.getElementById(sliderID);
        let input = document.getElementById(inputID);

        slider.value = currentPreset.value[filter.filterType];
        input.value = slider.value;
      }
      invert.value = currentPreset.value["invert"]
      Inte.imageAdjustment.updateFilters()

      $("#save-success-text").attr("hidden", true)
    });

    //Listeners for saving presets
    $("#preset-save-button").on("click", () => {
      let savedPreset = userPresetList.find(this.checkUserPresetID);
      for (filter of filterList) {
        let slider = document.getElementById(filter.filterType + "-slider")
        savedPreset.value[filter.filterType] = slider.value;
      }
      savedPreset.value["invert"] = invert.value;

      //Changes selected preset to saved preset and hides save popup
      document.getElementById("image-adjustment-preset-dropdown").value = savedPreset.presetID;
      $("#save-success-text").attr("hidden", false)

      //saves setting to this.presets (later saved to JSON)
      let savedPresetNumber = savedPreset.presetID[savedPreset.presetID.length - 1];
      this.presets[savedPresetNumber - 1] = savedPreset;
    });
  }

  /**
   * Helper for finding the selected preset of preset dropdown
   * @param {object} preset - contains image preset settings
   * @returns 
   */
  ImageAdjustment.prototype.checkPresetID = function(preset) {
    return preset.presetID == $("#image-adjustment-preset-dropdown").val()
  }

  /**
   * Helper for finding the selected preset of saveable presets
   * @param {object} preset - Contains image preset settings
   * @returns 
   */
  ImageAdjustment.prototype.checkUserPresetID = function(preset) {
    return preset.presetID == $("#image-adjust-saveto-dropdown").val()
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
      invert.flipValue();
      this.updateFilters();

      //Switches between true and false color presents when inverted
      let currentPresetValue = $("#image-adjustment-preset-dropdown").val()
      if (currentPresetValue.includes("Color")) {
        let ColorPresetNumber = currentPresetValue[currentPresetValue.length - 1]
        if (invert.value) {document.getElementById("image-adjustment-preset-dropdown").value = "False-Color-" + ColorPresetNumber}
        else {document.getElementById("image-adjustment-preset-dropdown").value = "True-Color-" + ColorPresetNumber}
      }
      else {document.getElementById("image-adjustment-preset-dropdown").value = "unsaved"};

      //Hide successful save popup
      $("#save-success-text").attr("hidden", true)
    });

    //Creates filter listener for all filters
    for(filter of filterList) {
      this.createFilterListener(filter.filterType);
    };

    //Changes highlight when hovering over save button
    $("#preset-save-button").on("mouseover", () => {
      document.getElementById("preset-save-button").style.backgroundColor = "#d1d1d1";
    });

    $("#preset-save-button").on("mouseout", () => {
      document.getElementById("preset-save-button").style.backgroundColor = "transparent"      
    })

    //Creates listeners for all presets
    this.createPresetListeners();
  }

  /**
   * Saves preset settings to JSON
   * @returns list of preset image settings
   */
  ImageAdjustment.prototype.getPresetJSON = function() {
    return this.presets;
  };

  /**
   * Saves current image settings when JSON is saved
   * @returns object containing current image settings
   */
  ImageAdjustment.prototype.getCurrentViewJSON = function() {
    currentSettings = {currentPreset: $("#image-adjustment-preset-dropdown").val()};

    for (filter of filterList) {
      let sliderID = filter.filterType + "-slider";
      let slider = document.getElementById(sliderID);

      currentSettings[filter.filterType] = slider.value;
    };
    currentSettings["invert"] = invert.value;

    return currentSettings
  }

  /**
   * Loads saved preset settings to buttons
   * @param {list} JSONdata - list of objects contaiting image settings
   */
  ImageAdjustment.prototype.loadPresetJSON = function(JSONdata) {
    this.presets = JSON.parse(JSON.stringify(JSONdata));
    userPresetStartingIndex = presetList.length - userPresetList.length

    for (i = 0; i <= 2; i++) {
      if (this.presets[i] != null) {
        presetList[userPresetStartingIndex + i] = this.presets[i];
      }
    }
  }

  /**
   * 
   * @param {object} JSONdata - object containing current image settings
   */
  ImageAdjustment.prototype.loadCurrentViewJSON = function(JSONdata) {
    document.getElementById("image-adjustment-preset-dropdown").value = JSONdata["currentPreset"];

    for (filter of filterList) {
      let sliderID = filter.filterType + "-slider";
      let inputID = filter.filterType + "-input";
      let slider = document.getElementById(sliderID);
      let input = document.getElementById(inputID);

      slider.value = JSONdata[filter.filterType];
      input.value = JSONdata[filter.filterType];
    }
    invert.value = JSONdata["invert"];
    this.updateFilters();
    }
  }
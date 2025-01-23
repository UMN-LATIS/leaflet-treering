/*
 * @class GridLayer.GL
 * @inherits GridLayer
 *
 * This `GridLayer` runs some WebGL code on each grid cell, and puts an image
 * with the result back in place.
 *
 * The contents of each cell can be purely synthetic (based only on the cell
 * coordinates), or be based on some remote tiles (used as textures in the WebGL
 * shaders).
 *
 * The fragment shader is assumed to receive two `vec2` attributes, with the CRS
 * coordinates and the texture coordinates: `aCRSCoords` and `aTextureCoords`.
 * If textures are used, they are accesed through the uniforms `uTexture0` through `uTexture7`
 * There will always be four vertices forming two triangles (a quad).
 *
 */


 var kernels = {
    normal: [
      0, 0, 0,
      0, 1, 0,
      0, 0, 0
    ],
    gaussianBlur: [
      0.045, 0.122, 0.045,
      0.122, 0.332, 0.122,
      0.045, 0.122, 0.045
    ],
    gaussianBlur2: [
      1, 2, 1,
      2, 4, 2,
      1, 2, 1
    ],
    gaussianBlur3: [
      0, 1, 0,
      1, 1, 1,
      0, 1, 0
    ],
    unsharpen: [
      -1, -1, -1,
      -1,  9, -1,
      -1, -1, -1
    ],
    sharpness: [
       0,-1, 0,
      -1, 5,-1,
       0,-1, 0
    ],
    sharpen: [
       -1, -1, -1,
       -1, 16, -1,
       -1, -1, -1
    ],
    edgeDetect: [
       -0.125, -0.125, -0.125,
       -0.125,  1,     -0.125,
       -0.125, -0.125, -0.125
    ],
    edgeDetect2: [
       -1, -1, -1,
       -1,  8, -1,
       -1, -1, -1
    ],
    edgeDetect3: [
       -5, 0, 0,
        0, 0, 0,
        0, 0, 5
    ],
    edgeDetect4: [
       -1, -1, -1,
        0,  0,  0,
        1,  1,  1
    ],
    edgeDetect5: [
       -1, -1, -1,
        2,  2,  2,
       -1, -1, -1
    ],
    edgeDetect6: [
       -5, -5, -5,
       -5, 39, -5,
       -5, -5, -5
    ],
    sobelHorizontal: [
        1,  2,  1,
        0,  0,  0,
       -1, -2, -1
    ],
    sobelVertical: [
        1,  0, -1,
        2,  0, -2,
        1,  0, -1
    ],
    previtHorizontal: [
        1,  1,  1,
        0,  0,  0,
       -1, -1, -1
    ],
    previtVertical: [
        1,  0, -1,
        1,  0, -1,
        1,  0, -1
    ],
    boxBlur: [
        0.111, 0.111, 0.111,
        0.111, 0.111, 0.111,
        0.111, 0.111, 0.111
    ],
    triangleBlur: [
        0.0625, 0.125, 0.0625,
        0.125,  0.25,  0.125,
        0.0625, 0.125, 0.0625
    ],
    emboss: [
       -2, -1,  0,
       -1,  1,  1,
        0,  1,  2
    ],
  };

  var effects = [
    { name: "gaussianBlur3", on: true },
    { name: "gaussianBlur3", on: true },
    { name: "gaussianBlur3", on: true },
    { name: "sharpness", },
    { name: "sharpness", },
    { name: "sharpness", },
    { name: "sharpen", },
    { name: "sharpen", },
    { name: "sharpen", },
    { name: "unsharpen", },
    { name: "unsharpen", },
    { name: "unsharpen", },
    { name: "emboss", on: true },
    { name: "edgeDetect", },
    { name: "edgeDetect", },
    { name: "edgeDetect3", },
    { name: "edgeDetect3", },
  ];

L.TileLayer.GL = L.GridLayer.extend({
	options: {
		// @option tileUrls: Array
		// Array of tile URL templates (as in `L.TileLayer`), between zero and 8 elements. Each URL template will be converted into a plain `L.TileLayer` and pushed in the `tileLayers` option.
		tileUrls: [],

		// @option tileLayers: Array
		// Array of instances of `L.TileLayer` (or its subclasses, like `L.TileLayer.WMS`), between zero and 8 elements.
		tileLayers: [],

		// @option fragmentShader: String
		// A string representing the GLSL fragment shader to be run.
		// This must NOT include defining the variants, nor the texture uniforms,
		// nor user-defined uniforms.
		fragmentShader: "void main(void) {gl_FragColor = vec4(0.2,0.2,0.2,1.0);}",
		// @option uniforms: Object
		// A map of names and initial values for the user-defined uniforms.
		// Values must be `Number` or an `Array` of up to four `Number`s.
		// e.g. `{ uTarget: 2.0, uOffset: [0.0, 5.0] }`.
		uniforms: {},

		subdomains: ["a", "b", "c", "d"],
	},
	kernelSettings: [
		
	],
	// On instantiating the layer, it will initialize all the GL context
	//   and upload the shaders to the GPU, along with the vertex buffer
	//   (the vertices will stay the same for all tiles).
	initialize: function(options) {
		options = L.setOptions(this, options);

		this._renderer = L.DomUtil.create("canvas");
		this._renderer.width = this._renderer.height = options.tileSize;
		this._glError = false;

		var gl = (this._gl =
			this._renderer.getContext("webgl", {
				premultipliedAlpha: false,
			}) ||
			this._renderer.getContext("experimental-webgl", {
				premultipliedAlpha: false,
			}));
		gl.viewportWidth = options.tileSize;
		gl.viewportHeight = options.tileSize;

		// Create `TileLayer`s from the tileUrls option.
		this._tileLayers = Array.from(options.tileLayers);
		for (var i = 0; i < options.tileUrls.length && i < 8; i++) {
			this._tileLayers.push(L.tileLayer(options.tileUrls[i]));
		}

		this.options.bounds = this._tileLayers[0].options.bounds;
		this.options.maxNativeZoom = this._tileLayers[0].options.maxNativeZoom;
        this.options.maxZoom =this._tileLayers[0].options.maxZoom;
		this.options.minZoom = this._tileLayers[0].options.minZoom;

		this._loadGLProgram();

		// Init textures
		this._textures = [];
		for (i = 0; i < this._tileLayers.length && i < 8; i++) {
			this._textures[i] = gl.createTexture();
			gl.uniform1i(gl.getUniformLocation(this._glProgram, "uTexture" + i), i);
		}

		this.textures = [];
		this.framebuffers = [];

		for (var ii = 0; ii < 6; ++ii) {
			this.texture = this.createAndSetupTexture(gl);
			this.textures.push(this.texture);
		
			// make the texture the same size as the image
			gl.texImage2D(
				gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0,
				gl.RGBA, gl.UNSIGNED_BYTE, null);
		
			// Create a framebuffer
			var fbo = gl.createFramebuffer();
			this.framebuffers.push(fbo);
			gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
		
			// Attach a texture to it.
			gl.framebufferTexture2D(
				gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
		}
	},
  createAndSetupTexture: function(gl) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
 
    // Set up texture so we can render any size image and so we are
    // working with pixels.
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
 
 
    return texture;
  },
	_setFragment: function(fragment){
		this.options.fragmentShader = fragment;
		this._loadGLProgram();
	},

    _isValidTile: function(coords) {
        return (coords.x == 0 && coords.y == 0 && coords.z == 0) ||
            coords.x >= 0 && coords.y >= 0 && coords.z > 0 && coords.z &&
            L.TileLayer.prototype._isValidTile.call(this, coords)
    },

	// @method getGlError(): String|undefined
	// If there was any error compiling/linking the shaders, returns a string
	// with information about that error. If there was no error, returns `undefined`.
	getGlError: function() {
		return this._glError;
	},

	_loadGLProgram: function() {
		var gl = this._gl;

		// Force using this vertex shader.
		// Just copy all attributes to predefined variants and set the vertex positions
		var vertexShaderCode =
			"attribute vec2 aVertexCoords;  " +
			"attribute vec2 aTextureCoords;  " +
			"attribute vec2 aCRSCoords;  " +
			"attribute vec2 aLatLngCoords;  " +
			"uniform float u_flipY;  " +
			"varying vec2 vTextureCoords;  " +
			"varying vec2 vCRSCoords;  " +
			"varying vec2 vLatLngCoords;  " +
			"void main(void) {  " +
			"	gl_Position = vec4(aVertexCoords  * vec2(1, u_flipY), 1.0, 1.0);  " +
			"	vTextureCoords = aTextureCoords;  " +
			"	vCRSCoords = aCRSCoords;  " +
			"	vLatLngCoords = aLatLngCoords;  " +
			"}";

		// Force using this bit for the fragment shader. All fragment shaders
		// will use the same predefined variants, and
		var fragmentShaderHeader =
			"precision highp float;\n" +
			"uniform float uNow;\n" +
			"uniform vec3 uTileCoords;\n" +
			"varying vec2 vTextureCoords;\n" +
			"varying vec2 vCRSCoords;\n" +
			"varying vec2 vLatLngCoords;\n";

		for (var i = 0; i < this._tileLayers.length && i < 8; i++) {
			fragmentShaderHeader += "uniform sampler2D uTexture" + i + ";\n";
		}

		fragmentShaderHeader += this._getUniformSizes();

		var program = (this._glProgram = gl.createProgram());
		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(vertexShader, vertexShaderCode);
		gl.shaderSource(fragmentShader, fragmentShaderHeader + this.options.fragmentShader);
		gl.compileShader(vertexShader);
		gl.compileShader(fragmentShader);

		// @event shaderError
		// Fired when there was an error creating the shaders.
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			this._glError = gl.getShaderInfoLog(vertexShader);
			console.error(this._glError);
			return null;
		}
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			this._glError = gl.getShaderInfoLog(fragmentShader);
			console.error(this._glError);
			return null;
		}

		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		gl.useProgram(program);

		// There will be four vec2 vertex attributes per vertex:
		// aVertexCoords (always from -1 to +1), aTextureCoords (always from 0 to +1),
		// aLatLngCoords and aCRSCoords (both geographical and per-tile).
		this._aVertexPosition = gl.getAttribLocation(program, "aVertexCoords");
		this._uFlipPosition = gl.getUniformLocation(program, "u_flipY");
		this._aTexPosition = gl.getAttribLocation(program, "aTextureCoords");
		this._aCRSPosition = gl.getAttribLocation(program, "aCRSCoords");
		this._aLatLngPosition = gl.getAttribLocation(program, "aLatLngCoords");

		this._initUniforms(program);

		// If the shader is time-dependent (i.e. animated), or has custom uniforms,
		// init the texture cache
		if (this._isReRenderable) {
			this._fetchedTextures = {};
			this._2dContexts = {};
		}

		// 		console.log('Tex position: ', this._aTexPosition);
		// 		console.log('CRS position: ', this._aCRSPosition);
		// 		console.log("uNow position: ", this._uNowPosition);

		// Create three data buffer with 8 elements each - the (easting,northing)
		// CRS coords, the (s,t) texture coords and the viewport coords for each
		// of the 4 vertices
		// Data for the texel and viewport coords is totally static, and
		// needs to be declared only once.
		this._CRSBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this._CRSBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(8), gl.STATIC_DRAW);
		if (this._aCRSPosition !== -1) {
			gl.enableVertexAttribArray(this._aCRSPosition);
			gl.vertexAttribPointer(this._aCRSPosition, 2, gl.FLOAT, false, 8, 0);
		}

		this._LatLngBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this._LatLngBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(8), gl.STATIC_DRAW);
		if (this._aLatLngPosition !== -1) {
			gl.enableVertexAttribArray(this._aLatLngPosition);
			gl.vertexAttribPointer(this._aLatLngPosition, 2, gl.FLOAT, false, 8, 0);
		}

		this._TexCoordsBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this._TexCoordsBuffer);

		// prettier-ignore
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			1.0, 0.0,
			0.0, 0.0,
			1.0, 1.0,
			0.0, 1.0,
		]), gl.STATIC_DRAW);
		if (this._aTexPosition !== -1) {
			gl.enableVertexAttribArray(this._aTexPosition);
			gl.vertexAttribPointer(this._aTexPosition, 2, gl.FLOAT, false, 8, 0);
		}

		this._VertexCoordsBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this._VertexCoordsBuffer);

		// prettier-ignore
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			 1,  1,
			-1,  1,
			 1, -1,
			-1, -1
		]), gl.STATIC_DRAW);
		if (this._aVertexPosition !== -1) {
			gl.enableVertexAttribArray(this._aVertexPosition);
			gl.vertexAttribPointer(this._aVertexPosition, 2, gl.FLOAT, false, 8, 0);
		}
	},

	// Looks at the size of the default values given for the uniforms.
	// Returns a string valid for defining the uniforms in the shader header.
	_getUniformSizes() {
		var defs = "";
		this._uniformSizes = {};
		for (var uniformName in this.options.uniforms) {
			var defaultValue = this.options.uniforms[uniformName];
			if (typeof defaultValue === "number") {
				this._uniformSizes[uniformName] = 0;
				defs += "uniform float " + uniformName + ";\n";
			} else if (defaultValue instanceof Array) {
				if (defaultValue.length > 4) {
					throw new Error("Max size for uniform value is 4 elements");
				}
				this._uniformSizes[uniformName] = defaultValue.length;
				if (defaultValue.length === 1) {
					defs += "uniform float " + uniformName + ";\n";
				} else {
					defs += "uniform vec" + defaultValue.length + " " + uniformName + ";\n";
				}
			} else {
				throw new Error(
					"Default value for uniforms must be either number or array of numbers"
				);
			}
		}
		return defs;
	},

	// Inits the uNow uniform, and the user-provided uniforms, given the current GL program.
	// Sets the _isReRenderable property if there are any set uniforms.
	_initUniforms(program) {
		var gl = this._gl;
		this._uTileCoordsPosition = gl.getUniformLocation(program, "uTileCoords");
		this._uNowPosition = gl.getUniformLocation(program, "uNow");
		this._currentKernel = gl.getUniformLocation(program, "u_kernel[0]");
		this.kernelWeightLocation = gl.getUniformLocation(program, "u_kernelWeight");
		this._isReRenderable = false;

		if (this._uNowPosition) {
			gl.uniform1f(this._uNowPosition, performance.now());
			this._isReRenderable = true;
		}

		this._uniformLocations = {};
		for (var uniformName in this.options.uniforms) {
			this._uniformLocations[uniformName] = gl.getUniformLocation(program, uniformName);
			this.setUniform(uniformName, this.options.uniforms[uniformName]);
			this._isReRenderable = true;
		}
	},

	// This is called once per tile - uses the layer's GL context to
	//   render a tile, passing the complex space coordinates to the
	//   GPU, and asking to render the vertexes (as triangles) again.
	// Every pixel will be opaque, so there is no need to clear the scene.
	_render: function(coords) {
		var gl = this._gl;

		// this._currentKernel = kernels["unsharpen"];
		
		
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		gl.clearColor(0.5, 0.5, 0.5, 0);
		gl.enable(gl.BLEND);
		var tileBounds = this._tileCoordsToBounds(coords);
		var west = tileBounds.getWest(),
			east = tileBounds.getEast(),
			north = tileBounds.getNorth(),
			south = tileBounds.getSouth();

		// Create data array for LatLng buffer
		// prettier-ignore
		var latLngData = [
			// Vertex 0
			east, north,

			// Vertex 1
			west, north,

			// Vertex 2
			east, south,

			// Vertex 3
			west, south,
		];

		// ...upload them to the GPU...
		gl.bindBuffer(gl.ARRAY_BUFFER, this._LatLngBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(latLngData), gl.STATIC_DRAW);

		// ...also create data array for CRS buffer...
		// Kinda inefficient, but doesn't look performance-critical
		var crs = this._map.options.crs,
			min = crs.project(L.latLng(south, west)),
			max = crs.project(L.latLng(north, east));

		// prettier-ignore
		var crsData = [
			// Vertex 0
			max.x, max.y,

			// Vertex 1
			min.x, max.y,

			// Vertex 2
			max.x, min.y,

			// Vertex 3
			min.x, min.y,
		];

		// ...and also upload that to the GPU...
		gl.bindBuffer(gl.ARRAY_BUFFER, this._CRSBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(crsData), gl.STATIC_DRAW);


		// ...and also set the uTileCoords uniform for this tile
		gl.uniform3f(this._uTileCoordsPosition, coords.x, coords.y, coords.z);

		gl.uniform1f(this._uFlipPosition, -1);

		var frameBufferNumber = 0;

		for (let index = 0; index < this.kernelSettings.length; index++) {
			const kernel = this.kernelSettings[index];
			if(kernel.strength === 0) {
				continue;
			}
			gl.uniform1fv(this._currentKernel, kernels[kernel.name]);
			gl.uniform1f(this.kernelWeightLocation, this.computeKernelWeight(kernels[kernel.name]));
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[frameBufferNumber]);
			this.setUniform("uSharpenStrength", kernel.strength);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.bindTexture(gl.TEXTURE_2D, this.textures[frameBufferNumber]);
			frameBufferNumber++;
		}
	
		
		gl.uniform1f(this._uFlipPosition, 1);

		gl.uniform1fv(this._currentKernel, kernels["normal"]);
		gl.uniform1f(this.kernelWeightLocation, this.computeKernelWeight(kernels["normal"]));
 
		// clear the framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		
	},

	computeKernelWeight: function(kernel) {
		var weight = kernel.reduce(function(prev, curr) {
			return prev + curr;
		});
		return weight <= 0 ? 1 : weight;
	},

	_bindTexture: function(index, imageData) {
		// Helper function. Binds a ImageData (HTMLImageElement, HTMLCanvasElement or
		// ImageBitmap) to a texture, given its index (0 to 7).
		// The image data is assumed to be in RGBA format.
		var gl = this._gl;

		gl.activeTexture(gl.TEXTURE0 + index);
		gl.bindTexture(gl.TEXTURE_2D, this._textures[index]);
		if (imageData.width < this.options.tileSize || imageData.height < this.options.tileSize) {
			// Scale up the texture to the next highest power of two dimensions.
			var canvas = document.createElement("canvas");
			canvas.width = this.options.tileSize;
			canvas.height = this.options.tileSize;
			var ctx = canvas.getContext("2d");
			ctx.fillStyle = "rgba(0,0,0,0.0)";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(imageData, 0, 0, imageData.width, imageData.height);
			imageData = canvas;
		}
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageData);
		canvas = null;
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
		gl.generateMipmap(gl.TEXTURE_2D);
	},


isPowerOfTwo: function (x) {
    return (x & (x - 1)) == 0;
},

nextHighestPowerOfTwo: function(x) {
    --x;
    for (var i = 1; i < 32; i <<= 1) {
        x = x | x >> i;
    }
    return x + 1;
},

	// Gets called by L.GridLayer before createTile(), just before coord wrapping happens.
	// Needed to store the context of each <canvas> tile when the tile coords is wrapping.
	_addTile(coords, container) {
		// This is quite an ugly hack, but WTF.
		this._unwrappedKey = this._tileCoordsToKey(coords);
		L.GridLayer.prototype._addTile.call(this, coords, container);
	},
	//createTile Leaflet Documentation: https://leafletjs.com/reference-1.7.1.html#tilelayer-createtile
	createTile: function(coords, done) {
		if(coords.y < 0) {
			coords.y = 0;
		}

		var tile = L.DomUtil.create("canvas", "leaflet-tile");
		tile.width = tile.height = this.options.tileSize;
		tile.onselectstart = tile.onmousemove = L.Util.falseFn;
		
		var ctx = tile.getContext("2d");
		var unwrappedKey = this._unwrappedKey;
		var texFetches = [];
		for (var i = 0; i < this._tileLayers.length && i < 8; i++) {
			// 				this.options.tileUrls[i]
			texFetches.push(this._getNthTile(i, coords));
		}

		Promise.all(texFetches).then(
			function(textureImages) {
				if (!this._map) {
					return;
				}
				// If the shader is time-dependent (i.e. animated),
				// save the textures for later access
				if (this._isReRenderable) {
					var key = this._tileCoordsToKey(coords);
					this._fetchedTextures[key] = textureImages;
					this._2dContexts[unwrappedKey] = ctx;
				}

				var gl = this._gl;
				for (var i = 0; i < this._tileLayers.length && i < 8; i++) {
					this._bindTexture(i, textureImages[i]);
				}

				this._render(coords);
				ctx.drawImage(this._renderer, 0, 0);
				done();
			}.bind(this),
			function(err) {
				L.TileLayer.prototype._tileOnError.call(this, done, tile, err);
			}.bind(this)
		);
		tile.width = 255;
		tile.height = 255;
		tile.style.width = 256;
		tile.style.height = 256;
		return tile;
	},

	_initTile: function (tile) {
		L.GridLayer.prototype._initTile(tile);
		// DomUtil.addClass(tile, 'leaflet-tile');

		var tileSize = this.getTileSize();
		tile.style.width = tileSize.x + 1 + 'px';
		tile.style.height = tileSize.y + 1 + 'px';

		// tile.onselectstart = Util.falseFn;
		// tile.onmousemove = Util.falseFn;

		// // update opacity on tiles in IE7-8 because of filter inheritance problems
		// if (Browser.ielt9 && this.options.opacity < 1) {
		// 	DomUtil.setOpacity(tile, this.options.opacity);
		// }

		// // without this hack, tiles disappear after zoom on Chrome for Android
		// // https://github.com/Leaflet/Leaflet/issues/2078
		// if (Browser.android && !Browser.android23) {
		// 	tile.style.WebkitBackfaceVisibility = 'hidden';
		// }
	},

	// getTileSize: function() {
    //     // var map = this._map,
    //     //     tileSize = L.GridLayer.prototype.getTileSize.call(this),
    //     //     zoom = this._tileZoom + this.options.zoomOffset,
    //     //     zoomN = this.options.maxNativeZoom;

    //     // tileSize.x = tileSize.x + this.options.overlap; // with deepzoom, our tile size removes the overlap, but leaflet needs it.
    //     // tileSize.y = tileSize.y + this.options.overlap;
    //     // // increase tile size when overscaling
    //     // var outputSize= zoomN !== null && zoom > zoomN ?
    //     //     tileSize.divideBy(map.getZoomScale(zoomN, zoom)).round() :
    //     //     tileSize;

    //     return L.point([255, 255]);
    // },

	_removeTile: function(key) {
		if (this._isReRenderable) {
			delete this._fetchedTextures[key];
			delete this._2dContexts[key];
		}
		L.TileLayer.prototype._removeTile.call(this, key);
	},
	//onAdd Leaflet Documentation: https://leafletjs.com/reference-1.7.1.html#layer-onadd
	onAdd: function(map) {
		// If the shader is time-dependent (i.e. animated), start an animation loop.
		if (this._uNowPosition) {
			L.Util.cancelAnimFrame(this._animFrame);
			this._animFrame = L.Util.requestAnimFrame(this._onFrame, this);
		}
		
		L.TileLayer.prototype.onAdd.call(this);
	},
	//onRemove Leaflet Documentation: https://leafletjs.com/reference-1.7.1.html#layer-onremove
	onRemove: function(map) {
		// Stop the animation loop, if any.
		L.Util.cancelAnimFrame(this._animFrame);
		L.TileLayer.prototype.onRemove.call(this, map);
	},

	_onFrame: function() {
		if (this._uNowPosition && this._map) {
			this.reRender();
			this._animFrame = L.Util.requestAnimFrame(this._onFrame, this, false);
		}
	},

	// Runs the shader (again) on all tiles
	reRender: function() {
		if (!this._isReRenderable) {
			return;
		}
		var gl = this._gl;

		gl.uniform1f(this._uNowPosition, performance.now());

		for (var key in this._tiles) {
			var tile = this._tiles[key];
			var coords = this._keyToTileCoords(key);
			var wrappedKey = this._tileCoordsToKey(this._wrapCoords(coords));

			if (!tile.current || !tile.loaded || !this._fetchedTextures[wrappedKey]) {
				continue;
			}

			for (var i = 0; i < this._tileLayers.length && i < 8; i++) {
				this._bindTexture(i, this._fetchedTextures[wrappedKey][i]);
			}
			this._render(coords);

			this._2dContexts[key].drawImage(this._renderer, 0, 0);
		}
	},

	// Sets the value(s) for a uniform.
	setUniform(name, value) {
		switch (this._uniformSizes[name]) {
			case 0:
				this._gl.uniform1f(this._uniformLocations[name], value);
				break;
			case 1:
				this._gl.uniform1fv(this._uniformLocations[name], value);
				break;
			case 2:
				this._gl.uniform2fv(this._uniformLocations[name], value);
				break;
			case 3:
				this._gl.uniform3fv(this._uniformLocations[name], value);
				break;
			case 4:
				this._gl.uniform4fv(this._uniformLocations[name], value);
				break;
		}
	},
	
	setKernelsAndStrength(kernelArray) {
		this.kernelSettings = kernelArray;
		this.reRender();
	},

	getTileSize: function() {
        var map = this._map,
            tileSize = L.GridLayer.prototype.getTileSize.call(this),
            zoom = this._tileZoom + this.options.zoomOffset,
            zoomN = this.options.maxNativeZoom;

        tileSize.x = tileSize.x - 1; // with deepzoom, our tile size removes the overlap, but leaflet needs it.
        tileSize.y = tileSize.y - 1;
        // increase tile size when overscaling
        var outputSize= zoomN !== null && zoom > zoomN ?
            tileSize.divideBy(map.getZoomScale(zoomN, zoom)).round() :
            tileSize;

        return outputSize;
    },


	// Gets the tile for the Nth `TileLayer` in `this._tileLayers`,
	// for the given tile coords, returns a promise to the tile.
	_getNthTile: function(n, coords) {
		var layer = this._tileLayers[n];
		// Monkey-patch a few things, both for TileLayer and TileLayer.WMS
		layer._tileZoom = this._tileZoom;
		layer._map = this._map;
		layer._crs = this._map.options.crs;
		layer._globalTileRange = this._globalTileRange;
		return new Promise(
			function(resolve, reject) {
				var tile = document.createElement("img");
				tile.crossOrigin = "";
				tile.src = layer.getTileUrl(coords);
				L.DomEvent.on(tile, "load", resolve.bind(this, tile));
				L.DomEvent.on(tile, "error", reject.bind(this, tile));
			}.bind(this)
		);
	},
	  // Returns RBG data at a specified coordinate
	  getColor: function(latlng) {
		var size = this.getTileSize();
		var point = this._map.project(latlng, this._tileZoom).floor();
		var coords = point.unscaleBy(size).floor();
		var offset = point.subtract(coords.scaleBy(size));
		coords.z = this._tileZoom;
		var tile = this._tiles[this._tileCoordsToKey(coords)];
		if (!tile || !tile.loaded) return null;
		try {
		  var canvas = document.createElement("canvas");
		  canvas.width = 1;
		  canvas.height = 1;
		  var context = canvas.getContext('2d');
		  context.drawImage(tile.el, -offset.x, -offset.y, size.x, size.y);
		  return context.getImageData(0, 0, 1, 1).data;
		} catch (e) {
		  return null;
		}
	  },

	//Returns a 2x2 matrix of RGB data of the area spanned between two specified lat lngs
	//with a given height (collects half of height above and below coordinate)
	getColorMatrix: async function(firstLatLng, secondLatLng, areaHeight) {
		this.subAreaDataSets = []; //Array containing the raw data of sub areas (see comments about canvas dimensions below)
		
		// let canvas = document.createElement("canvas");
		let canvas = document.getElementById("ard-canvas")
		// if (areaHeight < 255) {
		// 	canvas.height = 255;
		// }
		// else {
		// 	canvas.height = 2*areaHeight
		// }
		canvas.height = 2*areaHeight + 255
		let ctx = canvas.getContext('2d');

		let size = this.getTileSize();

		let firstPoint = this._map.project(firstLatLng, this.options.maxNativeZoom).floor();
		let secondPoint = this._map.project(secondLatLng, this.options.maxNativeZoom).floor();

		let deltaX = secondPoint.x - firstPoint.x; //Total x distance between points
		let deltaY = secondPoint.y - firstPoint.y; //Total y distance between points
		let distance = (deltaX**2 + deltaY**2)**(1/2); //Use distance formula to find total distance between points

		let sizeError = true; //Assume canvas is too large
		let subAreaScalar = 1; //Divides length of canvas by scalar until canvas is acceptable size
		while (sizeError) {
			try {
				canvas.width = (distance / subAreaScalar) + 500; //Extra width probably unnecessary, helpful for visual testing
				// ctx.translate(0,areaHeight/2) //Expects error here; cannot translate if canvas is too large
				ctx.translate(0, areaHeight/2)

				//Code that fires if there is no error
				sizeError = false;
				break;
			} catch {
				subAreaScalar += 1;
				continue;
			}
		}
		
		//End rectangle will be broken up into n rectangles, where n = subAreaScalar

		let firstTileCoords = firstPoint.unscaleBy(size).floor(); //Find center coordinates of tile that first latlng exists in
		let tilesInPath = [firstTileCoords]; //Array containing the coordinates of tiles already found and pasted to the canvas
		firstTileCoords.z = this.options.maxNativeZoom;

		let angle = Math.atan(-deltaY/deltaX) //Find angle of main line with x-axis (y direction defined such that down is positive)
		let offset = firstPoint.subtract(firstTileCoords.scaleBy(size)); // Difference in x & y of center of first tile and first point
		
		//Built in function to get a rectangle of rgb data can't be a rotated rectangle, therefore the tiles are rotated so rect can be parallel to canvas
		ctx.translate(offset.x, offset.y); //Move canvas context to start point
		ctx.rotate(angle); //Rotate about the start point
		ctx.translate(-(offset.x), -(offset.y)); //Undo translation
		
		let dx = deltaX/distance; //distance to travel in x direction to move 1 point along main line
		let dy = deltaY/distance;//distance to travel in y direction to move 1 point along main line

		//Find start coordinate of line following bottom of collection area
		let upperLineStartPoint = {
			x: firstPoint.x - (areaHeight / 2) * Math.cos((Math.PI / 2) - angle),
			y: firstPoint.y - (areaHeight / 2) * Math.sin((Math.PI / 2) - angle)
		}

		//Find start coordinate of line following bottom of collection area
		let lowerLineStartPoint = {
			x: firstPoint.x + (areaHeight / 2) * Math.cos((Math.PI / 2) - angle),
			y: firstPoint.y + (areaHeight / 2) * Math.sin((Math.PI / 2) - angle)
		}

		//The algorithm relies on event listeners to detect when a leaflet tile loads
		//Group necessary values into an object to use in a recursive function
		//The function moves along the center, top, and bottom of collection area to find all necessary tiles
		//Then uses built in canvas function to find RGB over an area
		let collectionParametersObject = {
			canvas: canvas, //html canvas element 
			ctx: ctx, //canvas context
			startScalar: 0, //see function below
			endScalar: Math.floor( distance / subAreaScalar), //see function below
			distance: distance, //Length of line between two specified latlngs
			dx: dx, //Change in x to move a single point along the line
			dy: dy, //Change in y to move a single point along the line
			firstPoint: firstPoint, //Starting point
			upperLineStartPoint: upperLineStartPoint, //Start point of upper line
			lowerLineStartPoint: lowerLineStartPoint, //Start point of lower line
			size: size, //Dimensions of an individual tile
			tilesInPath: tilesInPath, //Array containing all tiles already pasted to canvas
			firstTileCoords: firstTileCoords, //Coordinates of starting tile
			offset: offset, //Difference between first point coordinates and first tile coordinates
			angle: angle, //angle between line and horizontal
			areaHeight: areaHeight, //Height of rectangular area in which RGB data will be collected
			subAreaScalar: subAreaScalar, //Number of subdivisions of main collection area
			subAreaIndex: 1 //Index of sub area currently being collected
		}
		// ctx.filter = "contrast(2.15)"
		// ctx.filter = "brightness(1.1) contrast(1.05)"
		this._map.setZoom(this.options.maxNativeZoom, {animate: false});
		this._map.flyTo(firstLatLng, this.options.maxNativeZoom, {animate: false})


		let placeTiles = function(t) {
			const promise = new Promise((resolve) => {
				t.collectColorData(collectionParametersObject, function (result) {resolve(result)})
			})
			return promise;
		}

		let colorMatrix = await placeTiles(this)
		return colorMatrix
	},

	collectColorData: function(cpo, resolveCallback) { //collection parameters object
		this.addEventListener("load", function doThing() {
			this.removeEventListener("load", doThing);
			//Based on vector formula of a line: L= <xo, yo> + t<vx, vy>
			//t scales the vector following the line from the first latlng to the second
			for (let t = cpo.startScalar; t < cpo.endScalar; t++) {
				//Follow center line
				let centerLineX = cpo.firstPoint.x + t*cpo.dx;
				let centerLineY = cpo.firstPoint.y + t*cpo.dy;

				let point = L.point(centerLineX, centerLineY);
				let coords = point.unscaleBy(cpo.size).floor();
				if (!cpo.tilesInPath.includes(coords)) {
					cpo.tilesInPath.push(coords);
					coords.z = this.options.maxNativeZoom;
					let tile = this._tiles[this._tileCoordsToKey(coords)];

					if (!tile || tile.loading) {
						// this.removeEventListener("load", doThing);
						let latLng = this._map.unproject(point, this.options.maxNativeZoom);
						this._map.flyTo(latLng, this.options.maxNativeZoom, {animate: false});

						cpo.startScalar = t;
						this.collectColorData(cpo, resolveCallback);
						return;
					}
					
					let tileX = (coords.x - cpo.firstTileCoords.x) * 255;
					let tileY = (coords.y - cpo.firstTileCoords.y) * 255;
					cpo.ctx.drawImage(tile.el, tileX, tileY)
				}

				//Follow top line
				let upperLineX = cpo.upperLineStartPoint.x + t*cpo.dx;
				let upperLineY = cpo.upperLineStartPoint.y + t*cpo.dy;

				point = L.point(upperLineX, upperLineY);
				coords = point.unscaleBy(cpo.size).floor();
				if (!cpo.tilesInPath.includes(coords)) {
					cpo.tilesInPath.push(coords);
					coords.z = this.options.maxNativeZoom;
					let tile = this._tiles[this._tileCoordsToKey(coords)];

					if (!tile || tile.loading) {
						// this.removeEventListener("load");
						let latLng = this._map.unproject(point, this.options.maxNativeZoom);
						this._map.flyTo(latLng, this.options.maxNativeZoom, {animate: false});

						cpo.startScalar = t;
						this.collectColorData(cpo, resolveCallback);
						return;
					}
					
					let tileX = (coords.x - cpo.firstTileCoords.x) * 255;
					let tileY = (coords.y - cpo.firstTileCoords.y) * 255;
					cpo.ctx.drawImage(tile.el, tileX, tileY)
				}

				//Follow bottom line
				let lowerLineX = cpo.lowerLineStartPoint.x + t*cpo.dx;
				let lowerLineY = cpo.lowerLineStartPoint.y + t*cpo.dy;

				point = L.point(lowerLineX, lowerLineY);
				coords = point.unscaleBy(cpo.size).floor();
				if (!cpo.tilesInPath.includes(coords)) {
					cpo.tilesInPath.push(coords);
					coords.z = this.options.maxNativeZoom;
					let tile = this._tiles[this._tileCoordsToKey(coords)];

					if (!tile || tile.loading) {
						// this.removeEventListener("load");
						let latLng = this._map.unproject(point, this.options.maxNativeZoom);
						this._map.flyTo(latLng, this.options.maxNativeZoom, {animate: false});

						cpo.startScalar = t;
						this.collectColorData(cpo, resolveCallback);
						return;
					}
					
					let tileX = (coords.x - cpo.firstTileCoords.x) * 255;
					let tileY = (coords.y - cpo.firstTileCoords.y) * 255;
					cpo.ctx.drawImage(tile.el, tileX, tileY)
				}
			}
			//For loop finishes, sub area is on canvas
			this.removeEventListener("load");
			//Undo rotate so image data rectangle is parallel to canvas (screen)
			cpo.ctx.translate(cpo.offset.x, cpo.offset.y);
			cpo.ctx.rotate(-cpo.angle);
			cpo.ctx.translate(-cpo.offset.x, -cpo.offset.y);

			//Take image data over area 1/2 height above and below starting point, length of distance between points
			//length is smaller if area broken up into smaller parts
			let subAreaImageData = cpo.ctx.getImageData(cpo.offset.x, cpo.offset.y, cpo.endScalar, cpo.areaHeight);
			this.subAreaDataSets.push(subAreaImageData)

			cpo.ctx.beginPath();
			cpo.ctx.rect(cpo.offset.x, cpo.offset.y - (cpo.areaHeight / 2), cpo.endScalar, cpo.areaHeight)
			cpo.ctx.stroke()

			//Check if there are more sub areas to collect data from
			if (cpo.subAreaIndex < cpo.subAreaScalar) {
				//find new starting point (1 point after prev area ended)
				let firstPoint = L.point(cpo.firstPoint.x + cpo.endScalar * cpo.dx, cpo.firstPoint.y + cpo.endScalar * cpo.dy);
				let firstTileCoords = firstPoint.unscaleBy(cpo.size).floor();
				firstTileCoords.z = this.options.maxNativeZoom;

				let offset = firstPoint.subtract(firstTileCoords.scaleBy(cpo.size));
				cpo.ctx.translate(cpo.offset.x, cpo.offset.y);
				cpo.ctx.rotate(cpo.angle);
				cpo.ctx.translate(-cpo.offset.x, -cpo.offset.y);

				let upperLineStartPoint = {
					x: firstPoint.x - (cpo.areaHeight / 2) * Math.cos((Math.PI / 2) - cpo.angle),
					y: firstPoint.y - (cpo.areaHeight / 2) * Math.sin((Math.PI / 2) - cpo.angle)
				}

				
				let lowerLineStartPoint = {
					x: firstPoint.x + (cpo.areaHeight / 2) * Math.cos((Math.PI / 2) - cpo.angle),
					y: firstPoint.y + (cpo.areaHeight / 2) * Math.sin((Math.PI / 2) - cpo.angle)
				}

				let collectionParametersObject = {
					canvas: cpo.canvas,
					ctx: cpo.ctx,
					startScalar: 0,
					endScalar: Math.floor(cpo.distance / cpo.subAreaScalar),
					distance: cpo.distance,
					dx: cpo.dx,
					dy: cpo.dy,
					firstPoint: firstPoint,
					upperLineStartPoint: upperLineStartPoint,
					lowerLineStartPoint: lowerLineStartPoint,
					size: cpo.size,
					tilesInPath: [],
					firstTileCoords: firstTileCoords,
					offset: offset,
					angle: cpo.angle,
					areaHeight: cpo.areaHeight,
					subAreaScalar: cpo.subAreaScalar,
					subAreaIndex: cpo.subAreaIndex + 1
				}
				this.collectColorData(collectionParametersObject, resolveCallback);
			}
			//After all data is collected, transform raw data into a 2 dimenstional matrix
			// else { this.organizeIntoMatrix() }
			else { 
				let result = this.organizeIntoMatrix()
				resolveCallback(result)
			}
		})
	},

	organizeIntoMatrix: function() {
		let r,g,b;
		let width = this.subAreaDataSets[0].width;
		let height = this.subAreaDataSets[0].height;
		let out = [];

		for (subAreaData of this.subAreaDataSets) {
			let index = 0;
			let data = subAreaData.data;
			for (let row = 0; row < height; row++) {
				if (!out[row]) { out[row] = []};
				for (let col = 0; col < width; col++) {
					r = data[index];
					g = data[index + 1];
					b = data[index + 2];
					index += 4;
					out[row].push([r,b,g])
				}
			}
		}
		return out
	}
});

L.tileLayer.gl = function(opts) {
	return new L.TileLayer.GL(opts);
};

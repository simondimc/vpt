// #package js/main

// #include math
// #include WebGL.js
// #include Ticker.js
// #include Camera.js
// #include OrbitCameraController.js
// #include Volume.js
// #include renderers
// #include tonemappers

class RenderingContext {

constructor(options) {
    this._render = this._render.bind(this);
    this._webglcontextlostHandler = this._webglcontextlostHandler.bind(this);
    this._webglcontextrestoredHandler = this._webglcontextrestoredHandler.bind(this);

    Object.assign(this, {
        _resolution : 512,
        _filter     : 'linear'
    }, options);

    this._canvas = document.createElement('canvas');
    this._canvas.addEventListener('webglcontextlost', this._webglcontextlostHandler);
    this._canvas.addEventListener('webglcontextrestored', this._webglcontextrestoredHandler);

    this._initGL();

    this._camera = new Camera();
    this._camera.position.z = 1.5;
    this._camera.fovX = 0.3;
    this._camera.fovY = 0.3;
    this._camera.updateMatrices();

    this._cameraController = new OrbitCameraController(this._camera, this._canvas);

    this._volume = new Volume(this._gl);
    this._scale = new Vector(1, 1, 1);
    this._translation = new Vector(0, 0, 0);
    this._isTransformationDirty = true;
    this._updateMvpInverseMatrix();

    this._isTemporalRendering = false;
    this._temporalPlayer = null;
    this._temporalPlayerIsPlaying = false;
    this._temporalPlayerFrame = 0;
    this._temporalPlayerFps = 10;

    this._playerStop = this._playerStop.bind(this);
    this._playerPlay = this._playerPlay.bind(this);
    this._playerPause = this._playerPause.bind(this);
    this._playerPrevFrame = this._playerPrevFrame.bind(this);
    this._playerNextFrame = this._playerNextFrame.bind(this);
    this._playerFpsChange = this._playerFpsChange.bind(this);
    this._playerFrameChange = this._playerFrameChange.bind(this);
}

// ============================ WEBGL SUBSYSTEM ============================ //

_initGL() {
    const contextSettings = {
        alpha                 : false,
        depth                 : false,
        stencil               : false,
        antialias             : false,
        preserveDrawingBuffer : true,
    };

    this._contextRestorable = true;

    this._gl = this._canvas.getContext('webgl2-compute', contextSettings);
    if (this._gl) {
        this._hasCompute = true;
    } else {
        this._hasCompute = false;
        this._gl = this._canvas.getContext('webgl2', contextSettings);
    }
    const gl = this._gl;
    this._extLoseContext = gl.getExtension('WEBGL_lose_context');
    this._extColorBufferFloat = gl.getExtension('EXT_color_buffer_float');

    if (!this._extColorBufferFloat) {
        console.error('EXT_color_buffer_float not supported!');
    }

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    this._environmentTexture = WebGL.createTexture(gl, {
        width          : 1,
        height         : 1,
        data           : new Uint8Array([255, 255, 255, 255]),
        format         : gl.RGBA,
        internalFormat : gl.RGBA, // TODO: HDRI & OpenEXR support
        type           : gl.UNSIGNED_BYTE,
        wrapS          : gl.CLAMP_TO_EDGE,
        wrapT          : gl.CLAMP_TO_EDGE,
        min            : gl.LINEAR,
        max            : gl.LINEAR
    });

    this._program = WebGL.buildPrograms(gl, {
        quad: SHADERS.quad
    }, MIXINS).quad;

    this._clipQuad = WebGL.createClipQuad(gl);
}

_webglcontextlostHandler(e) {
    if (this._contextRestorable) {
        e.preventDefault();
    }
}

_webglcontextrestoredHandler(e) {
    this._initGL();
}

resize(width, height) {
    this._canvas.width = width;
    this._canvas.height = height;
    this._camera.resize(width, height);
}

setVolume(reader) {
    this._volume = new Volume(this._gl, reader);

    if (reader instanceof TemporalRAWReader) {
        this._temporalRenderFirstFrame()
    } else {
        this._volume.readMetadata({
            onData: () => {
                this._volume.readModality('default', {
                    onLoad: () => {
                        this._volume.setFilter(this._filter);
                        if (this._renderer) {
                            this._renderer.setVolume(this._volume);
                            this.startRendering();
                        }
                    }
                });
            }
        });
    }
}

setEnvironmentMap(image) {
    WebGL.createTexture(this._gl, {
        texture : this._environmentTexture,
        image   : image
    });
}

setFilter(filter) {
    this._filter = filter;
    if (this._volume) {
        this._volume.setFilter(filter);
        if (this._renderer) {
            this._renderer.reset();
        }
    }
}

chooseRenderer(renderer) {
    if (this._renderer) {
        this._renderer.destroy();
    }
    const rendererClass = this._getRendererClass(renderer);
    this._renderer = new rendererClass(this._gl, this._volume, this._environmentTexture);
    if (this._toneMapper) {
        this._toneMapper.setTexture(this._renderer.getTexture());
    }
    this._isTransformationDirty = true;
}

chooseToneMapper(toneMapper) {
    if (this._toneMapper) {
        this._toneMapper.destroy();
    }
    const gl = this._gl;
    let texture;
    if (this._renderer) {
        texture = this._renderer.getTexture();
    } else {
        texture = WebGL.createTexture(gl, {
            width  : 1,
            height : 1,
            data   : new Uint8Array([255, 255, 255, 255]),
        });
    }
    const toneMapperClass = this._getToneMapperClass(toneMapper);
    this._toneMapper = new toneMapperClass(gl, texture);
}

getCanvas() {
    return this._canvas;
}

getRenderer() {
    return this._renderer;
}

getToneMapper() {
    return this._toneMapper;
}

_updateMvpInverseMatrix() {
    if (!this._camera.isDirty && !this._isTransformationDirty) {
        return;
    }

    this._camera.isDirty = false;
    this._isTransformationDirty = false;
    this._camera.updateMatrices();

    const centerTranslation = new Matrix().fromTranslation(-0.5, -0.5, -0.5);
    const volumeTranslation = new Matrix().fromTranslation(
        this._translation.x, this._translation.y, this._translation.z);
    const volumeScale = new Matrix().fromScale(this._scale.x, this._scale.y, this._scale.z);

    const tr = new Matrix();
    tr.multiply(volumeScale, centerTranslation);
    tr.multiply(volumeTranslation, tr);
    tr.multiply(this._camera.transformationMatrix, tr);

    tr.inverse().transpose();
    if (this._renderer) {
        this._renderer.setMvpInverseMatrix(tr);
        this._renderer.reset();
    }
}

_render() {
    const gl = this._gl;
    if (!gl || !this._renderer || !this._toneMapper) {
        return;
    }

    if (!this._isTemporalRendering) {
        this._updateMvpInverseMatrix();
    }

    this._renderer.render();
    this._toneMapper.render();

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    const program = this._program;
    gl.useProgram(program.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._clipQuad);
    const aPosition = program.attributes.aPosition;
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._toneMapper.getTexture());
    gl.uniform1i(program.uniforms.uTexture, 0);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    gl.disableVertexAttribArray(aPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

getScale() {
    return this._scale;
}

setScale(x, y, z) {
    this._scale.set(x, y, z);
    this._isTransformationDirty = true;
}

getTranslation() {
    return this._translation;
}

setTranslation(x, y, z) {
    this._translation.set(x, y, z);
    this._isTransformationDirty = true;
}

getResolution() {
    return this._resolution;
}

setResolution(resolution) {
    if (this._renderer) {
        this._renderer.setResolution(resolution);
    }
    if (this._toneMapper) {
        this._toneMapper.setResolution(resolution);
        if (this._renderer) {
            this._toneMapper.setTexture(this._renderer.getTexture());
        }
    }
}

startRendering() {
    Ticker.add(this._render);
}

stopRendering() {
    Ticker.remove(this._render);
}

hasComputeCapabilities() {
    return this._hasCompute;
}

_getRendererClass(renderer) {
    switch (renderer) {
        case 'mip' : return MIPRenderer;
        case 'iso' : return ISORenderer;
        case 'eam' : return EAMRenderer;
        case 'mcs' : return MCSRenderer;
        case 'mcm' : return MCMRenderer;
        case 'mcc' : return MCCRenderer;
    }
}

_getToneMapperClass(toneMapper) {
    switch (toneMapper) {
        case 'range'    : return RangeToneMapper;
        case 'reinhard' : return ReinhardToneMapper;
        case 'artistic' : return ArtisticToneMapper;
    }
}

_temporalRenderFirstFrame() {
    this.stopRendering();
    this._volume.readFrameMetadata(0, {
        onData: () => {
            this._volume.readModality('default', {
                onLoad: () => {
                    this._volume.setFilter(this._filter);
                    if (this._renderer) {
                        this._renderer.setVolume(this._volume);
                        this.startRendering();
                    }
                }
            });
        }
    });
}

temporalSetupAndStartRendering({type, value, progressBarRef, player}) {
    this._temporalImages = []
    this._isTemporalRendering = true;
    this._temporalPlayerFps = player.getFps();
    this._temporalPlayer = player;
    this._temporalPlayer.setMaxValue(this._volume._reader.frames);

    this._temporalPlayer.addEventListener('stop', this._playerStop);
    this._temporalPlayer.addEventListener('play', this._playerPlay);
    this._temporalPlayer.addEventListener('pause', this._playerPause);
    this._temporalPlayer.addEventListener('prevFrame', this._playerPrevFrame);
    this._temporalPlayer.addEventListener('nextFrame', this._playerNextFrame);
    this._temporalPlayer.addEventListener('fpsChange', this._playerFpsChange);
    this._temporalPlayer.addEventListener('frameChange', this._playerFrameChange);

    if (type == "fixederror") {
        
    } else {
        this._renderFrameFixedTime(0, this._volume._reader.frames, value * 1000, progressBarRef)
    }
}

temporalStopRendering() {
    this._isTemporalRendering = false;
    this._temporalPlayerIsPlaying = false;
    this._temporalPlayerFrame = 0;
    this._temporalRenderFirstFrame();

    if (this._temporalPlayer) {
        this._temporalPlayer.setFrame(1);

        this._temporalPlayer.setEnabled(false);

        this._temporalPlayer.removeEventListener('stop', this._playerStop);
        this._temporalPlayer.removeEventListener('play', this._playerPlay);
        this._temporalPlayer.removeEventListener('pause', this._playerPause);
        this._temporalPlayer.removeEventListener('prevFrame', this._playerPrevFrame);
        this._temporalPlayer.removeEventListener('nextFrame', this._playerNextFrame);
        this._temporalPlayer.removeEventListener('fpsChange', this._playerFpsChange);
        this._temporalPlayer.removeEventListener('frameChange', this._playerFrameChange);
    }
}

_playerStop() {
    console.log("stop inside rendering context")
    this._temporalPlayerIsPlaying = false;
    this._temporalPlayer.setFrame(1);
    this._temporalPlayerFrame = 0;
}

_playerPlay() {
    console.log("play inside rendering context")
    if (this._temporalPlayerIsPlaying == false) {
        this._playTemporalImages();
    }
}

_playerPause() {
    console.log("pause inside rendering context")
    this._temporalPlayerIsPlaying = false;
}

_playerPrevFrame() {
    console.log("prevFrame inside rendering context")
    if (this._temporalPlayerIsPlaying == false) {
        this._drawTemporalImage(this._temporalPlayerFrame - 1, this._volume._reader.frames)
    }
}

_playerNextFrame() {
    console.log("nextFrame inside rendering context")
    if (this._temporalPlayerIsPlaying == false) {
        this._drawTemporalImage(this._temporalPlayerFrame + 1, this._volume._reader.frames)
    }
}

_playerFpsChange(e) {
    console.log("fpsChange inside rendering context")
    this._temporalPlayerFps = e.detail.fps;
}

_playerFrameChange(e) {
    if (this._temporalPlayerIsPlaying == false && this._temporalPlayerFrame != e.detail.frame) {
        console.log("frameChange inside rendering context", this._temporalPlayerFrame, e.detail.frame)
        this._drawTemporalImage(e.detail.frame, this._volume._reader.frames)
    }
}

_renderFrameFixedTime(frame, maxFrames, time, progressBarRef) {
    if (this._isTemporalRendering == false) {
        progressBarRef.setProgress(0);
        return;
    }

    if (frame >= maxFrames) {
        this._temporalPlayer.play();
        return;
    }

    this.stopRendering();

    this._volume.readFrameMetadata(frame, {
        onData: () => {
            this._volume.readModality('default', {
                onLoad: () => {
                    this._volume.setFilter(this._filter);
                    if (this._renderer) {
                        this._renderer.setVolume(this._volume);
                        this.startRendering();
                    }
                }
            });
        }
    });

    let that = this;
    setTimeout(function () {
        console.log("render", frame)

        let width = that._gl.drawingBufferWidth;
        let height = that._gl.drawingBufferHeight;

        let pixels = new Uint8Array(width * height * 4);
        that._gl.readPixels(0, 0, width, height, that._gl.RGBA, that._gl.UNSIGNED_BYTE, pixels);

        let image = {
            width: width,
            height: height,
            pixels: pixels
        }

        that._temporalImages.push(image);

        progressBarRef.setProgress(((frame + 1) / maxFrames) * 100);

        that._renderFrameFixedTime(frame + 1, maxFrames, time, progressBarRef);
    }, time)
}

_playTemporalImages() {
    this.stopRendering();

    this._temporalPlayerIsPlaying = true;
    this._temporalPlayer.setEnabled(true);

    this._drawTemporalImages(this._temporalPlayerFrame, this._volume._reader.frames)
}

_drawTemporalImages(frame, maxFrames) {
    if (this._isTemporalRendering == false || this._temporalPlayerIsPlaying == false) {
        return;
    }

    if (frame >= maxFrames) {
        frame = 0;
    }

    this._temporalPlayerFrame = frame;

    console.log("play", frame)

    this._temporalPlayer.setFrame(frame + 1);

    let image = this._temporalImages[frame];

    this._renderTemporalFrame(image);

    let that = this;
    setTimeout(function() {
        requestAnimationFrame(function() {
            that._drawTemporalImages(frame + 1, maxFrames)
        });
    }, (1 / this._temporalPlayerFps) * 1000);
}

_drawTemporalImage(frame, maxFrames) {
    if (frame >= maxFrames) {
        frame = 0;
    }

    if (frame < 0) {
        frame = maxFrames - 1;
    }

    this._temporalPlayerFrame = frame;

    console.log("play", frame)

    this._temporalPlayer.setFrame(frame + 1);

    let image = this._temporalImages[frame];

    this._renderTemporalFrame(image);
}

_renderTemporalFrame(image) {
    const gl = this._gl;
    if (!gl) {
        return;
    }

    let frameTexture = WebGL.createTexture(gl, {
        width          : image.width,
        height         : image.height,
        data           : image.pixels,
        format         : gl.RGBA,
        internalFormat : gl.RGBA,
        type           : gl.UNSIGNED_BYTE,
        wrapS          : gl.CLAMP_TO_EDGE,
        wrapT          : gl.CLAMP_TO_EDGE,
        min            : gl.LINEAR,
        max            : gl.LINEAR
    });

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    const program = this._program;
    gl.useProgram(program.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._clipQuad);
    const aPosition = program.attributes.aPosition;
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, frameTexture);
    gl.uniform1i(program.uniforms.uTexture, 0);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    gl.disableVertexAttribArray(aPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
}


}

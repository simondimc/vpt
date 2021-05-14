// #package js/main

// #include UIObject.js

class FramePlayer extends UIObject {

constructor(options) {
    super(TEMPLATES.FramePlayer, options);

    Object.assign(this, {
        frame       : 1,
        min         : 1,
        max         : 10,
        fps         : 10
    }, options);

    this._handleSliderMouseDown = this._handleSliderMouseDown.bind(this);
    this._handleSliderMouseUp   = this._handleSliderMouseUp.bind(this);
    this._handleSliderMouseMove = this._handleSliderMouseMove.bind(this);
    this._handleSliderWheel     = this._handleSliderWheel.bind(this);

    this._updateSliderUI();

    this._handleFrameInput = this._handleFrameInput.bind(this);
    this._handleFrameChange = this._handleFrameChange.bind(this);

    let input = this._binds.frameNumber;
    if (this.frame !== null) {
        input.value = this.frame;
    }
    if (this.min !== null) {
        input.min = this.min;
    }
    if (this.max !== null) {
        input.max = this.max;
    }
    input.step = 1;

    this._updateSpinerUI();

    this._stop = this.stop.bind(this);
    this._play = this.play.bind(this);
    this._pause = this.pause.bind(this);
    this._prevFrame = this.prevFrame.bind(this);
    this._nextFrame = this.nextFrame.bind(this);

    this._binds.stop.addEventListener('click', this._stop);
    this._binds.play.addEventListener('click', this._play);
    this._binds.pause.addEventListener('click', this._pause);
    this._binds.prevFrame.addEventListener('click', this._prevFrame);
    this._binds.nextFrame.addEventListener('click', this._nextFrame);

    this._binds.fps.value = this.fps;

    this._handleFpsInput = this._handleFpsInput.bind(this);
    this._handleFpsChange = this._handleFpsChange.bind(this);

    this.setEnabled(false);
}

setFrame(value) {
    if (this.frame != value) {
        this.frame = Math.round(CommonUtils.clamp(value, this.min, this.max));
        this._updateSliderUI();
        this._updateSpinerUI();
        this.trigger('frameChange', {
            frame: this.frame - 1
        });
    }
}

setFps(value) {
    if (this.fps != value) {
        this.fps = Math.round(CommonUtils.clamp(value, 1, 60));
        this.trigger('fpsChange', {
            fps: this.fps
        });
    }
}

setMaxValue(value) {
    this.max = value;
    this._binds.frameNumber.max = value;
}

_updateSliderUI() {
    const ratio = (this.frame - this.min) / (this.max - this.min) * 100;
    this._binds.sliderButton.style.marginLeft = ratio + '%';
}

_updateSpinerUI() {
    this._binds.frameNumber.value = this.frame;
}

getFrame() {
    return this.frame;
}

getFps() {
    return this.fps;
}

_setSliderValueByEvent(e) {
    const rect = this._binds.sliderContainer.getBoundingClientRect();
    const ratio = (e.pageX - rect.left) / (rect.right - rect.left);
    const value = this.min + ratio * (this.max - this.min);
    this.setFrame(value);
}

_handleSliderMouseDown(e) {
    document.addEventListener('mouseup', this._handleSliderMouseUp);
    document.addEventListener('mousemove', this._handleSliderMouseMove);
    this._setSliderValueByEvent(e);
}

_handleSliderMouseUp(e) {
    document.removeEventListener('mouseup', this._handleSliderMouseUp);
    document.removeEventListener('mousemove', this._handleSliderMouseMove);
    this._setSliderValueByEvent(e);
}

_handleSliderMouseMove(e) {
    this._setSliderValueByEvent(e);
}

_handleSliderWheel(e) {
    let wheel = e.deltaY;
    if (wheel < 0) {
        wheel = 1;
    } else if (wheel > 0) {
        wheel = -1;
    } else {
        wheel = 0;
    }

    const delta = wheel;
    this.setFrame(this.frame + delta);
}

_handleFrameInput(e) {
    e.stopPropagation();

    const parsedValue = parseFloat(this._binds.frameNumber.value);
    if (!isNaN(parsedValue)) {
        this.setFrame(parsedValue);
    } else {
        this._binds.frameNumber.value = this.frame;
    }
}

_handleFrameChange(e) {
    e.stopPropagation();

    const parsedValue = parseFloat(this._binds.frameNumber.value);
    if (!isNaN(parsedValue)) {
        this.setFrame(parsedValue);
    } else {
        this._binds.frameNumber.value = this.frame;
    }
}

_handleFpsInput(e) {
    e.stopPropagation();

    const parsedValue = parseFloat(this._binds.fps.value);
    if (!isNaN(parsedValue)) {
        this.setFps(parsedValue);
    } else {
        this._binds.fps.value = this.frame;
    }
}

_handleFpsChange(e) {
    e.stopPropagation();

    const parsedValue = parseFloat(this._binds.fps.value);
    if (!isNaN(parsedValue)) {
        this.setFps(parsedValue);
    } else {
        this._binds.fps.value = this.frame;
    }
}

play() {
    this._binds.frameSlider.removeEventListener('mousedown', this._handleSliderMouseDown);
    this._binds.frameSlider.removeEventListener('wheel', this._handleSliderWheel);
    this._binds.frameNumber.removeEventListener('input', this._handleFrameInput);
    this._binds.frameNumber.removeEventListener('change', this._handleFrameChange);
    this._binds.frameNumber.readOnly = true;
    this.trigger('play');
}

stop() {
    this._binds.frameSlider.addEventListener('mousedown', this._handleSliderMouseDown);
    this._binds.frameSlider.addEventListener('wheel', this._handleSliderWheel);
    this._binds.frameNumber.addEventListener('input', this._handleFrameInput);
    this._binds.frameNumber.addEventListener('change', this._handleFrameChange);
    this._binds.frameNumber.readOnly = false;
    this.trigger('stop');
}

pause() {
    this._binds.frameSlider.addEventListener('mousedown', this._handleSliderMouseDown);
    this._binds.frameSlider.addEventListener('wheel', this._handleSliderWheel);
    this._binds.frameNumber.addEventListener('input', this._handleFrameInput);
    this._binds.frameNumber.addEventListener('change', this._handleFrameChange);
    this._binds.frameNumber.readOnly = false;
    this.trigger('pause');
}

prevFrame() {
    this.trigger('prevFrame');
}

nextFrame() {
    this.trigger('nextFrame');
}

setEnabled(enabled) {
    this._binds.stop.disabled = !enabled;
    this._binds.play.disabled = !enabled;
    this._binds.pause.disabled = !enabled;
    this._binds.prevFrame.disabled = !enabled;
    this._binds.nextFrame.disabled = !enabled;

    this._binds.frameNumber.readOnly = !enabled;
    this._binds.fps.readOnly = !enabled;

    if (enabled) {
        this._binds.frameSlider.addEventListener('mousedown', this._handleSliderMouseDown);
        this._binds.frameSlider.addEventListener('wheel', this._handleSliderWheel);
        this._binds.frameNumber.addEventListener('input', this._handleFrameInput);
        this._binds.frameNumber.addEventListener('change', this._handleFrameChange);
        this._binds.fps.addEventListener('input', this._handleFpsInput);
        this._binds.fps.addEventListener('change', this._handleFpsChange);
    } else {
        this._binds.frameSlider.removeEventListener('mousedown', this._handleSliderMouseDown);
        this._binds.frameSlider.removeEventListener('wheel', this._handleSliderWheel);
        this._binds.frameNumber.removeEventListener('input', this._handleFrameInput);
        this._binds.frameNumber.removeEventListener('change', this._handleFrameChange);
        this._binds.fps.removeEventListener('input', this._handleFpsInput);
        this._binds.fps.removeEventListener('change', this._handleFpsChange);
    }

    super.setEnabled(enabled);
}
    
}

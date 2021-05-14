// #package js/main

// #include ../utils
// #include AbstractDialog.js

// #include ../../uispecs/MainDialog.json
// #include ../../html/AboutText.html

class MainDialog extends AbstractDialog {

constructor(options) {
    super(UISPECS.MainDialog, options);

    this._handleRendererChange = this._handleRendererChange.bind(this);
    this._handleToneMapperChange = this._handleToneMapperChange.bind(this);
    this._handleStartTemporalRenderingClick = this._handleStartTemporalRenderingClick.bind(this);
    this._handleStopTemporalRenderingClick = this._handleStopTemporalRenderingClick.bind(this);

    this._binds.sidebar.appendTo(document.body);
    this._binds.rendererSelect.addEventListener('change', this._handleRendererChange);
    this._binds.toneMapperSelect.addEventListener('change', this._handleToneMapperChange);

    this._binds.startTemporalRendering.addEventListener('click', this._handleStartTemporalRenderingClick);
    this._binds.stopTemporalRendering.addEventListener('click', this._handleStopTemporalRenderingClick);

    const about = DOMUtils.instantiate(TEMPLATES.AboutText);
    this._binds.about._element.appendChild(about);
}

getVolumeLoadContainer() {
    return this._binds.volumeLoadContainer;
}

getTemporalVolumeLoadContainer() {
    return this._binds.temporalVolumeLoadContainer;
}

getEnvmapLoadContainer() {
    return this._binds.envmapLoadContainer;
}

getRendererSettingsContainer() {
    return this._binds.rendererSettingsContainer;
}

getToneMapperSettingsContainer() {
    return this._binds.toneMapperSettingsContainer;
}

getRenderingContextSettingsContainer() {
    return this._binds.renderingContextSettingsContainer;
}

getSelectedRenderer() {
    return this._binds.rendererSelect.getValue();
}

getSelectedToneMapper() {
    return this._binds.toneMapperSelect.getValue();
}

_handleRendererChange() {
    const renderer = this._binds.rendererSelect.getValue();
    this.trigger('rendererchange', renderer);
}

_handleToneMapperChange() {
    const toneMapper = this._binds.toneMapperSelect.getValue();
    this.trigger('tonemapperchange', toneMapper);
}

disableMCC() {
    this._binds.rendererSelect.removeOption('mcc');
}

_handleStartTemporalRenderingClick() {
    this.trigger('startTemporalRenderingClick', {
        type: this._binds.temporalRendererSelect.getValue(),
        value: this._binds.temporalRendererValue.getValue(),
        progressBarRef: this._binds.temporalRenderingProgressBar,
        player: this._binds.temporalRenderingPlayer
    });
    this._binds.startTemporalRendering.setEnabled(false);
}

_handleStopTemporalRenderingClick() {
    this.trigger('stopTemporalRenderingClick', {});
    this._binds.startTemporalRendering.setEnabled(true);
    this._binds.temporalRenderingProgressBar.setProgress(0);
}

}

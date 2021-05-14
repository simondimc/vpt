// #package js/main

// #include AbstractDialog.js

// #include ../../uispecs/TemporalRenderingDialog.json

class TemporalRenderingDialog extends AbstractDialog {

constructor(options) {
    super(UISPECS.TemporalRenderingDialog, options);

    this._handleStartTemporalRenderingClick = this._handleStartTemporalRenderingClick.bind(this);
    this._handleStopTemporalRenderingClick = this._handleStopTemporalRenderingClick.bind(this);

    this._binds.startTemporalRendering.addEventListener('click', this._handleStartTemporalRenderingClick);
    this._binds.stopTemporalRendering.addEventListener('click', this._handleStopTemporalRenderingClick);
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
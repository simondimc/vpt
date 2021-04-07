// #package js/main

// #include AbstractReader.js

class TemporalRAWReader extends AbstractReader {

constructor(loader, options) {
    super(loader);

    Object.assign(this, {
        width  : 0,
        height : 0,
        depth  : 0,
        frames : 0,
        bits   : 8
    }, options);
}

readMetadata(handlers) {
    let metadata = {
        meta: {
            version: 1
        },
        modalities: [
            {
                name: 'default',
                dimensions: {
                    width  : this.width,
                    height : this.height,
                    depth  : this.depth
                },
                frames: this.frames,
                transform: {
                    matrix: [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        0, 0, 0, 1
                    ]
                },
                components: 1,
                bits: this.bits,
            }
        ],
        frames: []
    };

    for (let i = 0; i < this.frames; i++) {
        let placements = []
        let blocks = []
        
        for (let j = 0; j < this.depth; j++) {
            placements.push({
                index: this.depth * i + j,
                position: { x: 0, y: 0, z: this.depth * i + j }
            });

            blocks.push({
                url: 'default',
                format: 'raw',
                dimensions: {
                    width  : this.width,
                    height : this.height,
                    depth  : 1
                }
            });
        }

        metadata.frames.push({
            placements,
            blocks
        })        
    }

    handlers.onData && handlers.onData(metadata);
}

readBlock(block, handlers) {
    const sliceBytes = this.width * this.height * (this.bits / 8);
    const start = block * sliceBytes;
    const end = (block + 1) * sliceBytes;
    this._loader.readData(start, end, {
        onData: data => {
            handlers.onData && handlers.onData(data);
        }
    });
}

}
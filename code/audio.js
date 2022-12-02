// holds a granular object from the library and gives us a higher-level interface
class GranularLooper {
  constructor(input) {
    this.record_sample = new p5.SoundFile();

    // set up an empty effect "bus"
    // as the granulator itself doesn't work with everything in p5 land
    // so use this to bridge it
    this.grain_bus = new p5.Effect();
    this.grain_bus.drywet(0);
    this.grain_bus.disconnect();
    // store where in the buffer the granulator is pulling grains from
    this.pos = 0;
    this.gain = 0.5;

    const audioContext = p5.prototype.getAudioContext();

    this.granulator = new granular.Granular({
      audioContext,
      envelope: {
        attack: 0,
        decay: 0.5,
      },
      density: 0.9,
      spread: 0.1,
      pitch: 1,
    });

    this.granulator.disconnect();
    this.granulator.connect(this.grain_bus);
    this.grain_ids = [];
  }

  setSoundFile(sf) {
    // copy new sound file's data to our one
    this.record_sample.setBuffer([sf.buffer.getChannelData(0)]);
    this.pos = 0;
  }

  startGrains(num) {
    this.granulator.setBuffer(this.record_sample.buffer);
    for (let i = 0; i < num; i++) {
      let id = this.granulator.startVoice({
        position: 0.1,
        gain: this.gain,
      });
      // save the grain ids so we can change/stop them later
      this.grain_ids.push(id);
    }
  }

  stopGrains() {
    for (let id of this.grain_ids) {
      this.granulator.stopVoice(id);
    }
    this.grain_ids = [];
  }

  updateGrainPos() {
    // tick it along and reset if it's past the end of the buffer
    this.pos += 1 / 1000;
    if (this.pos > 1) {
      this.pos -= 1;
    }
    // and send it through the grains
    let t = this.pos;
    this.grain_ids.map((id) =>
      this.granulator.updateVoice(id, { position: t })
    );
  }

  setParams(params) {
    this.granulator.set(params);
  }

  setGain(gain) {
    // grain gain is per-voice so map over the list of grain ids
    this.gain = gain;
    this.grain_ids.map((id) => {
      this.granulator.updateVoice(id, { volume: gain });
    });
  }
}

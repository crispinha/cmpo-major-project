// container/communication class for the other devices
class Chain {
  constructor(pos, input_device_class, has_granular) {
    this.pos = pos;
    // take the class of the input device (sampler/recorder)
    // (not an object), call the constructor of that class
    this.input_device = new input_device_class(this);
    this.has_granular = has_granular;
    if (this.has_granular) {
      this.granular_device = new GranularDevice([pos[0] + 200, pos[1]], this);
    }

    this.bus = new p5.Effect();
    this.bus.drywet(0);
    this.bus.disconnect();

    this.effects_device = new Effects([pos[0] + 800, pos[1]], this.bus, this, [
      0,
      0,
    ]);
  }

  newSoundFile(sf) {
    if (this.has_granular) {
      this.granular_device.setSoundFile(sf);
    }
  }

  draw() {
    this.input_device.draw();
    if (this.has_granular) {
      this.granular_device.draw();
    }
    this.effects_device.draw();
  }

  remove() {
    this.input_device.remove();
    if (this.has_granular) {
      this.granular_device.remove();
    }
    this.effects_device.remove();
    // remove this from the list of chains
    const index = chains.indexOf(this);
    chains.splice(index, 1);
    updateChainPositions();
  }

  updatePos(new_pos) {
    this.pos = new_pos;
    this.input_device.updatePos(new_pos);
    if (this.has_granular) {
      this.granular_device.updatePos([new_pos[0] + 200, new_pos[1]]);
    }
    this.effects_device.updatePos(new_pos);
  }
}

// effects, holds filter/delay/reverb
class Effects {
  constructor(pos, bus, parent_chain, parent = [0, 0]) {
    this.pos = pos;
    this.bus = bus;
    this.parent_chain = parent_chain;
    this.parent = parent;

    this.ui = {
      box_filter: new Box([470, 0], 185, 120, "Filter", parent),
      box_delay: new Box([670, 0], 185, 120, "Delay", parent),
      box_reverb: new Box([870, 0], 185, 120, "Reverb", parent),
    };

    // setup filter
    this.filter = new p5.Filter();
    this.filter.disconnect();
    this.filter.process(this.bus);
    this.filter_use_globals = false;

    this.ui.filter_follow = new Checkbox(
      [470, 5],
      "Use global parameters",
      () => {
        this.filter_use_globals = this.ui.filter_follow.checked();
      }
    );

    this.ui.filter_kind = new Selector([475, 25], "", () => {
      this.filter.setType(this.ui.filter_kind.value());
    });
    this.ui.filter_kind.option("lowpass", "lowpass");
    this.ui.filter_kind.option("highpass", "highpass");

    this.ui.filter_wet = new Slider(470 + 77, 50, 0, 1, 1, "WET ");
    this.ui.filter_freq = new Slider(470 + 77, 75, 40, 10000, 10000, "F ");
    this.ui.filter_res = new Slider(470 + 77, 100, 0, 5, 0.2, "RES ");

    // setup delay
    this.delay = new p5.Delay();
    this.delay.disconnect();
    this.delay.process(this.filter);
    this.delay_use_globals = false;

    this.ui.delay_follow = new Checkbox(
      [670, 5],
      "Use global parameters",
      () => {
        this.delay_use_globals = this.ui.delay_follow.checked();
      }
    );

    this.ui.delay_wet = new Slider(670 + 77, 25, 0, 1, 0, "WET ");
    this.ui.delay_time = new Slider(670 + 77, 50, 0, 1, 0.5, "TIME ");
    this.ui.delay_feedback = new Slider(670 + 77, 75, 0, 0.99, 0.5, "FDBK ");
    this.ui.delay_pingpong = new Checkbox([670, 95], "Pingpong", () => {
      if (this.ui.delay_pingpong.checked()) {
        this.delay.setType("pingPong");
      } else {
        this.delay.setType("default");
      }
    });

    // setup reverb
    this.reverb = new p5.Reverb();
    this.reverb.process(this.delay);
    // each time you set the paremters on a reverb it resets its buffer
    // (and uses a bunch of cpu) so controlling it from the global controls
    // makes it real glitchy :(

    this.ui.reverb_wet = new Slider(870 + 77, 25, 0, 1, 0, "WET ");
    this.ui.reverb_time = new Slider(870 + 77, 50, 0, 10, 3, "TIME ");
    this.ui.reverb_decay = new Slider(870 + 77, 75, 0, 99, 2, "DECY ");

    // only update reverb settings when the mouse lets go of a slider
    // rather than as it's dragging
    this.reverb_settings_changed = false;
    this.ui.reverb_time.changed(() => {
      this.reverb_settings_changed = true;
    });

    this.ui.reverb_decay.changed(() => {
      this.reverb_settings_changed = true;
    });

    // setup level metre

    if (measure_amplitude) {
      this.amp = new p5.Amplitude(0.7);
      this.amp.setInput(this.reverb);
      this.ui.level = new Level([1062.5, 117], this.amp, 114);
    }

    this.updatePos(this.parent_chain.pos);
  }

  draw() {
    Object.values(this.ui).map((x) => x.draw());

    // update from globals if that box is checked, otherwise from "local" ui
    let freq;
    if (this.filter_use_globals) {
      if (this.ui.filter_kind.value() == "lowpass") {
        freq = map(global_ui.density.value(), 0, 1, 40, 10000);
      } else {
        freq = map(global_ui.density.value(), 0, 1, 10000, 40);
      }
    } else {
      freq = this.ui.filter_freq.value();
    }

    this.filter.drywet(this.ui.filter_wet.value());
    this.filter.set(freq, this.ui.filter_res.value());

    let time, fdbk;
    if (this.delay_use_globals) {
      time = 1 - global_ui.density.value();
      fdbk = global_ui.density.value();
    } else {
      time = this.ui.delay_time.value();
      fdbk = this.ui.delay_feedback.value();
    }

    this.delay.drywet(this.ui.delay_wet.value());
    this.delay.delayTime(time);
    this.delay.feedback(fdbk);

    // only update reverb settings when the mouse lets go of a slider
    // rather than as it's dragging
    let verb_time = this.ui.reverb_time.value();
    let decay = this.ui.reverb_decay.value();

    this.reverb.drywet(this.ui.reverb_wet.value());
    if (this.reverb_settings_changed) {
      this.reverb_settings_changed = false;
      this.reverb.set(verb_time, decay);
    }
  }

  updatePos(new_pos) {
    this.parent = new_pos;
    Object.values(this.ui).map((x) => x.updateParent(new_pos));
  }

  remove() {
    Object.values(this.ui).map((x) => x.remove());
  }
}

// records from mic into internal SoundFile
// can loop that, and passes it to granular
class Recorder {
  constructor(parent_chain) {
    this.parent_chain = parent_chain;
    this.state = new State("");

    this.rec = new p5.SoundRecorder();
    this.rec.setInput(mic_bus);
    this.record_sample = new p5.SoundFile();

    this.looping = false;

    this.ui = {
      box: new Box([0, 0], 185, 120, "RECORDER"),
      gain: new Slider(77, 62.5, 0, 1, 0.8, "GAIN "),
    };

    if (measure_amplitude) {
      this.amp = new p5.Amplitude(0.7);
      this.amp.setInput(this.record_sample);
      this.ui.level = new Level([192.5, 117], this.amp, 114);
    }

    this.useGlobalParameters = false;
    this.ui.follow = new Checkbox([50, 37], "Use global gain", () => {
      this.useGlobalParameters = this.ui.follow.checked();
    });

    this.ui.button_rec = new Button([5, 5], "REC&nbsp;", () => {
      if (this.state.state != "RECORDING") {
        this.state.change("RECORDING");
        this.rec.record(this.record_sample);
        this.ui.button_rec.changeText("STOP");
      } else {
        this.state.change("FULL");
        this.rec.stop();
        // call parent_chain, which calls granulator and sets sample there
        this.parent_chain.newSoundFile(this.record_sample);
        // fancy unicode space, helps line it up better
        this.ui.button_rec.changeText("REC ");
        this.record_sample.disconnect();
        this.record_sample.connect(this.parent_chain.bus);
        if (measure_amplitude) {
          this.amp.setInput(this.record_sample);
        }
      }
    });

    this.ui.button_loop = new Button([5, 35], "LOOP", () => {
      if (!this.looping) {
        this.looping = true;
        this.record_sample.loop();
        this.ui.button_loop.changeText("STOP");
      } else {
        this.looping = false;
        this.record_sample.stop();
        this.ui.button_loop.changeText("LOOP");
      }
    });
    this.state.onChange((s) => {
      if (s == "FULL") {
        this.ui.button_loop.enable();
      } else {
        this.ui.button_loop.disable();
      }
    });

    this.ui.button_del = new Button([5, 90], "DEL", () => {
      this.parent_chain.remove();
    });

    this.state.change("EMPTY");
    this.updatePos(this.parent_chain.pos);
  }

  draw() {
    let gain;
    if (this.useGlobalParameters) {
      gain = global_ui.gain.value();
    } else {
      gain = this.ui.gain.value();
    }
    this.record_sample.setVolume(gain);
    Object.values(this.ui).map((x) => x.draw());
  }

  updatePos(new_pos) {
    Object.values(this.ui).map((x) => x.updateParent(new_pos));
  }

  remove() {
    Object.values(this.ui).map((x) => x.remove());
    this.record_sample.stop();
  }
}

// loads pre-loaded sample into internal buffer
// can loop that, and passes it to granular
class Sampler {
  constructor(parent_chain) {
    this.parent_chain = parent_chain;
    this.state = new State("");
    this.record_sample = new p5.SoundFile();

    this.ui = {
      box: new Box([0, 0], 185, 120, "SAMPLER"),
      gain: new Slider(77, 62.5, 0, 1, 0.8, "GAIN "),
    };

    if (measure_amplitude) {
      this.amp = new p5.Amplitude(0.7);
      this.amp.setInput(this.record_sample);
      this.ui.level = new Level([192.5, 117], this.amp, 114);
    }

    this.useGlobalParameters = false;
    this.ui.follow = new Checkbox([50, 37], "Use global gain", () => {
      this.useGlobalParameters = this.ui.follow.checked();
    });

    this.ui.chooser = new Selector(
      [5, 5],
      "",
      (x) => this.updateSample(x),
      this.parent_chain.parent
    );

    // put all loaded sample names into chooser
    this.ui.chooser.option(" ", " ");
    for (let s of Object.keys(samples)) {
      this.ui.chooser.option(s, s);
    }

    this.state.onChange((s) => {
      if (s != "LOOP") {
        this.ui.chooser.enable();
      } else {
        this.ui.chooser.disable();
      }
    });

    this.ui.button_loop = new Button([5, 35], "LOOP", () => {
      if (!this.looping) {
        this.looping = true;
        this.state.change("LOOP");
        this.record_sample.loop();
        this.ui.button_loop.changeText("STOP");
      } else {
        this.looping = false;
        this.state.change("FULL");
        this.record_sample.stop();
        this.ui.button_loop.changeText("LOOP");
      }
    });

    this.state.onChange((s) => {
      if (s == "FULL" || s == "LOOP") {
        this.ui.button_loop.enable();
      } else {
        this.ui.button_loop.disable();
      }
    });

    this.ui.button_del = new Button([5, 90], "DEL", () => {
      this.parent_chain.remove();
    });

    this.updatePos(this.parent_chain.pos);
    this.state.change("EMPTY");
  }

  draw() {
    let gain;
    if (this.useGlobalParameters) {
      gain = global_ui.gain.value();
    } else {
      gain = this.ui.gain.value();
    }
    this.record_sample.setVolume(gain);
    Object.values(this.ui).map((x) => x.draw());
  }

  updateSample(s) {
    let samp_name = this.ui.chooser.value();
    // if they chose one
    if (samp_name != " ") {
      // copy buffer data from selected sample into this one
      // setBuffer takes an array of channel data, we give the left channel data
      // the alternative is record_sample = global_sample
      // but that means record_sample is a reference to that not unique
      // and only one amplitude monitor can be attached to a soundfile
      this.record_sample.setBuffer([
        samples[samp_name].buffer.getChannelData(0),
      ]);

      // call parent_chain, which calls granulator and sets sample there
      this.parent_chain.newSoundFile(this.record_sample);
      this.state.change("FULL");
      this.record_sample.disconnect();
      this.record_sample.connect(this.parent_chain.bus);

      if (measure_amplitude) {
        this.amp.setInput(this.record_sample);
      }
    } else {
      this.state.change("EMPTY");
      this.parent_chain.granular_device.state.change("EMPTY");
    }
  }

  updatePos(new_pos) {
    Object.values(this.ui).map((x) => x.updateParent(new_pos));
  }

  remove() {
    Object.values(this.ui).map((x) => x.remove());
    this.record_sample.stop();
  }
}

// ui for the granulator
class GranularDevice {
  constructor(initial_pos, parent_chain) {
    this.state = new State("");
    this.pos = initial_pos;
    this.parent_chain = parent_chain;

    this.looper = new GranularLooper(mic_bus);
    this.useGlobalParameters = false;

    this.ui = {
      num_grains: new Slider(121, 30, 1, 15, 5, "NUM GRAINS ", 1),
      density: new Slider(121, 50, 0.001, 1, 0.9, "DENSITY "),
      pitch: new Slider(121, 70, 0, 2.5, 1, "PITCH "),
      gain: new Slider(121, 90, 0, 1, 0.5, "GAIN "),
      box: new Box([0, 0], 255, 120, "GRANULAR"),
    };

    if (measure_amplitude) {
      this.amp = new p5.Amplitude(0.7);
      this.amp.setInput(this.parent_chain.bus);
      this.ui.level = new Level([262.5, 117], this.amp, 114);
    }

    this.ui.follow = new Checkbox([60, 7], "Use global parameters", () => {
      this.useGlobalParameters = this.ui.follow.checked();
    });

    this.ui.button_start_granulate = new Button([5, 5], "GRAN", () => {
      if (this.state.state != "GRANULATING") {
        this.ui.button_start_granulate.changeText("STOP");
        this.state.change("GRANULATING");
        this.looper.startGrains(this.ui.num_grains.value());
      } else {
        this.state.change("FULL");
        this.looper.stopGrains();
        this.ui.button_start_granulate.changeText("GRAN");
      }
    });

    this.state.onChange((s) => {
      if (s != "EMPTY") {
        this.ui.button_start_granulate.enable();
      } else {
        this.ui.button_start_granulate.disable();
      }
    });

    // only the num grains slider needs to be en/disabled
    // cos that can't be changed while the granulator is going
    this.state.onChange((s) => {
      if (s == "GRANULATING") {
        this.ui.num_grains.disable();
      } else {
        this.ui.num_grains.enable();
      }
    });

    this.updatePosId = setInterval((x) => {
      if (this.state.state == "GRANULATING") {
        this.looper.updateGrainPos();
      }
    }, 1);

    this.state.change("EMPTY");
    this.updatePos(initial_pos);
  }

  // called from parent_chain when the input bus has a new soundfile,
  // passes it to the granulator
  setSoundFile(sf) {
    this.looper.setSoundFile(sf);
    this.state.change("FULL");
    this.looper.grain_bus.connect(this.parent_chain.bus);
    if (measure_amplitude) {
      this.amp.setInput(this.parent_chain.bus);
    }
  }

  draw() {
    let density, gain;
    if (this.useGlobalParameters) {
      density = global_ui.density.value();
      gain = global_ui.gain.value();
    } else {
      density = this.ui.density.value();
      gain = this.ui.gain.value();
    }

    this.looper.setParams({
      density: density * 2,
      spread: density / (density / 6),
      pitch: this.ui.pitch.value(),
    });

    this.looper.setGain(gain);

    Object.values(this.ui).map((x) => x.draw());
  }

  updatePos(new_pos) {
    this.pos = new_pos;
    Object.values(this.ui).map((x) => x.updateParent(this.pos));
  }

  remove() {
    Object.values(this.ui).map((x) => x.remove());
    clearInterval(this.updatePosId);
    this.looper.stopGrains();
  }
}

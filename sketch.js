/*
 *
 * CMPO385 Major Project
 * Crispin Hitchings-Anstice
 *
 * a live performance tool for playback and processing of sound 
 * as part of a (semi-)improvised performance with taonga puoro
 *
 * Uses https://github.com/philippfromme/granular-js under the MIT license
 * For further details see documentation
 */
let mic, mic_bus;
let samples;
let chains = [];

let ui, global_ui;

// putting volume meters behind a flag variable as it can use lots of processing power
// and make everything noisy b/c it takes all the cpu time
let measure_amplitude = true;

function preload() {
  // load in all the samples, into an object/dictionary so they've got names
  samples = {
    piano: loadSound("samples/prepared-piano-plonk.wav"),
    "ambient waves": loadSound("samples/ambient waves.mp3"),
    "ambient birds": loadSound("samples/ambient birds clipped.mp3"),
    "pakuru clear": loadSound("samples/pakuru clear.wav"),
    "pakuru woody": loadSound("samples/pakuru woody.wav"),
    "porotiti softa": loadSound("samples/porotiti soft a.wav"),
    "porotiti stronga": loadSound("samples/porotiti strong a.wav"),
    "porotiti softb": loadSound("samples/porotiti soft b.wav"),
    "tumutumu clicks": loadSound("samples/tumutumu clicks.wav"),
    "tumutumu drone": loadSound("samples/tumutumu drone.wav"),
    "tumutumu whack": loadSound("samples/tumutumu whack.wav"),
  };
}

function setup() {
  // find dimensions of DOM element, make canvas that size so it covers all of it
  let b = document.getElementById("interface");
  createCanvas(b.offsetWidth, b.offsetHeight);

  mic = new p5.AudioIn();
  mic.start();

  // send mic thru an empty effect "bus"
  // and fiddle with the channel count so it's mono
  // otherwise we get a stereo signal where only the left channel has sound
  mic_bus = new p5.Effect();
  mic_bus.drywet(0);
  mic_bus.disconnect();
  mic_bus.input.channelCount = 1;
  mic_bus.input.channelCountMode = "explicit";
  mic_bus.output.channelCount = 2;
  mic_bus.output.channelCountMode = "explicit";
  mic.connect(mic_bus);

  // object for ui, again so they're all in one variable but also have names
  ui = {
    add_rec: new Button([20, 22.5], "Add recorder", () => {
      chains.push(new Chain([20, chains.length * 150 + 100], Recorder, false));
    }),
    add_samp: new Button([210, 22.5], "Add sampler", () => {
      chains.push(new Chain([20, chains.length * 150 + 100], Sampler, false));
    }),
    add_rec_gran: new Button([20, 55], "Add recorder + granular", () => {
      chains.push(new Chain([20, chains.length * 150 + 100], Recorder, true));
    }),
    add_samp_gran: new Button([210, 55], "Add sampler + granular", () => {
      chains.push(new Chain([20, chains.length * 150 + 100], Sampler, true));
    }),
  };

  // and ui for parameters that effect sound devices
  global_ui = {
    box: new Box([320, 20], 385, 25, "Global parameters"),
    density: new Slider(420, 22.5, 0, 1, 0.9, "DENSITY "),
    gain: new Slider(595, 22.5, 0, 1, 0.5, "GAIN "),
  };

  if (measure_amplitude) {
    ui.mic_box = new Box([2.5, 22.5], 15, 122, "MIC");
    ui.level = new Level([10, 140.5], mic, 114);
  }
}

function draw() {
  background(255);
  // call draw on all of them
  chains.map((x) => x.draw());
  // use Object.values to get the values as a list and map over that
  Object.values(ui).map((x) => x.draw());
  Object.values(global_ui).map((x) => x.draw());
}

// move all the chains, for when one is removed
function updateChainPositions() {
  for (let i = 0; i < chains.length; i++) {
    chains[i].updatePos([20, i * 150 + 100]);
  }
}

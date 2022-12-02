// super simple state machine class
// takes listener callback functions
// and calls them when the state changes
class State {
  constructor(initial_state) {
    this.state = initial_state;
    this.listeners = [];
  }

  change(new_state) {
    this.state = new_state;
    this.listeners.map((x) => x(new_state));
  }

  onChange(callback) {
    this.listeners.push(callback);
  }
}

// UI classes, like in assignments 2/3
// but I've added a `parent` position parameter
// all drawn locations are pos + parent, ie. everything is drawn
// relative to the location of parent
// which lets me move UI elements as a group
// without having to move each element individually
class Box {
  constructor(pos, width, height, text, parent = [0, 0]) {
    this.pos = pos;
    this.width = width;
    this.height = height;
    this.text = text;
    this.parent = parent;
  }

  draw() {
    noFill();
    stroke(0);
    textFont("Courier New");
    strokeWeight(1);

    text(
      this.text,
      this.pos[0] + this.parent[0],
      this.pos[1] + this.parent[1] - 10
    );
    strokeWeight(3);
    rect(
      this.pos[0] + this.parent[0],
      this.pos[1] + this.parent[1],
      this.width,
      this.height
    );
  }

  updateParent(new_parent) {
    this.parent = new_parent;
  }

  // called whenever a ui owner object is deleted
  // does nothing here but needed to remove DOM elements
  // from classes that have those
  remove() {}
}

class Button {
  constructor(pos, text, mousePressed, parent = [0, 0]) {
    this.x = pos[0];
    this.y = pos[1];
    this.parent = parent;

    this.domButton = createButton(text);
    this.domButton.position(this.x + this.parent[0], this.y + this.parent[1]);
    this.domButton.mousePressed(mousePressed);
  }

  draw() {}

  enable() {
    this.domButton.removeAttribute("disabled");
  }

  disable() {
    this.domButton.attribute("disabled", "");
  }

  changeText(text) {
    this.domButton.elt.textContent = text;
  }

  updateParent(new_parent) {
    this.parent = new_parent;
    this.domButton.position(this.x + this.parent[0], this.y + this.parent[1]);
  }

  remove() {
    this.domButton.remove();
  }
}

class Slider {
  constructor(x, y, lo, hi, start, text, step = 0, parent = [0, 0]) {
    this.x = x;
    this.y = y;
    this.text = text;

    this.domSlide = createSlider(lo, hi, start, step);
    this.domSlide.position(x, y);
    this.domSlide.style("width", "100px");
    this.parent = parent;
  }

  changed(callback) {
    this.domSlide.changed(callback);
  }

  value() {
    return this.domSlide.value();
  }

  enable() {
    this.domSlide.removeAttribute("disabled");
  }

  disable() {
    this.domSlide.attribute("disabled", "");
  }

  draw() {
    push();
    textFont("Courier New");
    textAlign(RIGHT, TOP);
    noFill();
    fill(0);
    noStroke();
    strokeWeight(1);
    text(
      this.text + this.value().toFixed(2).padStart(5, "0"),
      this.x + this.parent[0],
      this.y + this.parent[1] + 4
    );
    pop();
  }

  remove() {
    this.domSlide.remove();
  }

  updateParent(new_parent) {
    this.parent = new_parent;
    this.domSlide.position(this.x + this.parent[0], this.y + this.parent[1]);
  }
}

class Selector {
  constructor(pos, text, callback, parent = [0, 0]) {
    this.x = pos[0];
    this.y = pos[1];
    this.parent = parent;
    this.text = text;

    this.domSelect = createSelect();
    this.domSelect.position(this.x + this.parent[0], this.y + this.parent[1]);
    this.domSelect.style("width", "175px");
    this.domSelect.changed(callback);
  }

  value() {
    return this.domSelect.value();
  }

  option(name, value) {
    this.domSelect.option(name, value);
  }

  enable() {
    this.domSelect.removeAttribute("disabled");
  }

  disable() {
    this.domSelect.attribute("disabled", "");
  }

  draw() {
    push();
    textFont("Courier New");
    textAlign(RIGHT, TOP);
    fill(0);
    strokeWeight(0);
    text(this.text, this.x + this.parent[0], this.y + this.parent[1] + 4);
    pop();
  }

  updateParent(new_parent) {
    this.parent = new_parent;
    this.domSelect.position(this.x + this.parent[0], this.y + this.parent[1]);
  }

  remove() {
    this.domSelect.remove();
  }
}

class Checkbox {
  constructor(pos, text, callback, parent = [0, 0]) {
    this.x = pos[0];
    this.y = pos[1];
    this.parent = parent;
    this.text = text;

    this.domCheck = createCheckbox(text, false);
    this.domCheck.position(this.x + parent[0], this.y + parent[1]);
    this.domCheck.changed(callback);
  }

  checked() {
    return this.domCheck.checked();
  }

  draw() {}

  updateParent(new_parent) {
    this.parent = new_parent;
    this.domCheck.position(this.x + this.parent[0], this.y + this.parent[1]);
  }

  remove() {
    this.domCheck.remove();
  }
}

// loudness/level meter
class Level {
  // take in external p5.Amplitude, as the mic has an inbuilt one so I can't create one internally
  constructor(pos, amp_monitor, height, parent = [0, 0]) {
    this.pos = pos;
    this.amp_monitor = amp_monitor;
    this.height = height;
    this.parent = parent;
  }

  draw() {
    if (measure_amplitude) {
      // level * 2 cos I think by itself p5.Amplitude only measures half wave
      // and I want it to measure the whole thing
      let level = this.amp_monitor.getLevel() * 2;

      // work out the (0->1)->(0->this.height) mappings for each line
      let px_level = map(level, 0, 1, 0, this.height);
      let quarter_level = map(0.25, 0, 1, 0, this.height);
      let half_level = map(0.5, 0, 1, 0, this.height);
      let orange_level = map(0.7, 0, 1, 0, this.height);
      let red_level = map(0.9, 0, 1, 0, this.height);

      let pos = [this.pos[0] + this.parent[0], this.pos[1] + this.parent[1]];

      fill(127);
      stroke("green");
      strokeCap(SQUARE);

      strokeWeight(1);

      // draw the horizontal measuring lines
      line(pos[0] - 5, pos[1], pos[0] + 5, pos[1]);
      line(
        pos[0] - 5,
        pos[1] - quarter_level,
        pos[0] + 5,
        pos[1] - quarter_level
      );
      line(pos[0] - 5, pos[1] - half_level, pos[0] + 5, pos[1] - half_level);
      stroke("orange");
      line(
        pos[0] - 5,
        pos[1] - orange_level,
        pos[0] + 5,
        pos[1] - orange_level
      );
      stroke("red");
      line(pos[0] - 5, pos[1] - red_level, pos[0] + 5, pos[1] - red_level);
      line(pos[0] - 5, pos[1] - this.height, pos[0] + 5, pos[1] - this.height);

      // draw the bar itself
      strokeWeight(5);
      stroke("green");

      // full height in green
      line(pos[0], pos[1], pos[0], pos[1] - px_level);

      // if the level is "in the orange" then draw over the previous drawing
      // from the start of the orange portion to the top
      if (level >= 0.7) {
        stroke("orange");
        line(pos[0], pos[1] - orange_level, pos[0], pos[1] - px_level);

        // same if it's in the red
        if (level >= 0.9) {
          stroke("red");
          line(pos[0], pos[1] - red_level, pos[0], pos[1] - px_level);
        }
      }
    }
  }

  remove() {}

  updateParent(new_parent) {
    this.parent = new_parent;
  }
}

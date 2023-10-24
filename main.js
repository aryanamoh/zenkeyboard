//let synths = document.getElementById("select_synth").synth
let lfoButton = document.getElementById("lfo");
let indexSlider = document.getElementById("indexSlider");
let partialSelect = document.getElementById("partials");
let modSlider = document.getElementById("modfreqSlider");
let lfoSlider = document.getElementById("lfoSlider");
let synthType = "add";
let lfo = false;
let lfoFreq = 6;
let modFreqVal = 100;
let indexVal = 100;

//controls for each note
let activeGainNodes = {};
let activeOscillators = {};
let activeMod = {};
let activeModGain = {};
let activeLFO = {};
let activeLFOGain = {};
let start = 0;

// initialize an audio context
// set up a gain node
// give ourselves a bit of room to avoid clipping
document.addEventListener("DOMContentLoaded", function (event) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // values for scheduling gain values
  const offset = 0.01;
  const timeConstant = 0.01;
  const globalGainValue = 0.8;
  const localGainValue = 0.8;
  
  // Create a compressor node
  const compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-50, audioCtx.currentTime);
  compressor.connect(audioCtx.destination);

  //global gain node
  const globalGain = audioCtx.createGain(); //this will control the volume of all notes
  globalGain.gain.setValueAtTime(globalGainValue, audioCtx.currentTime);
  globalGain.connect(compressor);
  
  


  
  indexSlider.disabled = true;
  modSlider.disabled = true;
  lfoSlider.disabled = true;
  lfoButton.disabled = true;
  

  
  
  // map from keys to frequencies.
  const keyboardFrequencyMap = {
    90: 261.625565300598634, //Z - C
    83: 277.182630976872096, //S - C#
    88: 293.66476791740756, //X - D
    68: 311.12698372208091, //D - D#
    67: 329.627556912869929, //C - E
    86: 349.228231433003884, //V - F
    71: 369.994422711634398, //G - F#
    66: 391.995435981749294, //B - G
    72: 415.304697579945138, //H - G#
    78: 440.0, //N - A
    74: 466.163761518089916, //J - A#
    77: 493.883301256124111, //M - B
    81: 523.251130601197269, //Q - C
    50: 554.365261953744192, //2 - C#
    87: 587.32953583481512, //W - D
    51: 622.253967444161821, //3 - D#
    69: 659.255113825739859, //E - E
    82: 698.456462866007768, //R - F
    53: 739.988845423268797, //5 - F#
    84: 783.990871963498588, //T - G
    54: 830.609395159890277, //6 - G#
    89: 880.0, //Y - A
    55: 932.327523036179832, //7 - A#
    85: 987.766602512248223, //U - B
  };

  // map from key to pastel color, roughly rainbow order
  const keyColorMap = {
    90: "#FFD1DC", // Light Red - Pastel Pink
    83: "#FFA07A", // Orange - Soft Orange
    88: "#FFFFE0", // Light Yellow
    68: "#B0E57C", // Light Green - Pale Green
    67: "#AEEEEE", // Light Blue - Baby Blue
    86: "#E6E6FA", // Light Purple - Lavender
    71: "#C8A2C8", // Pastel Lilac - Lilac
    66: "#FFC0CB", // Pink - Pale Pink
    72: "#F08080", // Light Coral
    78: "#FFDAB9", // Peach
    74: "#FFFACD", // Buttercream
    77: "#B2FFFF", // Turquoise - Turquoise
    81: "#B0E2E2", // Light Blue-Green - Aqua
    50: "#87CEEB", // Sky Blue
    87: "#B0E0E6", // Powder Blue
    51: "#D3D3D3", // Pale Lilac - Pale Lilac
    69: "#FA8072", // Light Gray - Salmon
    82: "#CCCCFF", // Light Purple-Gray - Periwinkle
    53: "#E6E6FA", // Light Purple-Blue - Soft Lavender
    84: "#FFBCD9", // Cotton Candy
    54: "#D8BFD8", // Dusty Rose
    89: "#FFC266", // Pastel Orange
    55: "#E0FFB3", // Pastel Lime
    85: "#C9FFE5", // Pastel Teal
  };

  //user picked waveform
  const wavePicker = document.querySelector("select[id='waveform']");

  // add listeners to the keys to add and remove activeOscillators.
  window.addEventListener("keydown", keyDown, false);
  window.addEventListener("keyup", keyUp, false);

  // autoplay rain, adjust volume
  const rain = document.getElementById("rainsounds");
  function playAudio() { 
    rain.volume = 0.75;
    rain.play(); 
  } 


  // user presses key
  function keyDown(event) {
    const key = (event.detail || event.which).toString();
    if (keyboardFrequencyMap[key] && !activeOscillators[key]) {
      
      changeColor(key);
      
      
      if(synthType == "add"){
        playAdditive(key);
      }
      else if(synthType == "am") {
        playAM(key);
      }
      else if(synthType =="fm") {
        playFM(key);
      }
    }
  }

  // user releases key
  function keyUp(event) {
    const key = (event.detail || event.which).toString();
    if (keyboardFrequencyMap[key] && activeOscillators[key]) {
      // bring gain node to 0
      const gainNode = activeGainNodes[key];
      gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      gainNode.gain.setTargetAtTime(
        0,
        audioCtx.currentTime + offset,
        timeConstant
      );

      delete activeGainNodes[key];
      
      
      if (activeLFOGain[key]){
        const lfoNode = activeLFOGain[key];
        lfoNode.gain.cancelScheduledValues(audioCtx.currentTime);
        lfoNode.gain.setTargetAtTime(
          0,
          audioCtx.currentTime + offset,
          timeConstant
        );
        delete activeLFOGain[key];
        
        activeLFO[key].stop(audioCtx.currentTime + offset * 5);
        delete activeLFO[key];
      }
      
      if(synthType != "add") {
        const modNode = activeModGain[key];
        modNode.gain.cancelScheduledValues(audioCtx.currentTime);
        modNode.gain.setTargetAtTime(
          0,
          audioCtx.currentTime + offset,
          timeConstant
        );
        
        activeOscillators[key].stop(audioCtx.currentTime + offset * 5);
        activeMod[key].stop(audioCtx.currentTime + offset * 5);
      }
      
      delete activeOscillators[key];
      delete activeMod[key];
      
      
    }
  }

  // start an oscillator,
  // set the desired properties, and
  // connect the new oscillator to the the audioCtx.destination.
  function playAdditive(key) {
    
    // start rain sounds on first note
    if (start == 0) {
      playAudio();
      start = 1;
    }
    
    let partials = partialSelect.value;
    
    // lower gain of all active notes
    const numActiveNodes = Object.keys(activeGainNodes).length + 1;
    Object.values(activeGainNodes).forEach((val) => {
      for(let i=0; i<val.length; i++){
        val[i].gain.setTargetAtTime(
          (localGainValue / numActiveNodes)/partials,
          audioCtx.currentTime + offset,
          timeConstant
        );
      } 
    });
    
    
    
    // create new gain node for each note
    const gainNode = audioCtx.createGain();

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.setTargetAtTime(
      localGainValue / numActiveNodes,
      audioCtx.currentTime + offset,
      timeConstant
    );
    
    let addOsc = [];
    for(let p=1; p<=partials; p++) {
      let osc = oscSetup(keyboardFrequencyMap[key], p); 
      osc.connect(gainNode).connect(globalGain);
      addOsc[p-1] = osc;
    }
    
    

    // record note
    activeOscillators[key] = addOsc;
    activeGainNodes[key] = gainNode;
  }
  
  
  function playAM(key) {
      if (start == 0) {
        playAudio();
        start = 1;
      }
        
      let carrier = oscSetup(keyboardFrequencyMap[key], 1);
      let modulator = oscSetup(modFreqVal, 1);

      const modGain = audioCtx.createGain();
      const depth = audioCtx.createGain();
    

      depth.gain.setValueAtTime(0, audioCtx.currentTime);
      depth.gain.setTargetAtTime(
        0.5,
        audioCtx.currentTime + offset,
        timeConstant
      );
    
      modGain.gain.setValueAtTime(0, audioCtx.currentTime);
      modGain.gain.setTargetAtTime(
        1.0 - depth.gain.value,
        audioCtx.currentTime + offset,
        timeConstant
      );
      
      if (lfo === true){
        var lfoOsc = audioCtx.createOscillator();
        lfoOsc.frequency.setValueAtTime(lfoFreq, audioCtx.currentTime)
        const lfoGain = audioCtx.createGain();

        lfoGain.gain.setValueAtTime(0, audioCtx.currentTime);
        lfoGain.gain.setTargetAtTime(
          100,
          audioCtx.currentTime + offset,
          timeConstant
        );
      
        lfoOsc.connect(lfoGain);
        lfoGain.connect(modulator.frequency)
        activeLFO[key] = lfoOsc;
        activeLFOGain[key] = lfoGain;
        lfoOsc.start();
      }
    
      modulator.connect(depth).connect(modGain.gain);
      carrier.connect(modGain);
      modGain.connect(globalGain)

      //record notes
      activeMod[key] = modulator;
      activeModGain[key] = modGain;
      activeOscillators[key] = carrier;
      activeGainNodes[key] = depth;
        
    }
    
    function playFM(key) {
      if (start == 0) {
        playAudio();
        start = 1;
      }
      
      let carrier = oscSetup(keyboardFrequencyMap[key], 1);
      let modulator = oscSetup(modFreqVal, 1);
    
      // lower gain of all active notes
      const numActiveNodes = Object.keys(activeGainNodes).length + 2;
      Object.values(activeGainNodes).forEach((val) => {
        for(let i=0; i<val.length; i++){
          val[i].gain.setTargetAtTime(
            localGainValue / numActiveNodes,
            audioCtx.currentTime + offset,
            timeConstant
          );
        } 
      });

      const modGain = audioCtx.createGain();
      const carrGain = audioCtx.createGain();
    
      
      carrGain.gain.setValueAtTime(0, audioCtx.currentTime);
      carrGain.gain.setTargetAtTime(
        localGainValue / numActiveNodes,
        audioCtx.currentTime + offset,
        timeConstant
      );
    
      modGain.gain.setValueAtTime(0, audioCtx.currentTime);
      modGain.gain.setTargetAtTime(
        indexVal,
        audioCtx.currentTime + offset,
        timeConstant
      );
      
      if (lfo === true){
        var lfoOsc = audioCtx.createOscillator();
        lfoOsc.frequency.setValueAtTime(lfoFreq, audioCtx.currentTime)
        const lfoGain = audioCtx.createGain();

        lfoGain.gain.setValueAtTime(0, audioCtx.currentTime);
        lfoGain.gain.setTargetAtTime(
          100,
          audioCtx.currentTime + offset,
          timeConstant
        );
      
        lfoOsc.connect(lfoGain);
        lfoGain.connect(modulator.frequency)
        activeLFO[key] = lfoOsc;
        activeLFOGain[key] = lfoGain;
        lfoOsc.start();
      }
    
      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(carrGain);
      carrGain.connect(globalGain)

      //record notes
      activeMod[key] = modulator;
      activeModGain[key] = modGain;
      activeOscillators[key] = carrier;
      activeGainNodes[key] = carrGain;
    }
  
  function oscSetup(freq, partial) {
    // create oscillator at frequency of note
    const osc = audioCtx.createOscillator();
    
    if (partial==1){
      osc.frequency.setValueAtTime(
        freq,
        audioCtx.currentTime
      );
    }
    else {
      osc.frequency.setValueAtTime(
        partial*freq, //+ Math.random()*15,
        audioCtx.currentTime
      );
    }

    // user selected waveform
    const type = wavePicker.options[wavePicker.selectedIndex].value;
    osc.type = type;
    
    // start new note and bring gain up slowly
    osc.start(audioCtx.currentTime + offset);
    
    return osc;
  }

  // change background color on key press
  function changeColor(key) {
    document.body.style.backgroundColor = keyColorMap[key];
  }
  
  
});


function updateSynth() {
  
    synthType = document.querySelector('input[name="synth"]:checked').value;

      if (synthType == 'fm') {
          indexSlider.disabled = false;
          partialSelect.disabled = true;
          modSlider.disabled = false;
          lfoButton.disabled = false;
      }
      else if (synthType == 'add'){
          partialSelect.disabled = false;
          indexSlider.disabled = true;
          modSlider.disabled = true;
          lfoButton.disabled = true;
      }
      else{
          partialSelect.disabled = true;
          indexSlider.disabled = true;
          modSlider.disabled = false;
          lfoButton.disabled = false;
        }
};

function lfoToggle(){
    let slider = document.getElementById("lfoSlider")
    if (lfo === true){
        lfo = false;
        lfoButton.style.backgroundColor = "#FFFFFF";
        slider.disabled = true;
    }
    else{
        lfo = true;
        lfoButton.style.backgroundColor = "lightblue";
        slider.disabled = false;
    }
}

function updateLFO(val){
    lfoFreq = val;
    
}

function updateModFreq(val) {
    modFreqVal = 0 + val
    
};

function updateIndex(val) {
    indexVal = val
    
};

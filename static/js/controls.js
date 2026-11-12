import { st, VDIV_STEPS, TDIV_STEPS } from "./state.js";
import { $, fTime } from "./utils.js";
import { playUiTick, syncAudioSynth } from "./audio.js";
import { update } from "./api.js";
import { lecturas } from "./readouts.js";
import { stepBy, edit } from "./actions.js";

const goTo = sel =>
  window.wgScrollTo ? window.wgScrollTo(sel)
                    : document.querySelector(sel)?.scrollIntoView({ behavior: "smooth" });

const PRESETS = {
  tono:      { forma: "senoidal", mod: "none", freq: 440, amp: 5.0 },
  reloj:     { forma: "cuadrada", mod: "none", freq: 250, amp: 5.0 },
  portadora: { forma: "senoidal", mod: "am",   freq: 600, amp: 8.0 },
  barrido:   { forma: "diente",   mod: "none", freq: 120, amp: 6.5 },
};

export function autoScaleScope() {
  const idealVdiv = st.amp / 2.5;
  let bestV = 0;
  for (let i = 0; i < VDIV_STEPS.length; i++) {
    if (VDIV_STEPS[i] >= idealVdiv) { bestV = i; break; }
    bestV = i;
  }
  st.vdivIdx = bestV;

  const idealTdiv = (3 / st.freq) / 10;
  let bestT = 0;
  let minDiff = Infinity;
  for (let i = 0; i < TDIV_STEPS.length; i++) {
    const d = Math.abs(TDIV_STEPS[i] - idealTdiv);
    if (d < minDiff) { minDiff = d; bestT = i; }
  }
  st.tdivIdx = bestT;
  st.posY = 0.0;
  st.posX = 0.0;
  st.trigLvl = 0.0;
  st.xyMode = false;
  st.fft = false;
}

export function syncKeys() {
  document.querySelectorAll("#waves .wave-option").forEach(b => b.classList.toggle("on", b.dataset.f === st.forma));
  document.querySelectorAll("#mods .pill-btn").forEach(b => b.classList.toggle("on", b.dataset.m === st.mod));
  document.querySelectorAll("#steps .step-pill").forEach(b => b.classList.toggle("on", +b.dataset.m === st.mult));
  $("bRun").classList.toggle("on", st.run);
  $("bRun").textContent = st.run ? "RUN" : "STOP";
  $("bCh1").classList.toggle("on", st.ch1);
  if ($("bCh2")) $("bCh2").classList.toggle("on", st.ch2);
  $("bOut").classList.toggle("on", st.out);
  $("r50").classList.toggle("on", st.r === 50);
  $("rhz").classList.toggle("on", st.r !== 50);
  $("tShade").classList.toggle("on", st.area);
  $("tRmsL").classList.toggle("on", st.rmsl);
  $("tCur").classList.toggle("on", st.cur);
  if ($("tManCur")) $("tManCur").classList.toggle("on", st.manCur);
  if ($("tXY")) $("tXY").classList.toggle("on", st.xyMode);

  const btnFft = $("tFft");
  if (btnFft) {
    btnFft.classList.toggle("on", st.fft);
    if (st.fft) {
      btnFft.style.background = "rgba(99, 102, 241, 0.16)";
      btnFft.style.color = "#818CF8";
      btnFft.style.borderColor = "rgba(99, 102, 241, 0.45)";
    } else {
      btnFft.style.background = "";
      btnFft.style.color = "";
      btnFft.style.borderColor = "";
    }
  }

  if ($("valVdiv")) $("valVdiv").textContent = VDIV_STEPS[st.vdivIdx].toFixed(1) + " V/div";
  if ($("valTdiv")) $("valTdiv").textContent = fTime(TDIV_STEPS[st.tdivIdx]) + "/div";
  if ($("valPosY")) $("valPosY").textContent = (st.posY >= 0 ? "+" : "") + st.posY.toFixed(1) + " div";
  if ($("valPosX")) $("valPosX").textContent = (st.posX >= 0 ? "+" : "") + st.posX.toFixed(1) + " div";
  if ($("slPosY"))  $("slPosY").value = st.posY;
  if ($("slPosX"))  $("slPosX").value = st.posX;

  document.querySelectorAll("#coupGroup .step-pill").forEach(b =>
    b.classList.toggle("on", b.dataset.c === st.coupling)
  );

  document.querySelectorAll("#trigModes .step-pill").forEach(b =>
    b.classList.toggle("on", b.dataset.tm === st.trigMode)
  );
  if ($("bSlope")) {
    $("bSlope").textContent = st.trigSlope === "RISE" ? "FLANCO ↑" : "FLANCO ↓";
    $("bSlope").classList.toggle("on", st.trigSlope === "RISE");
  }
  if ($("valTrigLvl")) {
    $("valTrigLvl").textContent = (st.trigLvl >= 0 ? "+" : "") + st.trigLvl.toFixed(2) + " V";
  }
  if ($("slTrigLvl")) $("slTrigLvl").value = st.trigLvl;

  if ($("bCh2Toggle")) {
    $("bCh2Toggle").classList.toggle("on", st.ch2);
    $("bCh2Toggle").textContent = st.ch2 ? "CH2: ON" : "CH2: OFF";
  }
  document.querySelectorAll("#ch2Waves .step-pill").forEach(b =>
    b.classList.toggle("on", b.dataset.f2 === st.forma2)
  );
  document.querySelectorAll("#mathModes .step-pill").forEach(b =>
    b.classList.toggle("on", b.dataset.mm === st.mathMode)
  );
  if ($("valAmp2"))   $("valAmp2").textContent   = st.amp2.toFixed(1) + " Vp";
  if ($("slAmp2"))    $("slAmp2").value          = st.amp2;
  if ($("valPhase2")) $("valPhase2").textContent = st.phase2.toFixed(0) + "°";
  if ($("slPhase2"))  $("slPhase2").value        = st.phase2;
}

// Selector de las 3 pestañas inferiores (Telemetría | MEASURE | Cálculo Integral)
function setDeckTab(mode) {
  $("tabMetrics").classList.toggle("on", mode === "metrics");
  if ($("tabMeasure")) $("tabMeasure").classList.toggle("on", mode === "measure");
  $("tabMath").classList.toggle("on", mode === "math");

  $("viewMetrics").classList.toggle("hidden", mode !== "metrics");
  if ($("viewMeasure")) $("viewMeasure").classList.toggle("hidden", mode !== "measure");
  $("viewMath").classList.toggle("active", mode === "math");
  playUiTick(600);
}

// Selector de los 3 módulos del rack derecho (Generador | Escala & Trigger | CH2 & MATH)
function setRackTab(rack) {
  document.querySelectorAll("#rackTabs .rack-tab").forEach(b =>
    b.classList.toggle("on", b.dataset.rack === rack)
  );
  if ($("paneGen")) $("paneGen").classList.toggle("active", rack === "gen");
  if ($("paneDso")) $("paneDso").classList.toggle("active", rack === "dso");
  if ($("paneCh2")) $("paneCh2").classList.toggle("active", rack === "ch2");
  playUiTick(580);
}

function radio(container, attr, cb) {
  const el = $(container);
  if (!el) return;
  el.addEventListener("click", e => {
    const b = e.target.closest(`[${attr}]`);
    if (b) {
      playUiTick(540);
      cb(b.getAttribute(attr));
    }
  });
}

export function initControls() {
  $("tabMetrics").onclick = () => setDeckTab("metrics");
  if ($("tabMeasure")) $("tabMeasure").onclick = () => setDeckTab("measure");
  $("tabMath").onclick    = () => setDeckTab("math");

  radio("rackTabs", "data-rack", rack => setRackTab(rack));

  document.querySelectorAll("[data-preset]").forEach(card => {
    card.addEventListener("click", () => {
      const p = PRESETS[card.dataset.preset];
      if (!p) return;
      Object.assign(st, p);
      autoScaleScope();
      playUiTick(680);
      syncKeys();
      update();
      goTo("#workbench");
    });
  });

  $("btnTestLink").onclick = () => {
    playUiTick(660);
    goTo("#workbench");
  };

  radio("waves", "data-f", f => { st.forma = f; syncKeys(); update(); });
  radio("mods",  "data-m", m => { st.mod = m;   syncKeys(); update(); });
  radio("steps", "data-m", m => { st.mult = +m; syncKeys(); });

  $("bRun").onclick = () => { st.run = !st.run; playUiTick(600); syncKeys(); };
  $("bCh1").onclick = () => { st.ch1 = !st.ch1; playUiTick(500); syncKeys(); syncAudioSynth(); };
  if ($("bCh2")) $("bCh2").onclick = () => {
    st.ch2 = !st.ch2;
    if (st.ch2) setRackTab("ch2");
    playUiTick(500);
    syncKeys();
  };
  $("bOut").onclick = () => { st.out = !st.out; playUiTick(500); syncKeys(); lecturas(); syncAudioSynth(); };
  $("r50").onclick  = () => { st.r = 50;  playUiTick(550); syncKeys(); update(); };
  $("rhz").onclick  = () => { st.r = 1e6; playUiTick(550); syncKeys(); update(); };

  [["tShade", "area"], ["tRmsL", "rmsl"], ["tCur", "cur"], ["tManCur", "manCur"], ["tFft", "fft"]].forEach(([id, k]) => {
    const btn = $(id);
    if (btn) {
      btn.onclick = () => {
        st[k] = !st[k];
        if (k === "fft" && st.fft) st.xyMode = false;
        playUiTick(640);
        syncKeys();
      };
    }
  });

  if ($("tXY")) $("tXY").onclick = () => {
    st.xyMode = !st.xyMode;
    if (st.xyMode) {
      st.ch2 = true;
      st.fft = false;
    }
    playUiTick(640);
    syncKeys();
  };

  if ($("vdivDown")) $("vdivDown").onclick = () => {
    st.vdivIdx = Math.max(0, st.vdivIdx - 1);
    playUiTick(520); syncKeys();
  };
  if ($("vdivUp")) $("vdivUp").onclick = () => {
    st.vdivIdx = Math.min(VDIV_STEPS.length - 1, st.vdivIdx + 1);
    playUiTick(580); syncKeys();
  };
  if ($("tdivDown")) $("tdivDown").onclick = () => {
    st.tdivIdx = Math.max(0, st.tdivIdx - 1);
    playUiTick(520); syncKeys();
  };
  if ($("tdivUp")) $("tdivUp").onclick = () => {
    st.tdivIdx = Math.min(TDIV_STEPS.length - 1, st.tdivIdx + 1);
    playUiTick(580); syncKeys();
  };

  if ($("bAutoScale")) $("bAutoScale").onclick = () => {
    autoScaleScope();
    playUiTick(720);
    syncKeys();
  };

  if ($("slPosY")) {
    $("slPosY").addEventListener("input", e => { st.posY = +e.target.value; syncKeys(); });
    $("slPosY").addEventListener("dblclick", () => { st.posY = 0; syncKeys(); });
  }
  if ($("slPosX")) {
    $("slPosX").addEventListener("input", e => { st.posX = +e.target.value; syncKeys(); });
    $("slPosX").addEventListener("dblclick", () => { st.posX = 0; syncKeys(); });
  }

  radio("coupGroup", "data-c", c => { st.coupling = c; syncKeys(); });

  radio("trigModes", "data-tm", tm => { st.trigMode = tm; syncKeys(); });
  if ($("bSlope")) $("bSlope").onclick = () => {
    st.trigSlope = st.trigSlope === "RISE" ? "FALL" : "RISE";
    playUiTick(600);
    syncKeys();
  };
  if ($("slTrigLvl")) {
    $("slTrigLvl").addEventListener("input", e => { st.trigLvl = +e.target.value; syncKeys(); });
    $("slTrigLvl").addEventListener("dblclick", () => { st.trigLvl = 0; syncKeys(); });
  }

  if ($("bCh2Toggle")) $("bCh2Toggle").onclick = () => {
    st.ch2 = !st.ch2;
    playUiTick(560);
    syncKeys();
  };
  radio("ch2Waves", "data-f2", f2 => { st.forma2 = f2; syncKeys(); });
  radio("mathModes", "data-mm", mm => { st.mathMode = mm; syncKeys(); });

  if ($("slAmp2")) {
    $("slAmp2").addEventListener("input", e => { st.amp2 = +e.target.value; syncKeys(); });
  }
  if ($("slPhase2")) {
    $("slPhase2").addEventListener("input", e => { st.phase2 = +e.target.value; syncKeys(); });
    $("slPhase2").addEventListener("dblclick", () => { st.phase2 = 90; syncKeys(); });
  }

  document.querySelectorAll(".nudge").forEach(b =>
    b.addEventListener("click", () => stepBy(b.dataset.k, +b.dataset.d)));
  document.querySelectorAll(".dc-value").forEach(b =>
    b.addEventListener("click", () => edit(b.dataset.k)));
}
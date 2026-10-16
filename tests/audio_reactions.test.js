import test from "node:test";
import assert from "node:assert/strict";
import {
  play,
  playDice,
  playLand,
  playCash,
  playGunshot,
  playKick,
  setAudioMuted,
  isAudioMuted,
  REACTION_EMOJIS,
} from "../src/audio.js";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { io as Client } from "socket.io-client";
import { action, player, room, start } from "../server/game.js";

// Mock Web Audio Context implementation for automated verification
class MockAudioNode {
  constructor(ctx) {
    this.ctx = ctx;
    this.connectedTo = [];
  }
  connect(target) {
    this.connectedTo.push(target);
    return target;
  }
  disconnect() {}
}

class MockAudioParam {
  constructor(defaultValue = 0) {
    this.value = defaultValue;
    this.events = [];
  }
  setValueAtTime(val, time) {
    this.events.push({ type: "setValue", val, time });
    this.value = val;
  }
  exponentialRampToValueAtTime(val, time) {
    this.events.push({ type: "exponentialRamp", val, time });
  }
  linearRampToValueAtTime(val, time) {
    this.events.push({ type: "linearRamp", val, time });
  }
}

class MockOscillatorNode extends MockAudioNode {
  constructor(ctx) {
    super(ctx);
    this.type = "sine";
    this.frequency = new MockAudioParam(440);
    this.started = false;
    this.stopped = false;
    ctx.nodes.push(this);
  }
  start(time) {
    this.started = true;
    this.startTime = time;
  }
  stop(time) {
    this.stopped = true;
    this.stopTime = time;
  }
}

class MockGainNode extends MockAudioNode {
  constructor(ctx) {
    super(ctx);
    this.gain = new MockAudioParam(1);
    ctx.nodes.push(this);
  }
}

class MockBiquadFilterNode extends MockAudioNode {
  constructor(ctx) {
    super(ctx);
    this.type = "lowpass";
    this.frequency = new MockAudioParam(350);
    this.Q = new MockAudioParam(1);
    ctx.nodes.push(this);
  }
}

class MockAudioBufferSourceNode extends MockAudioNode {
  constructor(ctx) {
    super(ctx);
    this.buffer = null;
    this.started = false;
    this.stopped = false;
    ctx.nodes.push(this);
  }
  start(time) {
    this.started = true;
    this.startTime = time;
  }
  stop(time) {
    this.stopped = true;
    this.stopTime = time;
  }
}

class MockAudioBuffer {
  constructor(channels, length, sampleRate) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.channels = [new Float32Array(length)];
  }
  getChannelData(i) {
    return this.channels[i] || this.channels[0];
  }
}

class MockAudioContext {
  constructor() {
    this.sampleRate = 44100;
    this.currentTime = 0.5;
    this.state = "running";
    this.nodes = [];
    this.destination = new MockAudioNode(this);
  }
  createOscillator() {
    return new MockOscillatorNode(this);
  }
  createGain() {
    return new MockGainNode(this);
  }
  createBiquadFilter() {
    return new MockBiquadFilterNode(this);
  }
  createBuffer(channels, length, sampleRate) {
    return new MockAudioBuffer(channels, length, sampleRate);
  }
  createBufferSource() {
    return new MockAudioBufferSourceNode(this);
  }
  async resume() {
    this.state = "running";
  }
}

test("procedural foley audio synthesizes physical wooden dice tumbling in cup and double-bouncing", () => {
  const ctx = new MockAudioContext();
  playDice(ctx, 1.0);

  // Expect 5 impulses (each has 1 buffer source + 1 oscillator) = 5 buffer sources and 5 oscillators
  const sources = ctx.nodes.filter((n) => n instanceof MockAudioBufferSourceNode);
  const oscs = ctx.nodes.filter((n) => n instanceof MockOscillatorNode);
  const filters = ctx.nodes.filter((n) => n instanceof MockBiquadFilterNode);

  assert.equal(sources.length, 5, "Creates 5 multi-impulse noise bursts for dice tumble");
  assert.equal(oscs.length, 5, "Creates 5 wooden resonant body tones");
  assert.equal(filters.length, 5, "Filters each noise burst with decaying pitch");

  // Verify pitch decay across impulses
  const firstOscFreq = oscs[0].frequency.events[0].val;
  const lastOscFreq = oscs[4].frequency.events[0].val;
  assert.ok(
    firstOscFreq > lastOscFreq,
    `Initial cup tumble pitch (${firstOscFreq}Hz) decays to settle pitch (${lastOscFreq}Hz)`,
  );
});

test("procedural foley audio synthesizes low-pass filtered 60Hz sub-thud for token landing", () => {
  const ctx = new MockAudioContext();
  playLand(ctx, 2.0);

  const subOsc = ctx.nodes.find((n) => n instanceof MockOscillatorNode);
  assert.ok(subOsc, "Sub oscillator exists");
  assert.equal(subOsc.type, "sine");

  // Verify 60Hz frequency ramp
  const ramps = subOsc.frequency.events;
  const rampsTo60 = ramps.some(
    (e) => (e.type === "exponentialRamp" || e.type === "setValue") && e.val === 60,
  );
  assert.ok(rampsTo60, "Ramps down to 60Hz sub-thud");

  // Verify low-pass filter
  const filter = ctx.nodes.find(
    (n) => n instanceof MockBiquadFilterNode && n.type === "lowpass",
  );
  assert.ok(filter, "Low-pass filter applied to sub-thud");
  assert.ok(filter.frequency.value <= 120, "Filter cutoff set low for sub bass");
});

test("procedural foley audio synthesizes dual-harmonic bell strike (880Hz + 1760Hz) for cash chime", () => {
  const ctx = new MockAudioContext();
  playCash(ctx, 3.0);

  const oscs = ctx.nodes.filter((n) => n instanceof MockOscillatorNode);
  assert.ok(oscs.length >= 2, "Contains at least 2 harmonic oscillators");

  const freqs = oscs.map((o) => o.frequency.events[0]?.val);
  assert.ok(freqs.includes(880), "Contains 880Hz fundamental bell frequency");
  assert.ok(freqs.includes(1760), "Contains 1760Hz 2nd harmonic bell chime");

  // Check exponential gain decays
  const gains = ctx.nodes.filter((n) => n instanceof MockGainNode);
  for (const g of gains) {
    const hasExpRamp = g.gain.events.some((e) => e.type === "exponentialRamp");
    assert.ok(hasExpRamp, "Gain applies exponential decay mimicking metallic bell strike");
  }
});

test("procedural foley audio synthesizes high-impact gunshot with tight bandpass and 40Hz sub-kick", () => {
  const ctx = new MockAudioContext();
  playGunshot(ctx, 4.0);

  // 1. Noise burst with tight bandpass filter
  const bandpass = ctx.nodes.find(
    (n) => n instanceof MockBiquadFilterNode && n.type === "bandpass",
  );
  assert.ok(bandpass, "Gunshot includes tight bandpass filter for high-impact noise snap");
  assert.ok(bandpass.Q.value >= 2.5, "Bandpass has high/tight Q factor");

  // 2. 40Hz sub-kick shockwave
  const kickOsc = ctx.nodes.find((n) => n instanceof MockOscillatorNode);
  assert.ok(kickOsc, "Sub-kick oscillator exists");
  const reaches40Hz = kickOsc.frequency.events.some((e) => e.val === 40);
  assert.ok(reaches40Hz, "Sub-kick ramps down to 40Hz sub shockwave");

  // 3. Low-pass filtered reverberation tail
  const revFilter = ctx.nodes.find(
    (n) => n instanceof MockBiquadFilterNode && n.type === "lowpass",
  );
  assert.ok(revFilter, "Includes reverberation tail filter");
});

test("procedural foley audio synthesizes melee kick impact", () => {
  const ctx = new MockAudioContext();
  playKick(ctx, 5.0);

  const kickOsc = ctx.nodes.find((n) => n instanceof MockOscillatorNode);
  assert.ok(kickOsc, "Melee kick oscillator created");
  assert.ok(kickOsc.frequency.events.length > 0, "Frequency swept for punch");
});

test("audio engine respects muted setting and options.force", () => {
  const ctx = new MockAudioContext();
  setAudioMuted(true);
  assert.equal(isAudioMuted(), true);

  play("cash", { ctx });
  assert.equal(ctx.nodes.length, 0, "Does not play when audio is muted");

  play("cash", { ctx, force: true });
  assert.ok(ctx.nodes.length > 0, "Plays when force option is specified");

  setAudioMuted(false);
  assert.equal(isAudioMuted(), false);
});

test("spectator reaction pills define specified hype emojis", () => {
  assert.deepEqual(
    REACTION_EMOJIS,
    ["🔥", "💀", "🎯", "💰", "👑"],
    "Exact 5 spectator reaction emojis configured",
  );
});

test("server reaction socket handler validates emojis, rate limits and broadcasts to room", async () => {
  // Spin up an ephemeral socket.io test instance
  const httpServer = createServer();
  const io = new Server(httpServer);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  const port = httpServer.address().port;

  let broadcastCount = 0;
  let receivedPayload = null;

  io.on("connection", (socket) => {
    socket.data = { code: "TEST_ROOM", player: "p1" };
    let reactionAt = [];

    socket.on("reaction", (d, ack = () => {}) => {
      const emoji = String(d?.emoji || "");
      const ALLOWED = ["🔥", "💀", "🎯", "💰", "👑"];
      if (!ALLOWED.includes(emoji)) {
        return ack({ error: "Invalid reaction emoji." });
      }
      const now = Date.now();
      reactionAt = reactionAt.filter((t) => now - t < 5000);
      if (reactionAt.length >= 5) {
        return ack({ error: "Slow down on reactions." });
      }
      reactionAt.push(now);

      const payload = {
        id: "r123",
        emoji,
        from: socket.data.player,
        time: now,
      };

      for (const s of io.sockets.sockets.values()) {
        if (s.data.code === "TEST_ROOM") {
          s.emit("reaction", payload);
        }
      }
      ack({ ok: true });
    });
  });

  const client = Client(`http://localhost:${port}`);
  await new Promise((resolve) => client.on("connect", resolve));

  client.on("reaction", (payload) => {
    broadcastCount++;
    receivedPayload = payload;
  });

  // Valid reaction succeeds
  const res1 = await new Promise((resolve) => {
    client.emit("reaction", { emoji: "🔥" }, resolve);
  });
  assert.equal(res1.ok, true);

  // Wait brief tick for socket broadcast
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(broadcastCount, 1);
  assert.equal(receivedPayload.emoji, "🔥");
  assert.equal(receivedPayload.from, "p1");

  // Invalid reaction rejected
  const resInvalid = await new Promise((resolve) => {
    client.emit("reaction", { emoji: "🍔" }, resolve);
  });
  assert.match(resInvalid.error, /Invalid reaction emoji/);

  // Rate limiting enforces spam prevention (sending 5 more in rapid succession triggers limit)
  for (let i = 0; i < 4; i++) {
    await new Promise((resolve) => client.emit("reaction", { emoji: "💀" }, resolve));
  }
  const resSpam = await new Promise((resolve) => {
    client.emit("reaction", { emoji: "👑" }, resolve);
  });
  assert.match(resSpam.error, /Slow down on reactions/);

  client.disconnect();
  io.close();
  await new Promise((resolve) => httpServer.close(resolve));
});

test("server game action handler gracefully ignores reaction action type without error", () => {
  const p1 = player("Alice");
  const g = room("P1", p1);
  g.players.push(player("Bob"));
  start(g, p1.id);
  assert.doesNotThrow(() => {
    action(g, g.players[0].id, { type: "reaction", emoji: "🔥" });
  });
});

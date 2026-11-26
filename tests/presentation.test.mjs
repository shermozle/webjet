import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForHeroPresentation} from '../src/presentation.ts';

const deferred = () => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return {promise, resolve};
};

function browser(t, font, image) {
  const frames = [];
  const headline = {};
  const hero = {querySelector: () => headline};
  const globals = {
    document: {fonts: {load: () => font, ready: Promise.resolve()}},
    Image: class {decode() {return image;}},
    getComputedStyle: element => element === headline
      ? {fontWeight: '750', fontSize: '53px', fontFamily: 'Webjet, Arial'}
      : {backgroundImage: 'linear-gradient(red, blue), url("/assets/hero.webp")'},
    requestAnimationFrame: callback => frames.push(callback),
  };
  for (const [key, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {configurable: true, value});
    t.after(() => original ? Object.defineProperty(globalThis, key, original) : delete globalThis[key]);
  }
  return {hero, frames};
}

const tick = () => new Promise(resolve => setImmediate(resolve));

test('hero waits for delayed font AND decoded background, then two paint frames', async t => {
  const font = deferred(), image = deferred();
  const {hero, frames} = browser(t, font.promise, image.promise);
  let revealed = false;
  const ready = waitForHeroPresentation(hero).then(() => { revealed = true; });
  await tick();
  assert.equal(revealed, false);
  font.resolve();
  await tick();
  assert.equal(frames.length, 0, 'font readiness alone must not reveal the hero');
  image.resolve();
  await tick();
  assert.equal(revealed, false);
  frames.shift()();
  assert.equal(revealed, false, 'one animation frame is too early');
  frames.shift()();
  await ready;
  assert.equal(revealed, true);
});

test('failed assets still allow the fallback to become visible', async t => {
  const {hero, frames} = browser(t, Promise.reject(new Error('font blocked')), Promise.reject(new Error('image blocked')));
  const ready = waitForHeroPresentation(hero);
  await tick();
  frames.shift()();
  frames.shift()();
  await ready;
});

test('stalled asset requests cannot keep the hero hidden indefinitely', async t => {
  const {hero, frames} = browser(t, new Promise(() => {}), new Promise(() => {}));
  const ready = waitForHeroPresentation(hero, 10);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(frames.length, 1);
  frames.shift()();
  frames.shift()();
  await ready;
});

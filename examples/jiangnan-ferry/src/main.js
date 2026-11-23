import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createScene, meta } from './scene.js';

async function start() {
  const canvas = document.querySelector('canvas');
  document.title = document.querySelector('h1').textContent = meta.title;
  document.querySelector('header p').textContent = meta.subtitle || '';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.035, 1800);
  const controls = new OrbitControls(camera, canvas);
  const select = document.querySelector('#views');
  const toolbar = document.querySelector('#toolbar');
  const views = new Map();

  const view = {
    camera, controls,
    preset(label, position, target, options = {}) {
      if (views.has(label)) throw new Error('视角名称重复：' + label);
      views.set(label, { position, target, fov: options.fov ?? 42 });
      select.add(new Option(label, label));
    },
    go(label) {
      const pose = views.get(label);
      if (!pose) throw new Error('找不到视角：' + label);
      camera.position.fromArray(pose.position);
      controls.target.fromArray(pose.target);
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
      controls.update();
      select.value = label;
    }
  };
  const ui = {
    button(label, onClick) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', onClick);
      toolbar.append(button);
      return button;
    },
    slider(label, min, max, step, value, onInput) {
      const wrap = document.createElement('label');
      wrap.className = 'slider';
      wrap.textContent = label;
      const input = document.createElement('input');
      input.type = 'range';
      Object.assign(input, { min, max, step, value });
      input.setAttribute('aria-label', label);
      input.addEventListener('input', () => onInput(input.valueAsNumber));
      wrap.append(input);
      toolbar.append(wrap);
      return input;
    }
  };
  const artwork = await createScene({ THREE, scene, view, ui, renderer });
  const first = views.keys().next().value;
  if (!first) throw new Error('场景至少需要一个开场镜头。');
  view.go(first);
  select.addEventListener('change', () => view.go(select.value));
  document.querySelector('#reset').addEventListener('click', () => view.go(first));
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / Math.max(1, innerHeight);
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);
  let previous, elapsed = 0, frames = 0;
  window.sceneMaker = {
    inspect: () => artwork?.inspect?.() ?? {},
    status: () => ({ frames, triangles: renderer.info.render.triangles,
      draws: renderer.info.render.calls, view: select.value,
      camera: camera.position.toArray(), target: controls.target.toArray() })
  };
  renderer.setAnimationLoop(now => {
    const dt = previous === undefined ? 0 : Math.min((now - previous) / 1000, 0.1);
    previous = now;
    elapsed += dt;
    artwork?.update?.(dt, elapsed);
    controls.update();
    renderer.render(scene, camera);
    frames++;
  });
}
start().catch(error => {
  document.querySelector('#error').textContent = '场景加载失败。' + error.message;
  console.error(error);
});

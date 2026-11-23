export const meta = { title: '陶器习作', subtitle: '青釉与赤陶' };

export function createScene({ THREE, scene, view }) {
  scene.background = new THREE.Color(0xc9bba5);
  const surface = new THREE.MeshStandardMaterial({ color: 0xa68262, roughness: 0.84 });
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.28, 0.32, 80), surface);
  plinth.position.y = -0.16;
  scene.add(plinth);
  const profile = [[0.04, 0], [0.43, 0], [0.5, 0.12], [0.71, 0.52], [0.65, 0.85],
    [0.36, 1.08], [0.27, 1.22], [0.30, 1.27], [0.24, 1.27], [0.21, 1.18], [0.34, 1.03]];
  const vessel = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 80),
    new THREE.MeshStandardMaterial({ color: 0x426f68, roughness: 0.23, side: THREE.DoubleSide }));
  vessel.name = '青釉罐';
  scene.add(vessel);
  scene.add(new THREE.HemisphereLight(0xffedcf, 0x696451, 2.1));
  const light = new THREE.DirectionalLight(0xffe8c5, 3);
  light.position.set(-3, 5, 3);
  scene.add(light);
  view.preset('全景', [3, 2.1, 3.6], [0, 0.55, 0]);
  view.preset('釉口细节', [1.2, 1.65, 1.45], [0, 1.03, 0]);
  return { inspect: () => ({ subject: vessel.name }) };
}

import * as THREE from 'three';

// Vertical-gradient sky quad, parented to the camera so it always fills the
// upper view regardless of camera motion (the camera itself doesn't move in
// this slice, but banking/roll later will rotate it, and a camera-child quad
// stays correct without re-deriving frustum coverage each frame).
export function createSky(camera, stage) {
  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const fragmentShader = `
    uniform vec3 uTop;
    uniform vec3 uHorizon;
    varying vec2 vUv;
    void main() {
      // vUv.y: 0 at the bottom edge of the quad (horizon) .. 1 at the top.
      gl_FragColor = vec4(mix(uHorizon, uTop, vUv.y), 1.0);
    }
  `;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: stage.skyTop },
      uHorizon: { value: stage.skyHorizon },
    },
    vertexShader,
    fragmentShader,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  });

  // Sized to cover the camera frustum at a fixed depth in front of it.
  const dist = 500;
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const height = 2 * Math.tan(vFov / 2) * dist * 2.5; // margin for camera pitch
  const width = height * camera.aspect * 1.5;
  const geometry = new THREE.PlaneGeometry(width, height);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 0, -dist);
  mesh.renderOrder = -10;
  camera.add(mesh);
  return mesh;
}

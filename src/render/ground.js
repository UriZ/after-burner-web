import * as THREE from 'three';

// World-space checker on a large flat plane. Perspective does the "fanning
// toward a vanishing point" and scale-growth-near-camera work for free (the
// lesson from the Godot prototype, ARCHITECTURE.md D2) — no manual depth
// curve needed, just scroll the checker phase along world Z over time.
export function createGround(stage) {
  const vertexShader = `
    varying vec3 vWorldPos;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorldPos = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `;
  const fragmentShader = `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uScroll;
    uniform float uTile;
    varying vec3 vWorldPos;
    void main() {
      float cx = floor(vWorldPos.x / uTile);
      float cz = floor((vWorldPos.z + uScroll) / uTile);
      float checker = mod(cx + cz, 2.0);
      gl_FragColor = vec4(mix(uColorA, uColorB, checker), 1.0);
    }
  `;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColorA: { value: stage.groundA },
      uColorB: { value: stage.groundAccent },
      uScroll: { value: 0 },
      uTile: { value: 6.0 },
    },
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
  });

  const geometry = new THREE.PlaneGeometry(4000, 4000, 1, 1);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  return {
    mesh,
    update(dt, scrollSpeed) {
      material.uniforms.uScroll.value += dt * scrollSpeed;
    },
  };
}

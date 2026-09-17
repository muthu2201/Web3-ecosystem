/**
 * WebGL hero: the bonding curve as a three-dimensional surface.
 *
 * This renders the actual pricing function from `@web3eco/core` — the same maths that is
 * differential-tested against the Solidity library — rather than generic floating particles. The
 * ridge running across the mesh IS the curve: height is price, depth is time, and the glowing
 * line traces the current position along it. A hero that shows the product's real mechanism is
 * worth the bytes; one that shows abstract blobs is not.
 *
 * Three things keep it from being a liability:
 *
 *   - It is loaded lazily, so three.js never lands in the initial bundle and the interface is
 *     interactive before the graphics arrive.
 *   - It respects `prefers-reduced-motion` by rendering one static frame instead of animating.
 *   - If WebGL is unavailable or the context is lost, it unmounts itself and the CSS gradient
 *     behind it becomes the hero. Nothing breaks; there is simply no 3D.
 */

import { sampleCurve } from '@web3eco/core';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const V_NATIVE = 1_500_000_000_000_000_000n;
const V_TOKEN = 1_073_000_000n * 10n ** 18n;
const CURVE_SUPPLY = 800_000_000n * 10n ** 18n;

const COLS = 96;
const ROWS = 40;

export function CurveField({ className }: { className?: string }): JSX.Element | null {
  const mountRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      setFailed(true);
      return;
    }

    // Capped at 2 so a 3x-DPR phone does not render nine times the pixels for no visible gain.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 2.55, 5.2);
    camera.lookAt(0, 0.18, 0);

    // The real curve, sampled once and normalised into the mesh's height range.
    const samples = sampleCurve(V_NATIVE, V_TOKEN, CURVE_SUPPLY, COLS);
    const prices = samples.map((s) => Number(s.priceX18) / 1e18);
    const maxPrice = Math.max(...prices);
    const heights = prices.map((p) => (maxPrice > 0 ? p / maxPrice : 0));

    const group = new THREE.Group();
    scene.add(group);

    // --- Wireframe surface -------------------------------------------------
    const positions = new Float32Array(COLS * ROWS * 3);
    const colors = new Float32Array(COLS * ROWS * 3);
    const spanX = 9;
    const spanZ = 5.2;

    const flux = new THREE.Color('#38e0d0');
    const deep = new THREE.Color('#1b3a52');

    for (let z = 0; z < ROWS; z++) {
      for (let x = 0; x < COLS; x++) {
        const i = (z * COLS + x) * 3;
        positions[i] = (x / (COLS - 1) - 0.5) * spanX;
        positions[i + 1] = 0;
        positions[i + 2] = (z / (ROWS - 1) - 0.5) * spanZ;

        // Brighter along the ridge, so the curve reads as the subject of the image.
        const mix = Math.pow(heights[x] ?? 0, 0.7);
        const c = deep.clone().lerp(flux, mix);
        colors[i] = c.r;
        colors[i + 1] = c.g;
        colors[i + 2] = c.b;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Row-wise line segments read as contour lines, which suits a price surface better than a
    // filled mesh: it stays legible at any density and never occludes the ridge.
    const indices: number[] = [];
    for (let z = 0; z < ROWS; z++) {
      for (let x = 0; x < COLS - 1; x++) {
        indices.push(z * COLS + x, z * COLS + x + 1);
      }
    }
    for (let x = 0; x < COLS; x += 4) {
      for (let z = 0; z < ROWS - 1; z++) {
        indices.push(z * COLS + x, (z + 1) * COLS + x);
      }
    }
    geometry.setIndex(indices);

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
    });
    const mesh = new THREE.LineSegments(geometry, material);
    group.add(mesh);

    // --- The curve itself, drawn as a bright ridge line ---------------------
    const ridgeGeometry = new THREE.BufferGeometry();
    const ridgePositions = new Float32Array(COLS * 3);
    ridgeGeometry.setAttribute('position', new THREE.BufferAttribute(ridgePositions, 3));
    const ridge = new THREE.Line(
      ridgeGeometry,
      new THREE.LineBasicMaterial({ color: 0x7ff3e6, transparent: true, opacity: 0.95 }),
    );
    group.add(ridge);

    // --- Marker riding along the curve -------------------------------------
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    group.add(marker);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x38e0d0, transparent: true, opacity: 0.22 }),
    );
    group.add(halo);

    // --- Pointer parallax ---------------------------------------------------
    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };

    function onPointerMove(event: PointerEvent): void {
      const rect = mount!.getBoundingClientRect();
      target.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      target.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    }
    if (!reduced) window.addEventListener('pointermove', onPointerMove, { passive: true });

    const position = new THREE.Vector3();

    function draw(time: number): void {
      const t = reduced ? 6.2 : time * 0.00042;

      pointer.x += (target.x - pointer.x) * 0.045;
      pointer.y += (target.y - pointer.y) * 0.045;

      const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let z = 0; z < ROWS; z++) {
        const depth = z / (ROWS - 1);
        for (let x = 0; x < COLS; x++) {
          const index = z * COLS + x;
          const curve = heights[x] ?? 0;

          // The surface is the curve, extruded backwards and decaying with depth, plus a small
          // travelling wave so it reads as a live market rather than a static diagram.
          const decay = 1 - depth * 0.72;
          const wave = Math.sin(depth * 5.5 - t * 1.7 + (x / COLS) * 3.4) * 0.055 * (1 - depth * 0.45);
          pos.setY(index, curve * 1.55 * decay + wave);
        }
      }
      pos.needsUpdate = true;

      // Ridge follows the front row exactly, so the bright line is literally the curve.
      const ridgePos = ridgeGeometry.getAttribute('position') as THREE.BufferAttribute;
      for (let x = 0; x < COLS; x++) {
        ridgePos.setXYZ(x, pos.getX(x), pos.getY(x) + 0.012, pos.getZ(x));
      }
      ridgePos.needsUpdate = true;

      // Marker sweeps the curve, easing at the ends rather than snapping back.
      const sweep = reduced ? 0.62 : (Math.sin(t * 0.55) + 1) / 2;
      const markerIndex = Math.min(COLS - 1, Math.round(sweep * (COLS - 1)));
      position.set(pos.getX(markerIndex), pos.getY(markerIndex) + 0.05, pos.getZ(markerIndex));
      marker.position.copy(position);
      halo.position.copy(position);
      halo.scale.setScalar(reduced ? 1 : 1 + Math.sin(t * 3.1) * 0.16);

      group.rotation.y = pointer.x * 0.16;
      group.rotation.x = -0.055 + pointer.y * 0.055;

      renderer.render(scene, camera);
    }

    let frame = 0;
    function animate(time: number): void {
      frame = requestAnimationFrame(animate);
      draw(time);
    }

    if (reduced) {
      draw(0); // one static frame, no loop
    } else {
      frame = requestAnimationFrame(animate);
    }

    function onResize(): void {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (reduced) draw(0);
    }
    const observer = new ResizeObserver(onResize);
    observer.observe(mount);

    // A lost context on a memory-pressured mobile GPU would otherwise leave a black rectangle.
    function onContextLost(event: Event): void {
      event.preventDefault();
      setFailed(true);
    }
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      geometry.dispose();
      ridgeGeometry.dispose();
      material.dispose();
      marker.geometry.dispose();
      (marker.material as THREE.Material).dispose();
      halo.geometry.dispose();
      (halo.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  // The hero's gradient sits behind this, so returning null degrades to a flat backdrop rather
  // than an empty hole.
  if (failed) return null;

  return <div ref={mountRef} className={className} aria-hidden />;
}

export default CurveField;

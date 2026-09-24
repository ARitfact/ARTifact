import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Canvas } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

function WireChair() {
  const { scene } = useGLTF("/chair.glb");

  const { preview, material } = useMemo(() => {
    const clone = scene.clone(true);

    const material = new THREE.MeshBasicMaterial({
      color: "#b7cfaa",
      wireframe: true,
      transparent: true,
      opacity: 0.62,
    });

    clone.traverse((node) => {
      if (node.isMesh) {
        node.material = material;
      }
    });

    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const scale =
      2.8 /
      Math.max(size.x, size.y, size.z, 0.001);

    clone.position.set(
      -center.x * scale,
      -center.y * scale,
      -center.z * scale
    );

    clone.scale.setScalar(scale);

    return { preview: clone, material };
  }, [scene]);

  useEffect(
    () => () => material.dispose(),
    [material]
  );

  return <primitive object={preview} />;
}

export default function GenerationProgress({
  status,
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  // Visual loading animation, not Tripo's real percentage.
  const width = Math.min(
    92,
    8 + 84 * (1 - Math.exp(-seconds / 160))
  );

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        height: 550,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        background:
          "radial-gradient(circle at 50% 35%, #263126, #171a14 65%)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: "100%",
          height: 300,
          pointerEvents: "none",
        }}
      >
        <Canvas
          camera={{
            position: [3, 2, 5],
            fov: 42,
          }}
          gl={{ alpha: true }}
        >
          <Suspense fallback={null}>
            <WireChair />
          </Suspense>
        </Canvas>
      </div>

      <h2
        style={{
          margin: "12px 0 16px",
          color: "#f5f5ee",
        }}
      >
        {status === "submitting"
          ? "Uploading your image"
          : "Creating your 3D model"}
      </h2>

      <div
        aria-hidden="true"
        style={{
          width: "min(100%, 560px)",
          height: 12,
          background: "#30352b",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            background: "#d7ff3f",
            borderRadius: 99,
            transition: "width 1s linear",
          }}
        />
      </div>

      <p
        style={{
          color: "#c8d0c1",
          margin: "15px 0 6px",
        }}
      >
        {Math.floor(seconds / 60)}m{" "}
        {String(seconds % 60).padStart(2, "0")}s
        elapsed
      </p>

      <small
        style={{
          color: "#a7aea0",
          lineHeight: 1.5,
        }}
      >
        Your model will appear here when ready.
        Time varies by model and queue.
      </small>

      <small
        style={{
          color: "#8d9984",
          marginTop: 8,
        }}
      >
        Loading animation · exact provider progress
        is unavailable
      </small>
    </div>
  );
}
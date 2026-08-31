import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Center,
  useGLTF,
} from "@react-three/drei";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import * as THREE from "three";

function Model({ url, onDimensions }) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();

    box.getSize(size);

    onDimensions({
      width: size.x,
      height: size.y,
      depth: size.z,
    });
  }, [scene, onDimensions]);

  return (
    <Center>
      <primitive object={scene} />
    </Center>
  );
}

function LoadingModel() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial />
    </mesh>
  );
}

export default function ModelViewer({ modelUrl }) {
  const controlsRef = useRef();
  const viewerRef = useRef();

  const [dimensions, setDimensions] = useState(null);

  const handleDimensions = useCallback((size) => {
  setDimensions(size);
}, []);

  if (!modelUrl) {
    return (
      <div
        style={{
          width: "100%",
          height: "600px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#202020",
          color: "white",
        }}
      >
        <p>Upload an image to generate a 3D model</p>
      </div>
    );
  }

  const resetView = () => {
    controlsRef.current?.reset();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div
      ref={viewerRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "550px",
        background: "#202020",
        position: "relative",
      }}
    >
      <Canvas camera={{ position: [3, 2, 5], fov: 45 }}>
        <ambientLight intensity={1} />

        <directionalLight
          position={[5, 5, 5]}
          intensity={2}
        />

        <Environment preset="studio" />

        <Suspense fallback={<LoadingModel />}>
          <Model
            url={modelUrl}
            onDimensions={handleDimensions}
          />
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          enableRotate
          enableZoom
          enablePan
          rotateSpeed={0.8}
          zoomSpeed={0.8}
          panSpeed={0.8}
        />
      </Canvas>

      {/* DIMENSIONS */}

      {dimensions && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            background: "rgba(15,15,15,0.9)",
            border: "1px solid #333",
            borderRadius: "12px",
            padding: "14px 18px",
            color: "white",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "#777",
              letterSpacing: "1px",
              marginBottom: "8px",
            }}
          >
            MODEL DIMENSIONS
          </div>

          <div
            style={{
              display: "flex",
              gap: "18px",
            }}
          >
            <div>
              <strong>W</strong>
              <br />
              {dimensions.width.toFixed(2)}
            </div>

            <div>
              <strong>H</strong>
              <br />
              {dimensions.height.toFixed(2)}
            </div>

            <div>
              <strong>D</strong>
              <br />
              {dimensions.depth.toFixed(2)}
            </div>
          </div>

          <div
            style={{
              marginTop: "8px",
              fontSize: "10px",
              color: "#666",
            }}
          >
            Model units
          </div>
        </div>
      )}

      {/* CONTROLS */}

      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "10px",
          background: "rgba(15,15,15,0.9)",
          padding: "8px",
          borderRadius: "12px",
          border: "1px solid #333",
        }}
      >
        <button
          onClick={resetView}
          style={{
            background: "#202020",
            color: "white",
            border: "1px solid #444",
            borderRadius: "8px",
            padding: "9px 14px",
            cursor: "pointer",
          }}
        >
          ↻ Reset
        </button>

        <button
          onClick={toggleFullscreen}
          style={{
            background: "#202020",
            color: "white",
            border: "1px solid #444",
            borderRadius: "8px",
            padding: "9px 14px",
            cursor: "pointer",
          }}
        >
          ⛶ Fullscreen
        </button>
      </div>
    </div>
  );
}
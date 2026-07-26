import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

interface Props {
  modelUrl: string;
}

export default function DroneModelViewerScene({ modelUrl }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 1, 3], fov: 50 }}
      style={{ width: "100%", height: "100%" }}
      dpr={[1, 1.5]}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Suspense fallback={null}>
        <Model url={modelUrl} />
        <Environment preset="city" />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={1}
        maxDistance={10}
        autoRotate
        autoRotateSpeed={1}
      />
    </Canvas>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Html, Lightformer, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

export type SceneCategory = { slug: string; title: string; color: string };

// the platform colors come from the category colors
const HEX: Record<string, string> = {
  pink: "#F4A5B8", lavender: "#B9B1F4", butter: "#F6D96B", mint: "#A9D8C2", coral: "#FC563C",
};

// ---------- the objects that stand on the platforms ----------
function Cap() {
  return (
    <group position={[0, 0.5, 0]} rotation={[0.15, 0.5, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.62, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color="#242424" roughness={0.45} clearcoat={0.4} side={THREE.DoubleSide} />
      </mesh>
      <RoundedBox args={[0.95, 0.07, 0.6]} radius={0.035} position={[0, 0.02, 0.62]} castShadow>
        <meshPhysicalMaterial color="#FC563C" roughness={0.4} clearcoat={0.5} />
      </RoundedBox>
    </group>
  );
}

// a vase is a curve spun around an axis (a lathe)
const VASE_PROFILE = [
  [0.001, 0], [0.34, 0], [0.44, 0.14], [0.52, 0.42], [0.38, 0.78], [0.2, 0.98], [0.26, 1.12], [0.22, 1.12],
].map(([x, y]) => new THREE.Vector2(x, y));

function Vase() {
  return (
    <group>
      <mesh castShadow>
        <latheGeometry args={[VASE_PROFILE, 40]} />
        <meshPhysicalMaterial color="#FFFBF5" roughness={0.35} clearcoat={0.6} side={THREE.DoubleSide} />
      </mesh>
      {[[0, 1.35, 0, 0.32], [-0.28, 1.2, 0.05, 0.2], [0.27, 1.26, -0.05, 0.22]].map(([x, y, z, r], index) => (
        <mesh key={index} position={[x, y, z]} scale={[1, 1.2, 1]} castShadow>
          <sphereGeometry args={[r, 24, 24]} />
          <meshPhysicalMaterial color="#7FBF9E" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Bottle() {
  return (
    <group position={[0, 0.5, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.95, 32]} />
        <meshPhysicalMaterial color="#FFFBF5" roughness={0.3} clearcoat={0.7} />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.13, 0.28, 24]} />
        <meshPhysicalMaterial color="#FFFBF5" roughness={0.3} clearcoat={0.7} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.17, 24, 24]} />
        <meshPhysicalMaterial color="#FC563C" roughness={0.35} clearcoat={0.6} />
      </mesh>
    </group>
  );
}

function Ring() {
  return (
    <group position={[0, 0.75, 0]} rotation={[Math.PI / 2.4, 0, 0]}>
      <mesh castShadow>
        <torusGeometry args={[0.55, 0.11, 24, 64]} />
        <meshPhysicalMaterial color="#FC563C" roughness={0.3} clearcoat={0.7} />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <octahedronGeometry args={[0.2]} />
        <meshPhysicalMaterial color="#FFFBF5" roughness={0.2} clearcoat={1} />
      </mesh>
    </group>
  );
}

// the object that suits a category (by its name), otherwise one in turn
const pickObject = (title: string, index: number) => {
  const name = title.toLowerCase();
  if (/street|fashion|cloth|wear|shoe/.test(name)) return Cap;
  if (/home|living|decor|kitchen/.test(name)) return Vase;
  if (/beauty|skin|care|cosmetic/.test(name)) return Bottle;
  if (/access|jewel|bag/.test(name)) return Ring;
  return [Cap, Vase, Bottle, Ring][index % 4];
};

// ---------- one platform with its object ----------
function Station({ category, position, index }: { category: SceneCategory; position: [number, number, number]; index: number }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const group = useRef<THREE.Group>(null);
  const Item = pickObject(category.title, index);

  // smooth growing and shrinking when the mouse comes and goes
  useFrame((_, delta) => {
    if (!group.current) return;
    const target = hovered ? 1.14 : 1;
    group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, target, 8, delta));
  });

  return (
    <group position={position}>
      <mesh position={[0, -0.2, 0]} receiveShadow>
        <cylinderGeometry args={[1.15, 1.25, 0.4, 48]} />
        <meshPhysicalMaterial color={HEX[category.color] ?? "#B9B1F4"} roughness={0.45} clearcoat={0.5} />
      </mesh>

      <group
        ref={group}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (category.slug) {
            router.push(`/category/${category.slug}`);
          }
        }}
      >
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.6}>
          <Item />
        </Float>
        {hovered && (
          <Html center position={[0, 2, 0]}>
            <div className="whitespace-nowrap rounded-full border-2 border-charcoal bg-paper px-3 py-1 text-sm font-bold shadow-sticker-sm">
              {category.title}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

// ---------- the whole island leans toward the mouse ----------
function Rig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const width = useThree((state) => state.size.width);

  useFrame((state, delta) => {
    if (!group.current) return;
    // state.pointer goes from -1 to 1 across the canvas. damp() makes the movement smooth, not jumpy
    const turn = Math.PI / 5 + state.pointer.x * 0.35;
    const tilt = -state.pointer.y * 0.15;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, turn, 4, delta);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, tilt, 4, delta);
  });

  // on a wide screen the island sits on the right, next to the headline
  return <group ref={group} position={[width > 900 ? 2.2 : 0, 0, 0]}>{children}</group>;
}

const POSITIONS: Array<[number, number, number]> = [
  [-1.9, 0, 0.6], [0.2, 0.4, -1.3], [2.1, 0, 0.5], [0.1, -0.15, 2],
];

// small floating shapes for the playful feeling
function Decor() {
  return (
    <>
      <Float speed={3} floatIntensity={1.6} rotationIntensity={1.5}>
        <mesh position={[-3, 2.2, -1]}>
          <octahedronGeometry args={[0.3]} />
          <meshPhysicalMaterial color="#F6D96B" roughness={0.3} clearcoat={0.8} />
        </mesh>
      </Float>
      <Float speed={2.5} floatIntensity={1.2} rotationIntensity={1}>
        <mesh position={[3.2, 2.6, -1.5]}>
          <torusGeometry args={[0.28, 0.1, 16, 32]} />
          <meshPhysicalMaterial color="#F4A5B8" roughness={0.3} clearcoat={0.8} />
        </mesh>
      </Float>
      <Float speed={3.5} floatIntensity={1.4}>
        <mesh position={[1.2, 3, 1]}>
          <sphereGeometry args={[0.2, 24, 24]} />
          <meshPhysicalMaterial color="#FC563C" roughness={0.3} clearcoat={0.8} />
        </mesh>
      </Float>
    </>
  );
}

export default function HeroScene({ categories }: { categories: SceneCategory[] }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  // when the hero is scrolled out of view, the drawing stops (saves battery and speed)
  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapper} className="h-full w-full">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        frameloop={visible ? "always" : "never"}
        camera={{ position: [0, 3.4, 9], fov: 32 }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[4, 7, 4]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
        {/* soft light panels, so glossy surfaces get nice highlights (no image download needed) */}
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2.5} position={[0, 5, -4]} scale={[12, 6, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[-6, 1, 3]} scale={[4, 8, 1]} />
        </Environment>

        <Rig>
          {categories.slice(0, 4).map((category, index) => (
            <Station key={category.slug || category.title} category={category} position={POSITIONS[index]} index={index} />
          ))}
          <Decor />
        </Rig>

        <ContactShadows position={[0, -0.42, 0]} opacity={0.3} scale={16} blur={2.6} far={4} />
      </Canvas>
    </div>
  );
}
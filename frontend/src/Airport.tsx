import {
  memo,
  useRef,
  useMemo,
  useEffect,
  useState,
  useLayoutEffect,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import Html from "./SpatialLabel";
import * as THREE from "three";
import type { State, RequestRow } from "./types";
const CYAN = "#8de5ed",
  GREEN = "#9ae7bf",
  CORAL = "#ef9686";
const gateZ = [-4, 0, 4];
function Block({
  at,
  size,
  color = "#223945",
  metal = 0.4,
  ...props
}: {
  at: [number, number, number];
  size: [number, number, number];
  color?: string;
  metal?: number;
  [key: string]: unknown;
}) {
  return (
    <mesh position={at} castShadow receiveShadow {...props}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.42} metalness={metal} />
    </mesh>
  );
}
function Rollers({ length }: { length: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = Math.ceil(length * 3);
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      matrix.makeTranslation(-length / 2 + i / 3, 0.65, 0);
      ref.current!.setMatrixAt(i, matrix);
    }
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [length, count]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.018, 0.035, 0.9]} />
      <meshStandardMaterial color="#50616a" roughness={0.45} metalness={0.4} />
    </instancedMesh>
  );
}
const Belt = memo(function Belt({
  from,
  to,
}: {
  from: [number, number];
  to: [number, number];
}) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  return (
    <group
      position={[(from[0] + to[0]) / 2, 0, (from[1] + to[1]) / 2]}
      rotation={[0, -Math.atan2(to[1] - from[1], to[0] - from[0]), 0]}
    >
      <Block at={[0, 0.48, 0]} size={[length, 0.3, 1.05]} color="#111f29" />
      {[-0.55, 0.55].map((z) => (
        <group key={z}>
          <Block at={[0, 0.7, z]} size={[length, 0.14, 0.09]} color="#68818b" />
          <Block at={[0, 0.78, z]} size={[length, 0.025, 0.03]} color={CYAN} />
        </group>
      ))}
      <Rollers length={length} />
      {[-length / 3, length / 3].map((x) => (
        <Block key={x} at={[x, 0.22, 0]} size={[0.16, 0.45, 0.8]} />
      ))}
    </group>
  );
});
const Bag = memo(function Bag({
  scale = 1,
  color = CYAN,
}: {
  scale?: number;
  color?: string;
}) {
  return (
    <group scale={scale}>
      <RoundedBox
        args={[0.46, 0.58, 0.28]}
        radius={0.07}
        smoothness={2}
        castShadow
      >
        <meshStandardMaterial color={color} roughness={0.28} metalness={0.65} />
      </RoundedBox>
      <Block at={[0, 0.4, 0]} size={[0.2, 0.035, 0.05]} color="#17212b" />
      {[-0.085, 0.085].map((x) => (
        <Block
          key={x}
          at={[x, 0.35, 0]}
          size={[0.035, 0.1, 0.05]}
          color="#17212b"
        />
      ))}
      {[-0.15, -0.05, 0.05, 0.15].map((x) => (
        <Block
          key={x}
          at={[x, 0, 0.148]}
          size={[0.018, 0.43, 0.012]}
          color={color}
        />
      ))}
      <Block at={[0.14, 0.2, 0.17]} size={[0.11, 0.17, 0.02]} color="#f4e9d1" />
      {[-0.15, 0.15].map((x) => (
        <mesh key={x} position={[x, -0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.22, 8]} />
          <meshStandardMaterial color="#060d12" />
        </mesh>
      ))}
    </group>
  );
});
function HeroBag({ reduced }: { reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock, pointer }, dt) => {
    if (g.current && !reduced) {
      g.current.rotation.y = THREE.MathUtils.damp(
        g.current.rotation.y,
        -0.35 + pointer.x * 0.25,
        5,
        dt,
      );
      g.current.position.y = 6 + Math.sin(clock.elapsedTime * 0.6) * 0.12;
    }
  });
  return (
    <group ref={g} position={[5, 6, -2]} rotation={[0.12, -0.35, 0.08]}>
      <Bag scale={10} color="#a9ccd5" />
      <Html position={[3, -1.4, 0]} center className="tag" zIndexRange={[3, 0]}>
        <span>GET /departures</span>
        <strong>REQ—001</strong>
        <i>ONE WAY · TCP/IP</i>
      </Html>
    </group>
  );
}
function position(r: RequestRow, slot = r.n): [number, number, number] {
  const z = gateZ[r.gate ?? 0];
  switch (r.status) {
    case "created":
      return [-8, 1, 0];
    case "security":
      return [-6, 1, 0];
    case "routing":
      return [-2, 1, z];
    case "queued":
    case "waiting":
      return [
        0.5 + (slot % 3) * 0.28,
        1,
        z + (Math.floor(slot / 3) - 1.5) * 0.25,
      ];
    case "processing":
      return [3.6, 1, z];
    case "retrying":
      return [-3, 1, z];
    case "succeeded":
      return [7.2 + (r.n % 5) * 0.25, 0.95, -3.7 + Math.floor(r.n / 5) * 0.38];
    case "http_error":
      return [7, 1, 5];
    default:
      return [0.5 + (r.n % 10) * 0.28, 0.8, 5.6 + Math.floor(r.n / 10) * 0.2];
  }
}
function Traffic({
  state,
  reduced,
  onRequest,
}: {
  state: State | null;
  reduced: boolean;
  onRequest: (id: number) => void;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null),
    current = useRef(new Map<number, THREE.Vector3>()),
    paths = useRef(
      new Map<number, { status: string; points: THREE.Vector3[] }>(),
    );
  const dummy = useMemo(() => new THREE.Object3D(), []),
    color = useMemo(() => new THREE.Color(), []),
    lastTime = useRef(0);
  const slots = useMemo(() => {
    const counts: Record<string, number> = {};
    return new Map(
      (state?.requests ?? []).map((r) => {
        const key = `${r.gate}:${r.status}`;
        const slot = counts[key] ?? 0;
        counts[key] = slot + 1;
        return [r.n, slot];
      }),
    );
  }, [state]);
  useEffect(() => {
    if ((state?.time ?? 0) < lastTime.current) {
      current.current.clear();
      paths.current.clear();
    }
    lastTime.current = state?.time ?? 0;
  }, [state?.time]);
  useFrame((_, dt) => {
    if (!mesh.current) return;
    const rows = state?.requests ?? [];
    mesh.current.count = rows.length;
    rows.forEach((r, i) => {
      const target = new THREE.Vector3(...position(r, slots.get(r.n)));
      let p = current.current.get(r.n);
      if (!p) {
        p = target.clone();
        current.current.set(r.n, p);
      }
      if (reduced || state?.replay != null) {
        p.copy(target);
        paths.current.delete(r.n);
      } else {
        let route = paths.current.get(r.n);
        if (!route || route.status !== r.status) {
          const points: THREE.Vector3[] = [];
          const z = gateZ[r.gate ?? 0];
          if (
            ["routing", "queued", "waiting", "processing"].includes(r.status)
          ) {
            if (p.x < -3.01) points.push(new THREE.Vector3(-3, 1, 0));
            if (p.x < -1.9 && Math.abs(p.z - z) > 0.05)
              points.push(new THREE.Vector3(-3, 1, z));
          } else if (r.status === "succeeded") {
            points.push(
              new THREE.Vector3(7, 1, z),
              new THREE.Vector3(7, 1, target.z),
            );
          } else if (r.status === "timed_out") {
            points.push(
              new THREE.Vector3(0.5, 1, z),
              new THREE.Vector3(0.5, 0.8, 5.6),
            );
          }
          points.push(target);
          route = { status: r.status, points };
          paths.current.set(r.n, route);
        }
        if (route.points.length) route.points[route.points.length - 1] = target;
        let distance = Math.min(dt, 0.05) * 24;
        while (route.points.length && distance > 0) {
          const next = route.points[0],
            gap = p.distanceTo(next);
          if (gap <= distance) {
            p.copy(next);
            route.points.shift();
            distance -= gap;
          } else {
            p.lerp(next, distance / gap);
            distance = 0;
          }
        }
      }
      dummy.position.copy(p);
      dummy.rotation.set(0, 0.12, 0);
      dummy.scale.set(0.24, 0.34, 0.22);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
      color.set(
        r.status === "timed_out"
          ? CORAL
          : r.status === "succeeded"
            ? GREEN
            : CYAN,
      );
      mesh.current!.setColorAt(i, color);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor)
      mesh.current.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, 100]}
      castShadow
      onClick={(e) => {
        e.stopPropagation();
        const r = state?.requests[e.instanceId ?? -1];
        if (r) onRequest(r.n);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial metalness={0.5} roughness={0.35} />
    </instancedMesh>
  );
}
const Infrastructure = memo(function Infrastructure() {
  return (
    <>
      <RoundedBox
        position={[0, -0.25, 0]}
        args={[20, 0.6, 16]}
        radius={0.4}
        smoothness={3}
        receiveShadow
      >
        <meshStandardMaterial
          color="#142832"
          roughness={0.48}
          metalness={0.5}
        />
      </RoundedBox>
      <Block at={[0, -0.59, 0]} size={[19, 0.15, 15]} color="#050c12" />
      <Belt from={[-8, 0]} to={[-3, 0]} />
      <Belt from={[-3, -4]} to={[-3, 4]} />
      {gateZ.map((z) => (
        <group key={z}>
          <Belt from={[-3, z]} to={[7, z]} />
          <Block at={[3.5, 0.15, z]} size={[3.6, 0.12, 2.7]} color="#344c57" />
        </group>
      ))}
      <Belt from={[7, -4]} to={[7, 4]} />
      <group position={[-6, 0, 0]}>
        <Block at={[0, 1.4, -0.8]} size={[0.55, 2.3, 0.35]} color="#90aab4" />
        <Block at={[0, 1.4, 0.8]} size={[0.55, 2.3, 0.35]} color="#90aab4" />
        <Block at={[0, 2.6, 0]} size={[0.55, 0.25, 1.9]} color="#90aab4" />
        <Block at={[0.3, 2.4, 0]} size={[0.04, 0.05, 1.3]} color={CYAN} />
      </group>
      <group position={[-6, 0, -4.8]}>
        <Block at={[0, 1, 0]} size={[1.2, 2, 1.2]} />
        <RoundedBox position={[0, 2.4, 0]} args={[2.5, 0.9, 2.3]} radius={0.12}>
          <meshStandardMaterial
            color="#7396a5"
            metalness={0.7}
            roughness={0.3}
          />
        </RoundedBox>
        <Block at={[0, 3, 0]} size={[2.7, 0.16, 2.5]} color="#304c5d" />
        <Block at={[0, 3.8, 0]} size={[0.045, 1.5, 0.045]} color="#b9d8de" />
        <mesh position={[0, 4.6, 0]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshBasicMaterial color={CORAL} />
        </mesh>
      </group>
      {[-8, -6, -4, -2, 0, 2, 4, 6, 8].map((x) => (
        <Block
          key={x}
          at={[x, 0.08, -7.2]}
          size={[0.7, 0.025, 0.045]}
          color="#779199"
        />
      ))}
      <Html
        position={[-7, 0.2, 3]}
        center
        className="scene-label"
        zIndexRange={[2, 0]}
      >
        01 / CHECK-IN
      </Html>
      <Html
        position={[-2, 0.2, 6]}
        center
        className="scene-label"
        zIndexRange={[2, 0]}
      >
        02 / ROUTING
      </Html>
      <Html
        position={[8, 0.2, 5.5]}
        center
        className="scene-label"
        zIndexRange={[2, 0]}
      >
        04 / ARRIVALS
      </Html>
    </>
  );
});
function Scene({
  state,
  landing,
  reduced,
  onGate,
  onRequest,
  reset,
  follow,
}: {
  state: State | null;
  landing: boolean;
  reduced: boolean;
  onGate: (i: number) => void;
  onRequest: (i: number) => void;
  reset: number;
  follow: number | null;
}) {
  const controls = useRef<any>(null),
    world = useRef<THREE.Group>(null),
    hero = useRef<THREE.Group>(null),
    zoomTarget = useRef<number | null>(null);
  const { camera, size } = useThree();
  useEffect(() => {
    camera.position.set(17, 16, 21);
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
  }, [reset, camera]);
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    zoomTarget.current = Math.min(
      size.width / (landing ? 34 : 32),
      size.height / (landing ? 23 : 21),
    );
  }, [camera, size.width, size.height, landing, reset]);
  useFrame((_, dt) => {
    if (world.current) {
      const target = new THREE.Vector3(...(landing ? [5, 0, -2] : [0, 0, 0]));
      if (reduced) world.current.position.copy(target);
      else world.current.position.lerp(target, 1 - Math.exp(-dt * 4));
    }
    if (hero.current) {
      const target = landing ? 1 : 0.001;
      hero.current.scale.setScalar(
        reduced
          ? target
          : THREE.MathUtils.damp(hero.current.scale.x, target, 5, dt),
      );
    }
    if (zoomTarget.current !== null) {
      const cam = camera as THREE.OrthographicCamera;
      cam.zoom = reduced
        ? zoomTarget.current
        : THREE.MathUtils.damp(cam.zoom, zoomTarget.current, 5, dt);
      cam.updateProjectionMatrix();
      if (Math.abs(cam.zoom - zoomTarget.current) < 0.05)
        zoomTarget.current = null;
    }
    if (follow !== null && controls.current) {
      const row = state?.requests.find((r) => r.n === follow);
      if (row) {
        const slot = state!.requests
          .filter(
            (other) => other.gate === row.gate && other.status === row.status,
          )
          .findIndex((other) => other.n === row.n);
        const target = new THREE.Vector3(...position(row, slot));
        controls.current.target.lerp(
          target,
          reduced ? 1 : 1 - Math.exp(-dt * 4),
        );
        controls.current.update();
      }
    }
  });
  return (
    <>
      <color attach="background" args={["#08151f"]} />
      <fog attach="fog" args={["#08151f", 35, 80]} />
      <ambientLight intensity={1.2} />
      <hemisphereLight args={["#d5f1ff", "#152d36", 2]} />
      <directionalLight
        position={[-8, 16, 5]}
        intensity={3}
        color="#d2e7f2"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight
        position={[10, 7, -8]}
        intensity={2.5}
        color="#67b9d7"
      />
      <group ref={world}>
        <Infrastructure />
        {gateZ.map((z, i) => (
          <group
            key={i}
            position={[3.5, 0, z]}
            onClick={(e) => {
              e.stopPropagation();
              onGate(i);
            }}
          >
            <Block
              at={[0, 1.5, -0.98]}
              size={[2.8, 2.7, 0.2]}
              color="#364d58"
            />
            <mesh position={[0, 1.95, 1.05]}>
              <boxGeometry args={[2.65, 0.9, 0.04]} />
              <meshPhysicalMaterial
                color="#8ed0e1"
                transparent
                opacity={0.25}
                roughness={0.12}
                metalness={0.3}
              />
            </mesh>
            {[-0.9, 0, 0.9].map((x) => (
              <Block
                key={x}
                at={[x, 1.95, 1.07]}
                size={[0.035, 0.9, 0.06]}
                color="#91b4bf"
              />
            ))}
            <Block
              at={[0, 0.85, -0.85]}
              size={[2.5, 0.06, 0.06]}
              color={CYAN}
            />
            <Block at={[0, 2.9, 0]} size={[3.2, 0.18, 2.3]} color="#718d98" />
            {[-1.4, 1.4].map((x) => (
              <Block
                key={x}
                at={[x, 1.4, 0]}
                size={[0.12, 2.8, 2.1]}
                color="#506d79"
              />
            ))}
            <Block
              at={[0, 2.77, 1.16]}
              size={[2.7, 0.045, 0.04]}
              color={
                !state?.config.scenario && state?.gates[i].failures
                  ? CORAL
                  : CYAN
              }
            />
            {!!state?.config.scenario &&
              Array.from(
                { length: state.config.capacity ?? 2 },
                (_, worker) => (
                  <Block
                    key={`worker-${worker}`}
                    at={[
                      -1.1 + (worker % 4) * 0.7,
                      3.1 + Math.floor(worker / 4) * 0.25,
                      -0.5,
                    ]}
                    size={[0.45, 0.18, 0.65]}
                    color={state.config.routing[i] ? "#91bfc9" : "#35434e"}
                  />
                ),
              )}
            <Html position={[0, 3.55, 0]} center zIndexRange={[3, 0]}>
              <button
                className="gate-label"
                onClick={() => onGate(i)}
                aria-label={`Inspect gate ${"ABC"[i]}`}
              >
                <b>{"ABC"[i]}</b>
                <span>
                  {state?.config.scenario
                    ? state.config.routing[i]
                      ? `${state.config.capacity} WORKERS`
                      : "ROUTE CLOSED"
                    : `GATE / 0${i + 1}`}
                </span>
              </button>
            </Html>
          </group>
        ))}
        {!landing && (
          <Traffic state={state} reduced={reduced} onRequest={onRequest} />
        )}
      </group>
      <group ref={hero}>
        <HeroBag reduced={reduced || !landing} />
      </group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.95, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#09151c" roughness={0.6} />
      </mesh>
      <OrbitControls
        ref={controls}
        enabled={!landing}
        enableDamping={!reduced}
        dampingFactor={0.08}
        minZoom={15}
        maxZoom={100}
        minPolarAngle={0.25}
        maxPolarAngle={1.3}
        enablePan
        screenSpacePanning
      />
    </>
  );
}
export default function Airport(props: Parameters<typeof Scene>[0]) {
  const [failed, setFailed] = useState(false);
  const cleanupContext = useRef<(() => void) | null>(null);
  useLayoutEffect(
    () => () => {
      cleanupContext.current?.();
    },
    [],
  );
  return (
    <div
      className={`airport-canvas ${props.landing ? "landing-canvas" : ""}`}
      aria-label="Interactive miniature baggage routing airport"
    >
      {failed ? (
        <div className="canvas-fallback">
          3D rendering is unavailable. All simulation controls and request
          traces remain available.
        </div>
      ) : (
        <Canvas
          orthographic
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [17, 16, 21], zoom: 35, near: 0.1, far: 200 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            const canvas = gl.domElement;
            const lost = () => setFailed(true);
            canvas.addEventListener("webglcontextlost", lost, { once: true });
            cleanupContext.current = () =>
              canvas.removeEventListener("webglcontextlost", lost);
          }}
        >
          <Scene {...props} />
        </Canvas>
      )}
    </div>
  );
}

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Vector3 } from "three";

/** A DOM label projected into the scene, with an isolated root per mount.
 * Dispose outside the R3F commit so React never reuses a pending DOM root. */
export default function SpatialLabel({
  position,
  children,
  className,
  zIndexRange = [3, 0],
}: {
  position: [number, number, number];
  children: ReactNode;
  className?: string;
  center?: boolean;
  zIndexRange?: [number, number];
}) {
  const group = useRef<Group>(null);
  const dom = useRef<HTMLDivElement | null>(null);
  const root = useRef<Root | null>(null);
  const point = useRef(new Vector3());
  const scale = useRef(new Vector3());
  const { gl } = useThree();
  useLayoutEffect(() => {
    const element = document.createElement("div");
    element.style.cssText = `position:absolute;top:0;left:0;z-index:${zIndexRange[0]};`;
    gl.domElement.parentElement?.appendChild(element);
    const mountedRoot = createRoot(element);
    dom.current = element;
    root.current = mountedRoot;
    return () => {
      dom.current = null;
      root.current = null;
      element.remove();
      queueMicrotask(() => mountedRoot.unmount());
    };
  }, [gl]);
  useLayoutEffect(() => {
    root.current?.render(
      <div className={className} style={{ transform: "translate(-50%, -50%)" }}>
        {children}
      </div>,
    );
  }, [children, className]);
  useFrame(({ camera, size }) => {
    if (!group.current || !dom.current) return;
    group.current.getWorldPosition(point.current).project(camera);
    dom.current.style.transform = `translate3d(${((point.current.x + 1) * size.width) / 2}px,${((1 - point.current.y) * size.height) / 2}px,0)`;
    group.current.getWorldScale(scale.current);
    dom.current.style.display =
      point.current.z > 1 || scale.current.length() < 0.05 ? "none" : "";
  });
  return <group ref={group} position={position} />;
}

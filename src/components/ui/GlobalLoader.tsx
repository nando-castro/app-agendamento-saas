import anim from "@/assets/lottie/auth-check.json";
import Lottie from "lottie-react";

export default function GlobalLoader({ label }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(6px)",
        padding: 24,
      }}
    >
      <div style={{ width: 280, textAlign: "center" }}>
        <Lottie animationData={anim} loop />
        {label ? (
          <div style={{ marginTop: 12, opacity: 0.75, fontSize: 14 }}>
            {label}
          </div>
        ) : null}
      </div>
    </div>
  );
}

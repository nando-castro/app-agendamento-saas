import anim from "@/assets/lottie/auth-check.json";
import Lottie from "lottie-react";

export default function FullscreenLoader({ label }: { label?: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: 280, textAlign: "center" }}>
        <Lottie animationData={anim} loop />
        {label ? <div style={{ marginTop: 12, opacity: 0.75, fontSize: 14 }}>{label}</div> : null}
      </div>
    </div>
  );
}

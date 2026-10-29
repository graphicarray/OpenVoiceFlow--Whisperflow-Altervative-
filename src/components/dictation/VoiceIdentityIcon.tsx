import { useId } from "react";
import { cn } from "../lib/utils";
import { AGENT_MODE_PATH } from "./voiceIdentityMorph";

interface VoiceIdentityIconProps {
  size?: number;
  agentMode?: boolean;
  className?: string;
}

/**
 * Renders the Graphicarray logo mark in normal dictation mode and transitions
 * smoothly to the Agent sparkle mark when agentMode is active.
 */
export function VoiceIdentityIcon({
  size = 24,
  agentMode = false,
  className,
}: VoiceIdentityIconProps) {
  const uid = useId().replace(/:/g, "");
  const g1 = `vi-g1-${uid}`;
  const g2 = `vi-g2-${uid}`;
  const g3 = `vi-g3-${uid}`;

  return (
    <span
      className={cn("voice-identity-icon relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      data-agent-mode={agentMode ? "true" : "false"}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="voice-identity-svg absolute inset-0 overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={g1} cx="49.12" cy="57.59" fx="49.12" fy="57.59" r="20.9" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#00cdff" />
            <stop offset=".2" stopColor="#00c6ff" />
            <stop offset=".48" stopColor="#00b5ff" />
            <stop offset=".79" stopColor="#0099ff" />
            <stop offset="1" stopColor="#0083ff" />
          </radialGradient>
          <radialGradient id={g2} cx="28.88" cy="26.12" fx="28.88" fy="26.12" r="41.83" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#00cdff" />
            <stop offset=".23" stopColor="#00c9ff" />
            <stop offset=".47" stopColor="#00bdff" />
            <stop offset=".7" stopColor="#00a9ff" />
            <stop offset=".93" stopColor="#008dff" />
            <stop offset="1" stopColor="#0083ff" />
          </radialGradient>
          <radialGradient id={g3} cx="59" cy="46.76" fx="59" fy="46.76" r="33.78" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#00cdff" />
            <stop offset=".2" stopColor="#00c6ff" />
            <stop offset=".48" stopColor="#00b5ff" />
            <stop offset=".79" stopColor="#0099ff" />
            <stop offset="1" stopColor="#0083ff" />
          </radialGradient>
        </defs>
        <g
          className="voice-identity-construction transition-opacity duration-300"
          style={{ opacity: agentMode ? 0 : 1 }}
          transform="translate(-3.6, -3.6) scale(0.312)"
        >
          <polygon fill={`url(#${g1})`} points="49.78 61.93 39.27 63.71 39.27 63.71 33.89 73.04 49.78 70.35 66.11 73.15 60.72 63.81 49.78 61.93" />
          <path fill={`url(#${g2})`} d="M39.27,46.88l5.38-9.33.45-.79,2.54-4.4c1.03-1.78,3.6-1.78,4.63,0l2.54,4.4.5.87,10.78,1.85h0l-5.39-9.34-1.04-1.8-.11-.2c-4.27-7.39-14.94-7.39-19.2,0l-.11.2-.98,1.7-5.38,9.33-5.38,9.32-4.21,7.29c-2.78,4.82-1.54,10.27,1.85,13.63l2.36-4.09,5.38-9.32,5.38-9.33Z" />
          <path fill={`url(#${g3})`} d="M75.7,56.1l-4.2-7.27-10.78-1.85-10.73-1.84-.02.04-5.31,9.2,5.13-.87,5.55.95,10.78,1.85h0s5.39,9.34,5.39,9.34l2.35,4.07c3.39-3.37,4.63-8.81,1.84-13.63Z" />
        </g>
        <path
          className="voice-identity-final-agent transition-opacity duration-300"
          d={AGENT_MODE_PATH}
          fill="currentColor"
          transform="scale(1.2)"
          style={{ opacity: agentMode ? 1 : 0 }}
        />
      </svg>
    </span>
  );
}

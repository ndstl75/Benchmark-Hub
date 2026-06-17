/** PhysicianBench-inspired hero diagram for PharmDrugBench leaderboard. */

type PharmDrugBenchHeroDiagramProps = {
  className?: string;
};

export function PharmDrugBenchHeroDiagram({ className = "" }: PharmDrugBenchHeroDiagramProps) {
  return (
    <svg
      viewBox="0 0 920 340"
      className={`w-full max-w-6xl mx-auto ${className}`}
      role="img"
      aria-label="PharmDrugBench agent loop: LLM receives medication prompts, responds, and is scored with paper-aligned benchmark metrics"
    >
      <defs>
        <style>{`
          .pdb-agent {
            animation: pdb-agent-bob 3.8s ease-in-out infinite;
            transform-origin: 152px 170px;
          }

          .pdb-environment {
            animation: pdb-panel-glow 5.5s ease-in-out infinite;
            transform-origin: 610px 170px;
          }

          .pdb-action-line,
          .pdb-observation-line,
          .pdb-score-line {
            stroke-dashoffset: 0;
          }

          .pdb-action-line {
            animation: pdb-flow-forward 1.8s linear infinite;
          }

          .pdb-observation-line {
            animation: pdb-flow-back 2.1s linear infinite;
          }

          .pdb-score-line {
            animation: pdb-flow-forward 2.4s linear infinite;
          }

          .pdb-signal-action {
            animation: pdb-signal-action 1.9s ease-in-out infinite;
          }

          .pdb-signal-observation {
            animation: pdb-signal-observation 2.1s ease-in-out infinite;
          }

          .pdb-eye {
            animation: pdb-eye-pulse 3.2s ease-in-out infinite;
          }

          .pdb-live-dot {
            animation: pdb-live-pulse 1.8s ease-in-out infinite;
          }

          .pdb-tile {
            animation: pdb-tile-rise 5.2s ease-in-out infinite;
          }

          @keyframes pdb-agent-bob {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-5px) rotate(-0.6deg); }
          }

          @keyframes pdb-panel-glow {
            0%, 100% { opacity: 1; filter: url(#pdb-shadow); }
            50% { opacity: 0.96; filter: url(#pdb-shadow); }
          }

          @keyframes pdb-flow-forward {
            to { stroke-dashoffset: -22; }
          }

          @keyframes pdb-flow-back {
            to { stroke-dashoffset: 22; }
          }

          @keyframes pdb-signal-action {
            0% { transform: translateX(0); opacity: 0; }
            15% { opacity: 1; }
            80% { opacity: 1; }
            100% { transform: translateX(118px); opacity: 0; }
          }

          @keyframes pdb-signal-observation {
            0% { transform: translateX(0); opacity: 0; }
            15% { opacity: 1; }
            80% { opacity: 1; }
            100% { transform: translateX(-118px); opacity: 0; }
          }

          @keyframes pdb-eye-pulse {
            0%, 88%, 100% { opacity: 1; transform: scaleY(1); }
            92% { opacity: 0.45; transform: scaleY(0.25); }
          }

          @keyframes pdb-live-pulse {
            0%, 100% { opacity: 0.55; }
            50% { opacity: 1; }
          }

          @keyframes pdb-tile-rise {
            0%, 100% { transform: translateY(0); opacity: 0.94; }
            50% { transform: translateY(-3px); opacity: 1; }
          }

          @media (prefers-reduced-motion: reduce) {
            .pdb-agent,
            .pdb-environment,
            .pdb-action-line,
            .pdb-observation-line,
            .pdb-score-line,
            .pdb-signal-action,
            .pdb-signal-observation,
            .pdb-eye,
            .pdb-live-dot,
            .pdb-tile {
              animation: none;
            }
          }
        `}</style>
        <linearGradient id="pdb-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#F0FDFA" />
        </linearGradient>
        <filter id="pdb-shadow" x="-8%" y="-8%" width="116%" height="116%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#0F172A" floodOpacity="0.08" />
        </filter>
        <marker id="pdb-action-dot" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <circle cx="4" cy="4" r="3" fill="#0D9488" />
        </marker>
        <marker id="pdb-obs-dot" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <circle cx="4" cy="4" r="3" fill="#EA580C" />
        </marker>
      </defs>

      {/* reasoning bubble (PhysicianBench-style) */}
      <g filter="url(#pdb-shadow)">
        <rect
          x="40"
          y="24"
          width="208"
          height="62"
          rx="12"
          fill="#FFFFFF"
          stroke="#0F766E"
          strokeWidth="1.4"
          strokeDasharray="4 4"
        />
        <path d="M 140 86 L 150 98 L 162 86" fill="#FFFFFF" stroke="#0F766E" strokeWidth="1.4" />
        <text x="56" y="43" fill="#64748B" fontSize="9" fontWeight="700" fontFamily="system-ui,sans-serif" letterSpacing="0.16em">
          REASONING
        </text>
        <text x="56" y="62" fill="#0F172A" fontSize="11" fontWeight="700" fontFamily="system-ui,sans-serif">
          Assess ASCVD risk (10-yr 18%)
        </text>
      </g>

      {/* ── Agent + interaction (shifted right toward benchmark panel) ── */}
      <g transform="translate(36, 0)">
      <g className="pdb-agent" filter="url(#pdb-shadow)">
        {/* body */}
        <rect x="72" y="118" width="88" height="96" rx="20" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
        {/* head */}
        <rect x="84" y="104" width="64" height="52" rx="16" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
        {/* face screen */}
        <rect x="92" y="114" width="48" height="32" rx="8" fill="#0F172A" />
        <circle className="pdb-eye" cx="106" cy="128" r="5" fill="#FFFFFF" />
        <circle className="pdb-eye" cx="126" cy="128" r="5" fill="#FFFFFF" />
        <path d="M 100 138 Q 116 146 132 138" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* pharmacy cross */}
        <rect x="108" y="148" width="16" height="16" rx="4" fill="#CCFBF1" />
        <rect x="113" y="151" width="6" height="10" rx="1" fill="#0D9488" />
        <rect x="110" y="154" width="12" height="4" rx="1" fill="#0D9488" />
        {/* stethoscope */}
        <path d="M 68 130 Q 58 130 58 148 Q 58 162 72 162" stroke="#64748B" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="72" cy="162" r="4" fill="#64748B" />
        {/* clipboard */}
        <rect x="148" y="148" width="28" height="36" rx="4" fill="#F1F5F9" stroke="#CBD5E1" />
        <rect x="154" y="142" width="16" height="8" rx="2" fill="#94A3B8" />
        <path d="M 154 162 L 170 162 M 154 170 L 166 170 M 154 178 L 168 178" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="168" cy="178" r="6" fill="#DCFCE7" stroke="#22C55E" strokeWidth="1" />
        <path d="M 165 178 L 167 180 L 171 176" stroke="#16A34A" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="116" y="232" fill="#64748B" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="system-ui,sans-serif" letterSpacing="0.12em">
          AGENT
        </text>
      </g>

      {/* ── Action / Observation arrows ── */}
      <g>
        {/* action: agent → environment */}
        <path
          d="M 196 168 H 318"
          stroke="#0D9488"
          strokeWidth="2"
          className="pdb-action-line"
          strokeDasharray="6 5"
          markerEnd="url(#pdb-action-dot)"
        />
        <circle className="pdb-signal-action" cx="204" cy="168" r="4" fill="#0D9488" opacity="0" />
        <text x="257" y="158" fill="#0D9488" fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="system-ui,sans-serif">
          prompt
        </text>

        {/* observation: environment → agent */}
        <path
          d="M 318 198 H 196"
          stroke="#EA580C"
          strokeWidth="2"
          className="pdb-observation-line"
          strokeDasharray="6 5"
          markerEnd="url(#pdb-obs-dot)"
        />
        <circle className="pdb-signal-observation" cx="312" cy="198" r="4" fill="#EA580C" opacity="0" />
        <text x="257" y="218" fill="#EA580C" fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="system-ui,sans-serif">
          response
        </text>
      </g>

      {/* paper-aligned scoring loop (small, below agent) */}
      <g opacity="0.9">
        <path className="pdb-score-line" d="M 116 248 Q 116 268 196 268 Q 276 268 276 248" stroke="#A78BFA" strokeWidth="1.5" strokeDasharray="4 3" fill="none" />
        <text x="196" y="284" fill="#7C3AED" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="system-ui,sans-serif">
          checkpoint metrics score response
        </text>
      </g>
      </g>

      {/* ── Benchmark environment panel ── */}
      <g className="pdb-environment" filter="url(#pdb-shadow)">
        <rect x="330" y="36" width="560" height="268" rx="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />

        {/* window chrome */}
        <rect x="330" y="36" width="560" height="44" rx="14" fill="#F8FAFC" />
        <rect x="330" y="64" width="560" height="16" fill="#F8FAFC" />
        <circle cx="352" cy="58" r="5" fill="#FCA5A5" />
        <circle cx="368" cy="58" r="5" fill="#FCD34D" />
        <circle cx="384" cy="58" r="5" fill="#86EFAC" />

        <text x="610" y="62" fill="#0F172A" fontSize="13" fontWeight="800" textAnchor="middle" fontFamily="system-ui,sans-serif">
          PharmDrugBench
        </text>
        <text x="610" y="76" fill="#64748B" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="system-ui,sans-serif" letterSpacing="0.1em">
          BENCHMARK ENVIRONMENT
        </text>

        {/* mascot pill */}
        <g transform="translate(348, 78)">
          <ellipse cx="18" cy="22" rx="16" ry="20" fill="#FEF3C7" stroke="#FCD34D" strokeWidth="1" />
          <rect x="10" y="8" width="16" height="28" rx="8" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1" />
          <line x1="18" y1="4" x2="18" y2="10" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <line x1="14" y1="6" x2="22" y2="6" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* patient vignette bar */}
        <rect x="350" y="92" width="520" height="44" rx="10" fill="#F0FDFA" stroke="#99F6E4" strokeWidth="1" />
        <circle cx="376" cy="114" r="14" fill="#CCFBF1" stroke="#5EEAD4" />
        <circle cx="376" cy="108" r="6" fill="#0D9488" opacity="0.3" />
        <path d="M 368 120 Q 376 128 384 120" fill="#0D9488" opacity="0.4" />
        <text x="400" y="110" fill="#0F172A" fontSize="12" fontWeight="700" fontFamily="system-ui,sans-serif">
          Clinical vignette
        </text>
        <text x="400" y="126" fill="#64748B" fontSize="10" fontFamily="system-ui,sans-serif">
          Case #1842 · 68 yo F · 8 active meds · inpatient CMM review
        </text>

        {/* task tiles — 2 rows × 3 */}
        {[
          { label: "6 CMM", sub: "Rx-LLM", x: 350, y: 152, bg: "#FEF9C3", stroke: "#FDE047", icon: "💊" },
          { label: "3 DDI", sub: "Multi-format", x: 478, y: 152, bg: "#FFEDD5", stroke: "#FDBA74", icon: "⚠" },
          { label: "7 MedMatch", sub: "JSON slots", x: 606, y: 152, bg: "#EDE9FE", stroke: "#C4B5FD", icon: "{}" },
          { label: "2 Adversarial", sub: "Drug or Pokémon?", x: 350, y: 216, bg: "#FCE7F3", stroke: "#F9A8D4", icon: "?" },
          { label: "1 Verify", sub: "Uncertainty-DDI", x: 478, y: 216, bg: "#E0F2FE", stroke: "#7DD3FC", icon: "✓" },
          { label: "Scorecard", sub: "Paper metrics", x: 606, y: 216, bg: "#DCFCE7", stroke: "#86EFAC", icon: "✓" },
        ].map((tile) => (
          <g key={tile.label} className="pdb-tile" style={{ animationDelay: `${tile.x / 180}s` }}>
            <rect x={tile.x} y={tile.y} width="112" height="52" rx="10" fill={tile.bg} stroke={tile.stroke} strokeWidth="1" />
            <text x={tile.x + 14} y={tile.y + 22} fill="#334155" fontSize="11" fontWeight="700" fontFamily="system-ui,sans-serif">
              {tile.label}
            </text>
            <text x={tile.x + 14} y={tile.y + 38} fill="#64748B" fontSize="9" fontFamily="system-ui,sans-serif">
              {tile.sub}
            </text>
            <text x={tile.x + 92} y={tile.y + 32} fill="#64748B" fontSize="14" textAnchor="middle" fontFamily="system-ui,sans-serif">
              {tile.icon}
            </text>
          </g>
        ))}

        {/* status bar */}
        <rect x="350" y="280" width="520" height="28" rx="8" fill="#F8FAFC" stroke="#E2E8F0" />
        <circle className="pdb-live-dot" cx="368" cy="294" r="4" fill="#22C55E" />
        <text x="380" y="298" fill="#64748B" fontSize="10" fontFamily="system-ui,sans-serif">
          live · 19 clinician-validated tasks · 4 benchmark papers · paper-aligned scoring
        </text>
      </g>
    </svg>
  );
}

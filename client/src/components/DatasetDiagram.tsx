/** Inline paper-inspired diagrams for Dataset Mapping cards (no external img fetch). */

type DatasetDiagramProps = {
  id: string;
  className?: string;
};

export function DatasetDiagram({ id, className = "" }: DatasetDiagramProps) {
  const common = `w-full h-full ${className}`;

  switch (id) {
    case "rx-llm":
      return (
        <svg viewBox="0 0 480 280" className={common} aria-hidden>
          <rect width="480" height="280" fill="#F8FAFC" />
          <text x="24" y="28" fill="#334155" fontSize="13" fontWeight="700" fontFamily="system-ui,sans-serif">
            Rx-Bench: 6 CMM benchmarks (250 cases each)
          </text>
          {[
            ["Formulation", 24, 44],
            ["Drug order (sig)", 168, 44],
            ["Route matching", 312, 44],
            ["DDI ID", 24, 112],
            ["Renal dose ID", 168, 112],
            ["Drug-indication", 312, 112],
          ].map(([label, x, y]) => (
            <g key={String(label)}>
              <rect x={Number(x)} y={Number(y)} width="130" height="52" rx="8" fill="#EFF6FF" stroke="#93C5FD" />
              <text x={Number(x) + 12} y={Number(y) + 22} fill="#1D4ED8" fontSize="10" fontWeight="600" fontFamily="system-ui,sans-serif">
                {label}
              </text>
              <text x={Number(x) + 12} y={Number(y) + 38} fill="#64748B" fontSize="9" fontFamily="system-ui,sans-serif">
                zero-shot, 3 trials
              </text>
            </g>
          ))}
          <rect x="100" y="188" width="280" height="56" rx="10" fill="#ECFDF5" stroke="#6EE7B7" />
          <text x="240" y="214" fill="#047857" fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="system-ui,sans-serif">
            Precision / Recall / F1 / Accuracy
          </text>
          <text x="240" y="232" fill="#64748B" fontSize="10" textAnchor="middle" fontFamily="system-ui,sans-serif">
            Clinician-annotated inpatient + outpatient cases
          </text>
        </svg>
      );

    case "llm-ddi":
      return (
        <svg viewBox="0 0 480 280" className={common} aria-hidden>
          <rect width="480" height="280" fill="#FFFBEB" />
          <text x="24" y="28" fill="#78350F" fontSize="13" fontWeight="700" fontFamily="system-ui,sans-serif">
            DDI identification: 750 scenarios, 3 formats
          </text>
          <rect x="24" y="48" width="130" height="88" rx="10" fill="#FEF3C7" stroke="#FCD34D" />
          <text x="89" y="78" fill="#92400E" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="system-ui,sans-serif">
            Pointwise
          </text>
          <text x="89" y="96" fill="#78716C" fontSize="9" textAnchor="middle" fontFamily="system-ui,sans-serif">
            2-drug pair
          </text>
          <text x="89" y="112" fill="#78716C" fontSize="9" textAnchor="middle" fontFamily="system-ui,sans-serif">
            DDI ID task
          </text>
          <path d="M162 92h36" stroke="#D97706" strokeWidth="2" markerEnd="url(#ddiArrow)" />
          <rect x="204" y="48" width="130" height="88" rx="10" fill="#FEF3C7" stroke="#FCD34D" />
          <text x="269" y="78" fill="#92400E" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="system-ui,sans-serif">
            Pairwise
          </text>
          <text x="269" y="96" fill="#78716C" fontSize="9" textAnchor="middle" fontFamily="system-ui,sans-serif">
            3-drug combo
          </text>
          <path d="M342 92h36" stroke="#D97706" strokeWidth="2" markerEnd="url(#ddiArrow)" />
          <rect x="384" y="48" width="72" height="88" rx="10" fill="#FEF3C7" stroke="#FCD34D" />
          <text x="420" y="78" fill="#92400E" fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="system-ui,sans-serif">
            Listwise
          </text>
          <text x="420" y="96" fill="#78716C" fontSize="8" textAnchor="middle" fontFamily="system-ui,sans-serif">
            4-6 drugs
          </text>
          <rect x="40" y="160" width="400" height="88" rx="10" fill="#FFF7ED" stroke="#FDBA74" />
          <text x="240" y="188" fill="#C2410C" fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="system-ui,sans-serif">
            Category C/D/X interacting pairs
          </text>
          <text x="240" y="208" fill="#78716C" fontSize="10" textAnchor="middle" fontFamily="system-ui,sans-serif">
            Self-consistency across zero-shot runs
          </text>
          <text x="240" y="228" fill="#78716C" fontSize="9" textAnchor="middle" fontFamily="system-ui,sans-serif">
            github.com/AIChemist-Lab/LLM-DDI
          </text>
          <defs>
            <marker id="ddiArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#D97706" />
            </marker>
          </defs>
        </svg>
      );

    case "llm-uncertainty-ddi":
      return (
        <svg viewBox="0 0 480 280" className={common} aria-hidden>
          <rect width="480" height="280" fill="#FAF5FF" />
          <text x="24" y="28" fill="#5B21B6" fontSize="13" fontWeight="700" fontFamily="system-ui,sans-serif">
            LLM-Uncertainty-DDI: interaction verification
          </text>
          <rect x="32" y="52" width="180" height="96" rx="10" fill="#EDE9FE" stroke="#C4B5FD" />
          <text x="48" y="78" fill="#5B21B6" fontSize="10" fontWeight="600" fontFamily="system-ui,sans-serif">
            Input: drug pair + proposed
          </text>
          <text x="48" y="94" fill="#5B21B6" fontSize="10" fontWeight="600" fontFamily="system-ui,sans-serif">
            interaction category + action
          </text>
          <text x="48" y="118" fill="#78716C" fontSize="9" fontFamily="system-ui,sans-serif">
            Default prompt with hedging
          </text>
          <text x="48" y="134" fill="#78716C" fontSize="9" fontFamily="system-ui,sans-serif">
            Uncertainty-aware evaluation
          </text>
          <path d="M220 100h48" stroke="#8B5CF6" strokeWidth="2" markerEnd="url(#uvArrow)" />
          <rect x="276" y="52" width="172" height="96" rx="10" fill="#F5F3FF" stroke="#A78BFA" />
          <text x="362" y="84" fill="#5B21B6" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="system-ui,sans-serif">
            A = Correct
          </text>
          <text x="362" y="104" fill="#5B21B6" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="system-ui,sans-serif">
            B = Incorrect
          </text>
          <text x="362" y="128" fill="#78716C" fontSize="9" textAnchor="middle" fontFamily="system-ui,sans-serif">
            Verify proposed assessment
          </text>
          <rect x="48" y="168" width="384" height="88" rx="10" fill="#EDE9FE" stroke="#C4B5FD" />
          <text x="240" y="198" fill="#6D28D9" fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="system-ui,sans-serif">
            Correct answer rate / Refusal rate
          </text>
          <text x="240" y="218" fill="#78716C" fontSize="10" textAnchor="middle" fontFamily="system-ui,sans-serif">
            Correct given attempted
          </text>
          <text x="240" y="238" fill="#78716C" fontSize="9" textAnchor="middle" fontFamily="system-ui,sans-serif">
            github.com/AIChemist-Lab/LLM-Uncertainty-DDI
          </text>
          <defs>
            <marker id="uvArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#8B5CF6" />
            </marker>
          </defs>
        </svg>
      );

    case "medmatch":
      return (
        <svg viewBox="0 0 480 280" className={common} aria-hidden>
          <rect width="480" height="280" fill="#EFF6FF" />
          <text x="24" y="28" fill="#1E3A8A" fontSize="13" fontWeight="700" fontFamily="system-ui,sans-serif">
            MedMatch: free-text order to JSON slots (100 prompts)
          </text>
          <rect x="24" y="44" width="168" height="88" rx="8" fill="#F1F5F9" stroke="#CBD5E1" />
          <text x="36" y="66" fill="#475569" fontSize="9" fontWeight="600" fontFamily="system-ui,sans-serif">
            Clinician sig (free text)
          </text>
          <text x="36" y="84" fill="#64748B" fontSize="8" fontFamily="monospace">
            Vancomycin 1g in 250mL NS
          </text>
          <text x="36" y="98" fill="#64748B" fontSize="8" fontFamily="monospace">
            IV q12h
          </text>
          <text x="36" y="118" fill="#64748B" fontSize="8" fontFamily="system-ui,sans-serif">
            one-shot, triplicate runs
          </text>
          <path d="M200 88h44" stroke="#2563EB" strokeWidth="2" markerEnd="url(#mmArrow)" />
          <text x="222" y="80" fill="#2563EB" fontSize="8" textAnchor="middle" fontFamily="system-ui,sans-serif">
            LLM
          </text>
          <rect x="252" y="44" width="204" height="88" rx="8" fill="#DBEAFE" stroke="#93C5FD" />
          <text x="264" y="64" fill="#1D4ED8" fontSize="8" fontWeight="600" fontFamily="monospace">{`{ drug, dose, unit,`}</text>
          <text x="264" y="78" fill="#334155" fontSize="8" fontFamily="monospace">{`  route, frequency,`}</text>
          <text x="264" y="92" fill="#334155" fontSize="8" fontFamily="monospace">{`  diluent, infusion... }`}</text>
          <text x="264" y="112" fill="#64748B" fontSize="8" fontFamily="system-ui,sans-serif">
            MedMatch score = exact field match
          </text>
          {[
            ["Oral solid (40)", 24, 148],
            ["Oral liq (10)", 120, 148],
            ["IV intermit (17)", 216, 148],
            ["IV push (17)", 312, 148],
            ["IV continuous (27)", 24, 184],
            ["Route select", 168, 184],
          ].map(([label, x, y]) => (
            <g key={String(label)}>
              <rect x={Number(x)} y={Number(y)} width="88" height="28" rx="6" fill="#BFDBFE" fillOpacity="0.5" stroke="#60A5FA" />
              <text x={Number(x) + 44} y={Number(y) + 18} fill="#1E40AF" fontSize="7" textAnchor="middle" fontFamily="system-ui,sans-serif">
                {label}
              </text>
            </g>
          ))}
          <text x="240" y="258" fill="#64748B" fontSize="9" textAnchor="middle" fontFamily="system-ui,sans-serif">
            PMC12870651 / github.com/AIChemist-Lab/MedMatch
          </text>
          <defs>
            <marker id="mmArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#2563EB" />
            </marker>
          </defs>
        </svg>
      );

    case "pokemon-drugs":
      return (
        <svg viewBox="0 0 480 280" className={common} aria-hidden>
          <rect width="480" height="280" fill="#FFF1F2" />
          <text x="24" y="28" fill="#881337" fontSize="13" fontWeight="700" fontFamily="system-ui,sans-serif">
            Drug or Pokemon: 250 poisoned vignettes
          </text>
          <rect x="24" y="44" width="432" height="108" rx="10" fill="#FFFFFF" stroke="#FECDD3" />
          <text x="40" y="68" fill="#334155" fontSize="9" fontFamily="monospace">vancomycin 1000mg IV q12h</text>
          <text x="40" y="84" fill="#334155" fontSize="9" fontFamily="monospace">metoprolol 25mg PO BID</text>
          <text x="40" y="100" fill="#BE123C" fontSize="9" fontWeight="600" fontFamily="monospace">
            Kirlia 10mg PO once daily  (fabricated)
          </text>
          <text x="40" y="116" fill="#334155" fontSize="9" fontFamily="monospace">furosemide 40mg PO daily</text>
          <text x="40" y="132" fill="#334155" fontSize="9" fontFamily="monospace">aspirin 81mg PO daily</text>
          <rect x="24" y="168" width="132" height="56" rx="8" fill="#FEE2E2" stroke="#FCA5A5" />
          <text x="90" y="192" fill="#B91C1C" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="system-ui,sans-serif">
            Inherited
          </text>
          <text x="90" y="208" fill="#78716C" fontSize="8" textAnchor="middle" fontFamily="system-ui,sans-serif">
            treats as real drug
          </text>
          <rect x="174" y="168" width="132" height="56" rx="8" fill="#FEF9C3" stroke="#FDE047" />
          <text x="240" y="192" fill="#A16207" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="system-ui,sans-serif">
            Epistemic
          </text>
          <text x="240" y="208" fill="#78716C" fontSize="8" textAnchor="middle" fontFamily="system-ui,sans-serif">
            replaces with real drug
          </text>
          <rect x="324" y="168" width="132" height="56" rx="8" fill="#DCFCE7" stroke="#86EFAC" />
          <text x="390" y="192" fill="#15803D" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="system-ui,sans-serif">
            Suspicion
          </text>
          <text x="390" y="208" fill="#78716C" fontSize="8" textAnchor="middle" fontFamily="system-ui,sans-serif">
            detects fabrication
          </text>
          <text x="240" y="252" fill="#64748B" fontSize="9" textAnchor="middle" fontFamily="system-ui,sans-serif">
            LLM-as-judge / PMC12870567
          </text>
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 480 280" className={common} aria-hidden>
          <rect width="480" height="280" fill="#F1F5F9" />
          <text x="240" y="140" fill="#64748B" fontSize="14" textAnchor="middle" fontFamily="system-ui,sans-serif">
            Benchmark dataset
          </text>
        </svg>
      );
  }
}

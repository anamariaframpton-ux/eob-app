import { useState, useRef } from "react";

// ── CHANGE THIS ONE LINE WHEN YOU PICK A NAME ──
const APP_NAME = "EOB";

// Fraunces: a warm optical serif — feels like a trusted field guide or a really good explainer book.
// DM Sans: clean, friendly body text that pairs beautifully without competing.

const C = {
  cream: "#F4F1EA",
  ink: "#2A3528",
  accent: "#4A7C59",
  accentDark: "#375C43",
  warm: "#B87333",
  sky: "#4E7FA0",
  gold: "#C9A84C",
  muted: "#7A8A7D",
  card: "#FDFCF8",
  border: "#DDD8CE",
  headerBg: "#2A3528",
  storyBg: "#EEF4F0",
  storyBorder: "#A8C4B0",
};

const SCENARIOS = [
  { id: "pcp", emoji: "🩺", label: (name) => `${name} visits their primary care doctor` },
  { id: "er", emoji: "🚑", label: (name) => `${name} goes to the emergency room` },
  { id: "specialist", emoji: "👨‍⚕️", label: (name) => `${name} sees a specialist` },
  { id: "surgery", emoji: "🏥", label: (name) => `${name} needs outpatient surgery` },
  { id: "rx", emoji: "💊", label: (name) => `${name} fills a prescription` },
  { id: "pregnancy", emoji: "🤰", label: (name) => `${name} is having a baby`, femaleOnly: true },
  { id: "familyplanning", emoji: "👨‍👩‍👧", label: (name) => `${name} is family planning` },
];

const GLOSSARY = [
  { term: "Deductible", def: "The amount you pay out-of-pocket each year before your insurance starts sharing costs. If your deductible is $1,500, you pay 100% until you've spent $1,500 that year." },
  { term: "Premium", def: "The monthly bill you pay just to have insurance, regardless of whether you use it. Think of it like a subscription fee." },
  { term: "Copay", def: "A fixed flat fee you pay for a specific service (e.g. $25 every time you see your PCP). Copays often apply before your deductible is met." },
  { term: "Coinsurance", def: "After meeting your deductible, you and your insurer split costs by percentage. An 80/20 plan means insurance pays 80%, you pay 20%." },
  { term: "Out-of-Pocket Maximum", def: "The most you'll ever pay in a single year. Once you hit this cap, insurance covers 100% of covered services for the rest of the year." },
  { term: "In-Network", def: "Doctors and hospitals that have agreed to lower rates with your insurer. Staying in-network is one of the easiest ways to keep costs down." },
  { term: "Out-of-Network", def: "Providers without a contract with your insurer. You'll pay significantly more, sometimes everything, if you go out-of-network." },
  { term: "Prior Authorization", def: "Some treatments require your insurer's approval before you get them. Without it, they may not cover the cost. Always check before a procedure." },
  { term: "EOB", def: "Explanation of Benefits. A document your insurer sends after a claim showing what was billed, what they paid, and what you owe. It's not a bill." },
  { term: "FSA / HSA", def: "Tax-advantaged accounts to pay for medical expenses. HSAs pair with HDHPs; FSAs work with most plans. Money goes in pre-tax, which saves you real money." },
  { term: "HMO", def: "Health Maintenance Organization. You pick a primary care doctor who coordinates all your care. Lower cost, but less flexibility to see whoever you want." },
  { term: "PPO", def: "Preferred Provider Organization. See any doctor without a referral. You pay more in premiums for that freedom, but you have a lot more choice." },
];

const PLAN_COMPARISON = [
  { feature: "See any doctor", hmo: "Network only", ppo: "Yes", hdhp: "Yes", epo: "Network only" },
  { feature: "Referral to specialist", hmo: "Required", ppo: "Not required", hdhp: "Not required", epo: "Required" },
  { feature: "Typical monthly premium", hmo: "Lowest", ppo: "Highest", hdhp: "Low", epo: "Medium" },
  { feature: "Typical deductible", hmo: "Low", ppo: "Medium", hdhp: "High ($1,600+)", epo: "Medium" },
  { feature: "HSA eligible", hmo: "No", ppo: "No", hdhp: "Yes", epo: "No" },
  { feature: "Out-of-network coverage", hmo: "Emergency only", ppo: "Yes (higher cost)", hdhp: "Varies by plan", epo: "Emergency only" },
  { feature: "Best for", hmo: "Predictable, local care", ppo: "Flexibility & specialists", hdhp: "Healthy, want to save", epo: "Low cost, stay in-network" },
];

const planTypeColors = { HMO: "#4A7C59", PPO: "#4E7FA0", HDHP: "#B87333", EPO: "#C9A84C" };


export default function App() {
  const [tab, setTab] = useState("understand");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [characterName, setCharacterName] = useState("");
  const [characterGender, setCharacterGender] = useState(null);
  const [file1, setFile1] = useState(null);
  const [dragging1, setDragging1] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [customScenario, setCustomScenario] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(null);
  const [outputError, setOutputError] = useState(null);
  const fileRef1 = useRef();
  const [planA, setPlanA] = useState(null);
  const [planB, setPlanB] = useState(null);
  const [draggingA, setDraggingA] = useState(false);
  const [draggingB, setDraggingB] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareOutput, setCompareOutput] = useState(null);
  const [compareError, setCompareError] = useState(null);
  const fileRefA = useRef();
  const fileRefB = useRef();

  const name = characterName.trim() || "Alex";
  const isFemale = characterGender === "female";
  const visibleScenarios = SCENARIOS.filter(s => !s.femaleOnly || isFemale);

  const handleDrop = (setter, setDragging) => (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setter(f);
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const callClaude = async (messages, systemPrompt) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages }),
    });
    if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || "API request failed"); }
    const data = await response.json();
    return data.content.map(b => b.text || "").join("");
  };

  const runAnalysis = async () => {
    setLoading(true); setOutput(null); setOutputError(null);
    try {
      if (apiKey && file1) {
        const base64 = await fileToBase64(file1);
        const scenario = selectedScenario ? SCENARIOS.find(s => s.id === selectedScenario)?.label(name) : customScenario;
        const result = await callClaude([{ role: "user", content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: `Walk through this scenario as a story: "${scenario}". Use the name "${name}". Pull real numbers from the plan document. Keep it conversational. Format with clear steps.` },
        ]}], `You are a friendly, plain-English health insurance explainer. No jargon, no condescension. Walk through scenarios as short stories using the character's name. Show actual dollar amounts. End with a one-line "Bottom line" summary.`);
        setOutput(result);
      } else {
        await new Promise(r => setTimeout(r, 1600));
        setOutput(getDemoOutput(selectedScenario || "pcp", name));
      }
    } catch (err) { setOutputError(err.message); }
    setLoading(false);
  };

  const runComparison = async () => {
    setCompareLoading(true); setCompareOutput(null); setCompareError(null);
    try {
      if (apiKey && planA && planB) {
        const [b64A, b64B] = await Promise.all([fileToBase64(planA), fileToBase64(planB)]);
        const raw = await callClaude([{ role: "user", content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64A } },
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64B } },
          { type: "text", text: "Compare these two health insurance plans and return the JSON as instructed." },
        ]}], `Return only a JSON object, no markdown: {"planA":{"name":"","type":"","deductible":"","oop":"","pcp":"","specialist":"","er":"","network":""},"planB":{"name":"","type":"","deductible":"","oop":"","pcp":"","specialist":"","er":"","network":""},"verdict":""}`);
        setCompareOutput(JSON.parse(raw.replace(/```json|```/g, "").trim()));
      } else {
        await new Promise(r => setTimeout(r, 1800));
        setCompareOutput({
          planA: { name: planA?.name?.replace(".pdf", "") || "Plan A", type: "PPO", deductible: "$1,500", oop: "$5,000", pcp: "$25 copay", specialist: "$50 copay", er: "$300 copay", network: "Large national" },
          planB: { name: planB?.name?.replace(".pdf", "") || "Plan B", type: "HMO", deductible: "$500", oop: "$3,000", pcp: "$15 copay", specialist: "Referral required", er: "$250 copay", network: "Regional only" },
          verdict: "Plan B has a lower deductible and out-of-pocket max, better if you expect to use healthcare regularly. Plan A gives you the freedom to see any doctor without referrals, which matters if you have existing specialist relationships.",
        });
      }
    } catch (err) { setCompareError(err.message); }
    setCompareLoading(false);
  };

  const getDemoOutput = (id, name) => ({
    pcp: `📖 ${name}'s Story: A Routine Check-Up\n\n${name} wakes up with a persistent cough and decides to see their primary care doctor.\n\n**Step 1 — The Visit**\n${name} books an appointment and pays a **$25 copay** at the front desk.\n\n**Step 2 — Deductible Check**\n${name} hasn't met their $1,500 deductible yet, but copay visits often bypass the deductible entirely, so ${name} only owes the $25.\n\n**Step 3 — The Bill**\nThe doctor bills insurance $180. Insurance negotiates it down to $130. ${name} pays $25. Insurance pays $105. ${name} saved $155 just by staying in-network.\n\n💡 **Bottom line: ${name} pays $25 today.**`,
    er: `📖 ${name}'s Story: Emergency Room Visit\n\n${name} sprains their ankle badly and heads to the ER.\n\n**Step 1 — The ER Copay**\nMost plans charge a higher ER copay. ${name}'s plan charges $250.\n\n**Step 2 — Deductible Kicks In**\nThe total bill is $2,400. ${name} hasn't hit the $1,500 deductible yet, so they pay toward that first.\n\n**Step 3 — Coinsurance**\nAfter the deductible, the remaining $900 is split 80/20. ${name} owes 20% = **$180 more**.\n\n**Total: $1,680**\n\n💡 **Bottom line: ER visits add up fast. But once ${name} hits their out-of-pocket max later in the year, everything else is covered.**`,
    rx: `📖 ${name}'s Story: Filling a Prescription\n\n${name} is prescribed a medication after their doctor visit.\n\n**Step 1 — Drug Tiers**\nInsurance plans group drugs into tiers. Generic (Tier 1) is cheapest. Brand-name costs more. Specialty drugs can run hundreds per month.\n\n**Step 2 — ${name}'s Copay**\n${name}'s medication is a Tier 1 generic. Their plan charges **$10 per 30-day supply**.\n\n**Step 3 — The Savings**\nIf the doctor had prescribed a brand-name version, ${name} would pay $45 instead. The generic saves $35/month, or $420/year.\n\n💡 **Bottom line: Always ask if a generic exists. Same medicine, fraction of the cost.**`,
  }[id] || `📖 ${name}'s Story\n\nThis is a demo response. Upload your plan PDF and set your API key to get a real, personalized walkthrough pulled directly from your plan document.`);

  const formatOutput = (text) => text.split("\n").map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height: "0.5rem" }} />;
    const parts = line.split(/\*\*(.*?)\*\*/g);
    if (parts.length === 1) return <p key={i} style={{ marginBottom: "0.35rem", lineHeight: "1.75" }}>{line}</p>;
    return <p key={i} style={{ marginBottom: "0.35rem", lineHeight: "1.75" }}>{parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}</p>;
  });

  const spinner = <span style={{ display: "inline-block", width: "15px", height: "15px", border: "2.5px solid #fff4", borderTop: "2.5px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: "0.5rem", verticalAlign: "middle" }} />;
  const cardS = (x = {}) => ({ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: "14px", padding: "1.75rem", marginBottom: "1.25rem", boxShadow: "0 2px 12px rgba(42,53,40,0.05)", ...x });
  const labelS = { fontSize: "0.71rem", fontWeight: "600", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.09em", color: C.muted, marginBottom: "1rem" };
  const btnS = (v = "primary", x = {}) => ({ background: v === "primary" ? C.accent : v === "secondary" ? C.ink : "transparent", color: v === "ghost" ? C.ink : "#fff", border: v === "ghost" ? `1.5px solid ${C.border}` : "none", borderRadius: "8px", padding: "0.65rem 1.4rem", cursor: "pointer", fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif", fontWeight: "600", transition: "opacity 0.15s", ...x });
  const dropS = (d) => ({ border: `2px dashed ${d ? C.accent : C.border}`, borderRadius: "10px", padding: "2rem", textAlign: "center", cursor: "pointer", transition: "all 0.2s", background: d ? "#EEF4F0" : "#F9F8F4" });
  const h1S = { fontSize: "2rem", fontWeight: "700", letterSpacing: "-0.02em", marginBottom: "0.4rem", lineHeight: 1.2, fontFamily: "'Fraunces', serif", color: C.ink };
  const subS = { color: C.muted, fontSize: "1rem", marginBottom: "2rem", fontFamily: "'DM Sans', sans-serif" };

  return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: "'DM Sans', sans-serif", color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        button:hover { opacity: 0.85; }
        * { box-sizing: border-box; }
      `}</style>

      <header style={{ background: C.headerBg, padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: "60px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ color: "#F4F1EA", fontSize: "1.25rem", fontWeight: "700", fontFamily: "'Fraunces', serif", letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <span style={{ color: C.gold }}>◎</span> {APP_NAME}
        </div>
        <nav style={{ display: "flex", gap: "0.2rem" }}>
          {[["understand", "Understand My Plan"], ["compare", "Compare Plans"], ["lingo", "Learn the Lingo"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ background: tab === id ? C.accent : "transparent", color: tab === id ? "#fff" : "#A8BCA8", border: "none", borderRadius: "6px", padding: "0.4rem 0.85rem", cursor: "pointer", fontSize: "0.83rem", fontFamily: "'DM Sans', sans-serif", fontWeight: tab === id ? "600" : "400", transition: "all 0.2s" }}>{label}</button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: "860px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        <div style={{ background: "#FBF6E8", border: `1.5px solid ${C.gold}`, borderRadius: "10px", padding: "0.75rem 1.1rem", fontSize: "0.82rem", color: "#7A620A", marginBottom: "1.5rem", display: "flex", gap: "0.6rem", lineHeight: "1.5" }}>
          <span>⚠️</span>
          <span><strong>Heads up:</strong> Only upload generic plan documents like your "Aetna Benefits Summary". <strong>Never upload anything with your name, member ID, diagnoses, or personal medical information.</strong></span>
        </div>

        <div style={cardS({ background: "#EEF4F0", border: `1.5px solid ${C.storyBorder}`, marginBottom: "1.5rem" })}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <div style={{ fontWeight: "600", fontSize: "0.88rem", color: C.accentDark }}>🔑 Anthropic API Key</div>
              <div style={{ fontSize: "0.8rem", color: C.muted, marginTop: "0.2rem" }}>{apiKey ? "✅ Key set. AI analysis is live on your real plan documents." : "No key yet. Running in demo mode with example responses."}</div>
            </div>
            <button style={btnS("ghost")} onClick={() => setShowApiKey(!showApiKey)}>{showApiKey ? "Hide" : "Set API Key"}</button>
          </div>
          {showApiKey && (
            <div style={{ marginTop: "1rem" }}>
              <input type="password" placeholder="sk-ant-..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: "8px", padding: "0.65rem 1rem", fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif", outline: "none", background: "#fff", marginBottom: "0.5rem" }} />
              <div style={{ fontSize: "0.78rem", color: C.muted }}>Get yours at <strong>console.anthropic.com</strong>. Costs about $0.01–0.05 per analysis.</div>
            </div>
          )}
        </div>

        {tab === "understand" && (
          <div>
            <h1 style={h1S}>Understand My Plan</h1>
            <p style={subS}>Upload your benefits guide and we'll walk you through it in plain English, through a story that actually makes sense.</p>

            <div style={cardS()}>
              <div style={labelS}>Step 1 — Who's the story about?</div>
              <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "1rem", marginTop: 0 }}>We'll use this name and pronoun when walking through your scenario.</p>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                <input type="text" placeholder="Enter a name (e.g. Jordan)" value={characterName} onChange={(e) => setCharacterName(e.target.value)} style={{ border: `1.5px solid ${C.border}`, borderRadius: "8px", padding: "0.6rem 1rem", fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif", outline: "none", background: "#F9F8F4", width: "200px" }} />
                {["female", "male"].map(g => (
                  <button key={g} onClick={() => setCharacterGender(g)} style={btnS(characterGender === g ? "secondary" : "ghost", { padding: "0.6rem 1.1rem", fontSize: "0.85rem", border: characterGender === g ? "none" : `1.5px solid ${C.border}` })}>
                    {g === "female" ? "She / Her" : "He / Him"}
                  </button>
                ))}
              </div>
              {characterName && characterGender && <div style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: C.accent }}>✓ Got it. We'll follow <strong>{characterName}</strong> through their scenario.</div>}
            </div>

            <div style={cardS()}>
              <div style={labelS}>Step 2 — Upload your plan document</div>
              <div style={dropS(dragging1)} onDragOver={(e) => { e.preventDefault(); setDragging1(true); }} onDragLeave={() => setDragging1(false)} onDrop={handleDrop(setFile1, setDragging1)} onClick={() => fileRef1.current.click()}>
                <div style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>{file1 ? "📄" : "📂"}</div>
                <div style={{ fontSize: "0.9rem", color: file1 ? C.accent : C.muted, fontWeight: file1 ? "600" : "400" }}>{file1 ? `✓ ${file1.name}` : "Drag & drop your PDF, or click to browse"}</div>
                <input ref={fileRef1} type="file" accept=".pdf" style={{ display: "none" }} onChange={(e) => setFile1(e.target.files[0])} />
              </div>
              {!apiKey && <div style={{ fontSize: "0.8rem", color: C.muted, marginTop: "0.5rem" }}>No API key set. Your file won't be read yet, but you can still see how the app works with demo responses.</div>}
            </div>

            <div style={cardS()}>
              <div style={labelS}>Step 3 — Pick a scenario to walk through</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: "0.65rem", marginBottom: "1rem" }}>
                {visibleScenarios.map((s) => (
                  <button key={s.id} onClick={() => { setSelectedScenario(selectedScenario === s.id ? null : s.id); setCustomScenario(""); }} style={{ background: selectedScenario === s.id ? C.ink : "#F4F1EA", color: selectedScenario === s.id ? "#F4F1EA" : C.ink, border: `1.5px solid ${selectedScenario === s.id ? C.ink : C.border}`, borderRadius: "10px", padding: "0.85rem 1rem", cursor: "pointer", fontSize: "0.87rem", fontFamily: "'DM Sans', sans-serif", textAlign: "left", transition: "all 0.15s", lineHeight: "1.4" }}>
                    <span style={{ display: "block", fontSize: "1.3rem", marginBottom: "0.3rem" }}>{s.emoji}</span>
                    {s.label(name)}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: "0.72rem", color: C.muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.4rem" }}>Or describe your own situation</div>
              <textarea placeholder={`e.g. ${name} needs an MRI and isn't sure if it needs pre-authorization...`} value={customScenario} onChange={(e) => { setCustomScenario(e.target.value); if (e.target.value) setSelectedScenario(null); }} style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif", resize: "vertical", minHeight: "80px", outline: "none", background: "#F9F8F4" }} />
            </div>

            <button onClick={runAnalysis} disabled={!selectedScenario && !customScenario} style={btnS("primary", { width: "100%", padding: "0.85rem", opacity: (!selectedScenario && !customScenario) ? 0.45 : 1 })}>
              {loading ? <>{spinner}Reading your plan...</> : "✨ Walk Me Through It"}
            </button>

            {outputError && <div style={{ marginTop: "1.25rem", background: "#FFF0EE", border: `1.5px solid ${C.warm}`, borderRadius: "10px", padding: "1rem 1.25rem", fontSize: "0.88rem", color: C.warm }}><strong>Something went wrong:</strong> {outputError}</div>}

            {output && !outputError && (
              <div style={{ background: C.storyBg, border: `1.5px solid ${C.storyBorder}`, borderRadius: "12px", padding: "1.5rem 1.75rem", marginTop: "1.25rem" }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: C.accent, fontFamily: "'DM Sans', sans-serif", fontWeight: "600", marginBottom: "0.75rem" }}>📖 {name}'s Story</div>
                <div style={{ fontSize: "0.97rem", lineHeight: "1.8", color: C.ink }}>{formatOutput(output)}</div>
                {!apiKey && <div style={{ marginTop: "1rem", padding: "0.7rem 1rem", background: "#FBF6E8", borderRadius: "8px", fontSize: "0.8rem", color: "#7A620A" }}>💡 Demo response. Set your API key to get this analysis from your actual uploaded plan document.</div>}
              </div>
            )}
          </div>
        )}

        {tab === "compare" && (
          <div>
            <h1 style={h1S}>Compare Plans</h1>
            <p style={{ ...subS, marginBottom: "0.5rem" }}>Curious how your plan options stack up against each other?</p>
            <p style={{ color: "#888", fontSize: "0.9rem", marginBottom: "2rem" }}>Upload two benefits documents and we'll pull out the numbers that actually matter, side by side.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              {[
                { label: "Plan A", file: planA, setter: setPlanA, dragging: draggingA, setDragging: setDraggingA, ref: fileRefA, color: C.sky },
                { label: "Plan B", file: planB, setter: setPlanB, dragging: draggingB, setDragging: setDraggingB, ref: fileRefB, color: C.warm },
              ].map(({ label, file, setter, dragging, setDragging, ref, color }) => (
                <div key={label} style={cardS({ borderColor: file ? color : C.border, marginBottom: 0 })}>
                  <div style={{ ...labelS, color }}>{label}</div>
                  <div style={dropS(dragging)} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop(setter, setDragging)} onClick={() => ref.current.click()}>
                    <div style={{ fontSize: "1.8rem", marginBottom: "0.3rem" }}>{file ? "📄" : "📂"}</div>
                    <div style={{ fontSize: "0.85rem", color: file ? C.accent : C.muted, fontWeight: file ? "600" : "400" }}>{file ? file.name : "Upload PDF"}</div>
                    <input ref={ref} type="file" accept=".pdf" style={{ display: "none" }} onChange={(e) => setter(e.target.files[0])} />
                  </div>
                </div>
              ))}
            </div>

            <button onClick={runComparison} disabled={!planA || !planB} style={btnS("primary", { width: "100%", padding: "0.85rem", marginBottom: "1.5rem", opacity: (!planA || !planB) ? 0.45 : 1 })}>
              {compareLoading ? <>{spinner}Comparing...</> : "⚖️ Compare My Plans"}
            </button>

            {compareError && <div style={{ background: "#FFF0EE", border: `1.5px solid ${C.warm}`, borderRadius: "10px", padding: "1rem 1.25rem", fontSize: "0.88rem", color: C.warm, marginBottom: "1.25rem" }}><strong>Something went wrong:</strong> {compareError}</div>}

            {compareOutput && (
              <div style={cardS()}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.87rem" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "0.6rem 1rem", textAlign: "left", background: "#F4F1EA", borderBottom: `2px solid ${C.border}`, color: C.muted, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>Feature</th>
                      <th style={{ padding: "0.6rem 1rem", textAlign: "center", background: C.sky + "18", borderBottom: `2px solid ${C.sky}`, color: C.sky, fontWeight: "600" }}>{compareOutput.planA.name}</th>
                      <th style={{ padding: "0.6rem 1rem", textAlign: "center", background: C.warm + "18", borderBottom: `2px solid ${C.warm}`, color: C.warm, fontWeight: "600" }}>{compareOutput.planB.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[["Plan Type", compareOutput.planA.type, compareOutput.planB.type], ["Deductible", compareOutput.planA.deductible, compareOutput.planB.deductible], ["Out-of-Pocket Max", compareOutput.planA.oop, compareOutput.planB.oop], ["PCP Visit", compareOutput.planA.pcp, compareOutput.planB.pcp], ["Specialist", compareOutput.planA.specialist, compareOutput.planB.specialist], ["ER Visit", compareOutput.planA.er, compareOutput.planB.er], ["Network", compareOutput.planA.network, compareOutput.planB.network]].map(([label, a, b], i) => (
                      <tr key={label} style={{ background: i % 2 === 0 ? "#F9F8F4" : "#fff", borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "0.65rem 1rem", fontWeight: "600", fontSize: "0.8rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "center" }}>{a}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "center" }}>{b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: "1.25rem", background: C.storyBg, borderRadius: "10px", padding: "1rem 1.25rem", fontSize: "0.9rem", lineHeight: "1.65", color: C.ink }}>
                  <strong style={{ color: C.accent }}>💡 Our take: </strong>{compareOutput.verdict}
                </div>
              </div>
            )}

            <div style={cardS({ marginTop: "0.5rem" })}>
              <div style={labelS}>Plan Type Quick Reference</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                      <th style={{ padding: "0.5rem 0.85rem", textAlign: "left", color: C.muted, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: "600" }}>Feature</th>
                      {["HMO", "PPO", "HDHP", "EPO"].map(t => <th key={t} style={{ padding: "0.5rem 0.85rem", textAlign: "center", fontWeight: "700", color: planTypeColors[t], fontSize: "0.88rem", fontFamily: "'Fraunces', serif" }}>{t}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {PLAN_COMPARISON.map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#F9F8F4" : "#fff", borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "0.6rem 0.85rem", fontWeight: "600", color: "#555", fontSize: "0.83rem" }}>{row.feature}</td>
                        <td style={{ padding: "0.6rem 0.85rem", textAlign: "center", color: "#666" }}>{row.hmo}</td>
                        <td style={{ padding: "0.6rem 0.85rem", textAlign: "center", color: "#666" }}>{row.ppo}</td>
                        <td style={{ padding: "0.6rem 0.85rem", textAlign: "center", color: "#666" }}>{row.hdhp}</td>
                        <td style={{ padding: "0.6rem 0.85rem", textAlign: "center", color: "#666" }}>{row.epo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "lingo" && (
          <div>
            <h1 style={h1S}>Learn the Lingo</h1>
            <p style={subS}>Insurance docs are written like they're trying to confuse you. Here's everything you actually need to know, in words that make sense.</p>

            <div style={cardS()}>
              <div style={labelS}>The Four Plan Types</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "1rem" }}>
                {[
                  { type: "HMO", name: "Health Maintenance Org.", blurb: "You pick one primary care doctor who runs the show. Want to see a specialist? You need a referral first. The trade-off: it's usually the most affordable option.", pro: "Lowest cost", con: "Least flexible" },
                  { type: "PPO", name: "Preferred Provider Org.", blurb: "See any doctor you want, whenever you want. No referrals, no gatekeeper. You pay more in premiums for that freedom, but some people really value it.", pro: "Most flexible", con: "Most expensive" },
                  { type: "HDHP", name: "High-Deductible Plan", blurb: "Low monthly premiums, but a high deductible before coverage kicks in. The upside: it pairs with an HSA, letting you save pre-tax dollars for medical costs.", pro: "HSA eligible", con: "High deductible" },
                  { type: "EPO", name: "Exclusive Provider Org.", blurb: "Like an HMO without the referral hassle, but you must stay in-network. Go out-of-network and you're paying the full bill yourself.", pro: "No referrals", con: "Network only" },
                ].map((p) => {
                  const col = planTypeColors[p.type];
                  return (
                    <div key={p.type} style={{ background: "#F9F8F4", border: `1.5px solid ${C.border}`, borderRadius: "12px", padding: "1.1rem", borderTop: `3px solid ${col}` }}>
                      <div style={{ fontWeight: "700", fontSize: "1rem", marginBottom: "0.15rem", color: col, fontFamily: "'Fraunces', serif" }}>{p.type}</div>
                      <div style={{ fontSize: "0.78rem", color: C.muted, marginBottom: "0.6rem" }}>{p.name}</div>
                      <div style={{ fontSize: "0.84rem", color: "#555", lineHeight: "1.6", marginBottom: "0.75rem" }}>{p.blurb}</div>
                      <div style={{ fontSize: "0.78rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                        <span style={{ color: C.accent }}>✓ {p.pro}</span>
                        <span style={{ color: C.warm }}>✗ {p.con}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={cardS()}>
              <div style={labelS}>Key Terms</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {GLOSSARY.map((g, i) => (
                  <div key={g.term} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "1rem", padding: "0.85rem 0", borderBottom: i < GLOSSARY.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "baseline" }}>
                    <div style={{ fontWeight: "600", fontSize: "0.92rem", fontFamily: "'Fraunces', serif", color: C.ink }}>{g.term}</div>
                    <div style={{ fontSize: "0.88rem", color: "#555", lineHeight: "1.65" }}>{g.def}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={cardS()}>
              <div style={labelS}>📖 How it all fits together — Jordan's year</div>
              <div style={{ lineHeight: "1.9", fontSize: "0.95rem" }}>
                <p>Meet <strong>Jordan</strong>. Jordan has a PPO with a <strong>$1,000 deductible</strong>, <strong>20% coinsurance</strong>, and a <strong>$4,000 out-of-pocket max</strong>.</p>
                <br />
                <p>In January, Jordan breaks their wrist. The ER bill comes to <strong>$3,000</strong>. Jordan hasn't hit the deductible yet, so they pay the first <strong>$1,000</strong> themselves. Deductible: done.</p>
                <br />
                <p>The remaining $2,000 gets split. Insurance covers 80% (<strong>$1,600</strong>), Jordan covers 20% (<strong>$400</strong>). Running total out of pocket: <strong>$1,400</strong>.</p>
                <br />
                <p>In June, Jordan needs physical therapy. Another $2,000 in bills. Deductible's already met, so Jordan only pays 20% = <strong>$400 more</strong>. Total: <strong>$1,800</strong>.</p>
                <br />
                <p>By October, Jordan's total out-of-pocket hits <strong>$4,000</strong>. That's the max. From here until December 31st, insurance picks up <strong>100%</strong> of every covered cost. Jordan pays nothing more this year.</p>
                <br />
                <div style={{ background: C.storyBg, padding: "0.85rem 1.1rem", borderRadius: "8px", fontSize: "0.88rem", lineHeight: "1.6", border: `1px solid ${C.storyBorder}` }}>
                  💡 <strong>The through-line:</strong> Deductible → Coinsurance → Out-of-Pocket Max. Once that chain clicks, you can estimate almost any medical bill before it arrives.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

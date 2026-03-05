import { useState, useRef } from "react";

// ── CHANGE THIS ONE LINE WHEN YOU PICK A NAME ──
const APP_NAME = "EOB";

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
  { id: "surgery", emoji: "🏥", label: (name) => `${name} needs

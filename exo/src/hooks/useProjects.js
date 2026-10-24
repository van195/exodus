import { useEffect, useState } from "react";

// Demo storage: everything lives in the browser (localStorage).
// Replace the functions below with real API calls when the backend is ready.
const KEY = "exodus_projects_v2";

const day = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const ago = (days) => Date.now() - days * 86400000;
const rec = (id, type, amount, method, account, at) => ({ id, type, amount, method, account, at });

const SEED = [
  {
    id: "p1", title: "Pharmacy inventory system", category: "Software",
    description: "Track medicine stock, expiry dates and daily sales for two branches. Needs low-stock alerts and a simple report page.",
    budget: 45000, deadline: day(21), status: "open", createdAt: ago(2),
    clientId: "other", clientName: "Abay Pharmacy", contactPhone: "0911 223 344", contactEmail: "abay.pharmacy@example.com",
    developerId: null, developerName: null, receipts: [], messages: [],
  },
  {
    id: "p2", title: "Hotel booking website", category: "Website",
    description: "Public website with room gallery, availability calendar and booking requests sent to the front desk by email.",
    budget: 60000, deadline: day(30), status: "open", createdAt: ago(1),
    clientId: "other", clientName: "Tana Hotel", contactPhone: "0918 440 120", contactEmail: "",
    developerId: null, developerName: null, receipts: [], messages: [],
  },
  {
    id: "p3", title: "Cafe ordering mobile app", category: "Mobile app",
    description: "Customers browse the menu and order from their table. Orders appear on a kitchen screen in real time.",
    budget: 80000, deadline: day(14), status: "funded", createdAt: ago(6),
    clientId: "other", clientName: "Bahir Cafe", contactPhone: "0925 310 778", contactEmail: "hello@bahircafe.example.com",
    developerId: "me", developerName: "You",
    receipts: [rec("EXO-8K2M1A", "fund", 80000, "Telebirr", "•••• 4411", ago(5))],
    messages: [
      { from: "developer", text: "Hello! I accepted the cafe app. Can you send your menu and logo?", at: ago(5) + 3600000 },
      { from: "client", text: "Sure, I will send them on Telegram today.", at: ago(5) + 7200000 },
    ],
  },
  {
    id: "p4", title: "School grade portal", category: "Website",
    description: "Teachers enter grades, parents log in to see their child's results. Printable report cards.",
    budget: 55000, deadline: day(-3), status: "funded", createdAt: ago(20),
    clientId: "me", clientName: "Your company", contactPhone: "0900 000 000", contactEmail: "",
    developerId: "other", developerName: "Selam T.", developerPhone: "0922 556 677",
    receipts: [rec("EXO-4D9Q7T", "fund", 55000, "CBE Birr", "•••• 9020", ago(18))],
    messages: [{ from: "developer", text: "The grade entry screens are ready. I am finishing the parent login.", at: ago(8) }],
  },
  {
    id: "p5", title: "Shop sales dashboard", category: "Software",
    description: "Daily sales, best-selling items and monthly profit charts for a retail shop.",
    budget: 30000, deadline: day(5), status: "delivered", createdAt: ago(12),
    clientId: "me", clientName: "Your company", contactPhone: "0900 000 000", contactEmail: "",
    developerId: "other", developerName: "Dawit M.", developerPhone: "0933 118 204",
    receipts: [rec("EXO-1H5Z3C", "fund", 30000, "Bank transfer", "•••• 1288", ago(10))],
    messages: [{ from: "developer", text: "Delivered! Please check the monthly chart and approve when ready.", at: ago(1) }],
  },
  {
    id: "p6", title: "Company landing page", category: "Website",
    description: "One-page website with services, team and contact form. Amharic and English.",
    budget: 18000, deadline: day(10), status: "open", createdAt: ago(0),
    clientId: "me", clientName: "Your company", contactPhone: "0900 000 000", contactEmail: "",
    developerId: null, developerName: null, receipts: [], messages: [],
  },
];

const load = () => {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? JSON.parse(saved) : SEED;
  } catch {
    return SEED;
  }
};

export function useProjects() {
  const [projects, setProjects] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(projects)); } catch { /* ignore */ }
  }, [projects]);

  // keep two open tabs in sync (client in one tab, developer in another)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY && e.newValue) setProjects(JSON.parse(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // change can be an object or a function of the current project
  const patch = (id, change) =>
    setProjects((list) =>
      list.map((p) => (p.id === id ? { ...p, ...(typeof change === "function" ? change(p) : change) } : p))
    );

  // Records a payment step and its receipt. Returns the receipt so the UI can show it.
  const pay = (project, status, type, details = {}) => {
    const receipt = {
      id: `EXO-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      type, amount: project.budget, at: Date.now(), ...details,
    };
    patch(project.id, (p) => ({ status, receipts: [...(p.receipts || []), receipt] }));
    return receipt;
  };

  return {
    projects,
    create: (data) =>
      setProjects((list) => [
        {
          id: `p${Date.now()}`, status: "open", createdAt: Date.now(), clientId: "me",
          developerId: null, developerName: null, receipts: [], messages: [], ...data,
        },
        ...list,
      ]),
    accept: (id) => patch(id, { status: "accepted", developerId: "me", developerName: "You" }),
    deliver: (id) => patch(id, { status: "delivered" }),
    fund: (project, details) => pay(project, "funded", "fund", details),
    release: (project) => pay(project, "released", "release", { method: "Escrow release" }),
    refund: (project) =>
      pay(project, "refunded", "refund", {
        method: (project.receipts || []).find((r) => r.type === "fund")?.method || "Original payment method",
      }),
    sendMessage: (id, from, text) =>
      patch(id, (p) => ({ messages: [...(p.messages || []), { from, text, at: Date.now() }] })),
    reset: () => setProjects(SEED),
  };
}

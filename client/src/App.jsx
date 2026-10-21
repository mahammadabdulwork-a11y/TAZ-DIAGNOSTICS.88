import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ClipboardList,
  Clock,
  Copy,
  CreditCard,
  Database,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FlaskConical,
  Globe,
  Home,
  Laptop,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  MoreVertical,
  Phone,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Trash2,
  Upload,
  User,
  UserCheck,
  UserCog,
  Users,
  Wifi,
  X,
} from "lucide-react";
// PDF is now generated via a dedicated print window (no external PDF lib needed)
import "./styles.css";
import { TECHNICIAN_SIGNATURE_SRC } from "./technicianSignatureData.js";
import {
  startLiveSync,
  syncCollectionToBackend,
  deleteItemFromBackend,
  markItemDeleted,
  getSyncStatus,
  onSyncStatusChange,
  pullAllFromBackend,
  pushAllToBackend,
  getCustomApiBase,
  setCustomApiBase,
  fetchNetworkInfo,
  downloadLifetimeBackup,
  restoreLifetimeBackup,
  syncBatchToBackend,
} from "./services/dataSyncService.js";


/* =========================================================
   TAZ COMPANY — STORAGE KEYS & UTILITIES
   ========================================================= */

const STORAGE = {
  session: "taz_company_session",
  patients: "taz_company_patients",
  doctors: "taz_company_doctors",
  tests: "taz_company_tests",
  reports: "taz_company_reports",
  bills: "taz_company_bills",
  messages: "taz_company_messages",
  branches: "taz_company_branches",
  users: "taz_company_users",
  settings: "taz_company_settings",
};

const today = () => new Date().toISOString().slice(0, 10);

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    const parsed = JSON.parse(value);
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : fallback;
    }
    if (fallback && typeof fallback === "object") {
      return (parsed && typeof parsed === "object") ? parsed : fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("Storage write error:", err);
  }
  window.dispatchEvent(
    new CustomEvent("taz-company-update", { detail: { key, value } })
  );
  if (key && key !== STORAGE.session) {
    syncCollectionToBackend(key, value);
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("Storage writeLocal error:", err);
  }
  window.dispatchEvent(
    new CustomEvent("taz-company-update", { detail: { key, value } })
  );
}

function useStoredData(key, fallback) {
  const [data, setData] = useState(() => read(key, fallback));

  useEffect(() => {
    const handleUpdate = (e) => {
      if (!e?.detail?.key || e.detail.key === key) {
        setData(read(key, fallback));
      }
    };

    const handleStorage = (e) => {
      if (!e.key || e.key === key) {
        setData(read(key, fallback));
      }
    };

    window.addEventListener("taz-company-update", handleUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("taz-company-update", handleUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, [key]);

  const updateData = (nextVal) => {
    setData((prev) => {
      const resolved = typeof nextVal === "function" ? nextVal(prev) : nextVal;
      write(key, resolved);
      return resolved;
    });
  };

  return [data, updateData];
}

function nextId(prefix, items) {
  if (!Array.isArray(items) || items.length === 0) return `${prefix}001`;
  const numbers = items.map((item) => {
    const match = String(item?.id || "").match(/\d+/);
    return match ? Number(match[0]) : 0;
  });
  const next = Math.max(0, ...numbers) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

/* =========================================================
   ERROR BOUNDARY — ZERO CRASH SHIELD
   ========================================================= */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Clinical System Intercepted Error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleSafeRecovery = () => {
    try {
      seed(true);
    } catch {}
    this.setState({ hasError: false, error: null });
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F9FAFB",
          padding: "24px",
          fontFamily: "Inter, system-ui, sans-serif"
        }}>
          <div style={{
            maxWidth: "520px",
            width: "100%",
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            padding: "36px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
            textAlign: "center",
            border: "1px solid #E5E7EB"
          }}>
            <div style={{
              width: "60px",
              height: "60px",
              backgroundColor: "#ECFDF5",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              color: "#059669",
              fontSize: "26px"
            }}>
              🛡️
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111827", margin: "0 0 8px" }}>
              TAZ DIAGNOSTIC — Safe Recovery Mode
            </h2>
            <p style={{ fontSize: "14px", color: "#4B5563", lineHeight: "1.6", margin: "0 0 22px" }}>
              A temporary display error occurred, but <b>your patients, tests, reports, and database records are 100% safe and intact.</b>
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={this.handleReload}
                style={{
                  backgroundColor: "#5B0A1A",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "11px 22px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                Refresh System
              </button>
              <button
                onClick={this.handleSafeRecovery}
                style={{
                  backgroundColor: "#F3F4F6",
                  color: "#374151",
                  border: "1px solid #D1D5DB",
                  padding: "11px 22px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export { ErrorBoundary };

/* =========================================================
   DEFAULT SEED DATA
   ========================================================= */

const DEFAULT_DOCTORS = [
  {
    id: "DOC001",
    name: "Dr. Ahmed Khan",
    specialization: "Consultant Physician",
    phone: "9876543210",
    email: "ahmed@tazdiagnostic.com",
    status: "Active",
  },
  {
    id: "DOC002",
    name: "Dr. Ananya Rao",
    specialization: "General Physician",
    phone: "9876501234",
    email: "ananya@tazdiagnostic.com",
    status: "Active",
  },
  {
    id: "DOC003",
    name: "Dr. Rahul Mehta",
    specialization: "Cardiologist",
    phone: "9876505678",
    email: "rahul@tazdiagnostic.com",
    status: "Active",
  },
  {
    id: "DOC004",
    name: "Dr. Priya Sharma",
    specialization: "Pathologist",
    phone: "9988776655",
    email: "priya@tazdiagnostic.com",
    status: "Active",
  },
];

// =========================================================
// HELPER: DETECT ABNORMAL TEST RESULT (Matching Image 4)
// =========================================================
function getAbnormalFlag(value, reference, gender = "Male") {
  if (!value || !reference || value === "—" || value === "Nil") return null;
  const valStr = String(value).trim();
  const refLower = reference.toLowerCase();

  // If reference explicitly allows both Positive and Negative (e.g. Rh Type) or Blood Groups, it's normal
  if (refLower.includes("positive") && refLower.includes("negative")) return null;
  if (refLower.includes("a / b / ab / o") || refLower.includes("a/b/ab/o")) return null;

  // Qualitative checks
  const lowerVal = valStr.toLowerCase();
  if (
    valStr === "1+" ||
    valStr === "2+" ||
    valStr === "3+" ||
    valStr === "4+" ||
    lowerVal === "positive" ||
    lowerVal === "reactive"
  ) {
    if (refLower.includes("negative") || refLower.includes("nil") || refLower.includes("non-reactive")) {
      return "Abnormal";
    }
  }

  // Handle cell ranges like "4-5 cells/hpf" or "2-3 cells/hpf" vs "0 - 4/HPF"
  const cellMatch = valStr.match(/^([0-9.]+)(?:\s*-\s*([0-9.]+))?\s*cells?/i);
  if (cellMatch) {
    const valHigh = cellMatch[2] ? parseFloat(cellMatch[2]) : parseFloat(cellMatch[1]);
    const refMatch = reference.match(/([0-9.]+)\s*-\s*([0-9.]+)/);
    if (refMatch) {
      const refMax = parseFloat(refMatch[2]);
      if (valHigh > refMax) return "High";
    }
    return null;
  }

  // Skip ratio / time formats like "2:30", "5:00"
  if (valStr.includes(":")) return null;

  // Clean numeric string
  const cleanVal = parseFloat(valStr.replace(/,/g, ""));
  if (isNaN(cleanVal)) return null;

  const refStr = reference.replace(/,/g, "");

  // Gender specific
  if (refStr.toLowerCase().includes("male:") || refStr.toLowerCase().includes("female:")) {
    const isFemale = String(gender).toLowerCase().startsWith("f");
    const part = isFemale
      ? refStr.match(/Female:\s*([0-9.]+)\s*-\s*([0-9.]+)/i)
      : refStr.match(/Male:\s*([0-9.]+)\s*-\s*([0-9.]+)/i);
    if (part) {
      const min = parseFloat(part[1]);
      const max = parseFloat(part[2]);
      if (cleanVal < min) return "Low";
      if (cleanVal > max) return "High";
      return null;
    }
  }

  // Range min - max
  const rangeMatch = refStr.match(/([0-9.]+)\s*-\s*([0-9.]+)/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (cleanVal < min) return "Low";
    if (cleanVal > max) return "High";
    return null;
  }

  // Bound < max
  const lessMatch = refStr.match(/<\s*([0-9.]+)/);
  if (lessMatch) {
    const max = parseFloat(lessMatch[1]);
    if (cleanVal > max) return "High";
    return null;
  }

  // Bound > min
  const greaterMatch = refStr.match(/>\s*([0-9.]+)/);
  if (greaterMatch) {
    const min = parseFloat(greaterMatch[1]);
    if (cleanVal < min) return "Low";
    return null;
  }

  return null;
}

const DEFAULT_TESTS = [
  // ==========================================
  // Clinical Pathology
  // ==========================================
  {
    id: "TST001",
    name: "H.B.",
    category: "Clinical Pathology",
    unit: "g/dL",
    reference: "Male: 13.0 - 17.0, Female: 12.0 - 15.0",
    price: 100,
    status: "Active",
  },
  {
    id: "TST002",
    name: "TRBC",
    category: "Clinical Pathology",
    unit: "mil/cu.mm",
    reference: "4.5 - 5.5 mil/cu.mm",
    price: 0,
    status: "Active",
  },
  {
    id: "TST003",
    name: "TWBC",
    category: "Clinical Pathology",
    unit: "/cu.mm",
    reference: "4,000 - 11,000 /cu.mm",
    price: 0,
    status: "Active",
  },
  {
    id: "TST004",
    name: "Platelet Count",
    category: "Clinical Pathology",
    unit: "Lakhs/cu.mm",
    reference: "1.5 - 4.5 Lakhs/cu.mm",
    price: 0,
    status: "Active",
  },
  {
    id: "TST005",
    name: "DC Count",
    category: "Clinical Pathology",
    unit: "%",
    reference: "Differential Leucocyte Count",
    price: 0,
    status: "Active",
  },
  {
    id: "TST006",
    name: "Polymorphs",
    category: "Clinical Pathology",
    unit: "%",
    reference: "40 - 75 %",
    price: 0,
    status: "Active",
  },
  {
    id: "TST007",
    name: "Lymphocytes",
    category: "Clinical Pathology",
    unit: "%",
    reference: "20 - 45 %",
    price: 0,
    status: "Active",
  },
  {
    id: "TST008",
    name: "Eosinophils",
    category: "Clinical Pathology",
    unit: "%",
    reference: "1 - 6 %",
    price: 0,
    status: "Active",
  },
  {
    id: "TST009",
    name: "Monocytes",
    category: "Clinical Pathology",
    unit: "%",
    reference: "2 - 8 %",
    price: 0,
    status: "Active",
  },
  {
    id: "TST010",
    name: "ESR",
    category: "Clinical Pathology",
    unit: "mm/1st hr",
    reference: "Male: 0 - 15, Female: 0 - 20 (Westergren)",
    price: 100,
    status: "Active",
  },
  {
    id: "TST011",
    name: "Bleeding Time",
    category: "Clinical Pathology",
    unit: "min:sec",
    reference: "2 - 7 mins (Duke's method)",
    price: 50,
    status: "Active",
  },
  {
    id: "TST012",
    name: "Clotting Time",
    category: "Clinical Pathology",
    unit: "min:sec",
    reference: "3 - 8 mins (Lee-White method)",
    price: 50,
    status: "Active",
  },
  {
    id: "TST013",
    name: "MP",
    category: "Clinical Pathology",
    unit: "Smear Examination",
    reference: "Negative / Not Seen",
    price: 150,
    status: "Active",
  },
  {
    id: "TST014",
    name: "MF",
    category: "Clinical Pathology",
    unit: "Smear Examination",
    reference: "Negative / Not Seen",
    price: 200,
    status: "Active",
  },
  {
    id: "TST015",
    name: "Blood Group",
    category: "Clinical Pathology",
    unit: "Agglutination",
    reference: "A / B / AB / O",
    price: 100,
    status: "Active",
  },
  {
    id: "TST016",
    name: "Rh Type",
    category: "Clinical Pathology",
    unit: "Agglutination",
    reference: "Positive / Negative",
    price: 0,
    status: "Active",
  },
  {
    id: "TST017",
    name: "R.A. Test",
    category: "Clinical Pathology",
    unit: "IU/mL",
    reference: "< 20 IU/mL (Negative)",
    price: 200,
    status: "Active",
  },
  {
    id: "TST018",
    name: "VDRL",
    category: "Clinical Pathology",
    unit: "Qualitative",
    reference: "Non-Reactive",
    price: 200,
    status: "Active",
  },
  {
    id: "TST019",
    name: "Widal Test",
    category: "Clinical Pathology",
    unit: "Titer",
    reference: "S. Typhi 'O' & 'H' < 1:80",
    price: 100,
    status: "Active",
  },
  {
    id: "TST020",
    name: "OT",
    category: "Clinical Pathology",
    unit: "Titer",
    reference: "< 1:80 (Negative)",
    price: 0,
    status: "Active",
  },
  {
    id: "TST021",
    name: "HT",
    category: "Clinical Pathology",
    unit: "Titer",
    reference: "< 1:80 (Negative)",
    price: 0,
    status: "Active",
  },
  {
    id: "TST022",
    name: "HA",
    category: "Clinical Pathology",
    unit: "Titer",
    reference: "< 1:80 (Negative)",
    price: 0,
    status: "Active",
  },
  {
    id: "TST023",
    name: "HB",
    category: "Clinical Pathology",
    unit: "Titer",
    reference: "< 1:80 (Negative)",
    price: 0,
    status: "Active",
  },
  {
    id: "TST024",
    name: "Mantoux Test",
    category: "Clinical Pathology",
    unit: "mm (induration)",
    reference: "< 5 mm: Negative, > 10 mm: Positive",
    price: 200,
    status: "Active",
  },

  // ==========================================
  // Urine Examinations
  // ==========================================
  {
    id: "TST025",
    name: "Sugar",
    category: "Urine Examinations",
    unit: "Qualitative",
    reference: "Nil / Negative",
    price: 50,
    status: "Active",
  },
  {
    id: "TST026",
    name: "Albumin",
    category: "Urine Examinations",
    unit: "Qualitative",
    reference: "Nil / Negative",
    price: 50,
    status: "Active",
  },
  {
    id: "TST027",
    name: "Bile Salts",
    category: "Urine Examinations",
    unit: "Qualitative",
    reference: "Negative / Not Detected",
    price: 50,
    status: "Active",
  },
  {
    id: "TST028",
    name: "Bile Pigments",
    category: "Urine Examinations",
    unit: "Qualitative",
    reference: "Negative / Not Detected",
    price: 50,
    status: "Active",
  },
  {
    id: "TST029",
    name: "Pus Cells",
    category: "Urine Examinations",
    unit: "/HPF",
    reference: "0 - 4 /HPF",
    price: 50,
    status: "Active",
  },
  {
    id: "TST030",
    name: "RBC",
    category: "Urine Examinations",
    unit: "/HPF",
    reference: "Nil / Occasional",
    price: 0,
    status: "Active",
  },
  {
    id: "TST031",
    name: "Casts",
    category: "Urine Examinations",
    unit: "/LPF",
    reference: "Not Seen / Nil",
    price: 0,
    status: "Active",
  },
  {
    id: "TST032",
    name: "Crystals",
    category: "Urine Examinations",
    unit: "Microscopy",
    reference: "Not Seen / Nil",
    price: 0,
    status: "Active",
  },
  {
    id: "TST033",
    name: "WBC",
    category: "Urine Examinations",
    unit: "/HPF",
    reference: "0 - 2 /HPF",
    price: 0,
    status: "Active",
  },
  {
    id: "TST034",
    name: "Epithelial Cells",
    category: "Urine Examinations",
    unit: "/HPF",
    reference: "0 - 3 /HPF",
    price: 0,
    status: "Active",
  },
  {
    id: "TST035",
    name: "Others",
    category: "Urine Examinations",
    unit: "Examination",
    reference: "Nil",
    price: 0,
    status: "Active",
  },
  {
    id: "TST036",
    name: "Pregnancy Test",
    category: "Urine Examinations",
    unit: "Qualitative",
    reference: "Negative",
    price: 0,
    status: "Active",
  },

  // ==========================================
  // Bio Chemistry
  // ==========================================
  {
    id: "TST037",
    name: "Serum Glucose (F)",
    category: "Bio Chemistry",
    unit: "mg/dL",
    reference: "70 - 100",
    price: 50,
    status: "Active",
  },
  {
    id: "TST038",
    name: "Serum Glucose (R)",
    category: "Bio Chemistry",
    unit: "mg/dL",
    reference: "70 - 140",
    price: 50,
    status: "Active",
  },
  {
    id: "TST039",
    name: "Serum Glucose (PP)",
    category: "Bio Chemistry",
    unit: "mg/dL",
    reference: "< 140",
    price: 50,
    status: "Active",
  },
  {
    id: "TST040",
    name: "Urea",
    category: "Bio Chemistry",
    unit: "mg/dL",
    reference: "15 - 40",
    price: 150,
    status: "Active",
  },
  {
    id: "TST041",
    name: "Creatinine",
    category: "Bio Chemistry",
    unit: "mg/dL",
    reference: "Male: 0.7 - 1.3, Female: 0.6 - 1.1",
    price: 150,
    status: "Active",
  },
  {
    id: "TST042",
    name: "Cholesterol",
    category: "Bio Chemistry",
    unit: "mg/dL",
    reference: "Desirable: < 200",
    price: 100,
    status: "Active",
  },
  {
    id: "TST043",
    name: "Bilirubin Total",
    category: "Bio Chemistry",
    unit: "mg/dL",
    reference: "0.2 - 1.2",
    price: 100,
    status: "Active",
  },
  {
    id: "TST044",
    name: "Vanden Bergh Reaction",
    category: "Bio Chemistry",
    unit: "Reaction",
    reference: "Negative / Indirect",
    price: 100,
    status: "Active",
  },
  {
    id: "TST045",
    name: "HIV TRI DOT 1 & 2 Method",
    category: "Bio Chemistry",
    unit: "Qualitative",
    reference: "Non-Reactive",
    price: 300,
    status: "Active",
  },
  {
    id: "TST046",
    name: "HIV-1 Positive",
    category: "Bio Chemistry",
    unit: "Qualitative",
    reference: "Non-Reactive",
    price: 300,
    status: "Active",
  },
  {
    id: "TST047",
    name: "HIV-2 Positive",
    category: "Bio Chemistry",
    unit: "Qualitative",
    reference: "Non-Reactive",
    price: 300,
    status: "Active",
  },
  {
    id: "TST048",
    name: "HBsAg",
    category: "Bio Chemistry",
    unit: "Qualitative",
    reference: "Non-Reactive",
    price: 300,
    status: "Active",
  },

  // ==========================================
  // Motion Examination
  // ==========================================
  {
    id: "TST049",
    name: "Motion Examination",
    category: "Motion Examination",
    unit: "Routine",
    reference: "Normal / Semisolid",
    price: 300,
    status: "Active",
  },
  {
    id: "TST050",
    name: "Mucus",
    category: "Motion Examination",
    unit: "Macroscopy",
    reference: "Not Seen / Nil",
    price: 0,
    status: "Active",
  },
  {
    id: "TST051",
    name: "Occult Blood",
    category: "Motion Examination",
    unit: "Chemical",
    reference: "Negative",
    price: 0,
    status: "Active",
  },
  {
    id: "TST052",
    name: "Microscopy Examination",
    category: "Motion Examination",
    unit: "Microscopy",
    reference: "See individual findings",
    price: 0,
    status: "Active",
  },
  {
    id: "TST053",
    name: "OVA",
    category: "Motion Examination",
    unit: "/HPF",
    reference: "Not Seen / Nil",
    price: 0,
    status: "Active",
  },
  {
    id: "TST054",
    name: "Cyst's",
    category: "Motion Examination",
    unit: "/HPF",
    reference: "Not Seen / Nil",
    price: 0,
    status: "Active",
  },
  {
    id: "TST055",
    name: "Bacteria",
    category: "Motion Examination",
    unit: "/HPF",
    reference: "Normal Flora",
    price: 0,
    status: "Active",
  },
  {
    id: "TST056",
    name: "Others",
    category: "Motion Examination",
    unit: "Microscopy",
    reference: "Nil",
    price: 0,
    status: "Active",
  },

  // ==========================================
  // Semen Analysis
  // ==========================================
  {
    id: "TST057",
    name: "Semen Analysis",
    category: "Semen Analysis",
    unit: "Analysis",
    reference: "Volume: 2 - 5 mL, Liquefaction: 20-30 min",
    price: 350,
    status: "Active",
  },
  {
    id: "TST058",
    name: "Collection",
    category: "Semen Analysis",
    unit: "Observation",
    reference: "Complete Specimen",
    price: 0,
    status: "Active",
  },
  {
    id: "TST059",
    name: "Reaction",
    category: "Semen Analysis",
    unit: "pH",
    reference: "Alkaline (7.2 - 8.0)",
    price: 0,
    status: "Active",
  },
  {
    id: "TST060",
    name: "Semen Total Count",
    category: "Semen Analysis",
    unit: "Million/mL",
    reference: "> 15 Million/mL",
    price: 0,
    status: "Active",
  },
  {
    id: "TST061",
    name: "Motile",
    category: "Semen Analysis",
    unit: "%",
    reference: "> 40 % Progressive",
    price: 0,
    status: "Active",
  },
  {
    id: "TST062",
    name: "Non Motile",
    category: "Semen Analysis",
    unit: "%",
    reference: "< 60 %",
    price: 0,
    status: "Active",
  },
  {
    id: "TST063",
    name: "Pus Cells",
    category: "Semen Analysis",
    unit: "/HPF",
    reference: "0 - 2 /HPF",
    price: 0,
    status: "Active",
  },
  {
    id: "TST064",
    name: "Others",
    category: "Semen Analysis",
    unit: "Observation",
    reference: "Nil",
    price: 0,
    status: "Active",
  },

  // ==========================================
  // Additional Tests
  // ==========================================
  {
    id: "TST065",
    name: "Thyroid",
    category: "Additional Tests",
    unit: "Various",
    reference: "TSH: 0.4 - 4.2 µIU/mL, T3/T4: Normal",
    price: 500,
    status: "Active",
  },
  {
    id: "TST066",
    name: "LFT (Liver Function Test)",
    category: "Bio Chemistry",
    unit: "Profile",
    reference: "Complete Liver Function Panel",
    price: 800,
    status: "Active",
  },
  {
    id: "TST067",
    name: "Vitamin D",
    category: "Additional Tests",
    unit: "ng/mL",
    reference: "Sufficiency: 30.0 - 100.0",
    price: 1000,
    status: "Active",
  },
  {
    id: "TST068",
    name: "Vitamin B12",
    category: "Additional Tests",
    unit: "pg/mL",
    reference: "211 - 911",
    price: 1000,
    status: "Active",
  },
  {
    id: "TST069",
    name: "Iron",
    category: "Additional Tests",
    unit: "µg/dL",
    reference: "Male: 65 - 175, Female: 50 - 170",
    price: 800,
    status: "Active",
  },
  {
    id: "TST070",
    name: "CRP",
    category: "Additional Tests",
    unit: "mg/L",
    reference: "< 6.0 mg/L (Normal)",
    price: 500,
    status: "Active",
  },
  {
    id: "TST071",
    name: "HbA1c",
    category: "Additional Tests",
    unit: "%",
    reference: "Normal: < 5.7%, Diabetic: ≥ 6.5%",
    price: 500,
    status: "Active",
  },

  // ==========================================
  // Liver Function Test (LFT) — Individual Parameters
  // ==========================================
  {
    id: "TST072",
    name: "Total Bilirubin",
    category: "Liver Function Test",
    unit: "mg/dl",
    reference: "0.1 - 1.2 mg/dl",
    price: 100,
    status: "Active",
  },
  {
    id: "TST073",
    name: "Direct Bilirubin",
    category: "Liver Function Test",
    unit: "mg/dl",
    reference: "Up to 0.3 mg/dl",
    price: 100,
    status: "Active",
  },
  {
    id: "TST074",
    name: "Indirect Bilirubin",
    category: "Liver Function Test",
    unit: "mg/dl",
    reference: "0.1 - 0.8 mg/dl",
    price: 100,
    status: "Active",
  },
  {
    id: "TST075",
    name: "S G P T",
    category: "Liver Function Test",
    unit: "IU/L",
    reference: "Male: Up to 45 IU/L\nFemale: Up to 34 IU/L",
    price: 150,
    status: "Active",
  },
  {
    id: "TST076",
    name: "S G O T",
    category: "Liver Function Test",
    unit: "IU/L",
    reference: "Male : Up to 45 IU/L\nFemale: Up to 37 IU/L",
    price: 150,
    status: "Active",
  },
  {
    id: "TST077",
    name: "Alkaline Phosphatase",
    category: "Liver Function Test",
    unit: "IU/L",
    reference: "44 - 147 IU/L",
    price: 150,
    status: "Active",
  },
  {
    id: "TST078",
    name: "Total Proteins",
    category: "Liver Function Test",
    unit: "gm/dl",
    reference: "6.4 - 8.3 gm/dl",
    price: 120,
    status: "Active",
  },
  {
    id: "TST079",
    name: "Serum Albumin",
    category: "Liver Function Test",
    unit: "gm/dl",
    reference: "3.4 - 5.0 gm/dl",
    price: 120,
    status: "Active",
  },
  {
    id: "TST080",
    name: "Globulin",
    category: "Liver Function Test",
    unit: "gm/dl",
    reference: "2.5 - 3.5 gm/dl",
    price: 100,
    status: "Active",
  },
  {
    id: "TST081",
    name: "A/G Ratio",
    category: "Liver Function Test",
    unit: "",
    reference: "1.0 - 2.1",
    price: 50,
    status: "Active",
  },

  // ==========================================
  // Lipid Profile — Individual Parameters
  // ==========================================
  {
    id: "TST082",
    name: "Lipid Profile",
    category: "Lipid Profile",
    unit: "Profile",
    reference: "Complete Lipid Profile Panel",
    price: 750,
    status: "Active",
  },
  {
    id: "TST083",
    name: "Total Cholesterol",
    category: "Lipid Profile",
    unit: "mg/dl",
    reference: "50 - 200 mg/dl",
    price: 120,
    status: "Active",
  },
  {
    id: "TST084",
    name: "H D L Cholesterol",
    category: "Lipid Profile",
    unit: "mg/dl",
    reference: "30 - 70 mg/dl",
    price: 150,
    status: "Active",
  },
  {
    id: "TST085",
    name: "Tryglycerides",
    category: "Lipid Profile",
    unit: "mg/dl",
    reference: "50 - 160 mg/dl",
    price: 150,
    status: "Active",
  },
  {
    id: "TST086",
    name: "L D L Cholesterol",
    category: "Lipid Profile",
    unit: "mg/dl",
    reference: "30 - 130 mg/dl",
    price: 150,
    status: "Active",
  },
  {
    id: "TST087",
    name: "V L D L Cholesterol",
    category: "Lipid Profile",
    unit: "mg/dl",
    reference: "Up to 30 mg/dl",
    price: 120,
    status: "Active",
  },
  {
    id: "TST088",
    name: "LDL/HDL",
    category: "Lipid Profile",
    unit: "",
    reference: "Up to 3.5",
    price: 50,
    status: "Active",
  },

  // ==========================================
  // Electrolytes — Individual Parameters
  // ==========================================
  {
    id: "TST089",
    name: "Electrolytes Profile",
    category: "Electrolytes",
    unit: "Profile",
    reference: "Sodium, Potassium, Chloride, Calcium",
    price: 600,
    status: "Active",
  },
  {
    id: "TST090",
    name: "Serum Sodium",
    category: "Electrolytes",
    unit: "mmol/L",
    reference: "135 - 150 mmol/L",
    price: 150,
    status: "Active",
  },
  {
    id: "TST091",
    name: "Serum Potassium",
    category: "Electrolytes",
    unit: "mmol/L",
    reference: "3.5 - 5.0 mmol/L",
    price: 150,
    status: "Active",
  },
  {
    id: "TST092",
    name: "Serum Chloride",
    category: "Electrolytes",
    unit: "mmol/L",
    reference: "94 - 110 mmol/L",
    price: 150,
    status: "Active",
  },
  {
    id: "TST093",
    name: "Serum Calcium",
    category: "Electrolytes",
    unit: "mg/dl",
    reference: "8.6 - 10.2 mg/dl",
    price: 150,
    status: "Active",
  },

  // ==========================================
  // HBA1C — Individual Parameters
  // ==========================================
  {
    id: "TST094",
    name: "Glycosylated Haemoglobin(HBA1C)",
    category: "HBA1C",
    unit: "%",
    reference: "Non Diabetic : 4.0 - 6.0 %\nGood Control : 6.0 - 7.0 %\nFair Control : 7.0 - 8.0 %\nPoor Control : > 8.0 %",
    price: 500,
    status: "Active",
  },
  {
    id: "TST095",
    name: "Mean Blood Glucose",
    category: "HBA1C",
    unit: "mg/dl",
    reference: "70 - 126 mg/dl",
    price: 150,
    status: "Active",
  },
];

const DEFAULT_BRANCHES = [
  {
    id: "BR001",
    name: "Main Branch",
    address: "Dr No: 8-200 RAJKUMAR SILKS, Near Raj Kumar Silks Street, Main Road, Tallapudi, Rajahmundry-534341, Andhra Pradesh",
    phone: "9440985131",
    status: "Active",
  },
];

const DEFAULT_PATIENTS = [];

const DEFAULT_USERS = [
  {
    id: "USR001",
    name: "Administrator",
    username: "Taz@18",
    password: "Sofiya@2010",
    role: "Administrator",
    status: "Active",
  },
  {
    id: "USR002",
    name: "Lab Technician",
    username: "Taz@18",
    password: "Sofiya@2010",
    role: "Lab Technician",
    status: "Active",
  },
];

const DEFAULT_REPORTS = [];

const DEFAULT_BILLS = [];

const DEFAULT_MESSAGES = [];

function seed(force = false) {
  const existingDocs = read(STORAGE.doctors, null);
  if (force || !existingDocs || !existingDocs.length) {
    writeLocal(STORAGE.doctors, DEFAULT_DOCTORS);
  }
  
  const existingTests = read(STORAGE.tests, null);
  if (force || !existingTests || !existingTests.length) {
    writeLocal(STORAGE.tests, DEFAULT_TESTS);
    writeLocal("taz_tests_catalog_v", 8);
  } else {
    const currentVersion = Number(read("taz_tests_catalog_v", 0));
    if (currentVersion < 8) {
      const defaultMap = new Map(DEFAULT_TESTS.map((t) => [t.id, t]));
      const defaultByName = new Map(DEFAULT_TESTS.map((t) => [t.name.toLowerCase().trim(), t]));
      const updatedExisting = existingTests.map((t) => {
        const match = defaultMap.get(t.id) || defaultByName.get((t?.name || "").toLowerCase().trim());
        if (match) {
          return { ...t, category: match.category, reference: match.reference, unit: match.unit };
        }
        return t;
      });
      const existingIds = new Set(updatedExisting.map((t) => t.id));
      const existingNames = new Set(updatedExisting.map((t) => (t?.name || "").toLowerCase().trim()));
      const toAdd = DEFAULT_TESTS.filter(
        (t) => !existingIds.has(t.id) && !existingNames.has((t?.name || "").toLowerCase().trim())
      );
      const merged = [...updatedExisting, ...toAdd];
      write(STORAGE.tests, merged);
      writeLocal("taz_tests_catalog_v", 8);
    }
  }

  // Always ensure branches exist
  const existingBranches = read(STORAGE.branches, null);
  if (force || !existingBranches || !existingBranches.length) {
    writeLocal(STORAGE.branches, DEFAULT_BRANCHES);
    writeLocal("taz_branches_v", 3);
  }

  if (force || !localStorage.getItem(STORAGE.users)) {
    writeLocal(STORAGE.users, DEFAULT_USERS);
    writeLocal("taz_users_v", 2);
  }

  if (force && !localStorage.getItem(STORAGE.patients)) {
    writeLocal(STORAGE.patients, []);
    writeLocal(STORAGE.reports, []);
    writeLocal(STORAGE.bills, []);
    writeLocal(STORAGE.messages, []);
  }
  const storedSettings = read(STORAGE.settings, null);
  const correctAddress = "Dr No: 8-200 RAJKUMAR SILKS, Near Raj Kumar Silks Street, Main Road, Tallapudi, Rajahmundry-534341, Andhra Pradesh";
  const correctPhone = "9440985131";
  const correctEmail = "tazdiagnostic@gmail.com";

  if (
    force ||
    !storedSettings ||
    storedSettings.phone === "040-24567890" ||
    storedSettings.email === "info@tazdiagnostic.com" ||
    !storedSettings.address ||
    !storedSettings.address.includes("Tallapudi")
  ) {
    writeLocal(STORAGE.settings, {
      ...(storedSettings || {}),
      labName: "TAZ DIAGNOSTIC",
      phone: correctPhone,
      email: correctEmail,
      address: correctAddress,
      footerNote:
        storedSettings?.footerNote ||
        "This laboratory report is generated electronically. Please consult your physician for clinical correlation.",
    });
  }
}

/* =========================================================
   COMMON UI PRIMITIVES
   ========================================================= */

function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2600);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;
  return (
    <div className="toast">
      <Check size={18} />
      <span>{message}</span>
    </div>
  );
}

function Button({
  children,
  onClick,
  primary = false,
  danger = false,
  type = "button",
  disabled = false,
  className = "",
  id,
  ...props
}) {
  return (
    <button
      id={id}
      type={type}
      disabled={disabled}
      className={`btn ${primary ? "primary" : ""} ${danger ? "danger" : ""} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

function PageHeader({ title, subtitle, children }) {
  return (
    <div className="pagehead">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="headactions">{children}</div>}
    </div>
  );
}

function SearchSelect({
  value,
  onChange,
  options,
  placeholder,
  allowSelf = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected =
    options.find((item) => item.value === value) ||
    (value === "Self" ? { label: "Self", value: "Self" } : null);

  const filtered = options.filter((item) =>
    `${item.label} ${item.meta || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="field">
      <div
        className="selectbox"
        onClick={() => {
          setOpen(!open);
          setSearch("");
        }}
      >
        <span>{selected?.label || placeholder}</span>
        <ChevronDown size={17} />
      </div>

      {open && (
        <div className="dropdown">
          <div className="dropsearch">
            <Search size={15} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
            />
          </div>

          {allowSelf && (
            <button
              type="button"
              className="dropitem"
              onClick={() => {
                onChange("Self");
                setOpen(false);
              }}
            >
              <strong>Self</strong>
              <span>Patient Direct</span>
            </button>
          )}

          {filtered.map((item) => (
            <button
              type="button"
              key={item.value}
              className="dropitem"
              onClick={() => {
                onChange(item.value);
                setOpen(false);
              }}
            >
              <strong>{item.label}</strong>
              <span>{item.meta}</span>
            </button>
          ))}

          {!filtered.length && !allowSelf && (
            <div className="emptydrop">No matching records</div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   APPLICATION LAYOUT
   ========================================================= */

function Layout({
  route,
  navigate,
  session,
  children,
  logout,
  onToast,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState(() => getSyncStatus());
  const [showSyncModal, setShowSyncModal] = useState(false);

  useEffect(() => {
    const unsub = onSyncStatusChange((status) => {
      setSyncStatus({ ...status });
    });
    return unsub;
  }, []);

  const menu = [
    ["/dashboard", "Dashboard", Home],
    ["/patients/new", "Patient Entry", User],
    ["/patients", "Patients", Users],
    ["/patient-history", "Patient History", Clock],
    ["/doctors", "Doctors", Stethoscope],
    ["/tests", "Test Management", FlaskConical],
    ["/test-master", "Test Master", ClipboardList],
    ["/reports", "Reports", FileText],
    ["/messages", "Messages", MessageSquare],
    ["/billing", "Billing", CreditCard],
    ["/analytics", "Analytics", BarChart3],
    ["/branches", "Branches", Building2],
    ["/users", "Users", UserCog],
    ["/settings", "Settings", SettingsIcon],
  ];

  const currentPath = (route || "").split("?")[0];
  const active =
    menu.find(([path]) => currentPath === path)?.[1] ||
    (currentPath.startsWith("/patients/") ? "Patient Entry" : "Dashboard");

  return (
    <div className="app">
      <div
        className={`sidebar-backdrop ${mobileOpen ? "show" : ""}`}
        onClick={() => setMobileOpen(false)}
      />
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brandmark">
            <Activity />
          </div>
          <div>
            <strong>TAZ COMPANY</strong>
            <small>Laboratory Management</small>
          </div>
          <button
            className="mobile-x"
            onClick={() => setMobileOpen(false)}
          >
            <X />
          </button>
        </div>

        <div className="menutitle">MAIN MENU</div>

        <nav>
          {menu.map(([path, label, Ico]) => (
            <button
              key={path}
              className={`navitem ${
                currentPath === path ||
                (path === "/patients/new" &&
                  currentPath.startsWith("/patients/") &&
                  currentPath !== "/patients")
                  ? "active"
                  : ""
              }`}
              onClick={() => {
                navigate(path);
                setMobileOpen(false);
              }}
            >
              <Ico />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebottom">
          <div
            className="profile"
            onClick={() => navigate("/users")}
            style={{ cursor: "pointer" }}
            title="Click to view Users & Roles"
          >
            <div className="avatar">
              {session.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <b>{session.name}</b>
              <small>{session.role}</small>
            </div>
          </div>

          <button className="logout" onClick={logout}>
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb">
            <button
              className="mobile-menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu />
            </button>
            <span>TAZ COMPANY</span>
            <span>/</span>
            <strong>{active}</strong>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              id="btn-connect-phone-pc"
              onClick={() => setShowSyncModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                fontSize: "12px",
                fontWeight: "700",
                padding: "6px 14px",
                borderRadius: "20px",
                backgroundColor: "#fff0f3",
                color: "#8b1730",
                border: "1px solid #f2cfd7",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(139,23,48,0.08)",
                transition: "all 0.15s ease",
              }}
              title="Connect Mobile Phone or Other Computers to this Lab"
            >
              <QrCode size={15} color="#8b1730" />
              <span>📱 Connect Phone / PC</span>
            </button>

            <div
              onClick={() => setShowSyncModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                fontSize: "12px",
                fontWeight: "600",
                padding: "5px 12px",
                borderRadius: "20px",
                backgroundColor: "#ECFDF5",
                color: "#065F46",
                border: "1px solid #A7F3D0",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                cursor: "pointer",
              }}
              title="Click to open Phone & PC Connection Hub"
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#10B981",
                  boxShadow: "0 0 8px #10B981"
                }}
              />
              <span>🟢 Live Phone & PC Synced</span>
            </div>

            <div className="topuser">
              <div className="avatar">
                {session.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <b>{session.name}</b>
                <small>{session.role}</small>
              </div>
            </div>
          </div>
        </header>

        <section className="content">{children}</section>
      </main>

      {showSyncModal && (
        <SyncConfigModal
          syncStatus={syncStatus}
          onClose={() => setShowSyncModal(false)}
          onToast={onToast}
        />
      )}
    </div>
  );
}

function SyncConfigModal({ syncStatus, onClose, onToast }) {
  const [activeTab, setActiveTab] = useState("connect"); // "connect" | "lifetime"
  const [isTesting, setIsTesting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef(null);

  const [selectedHost, setSelectedHost] = useState("");

  useEffect(() => {
    fetchNetworkInfo().then((info) => {
      if (info) setNetworkInfo(info);
    });
  }, []);

  const currentHost = (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1")
    ? window.location.hostname
    : (networkInfo?.primaryIp || "192.168.55.102");

  const resolvedHost = selectedHost.trim() || currentHost;
  const port = window.location.port || "5173";
  const mobileUrl = (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" && !selectedHost)
    ? window.location.origin
    : `http://${resolvedHost}:${port}/`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(mobileUrl)}`;

  const handleOpenMobile = () => {
    window.open(mobileUrl, "_blank", "noopener,noreferrer");
    onToast?.("Opening Lab Portal in new tab...");
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(mobileUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      onToast?.("Link copied to clipboard!");
    }
  };

  const handleCopyCreds = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText("Username: Taz@18\nPassword: Sofiya@2010");
      setCopiedCreds(true);
      setTimeout(() => setCopiedCreds(false), 2000);
      onToast?.("Login credentials copied!");
    }
  };

  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    try {
      await downloadLifetimeBackup();
      onToast?.("Full Lab Lifetime Backup downloaded successfully!");
    } catch (e) {
      onToast?.("Backup failed: " + e.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm("Restoring from this backup will update all patient, report, test, and billing records. Do you want to proceed?")) {
      e.target.value = "";
      return;
    }
    setIsRestoring(true);
    try {
      await restoreLifetimeBackup(file);
      onToast?.("Database restored successfully! All records refreshed.");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      onToast?.("Restore failed: " + err.message);
    } finally {
      setIsRestoring(false);
      e.target.value = "";
    }
  };

  return (
    <div className="modalshade" style={{ zIndex: 1000 }} onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: "580px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modalhead" style={{ borderBottom: "1px solid #E5E7EB", paddingBottom: "12px" }}>
          <div>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, color: "#064E3B", fontSize: "17px" }}>
              <Activity size={20} color="#059669" />
              Live Phone & PC Connection Hub
            </h3>
            <span style={{ fontSize: "12px", color: "#6B7280" }}>
              Real-time two-way synchronization between Mobile Phone, Laptop & Clinic PCs
            </span>
          </div>
          <button type="button" className="close" onClick={onClose} style={{ fontSize: "22px" }}>×</button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid #E5E7EB",
          backgroundColor: "#F9FAFB",
          padding: "4px 8px 0"
        }}>
          <button
            type="button"
            onClick={() => setActiveTab("connect")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 16px",
              border: "none",
              borderBottom: activeTab === "connect" ? "3px solid #059669" : "3px solid transparent",
              backgroundColor: "transparent",
              color: activeTab === "connect" ? "#064E3B" : "#6B7280",
              fontWeight: activeTab === "connect" ? "700" : "500",
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            <Smartphone size={16} />
            📱 Connect Phone / Another PC
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("lifetime")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 16px",
              border: "none",
              borderBottom: activeTab === "lifetime" ? "3px solid #059669" : "3px solid transparent",
              backgroundColor: "transparent",
              color: activeTab === "lifetime" ? "#064E3B" : "#6B7280",
              fontWeight: activeTab === "lifetime" ? "700" : "500",
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            <ShieldCheck size={16} />
            🛡️ Lifetime Offline Protection & Backup
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: "18px 20px", overflowY: "auto", flex: 1, fontSize: "13px", lineHeight: "1.5" }}>

          {/* TAB 1: PHONE & PC CONNECTION */}
          {activeTab === "connect" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Green Live Synced Banner */}
              <div style={{
                backgroundColor: "#ECFDF5",
                border: "1px solid #A7F3D0",
                borderRadius: "10px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px"
              }}>
                <span style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: "#10B981",
                  boxShadow: "0 0 8px #10B981",
                  marginTop: "5px",
                  flexShrink: 0
                }} />
                <div>
                  <strong style={{ color: "#065F46", fontSize: "13px" }}>
                    🟢 Live Two-Way Sync Active
                  </strong>
                  <div style={{ fontSize: "12px", color: "#047857", marginTop: "3px" }}>
                    Whatever you do on your mobile phone or laptop (add patient, delete patient, add test, add doctor, update report, billing) updates on both devices in real time.
                  </div>
                </div>
              </div>

              {/* QR Code and Quick Open Section */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                padding: "16px",
                backgroundColor: "#F9FAFB",
                borderRadius: "12px",
                border: "1px solid #E5E7EB",
                flexWrap: "wrap",
                justifyContent: "center"
              }}>
                {/* Clickable QR Code Card */}
                <div
                  onClick={handleOpenMobile}
                  title="Click to open Lab Portal in new tab"
                  style={{
                    padding: "12px",
                    backgroundColor: "#FFFFFF",
                    borderRadius: "12px",
                    boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
                    border: "2px solid #10B981",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  <img
                    src={qrCodeUrl}
                    alt="Mobile Access QR Code"
                    style={{ width: "160px", height: "160px", display: "block" }}
                  />
                  <div style={{
                    fontSize: "12px",
                    color: "#065F46",
                    marginTop: "8px",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px"
                  }}>
                    <span>👆 Tap / Click to Open</span>
                    <ExternalLink size={13} />
                  </div>
                  <div style={{ fontSize: "10px", color: "#6B7280" }}>
                    Or scan with phone camera
                  </div>
                </div>

                {/* Direct Link and Quick Open Buttons */}
                <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6B7280" }}>
                      Direct Link for Phone or Any PC:
                    </label>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginTop: "4px"
                    }}>
                      <input
                        readOnly
                        value={mobileUrl}
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          borderRadius: "6px",
                          border: "1px solid #D1D5DB",
                          backgroundColor: "#FFFFFF",
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#111827"
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #10B981",
                          backgroundColor: copiedLink ? "#10B981" : "#ECFDF5",
                          color: copiedLink ? "#FFFFFF" : "#065F46",
                          fontWeight: "600",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          whiteSpace: "nowrap"
                        }}
                        title="Copy link"
                      >
                        {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                        {copiedLink ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Big Green Open Button */}
                  <Button
                    primary
                    onClick={handleOpenMobile}
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      padding: "10px",
                      fontSize: "13px",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <ExternalLink size={16} />
                    🚀 Open Lab Portal Now (Click Here)
                  </Button>

                  {/* Credentials helper */}
                  <div style={{
                    padding: "10px 12px",
                    backgroundColor: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    borderRadius: "8px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#1E40AF" }}>
                        🔑 Login Credentials:
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCreds}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#2563EB",
                          fontSize: "11px",
                          cursor: "pointer",
                          fontWeight: "600",
                          textDecoration: "underline"
                        }}
                      >
                        {copiedCreds ? "Copied!" : "Copy Login"}
                      </button>
                    </div>
                    <div style={{ fontSize: "12px", color: "#1E3A8A", marginTop: "4px" }}>
                      Username: <b>Taz@18</b> &nbsp;|&nbsp; Password: <b>Sofiya@2010</b>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick 3-Step Guide */}
              <div style={{
                backgroundColor: "#F3F4F6",
                borderRadius: "8px",
                padding: "12px 14px",
                fontSize: "12px",
                color: "#374151"
              }}>
                <strong style={{ display: "block", marginBottom: "6px" }}>📱 How to Connect Your Mobile Phone:</strong>
                <ol style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <li>Ensure your phone is connected to the same clinic Wi-Fi (or mobile hotspot).</li>
                  <li>Scan the QR code above with your phone camera, or open <b>{mobileUrl}</b> in Chrome/Safari.</li>
                  <li>Sign in with <b>Taz@18</b> / <b>Sofiya@2010</b>. Everything you add, edit, or delete synchronizes immediately with this PC!</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: LIFETIME OFFLINE PROTECTION & BACKUPS */}
          {activeTab === "lifetime" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{
                backgroundColor: "#ECFDF5",
                border: "1px solid #10B981",
                borderRadius: "10px",
                padding: "14px",
                display: "flex",
                gap: "12px"
              }}>
                <ShieldCheck size={28} color="#059669" style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ color: "#065F46", fontSize: "14px" }}>
                    Lifetime Durability & Zero Expiration Guarantee
                  </strong>
                  <div style={{ color: "#047857", fontSize: "12px", marginTop: "4px", lineHeight: "1.5" }}>
                    Your software is designed to run locally and offline on your computer forever. It has <b>zero monthly subscription fees</b>, <b>no expiry dates</b>, and will never lock you out. All records are stored securely on your local disk.
                  </div>
                </div>
              </div>

              {/* Action Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {/* 1-Click Backup */}
                <div style={{
                  padding: "14px",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "10px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "700", color: "#1F2937", marginBottom: "6px" }}>
                      <Download size={16} color="#059669" />
                      1-Click Full Lab Backup
                    </div>
                    <p style={{ fontSize: "12px", color: "#6B7280", margin: "0 0 12px" }}>
                      Downloads all Patients, Test Master (with all reference ranges & formulas), Reports, and Bills into a single lifetime <code>.json</code> file.
                    </p>
                  </div>
                  <Button
                    primary
                    onClick={handleDownloadBackup}
                    disabled={isBackingUp}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    {isBackingUp ? "Downloading..." : "📥 Download Full Backup"}
                  </Button>
                </div>

                {/* 1-Click Restore */}
                <div style={{
                  padding: "14px",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "10px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "700", color: "#1F2937", marginBottom: "6px" }}>
                      <Upload size={16} color="#2563EB" />
                      Restore From Backup
                    </div>
                    <p style={{ fontSize: "12px", color: "#6B7280", margin: "0 0 12px" }}>
                      Migrate to a new computer or recover everything in 5 seconds by selecting any previously downloaded lab backup file.
                    </p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    style={{ display: "none" }}
                    onChange={handleFileRestore}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRestoring}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    {isRestoring ? "Restoring..." : "📤 Restore Database File"}
                  </Button>
                </div>
              </div>

              {/* Automatic daily snapshots note */}
              <div style={{
                padding: "10px 14px",
                backgroundColor: "#F9FAFB",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#4B5563"
              }}>
                <b>🛡️ Automated Daily Disk Snapshots:</b> Whenever changes occur, the server automatically archives daily snapshots into <code>server/data/backups/</code>. You can copy this folder to a USB flash drive anytime for extra peace of mind!
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modalfoot" style={{ borderTop: "1px solid #E5E7EB", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Button
            onClick={async () => {
              setIsTesting(true);
              try {
                await pullAllFromBackend(true);
                await pushAllToBackend();
                onToast?.("Sync complete: all data synchronized with server!");
              } catch (e) {
                onToast?.("Sync failed: " + e.message);
              } finally {
                setIsTesting(false);
              }
            }}
            disabled={isTesting}
          >
            {isTesting ? "Syncing..." : "🔄 Sync All Data Now"}
          </Button>

          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PAGE: LOGIN
   ========================================================= */

function Login({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState("Administrator");
  const [username, setUsername] = useState("Taz@18");
  const [password, setPassword] = useState("Sofiya@2010");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function submit(e) {
    if (e) e.preventDefault();
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    // Directly authenticate Taz@18 / Sofiya@2010 for both logins
    if (
      (cleanUser.toLowerCase() === "taz@18" && cleanPass === "Sofiya@2010") ||
      (cleanUser.toLowerCase() === "admin" && cleanPass === "admin123") ||
      (cleanUser.toLowerCase() === "technician" && cleanPass === "tech123")
    ) {
      const users = read(STORAGE.users, DEFAULT_USERS);
      const matched =
        users.find((u) => u.role === selectedRole) ||
        (selectedRole === "Administrator" ? users[0] : users[1]) || {
          id: selectedRole === "Administrator" ? "USR001" : "USR002",
          name: selectedRole,
          username: "Taz@18",
          password: "Sofiya@2010",
          role: selectedRole,
          status: "Active",
        };
      onLogin(matched);
      return;
    }

    const users = read(STORAGE.users, DEFAULT_USERS);
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === cleanUser.toLowerCase() &&
        u.password === cleanPass
    );

    if (!user) {
      setError("Invalid username or password. Taz@18 / Sofiya@2010 required.");
      return;
    }
    onLogin(user);
  }

  const fillAndLogin = (roleName) => {
    setUsername("Taz@18");
    setPassword("Sofiya@2010");
    setSelectedRole(roleName);
    const users = read(STORAGE.users, DEFAULT_USERS);
    const user =
      users.find((x) => x.role === roleName) || {
        id: roleName === "Administrator" ? "USR001" : "USR002",
        name: roleName,
        username: "Taz@18",
        password: "Sofiya@2010",
        role: roleName,
        status: "Active",
      };
    onLogin(user);
  };

  return (
    <div className="login">
      <div className="loginpanel">
        <div className="loginbrand">
          <div className="brandmark">
            <Activity />
          </div>
          <h1>TAZ COMPANY</h1>
          <p>Laboratory Management System</p>
          <div className="hint">
            Complete patient registration, laboratory testing, reporting, billing
            and multi-branch management.
          </div>
        </div>

        <form className="loginform" onSubmit={submit}>
          <h2>Welcome Back</h2>
          <p>Sign in to access your laboratory workstation.</p>

          <div style={{ marginTop: 12, marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#670b1e", display: "block", marginBottom: 6 }}>
              SELECT WORKSTATION ROLE
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                onClick={() => setSelectedRole("Administrator")}
                style={{
                  padding: "8px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: selectedRole === "Administrator" ? "2px solid #670b1e" : "1px solid #dcccd0",
                  background: selectedRole === "Administrator" ? "#fbf3f5" : "#ffffff",
                  color: selectedRole === "Administrator" ? "#670b1e" : "#555555",
                  cursor: "pointer",
                }}
              >
                Administrator
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("Lab Technician")}
                style={{
                  padding: "8px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: selectedRole === "Lab Technician" ? "2px solid #670b1e" : "1px solid #dcccd0",
                  background: selectedRole === "Lab Technician" ? "#fbf3f5" : "#ffffff",
                  color: selectedRole === "Lab Technician" ? "#670b1e" : "#555555",
                  cursor: "pointer",
                }}
              >
                Lab Technician
              </button>
            </div>
          </div>

          <div className="field">
            <label>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username (Taz@18)"
            />
          </div>

          <div className="field pass" style={{ marginTop: 16 }}>
            <label>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (Sofiya@2010)"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: 0,
                  background: "transparent",
                  color: "#8c757e",
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          <button className="btn primary" type="submit" style={{ width: "100%", marginTop: 18 }}>
            Sign In as {selectedRole}
          </button>

          <div style={{ marginTop: 22 }}>
            <span style={{ fontSize: 11, color: "#8c757e", fontWeight: 700 }}>
              QUICK LOGIN (CLICK TO SIGN IN WITH Taz@18 / Sofiya@2010):
            </span>
            <div className="role-chips">
              <button
                type="button"
                className={`role-chip ${selectedRole === "Administrator" ? "active" : ""}`}
                onClick={() => fillAndLogin("Administrator")}
              >
                Admin: Taz@18
              </button>
              <button
                type="button"
                className={`role-chip ${selectedRole === "Lab Technician" ? "active" : ""}`}
                onClick={() => fillAndLogin("Lab Technician")}
              >
                Technician: Taz@18
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   PAGE: DASHBOARD
   ========================================================= */

function Dashboard({ navigate, onToast }) {
  const [patients] = useStoredData(STORAGE.patients, DEFAULT_PATIENTS);
  const [tests] = useStoredData(STORAGE.tests, DEFAULT_TESTS);
  const [reports] = useStoredData(STORAGE.reports, DEFAULT_REPORTS);
  const [bills] = useStoredData(STORAGE.bills, DEFAULT_BILLS);
  const [branches] = useStoredData(STORAGE.branches, DEFAULT_BRANCHES);

  const revenue = bills.reduce((sum, bill) => sum + Number(bill.paid || 0), 0);
  const pending = reports.filter((r) => r.status !== "Completed").length;

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Dashboard"
        subtitle="Laboratory overview and daily operations."
      >
        <Button onClick={() => navigate("/patients/new")} primary>
          <Plus size={16} /> New Patient
        </Button>
      </PageHeader>

      <div className="stats">
        <div className="stat" style={{ cursor: "pointer" }} onClick={() => navigate("/patients")}>
          <div className="staticon">
            <Users />
          </div>
          <div>
            <span>Total Patients</span>
            <strong>{patients.length}</strong>
            <small>Registered patients</small>
          </div>
        </div>

        <div className="stat" style={{ cursor: "pointer" }} onClick={() => navigate("/tests")}>
          <div className="staticon">
            <FlaskConical />
          </div>
          <div>
            <span>Active Tests</span>
            <strong>{tests.length}</strong>
            <small>Available tests</small>
          </div>
        </div>

        <div className="stat" style={{ cursor: "pointer" }} onClick={() => navigate("/reports")}>
          <div className="staticon">
            <AlertCircle />
          </div>
          <div>
            <span>Pending Reports</span>
            <strong>{pending}</strong>
            <small>Need technician action</small>
          </div>
        </div>

        <div className="stat" style={{ cursor: "pointer" }} onClick={() => navigate("/reports")}>
          <div className="staticon">
            <FileText />
          </div>
          <div>
            <span>Total Reports</span>
            <strong>{reports.length}</strong>
            <small>Generated reports</small>
          </div>
        </div>

        <div className="stat" style={{ cursor: "pointer" }} onClick={() => navigate("/billing")}>
          <div className="staticon">
            <CreditCard />
          </div>
          <div>
            <span>Collected</span>
            <strong>{money(revenue)}</strong>
            <small>Received payments</small>
          </div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="cardhead">
            <div>
              <h3>Revenue Overview</h3>
              <p>Collected payments from diagnostic services.</p>
            </div>
            <BarChart3 />
          </div>

          <div className="bars">
            {[35, 55, 42, 72, 62, 84, 68].map((height, i) => (
              <div className="barcol" key={i}>
                <div className="bar" style={{ height: `${height}%` }} />
                <small>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                </small>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="cardhead">
            <div>
              <h3>Quick Actions</h3>
              <p>Frequently accessed operations.</p>
            </div>
          </div>

          <div className="quickgrid">
            <button
              className="quick"
              onClick={() => navigate("/patients/new")}
            >
              <User /> New Patient
            </button>
            <button
              className="quick"
              onClick={() => navigate("/reports")}
            >
              <FileText /> Reports
            </button>
            <button
              className="quick"
              onClick={() => navigate("/billing")}
            >
              <CreditCard /> Billing
            </button>
            <button
              className="quick"
              onClick={() => navigate("/messages")}
            >
              <MessageSquare /> Messages
            </button>
          </div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="cardhead">
            <div>
              <h3>Recent Patients</h3>
              <p>Latest patient admissions.</p>
            </div>
            <button
              className="link"
              onClick={() => navigate("/patients")}
            >
              View All
            </button>
          </div>

          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Phone</th>
                  <th>Branch</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "28px 16px", color: "#666" }}>
                      <div style={{ fontWeight: 600, color: "#5b0a1a", marginBottom: "4px" }}>
                        No patients registered yet today
                      </div>
                      <div style={{ fontSize: "12px", color: "#888", marginBottom: "10px" }}>
                        Ready for Day 1 entries. Click "+ New Patient" to register the first patient.
                      </div>
                      <Button primary onClick={() => navigate("/patients/new")}>
                        <Plus size={14} /> Register First Patient
                      </Button>
                    </td>
                  </tr>
                ) : (
                  patients.slice(0, 5).map((patient) => (
                    <tr key={patient.id}>
                      <td>
                        <b>{patient.name}</b>
                        <small>{patient.id}</small>
                      </td>
                      <td>{patient.phone}</td>
                      <td>{patient.branch}</td>
                      <td>{patient.date}</td>
                      <td className="actions">
                        <button
                          title="View Reports"
                          onClick={() => navigate(`/reports?patient=${patient.id}`)}
                        >
                          <FileText size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="cardhead">
            <div>
              <h3>Branches</h3>
              <p>Network centers overview.</p>
            </div>
            <button
              className="link"
              onClick={() => navigate("/branches")}
            >
              Manage
            </button>
          </div>

          {branches.map((branch) => (
            <div className="summaryrow" key={branch.id}>
              <Building2 size={17} />
              <span>{branch.name}</span>
              <b>{branch.status}</b>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================
         PATIENTS DAY TO DAY (Daily Patient Registry & Test Results)
         ========================================================= */}
      <PatientsDayToDay patients={patients} reports={reports} navigate={navigate} />
    </div>
  );
}

function PatientsDayToDay({ patients, reports, navigate }) {
  const groupsByDate = useMemo(() => {
    const map = {};
    (patients || []).forEach((p) => {
      const d = p.date || p.createdAt?.slice(0, 10) || today();
      if (!map[d]) map[d] = [];
      map[d].push(p);
    });
    const sortedDates = Object.keys(map).sort((a, b) => (a < b ? 1 : -1));
    return sortedDates.map((dateStr) => ({
      date: dateStr,
      list: map[dateStr],
    }));
  }, [patients]);

  const [expandedDate, setExpandedDate] = useState(() => {
    return groupsByDate[0]?.date || today();
  });

  const formatLongDate = (dStr) => {
    if (!dStr) return "Today";
    try {
      const [y, m, d] = dStr.split("-");
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const monName = months[parseInt(m, 10) - 1] || m;
      return `${parseInt(d, 10)} ${monName} ${y}`;
    } catch {
      return dStr;
    }
  };

  return (
    <div className="card" style={{ marginTop: "24px" }}>
      <div className="cardhead" style={{ marginBottom: "16px" }}>
        <div>
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px", color: "#111827", fontSize: "16px", fontWeight: "700" }}>
            <Calendar size={18} color="#0e5a3a" /> Patients Day to Day
          </h3>
          <p style={{ margin: "3px 0 0", color: "#6B7280", fontSize: "13px" }}>
            Daily breakdown of patient entries and clinical results. Click any date to view all patients registered on that day, or click any patient to open their reports & test results.
          </p>
        </div>
        <span
          style={{
            backgroundColor: "#ECFDF5",
            color: "#065F46",
            fontSize: "12px",
            fontWeight: "700",
            padding: "4px 12px",
            borderRadius: "16px",
            border: "1px solid #A7F3D0",
          }}
        >
          {patients.length} Total Patients
        </span>
      </div>

      {groupsByDate.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px", color: "#6B7280" }}>
          <User size={36} color="#9CA3AF" style={{ margin: "0 auto 8px" }} />
          <div style={{ fontWeight: 600, color: "#111827", fontSize: "14px" }}>No daily patient entries recorded yet</div>
          <p style={{ fontSize: "12px", margin: "4px 0 12px" }}>Register a patient to begin tracking day-to-day admissions.</p>
          <Button primary onClick={() => navigate("/patients/new")}>
            <Plus size={14} /> New Patient Entry
          </Button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {groupsByDate.map(({ date, list }) => {
            const isExpanded = expandedDate === date;
            const isToday = date === today();

            return (
              <div
                key={date}
                style={{
                  border: isExpanded ? "1.5px solid #0e5a3a" : "1px solid #E5E7EB",
                  borderRadius: "10px",
                  overflow: "hidden",
                  backgroundColor: "#FFFFFF",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  onClick={() => setExpandedDate(isExpanded ? null : date)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 18px",
                    cursor: "pointer",
                    backgroundColor: isExpanded ? "#F0FDF4" : "#F9FAFB",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Calendar size={16} color={isExpanded ? "#0e5a3a" : "#6B7280"} />
                    <div>
                      <strong style={{ fontSize: "14px", color: isExpanded ? "#0e5a3a" : "#111827" }}>
                        {formatLongDate(date)}
                      </strong>
                      {isToday && (
                        <span
                          style={{
                            marginLeft: "8px",
                            fontSize: "10.5px",
                            fontWeight: "800",
                            backgroundColor: "#0e5a3a",
                            color: "#FFFFFF",
                            padding: "2px 7px",
                            borderRadius: "10px",
                            letterSpacing: "0.4px",
                          }}
                        >
                          TODAY
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#374151",
                        backgroundColor: "#FFFFFF",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        border: "1px solid #D1D5DB",
                      }}
                    >
                      {list.length} Patient{list.length === 1 ? "" : "s"}
                    </span>
                    <span style={{ fontSize: "12px", color: "#6B7280" }}>
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: "0 14px 14px" }}>
                    <div className="tablewrap" style={{ marginTop: "10px" }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Patient ID</th>
                            <th>Patient Name</th>
                            <th>Age / Gender</th>
                            <th>Phone</th>
                            <th>Referred Doctor</th>
                            <th>Status / Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((patient) => {
                            const patReport = reports.find((r) => r.patientId === patient.id);
                            const isCompleted = patReport?.status === "Completed";

                            return (
                              <tr
                                key={patient.id}
                                style={{ cursor: "pointer" }}
                                onClick={() => navigate(`/reports?patient=${patient.id}`)}
                                title="Click to view complete lab report and results"
                              >
                                <td>
                                  <span style={{ fontFamily: "monospace", fontWeight: "700", color: "#0e5a3a" }}>
                                    {patient.id}
                                  </span>
                                </td>
                                <td>
                                  <b style={{ color: "#111827" }}>{patient.name}</b>
                                </td>
                                <td>
                                  {patient.age ? `${patient.age} Yrs` : "—"} / {patient.gender || "—"}
                                </td>
                                <td>{patient.phone || "—"}</td>
                                <td>{patient.referredBy || "Self"}</td>
                                <td className="actions" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    className={`badge ${isCompleted ? "completed" : "pending"}`}
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: "700",
                                      padding: "4px 10px",
                                      borderRadius: "14px",
                                      border: "none",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => navigate(`/reports?patient=${patient.id}`)}
                                  >
                                    <FileText size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                                    {isCompleted ? "View Report" : "Enter Results"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CLINICAL PROFILES & TEST PACKAGES
   ========================================================= */

const CLINICAL_PROFILES = [
  {
    id: "PKG_CBP",
    name: "CBP Profile",
    fullname: "Complete Blood Picture",
    desc: "12 Blood tests: Hb, RBC, WBC, Platelets, Differential, ESR, BT/CT",
    category: "Clinical Pathology",
    badge: "12 Tests",
    icon: "🩸",
    testIds: [
      "TST001", "TST002", "TST003", "TST004", "TST005", "TST006",
      "TST007", "TST008", "TST009", "TST010", "TST011", "TST012"
    ],
  },
  {
    id: "PKG_CUE",
    name: "CUE Profile",
    fullname: "Complete Urine Examination",
    desc: "8 Urine tests: Sugar, Albumin, Bile Salts, Pus Cells, RBC, Casts, Crystals",
    category: "Urine Examinations",
    badge: "8 Tests",
    icon: "🧪",
    testIds: [
      "TST025", "TST026", "TST027", "TST028", "TST029", "TST030", "TST031", "TST032"
    ],
  },
  {
    id: "PKG_LFT",
    name: "Liver Function Test",
    fullname: "Liver Function Test (LFT)",
    desc: "10 Tests: Total Bilirubin, Direct, Indirect, SGPT, SGOT, Alk Phos, Proteins, Albumin, Globulin, A/G Ratio",
    category: "Liver Function Test",
    badge: "10 Tests",
    icon: "🫀",
    testIds: [
      "TST072", "TST073", "TST074", "TST075", "TST076",
      "TST077", "TST078", "TST079", "TST080", "TST081"
    ],
  },
  {
    id: "PKG_LIPID",
    name: "Lipid Profile",
    fullname: "Lipid Profile Panel",
    desc: "6 Tests: Total Cholesterol, HDL, Triglycerides, LDL, VLDL, LDL/HDL",
    category: "Lipid Profile",
    badge: "6 Tests",
    icon: "🩺",
    testIds: [
      "TST083", "TST084", "TST085", "TST086", "TST087", "TST088"
    ],
  },
  {
    id: "PKG_ELECTROLYTES",
    name: "Electrolytes",
    fullname: "Serum Electrolytes Panel",
    desc: "4 Tests: Sodium, Potassium, Chloride, Calcium",
    category: "Electrolytes",
    badge: "4 Tests",
    icon: "⚡",
    testIds: [
      "TST090", "TST091", "TST092", "TST093"
    ],
  },
  {
    id: "PKG_HBA1C",
    name: "HBA1C",
    fullname: "Glycosylated Haemoglobin (HBA1C)",
    desc: "2 Tests: Glycosylated Haemoglobin(HBA1C), Mean Blood Glucose",
    category: "HBA1C",
    badge: "2 Tests",
    icon: "🩸",
    testIds: [
      "TST094", "TST095"
    ],
  },
  {
    id: "PKG_RENAL",
    name: "Biochem / Renal",
    fullname: "Renal Function & Biochem",
    desc: "6 Tests: Fasting Glucose, Urea, Creatinine, Cholesterol, Bilirubin Total",
    category: "Bio Chemistry",
    badge: "6 Tests",
    icon: "💧",
    testIds: ["TST037", "TST040", "TST041", "TST042", "TST043", "TST044"],
  },
  {
    id: "PKG_DIABETIC",
    name: "Diabetic Profile",
    fullname: "Diabetic Health Check",
    desc: "3 Tests: Fasting Glucose, Post-Prandial Glucose, HbA1c",
    category: "Bio Chemistry",
    badge: "3 Tests",
    icon: "🍬",
    testIds: ["TST037", "TST039", "TST071"],
  },
  {
    id: "PKG_MOTION",
    name: "Motion / Stool",
    fullname: "Complete Stool Examination",
    desc: "7 Tests: Consistency, Mucus, Occult Blood, Ova, Cysts, Bacteria",
    category: "Motion Examination",
    badge: "7 Tests",
    icon: "🦠",
    testIds: ["TST049", "TST050", "TST051", "TST052", "TST053", "TST054", "TST055"],
  },
  {
    id: "PKG_SEMEN",
    name: "Semen Analysis",
    fullname: "Fertility & Semen Evaluation",
    desc: "7 Tests: Total Count, Motility, Morphology, Pus Cells",
    category: "Semen Analysis",
    badge: "7 Tests",
    icon: "🔬",
    testIds: ["TST057", "TST058", "TST059", "TST060", "TST061", "TST062", "TST063"],
  },
];

/* =========================================================
   MODAL: MANAGE / ADD TESTS FOR PATIENT
   ========================================================= */

function ManageTestsModal({ patient, tests, onClose, onSave }) {
  const [selectedTests, setSelectedTests] = useState(() => patient?.tests || []);
  const [testSearch, setTestSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = [
    "All",
    "Clinical Pathology",
    "Urine Examinations",
    "Bio Chemistry",
    "Liver Function Test",
    "Lipid Profile",
    "Electrolytes",
    "HBA1C",
    "Motion Examination",
    "Semen Analysis",
    "Additional Tests",
  ];

  function toggleTest(id) {
    setSelectedTests((curr) =>
      curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]
    );
  }

  function togglePackage(pkg) {
    const allSelected = pkg.testIds.every((id) => selectedTests.includes(id));
    if (allSelected) {
      setSelectedTests((curr) => curr.filter((id) => !pkg.testIds.includes(id)));
    } else {
      setSelectedTests((curr) => [...new Set([...curr, ...pkg.testIds])]);
    }
  }

  function selectAllInCurrentView() {
    const ids = filteredTests.map((t) => t.id);
    setSelectedTests((curr) => [...new Set([...curr, ...ids])]);
  }

  function clearAllTests() {
    setSelectedTests([]);
  }

  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      const matchCat = activeCategory === "All" || t.category === activeCategory;
      const q = testSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [tests, activeCategory, testSearch]);

  const totalCost = useMemo(() => {
    return tests
      .filter((t) => selectedTests.includes(t.id))
      .reduce((sum, t) => sum + Number(t.price || 0), 0);
  }, [tests, selectedTests]);

  return (
    <div className="modalshade">
      <div className="modal" style={{ maxWidth: 880, width: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="modalhead" style={{ borderBottom: "2px solid #5b0a1a", paddingBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, color: "#380a15", fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <FlaskConical size={20} color="#5b0a1a" />
              Manage Tests for {patient?.name} ({patient?.id})
            </h3>
            <p style={{ margin: "3px 0 0 0", fontSize: 12, color: "#7a6870" }}>
              Add or remove laboratory tests. Reports, worklists, and invoices will update instantly.
            </p>
          </div>
          <button className="close" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "14px 2px" }}>
          {/* Quick Profiles Bar */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <b style={{ fontSize: 12, color: "#5b0a1a" }}>1-Click Clinical Packages / Profiles:</b>
              <span style={{ fontSize: 11, color: "#7a6870" }}>Click to toggle package tests</span>
            </div>
            <div className="profile-cards-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8, marginBottom: 8 }}>
              {CLINICAL_PROFILES.map((pkg) => {
                const isAllSelected = pkg.testIds.every((id) => selectedTests.includes(id));
                const partialCount = pkg.testIds.filter((id) => selectedTests.includes(id)).length;
                return (
                  <div
                    key={pkg.id}
                    className={`profile-card ${isAllSelected ? "active" : ""}`}
                    onClick={() => togglePackage(pkg)}
                    style={{ padding: "8px 10px", borderRadius: 8 }}
                  >
                    <div className="profile-card-top">
                      <span className="profile-card-title" style={{ fontSize: 12 }}>{pkg.icon} {pkg.name}</span>
                      <span className="profile-card-badge" style={{ fontSize: 9.5 }}>
                        {isAllSelected ? "✓ Added" : partialCount > 0 ? `${partialCount}/${pkg.testIds.length}` : `+ ${pkg.badge}`}
                      </span>
                    </div>
                    <div className="profile-card-desc" style={{ fontSize: 10 }}>{pkg.fullname}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search & Category Filter */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
            <div className="search" style={{ flex: 1, minWidth: 220, margin: 0 }}>
              <Search size={15} />
              <input
                placeholder="Search test by name, code (TST001), or department..."
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                style={{ fontSize: 13, padding: "6px 8px" }}
              />
              {testSearch && (
                <button type="button" onClick={() => setTestSearch("")} style={{ border: 0, background: "transparent", cursor: "pointer" }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className="tab"
                style={{ padding: "5px 10px", fontSize: 11 }}
                onClick={selectAllInCurrentView}
              >
                + Select All in View
              </button>
              <button
                type="button"
                className="tab"
                style={{ padding: "5px 10px", fontSize: 11 }}
                onClick={clearAllTests}
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Department Tabs */}
          <div className="dept-filter-tabs">
            {categories.map((cat) => {
              const count = cat === "All" ? tests.length : tests.filter((t) => t.category === cat).length;
              return (
                <button
                  type="button"
                  key={cat}
                  className={`dept-filter-tab ${activeCategory === cat ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Selected Tests Basket */}
          {selectedTests.length > 0 && (
            <div className="test-chips-basket">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b style={{ fontSize: 11.5, color: "#5b0a1a" }}>
                  Selected Tests Basket ({selectedTests.length} tests · Total: {money(totalCost)})
                </b>
                <button
                  type="button"
                  onClick={clearAllTests}
                  style={{ border: 0, background: "transparent", color: "#a12929", fontSize: 11, cursor: "pointer", fontWeight: 700 }}
                >
                  Clear Selection
                </button>
              </div>
              <div className="test-chips-list">
                {selectedTests.map((id) => {
                  const t = tests.find((x) => x.id === id);
                  if (!t) return null;
                  return (
                    <span key={id} className="test-chip">
                      <span>{t.name}</span>
                      <small style={{ color: "#7a6870", fontSize: 9.5 }}>{t.price ? money(t.price) : "Free"}</small>
                      <button
                        type="button"
                        className="test-chip-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTest(id);
                        }}
                        title={`Remove ${t.name}`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Test Cards Grid */}
          <div className="tests-picker-grid">
            {filteredTests.map((test) => {
              const selected = selectedTests.includes(test.id);
              return (
                <div
                  key={test.id}
                  className={`test-picker-card ${selected ? "selected" : ""}`}
                  onClick={() => toggleTest(test.id)}
                >
                  <div style={{ marginTop: 2 }}>
                    {selected ? (
                      <div style={{ width: 18, height: 18, borderRadius: 4, background: "#8b1730", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={12} color="#fff" />
                      </div>
                    ) : (
                      <div style={{ width: 18, height: 18, borderRadius: 4, border: "1.5px solid #dcced3", background: "#fff" }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 800, fontSize: 12, color: "#380a15", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {test.name}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#8b1730", marginLeft: 4 }}>
                        {test.price ? money(test.price) : "Free"}
                      </span>
                    </div>
                    <div style={{ fontSize: 9.5, color: "#7a6870", marginTop: 2, display: "flex", gap: 6 }}>
                      <span style={{ background: "#f5edf0", padding: "1px 4px", borderRadius: 3, fontWeight: 600 }}>{test.id}</span>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{test.category}</span>
                    </div>
                    {test.reference && (
                      <div style={{ fontSize: 9, color: "#888", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        Ref: {test.reference}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ borderTop: "1px solid #ebd7dc", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#5b0a1a" }}>
              Total: {selectedTests.length} tests · {money(totalCost)}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              primary
              onClick={() => onSave(selectedTests)}
              style={{ background: "#0e5a3a", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Check size={16} /> Save & Update Tests
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PAGE: PATIENT ENTRY (UPGRADED CLINICAL VERSION)
   ========================================================= */

function PatientEntry({ navigate, onToast }) {
  const [doctors] = useStoredData(STORAGE.doctors, DEFAULT_DOCTORS);
  const [tests] = useStoredData(STORAGE.tests, DEFAULT_TESTS);
  const [branches] = useStoredData(STORAGE.branches, DEFAULT_BRANCHES);
  const [patients, setPatients] = useStoredData(STORAGE.patients, DEFAULT_PATIENTS);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "Male",
    email: "",
    referredBy: "Dr. Ahmed Khan",
    branch: branches[0]?.name || "Main Branch",
  });

  const [selectedTests, setSelectedTests] = useState([]);
  const [testSearch, setTestSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = [
    "All",
    "Clinical Pathology",
    "Urine Examinations",
    "Bio Chemistry",
    "Liver Function Test",
    "Lipid Profile",
    "Electrolytes",
    "HBA1C",
    "Motion Examination",
    "Semen Analysis",
    "Additional Tests",
  ];

  const doctorOptions = doctors.map((doctor) => ({
    value: doctor.name,
    label: doctor.name,
    meta: doctor.specialization,
  }));

  function toggleTest(id) {
    setSelectedTests((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function togglePackage(pkg) {
    const allSelected = pkg.testIds.every((id) => selectedTests.includes(id));
    if (allSelected) {
      setSelectedTests((curr) => curr.filter((id) => !pkg.testIds.includes(id)));
    } else {
      setSelectedTests((curr) => [...new Set([...curr, ...pkg.testIds])]);
    }
  }

  function selectAllInCurrentCategory() {
    const ids = filteredTests.map((t) => t.id);
    setSelectedTests((prev) => [...new Set([...prev, ...ids])]);
  }

  function clearAllTests() {
    setSelectedTests([]);
  }

  function resetAll() {
    setForm({
      name: "",
      phone: "",
      age: "",
      gender: "Male",
      email: "",
      referredBy: "Dr. Ahmed Khan",
      branch: branches[0]?.name || "Main Branch",
    });
    setSelectedTests([]);
    setTestSearch("");
    setActiveCategory("All");
  }

  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      const matchCat = activeCategory === "All" || t.category === activeCategory;
      const q = testSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [tests, activeCategory, testSearch]);

  const calculatedTotal = useMemo(() => {
    return tests
      .filter((t) => selectedTests.includes(t.id))
      .reduce((sum, t) => sum + Number(t.price || 0), 0);
  }, [tests, selectedTests]);

  function submitWithAction(actionTarget = "patients") {
    if (!form.name || !form.phone || !form.age || !form.gender) {
      alert("Please complete the required patient demographics (Name, Phone, Age, Gender).");
      return;
    }

    if (!selectedTests.length) {
      alert("Please select at least one laboratory test or clinical package.");
      return;
    }

    const currentPatients = read(STORAGE.patients, DEFAULT_PATIENTS);
    const newPatId = nextId("PAT", currentPatients);
    const patient = {
      id: newPatId,
      ...form,
      date: today(),
      tests: selectedTests,
    };

    const updatedPatients = [...currentPatients, patient];
    const updatedReports = [
      ...reports,
      {
        id: newReportId,
        patientId: patient.id,
        doctor: form.referredBy || "Self",
        date: today(),
        status: "Pending",
        results: {},
      },
    ];
    const updatedBills = [
      ...bills,
      {
        id: nextId("BILL", bills),
        patientId: patient.id,
        date: today(),
        amount: calculatedTotal,
        paid: 0,
        mode: "Cash",
        status: "Pending",
      },
    ];

    write(STORAGE.patients, updatedPatients);
    write(STORAGE.reports, updatedReports);
    write(STORAGE.bills, updatedBills);
    syncBatchToBackend({
      patients: updatedPatients,
      reports: updatedReports,
      bills: updatedBills,
    });

    if (actionTarget === "open_report") {
      onToast(`Patient ${patient.name} registered! Opening lab report...`, "success");
      navigate(`/reports?patient=${patient.id}`);
    } else if (actionTarget === "add_next") {
      onToast(`Patient ${patient.name} registered! Ready for next patient.`, "success");
      resetAll();
    } else {
      onToast(`Patient ${patient.name} registered successfully! ID: ${patient.id}`, "success");
      setTimeout(() => {
        navigate("/patients");
      }, 500);
    }
  }

  return (
    <>
      <PageHeader
        title="Patient Entry & Registration"
        subtitle="Modern clinical intake with 1-click test packages, instant search, and direct laboratory routing."
      >
        <Button onClick={resetAll}>
          <RefreshCw size={14} /> Clear Form
        </Button>
        <Button id="btn-header-register-patient" primary onClick={() => submitWithAction("patients")}>
          <Check size={16} /> Register Patient & Save
        </Button>
      </PageHeader>

      <div className="patient-entry-layout">
        {/* LEFT COLUMN: DEMOGRAPHICS & ORDER ACTIONS */}
        <div className="patient-entry-left">
          <div className="card formcard">
            <div className="sectiontitle" style={{ marginBottom: 14 }}>
              <User />
              <div>
                <h3 style={{ margin: 0 }}>Patient Demographics</h3>
                <p style={{ margin: "2px 0 0 0" }}>Patient identity and referral details.</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="field">
                <label>System Patient ID</label>
                <input
                  value={nextId("PAT", patients)}
                  disabled
                  style={{ background: "#f8f3f5", fontWeight: 700, color: "#5b0a1a" }}
                />
              </div>

              <div className="field">
                <label>Full Patient Name *</label>
                <input
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div className="field">
                <label>Phone Number *</label>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="10-digit mobile number"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 10 }}>
                <div className="field">
                  <label>Age *</label>
                  <input
                    required
                    type="number"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    placeholder="e.g. 35"
                  />
                </div>

                <div className="field">
                  <label>Gender *</label>
                  <div className="gender-pills">
                    {["Male", "Female", "Other"].map((g) => (
                      <button
                        type="button"
                        key={g}
                        className={`gender-pill ${form.gender === g ? "active" : ""}`}
                        onClick={() => setForm({ ...form, gender: g })}
                      >
                        {g === "Male" ? "♂ Male" : g === "Female" ? "♀ Female" : "⚥ Other"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ margin: 0 }}>Referred By Doctor</label>
                  <button
                    type="button"
                    className="tab"
                    style={{ padding: "2px 6px", fontSize: 10 }}
                    onClick={() => setForm({ ...form, referredBy: "Self" })}
                  >
                    Walk-in / Self
                  </button>
                </div>
                <SearchSelect
                  value={form.referredBy}
                  onChange={(value) => setForm({ ...form, referredBy: value })}
                  options={doctorOptions}
                  placeholder="Select Doctor / Self"
                  allowSelf
                />
              </div>

              <div className="field">
                <label>Branch Center</label>
                <select
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                >
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Email Address (Optional)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="patient@example.com"
                />
              </div>
            </div>
          </div>

          {/* INTAKE SUMMARY & FAST ACTIONS */}
          <div className="card" style={{ marginTop: 14, background: "#fdfafb", border: "1.5px solid #ebd7dc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <b style={{ color: "#5b0a1a", fontSize: 13 }}>Enrolled Tests Summary</b>
              <span className="badge active" style={{ fontSize: 12 }}>
                {selectedTests.length} tests
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0", borderTop: "1px dashed #daccd1", borderBottom: "1px dashed #daccd1", marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: "#66545c" }}>Estimated Total:</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#5b0a1a" }}>{money(calculatedTotal)}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Button
                primary
                type="button"
                onClick={() => submitWithAction("open_report")}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  padding: "10px",
                  background: "#5b0a1a",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <FileText size={16} /> Complete & Open Lab Report
              </Button>

              <Button
                type="button"
                onClick={() => submitWithAction("add_next")}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  padding: "9px",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Plus size={15} /> Register & Add Next Patient
              </Button>

              <Button
                type="button"
                onClick={() => navigate("/patients")}
                style={{ width: "100%", justifyContent: "center", fontSize: 12 }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TEST SELECTION SUITE */}
        <div className="patient-entry-right">
          <div className="card formcard">
            {/* Header: Packages */}
            <div className="sectiontitle" style={{ marginBottom: 12 }}>
              <FlaskConical />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Laboratory Test Suite</h3>
                  <span style={{ fontSize: 11, color: "#7a6870" }}>
                    {tests.length} Total Laboratory Tests Available
                  </span>
                </div>
                <p style={{ margin: "2px 0 0 0" }}>
                  Pick standard clinical packages with 1 click, or search and pick individual tests.
                </p>
              </div>
            </div>

            {/* 1-Click Clinical Packages Grid */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <b style={{ fontSize: 11.5, color: "#5b0a1a" }}>1-Click Clinical Packages / Profiles:</b>
                <span style={{ fontSize: 10.5, color: "#888" }}>Tap any card to toggle package</span>
              </div>
              <div className="profile-cards-grid">
                {CLINICAL_PROFILES.map((pkg) => {
                  const isAllSelected = pkg.testIds.every((id) => selectedTests.includes(id));
                  const partialCount = pkg.testIds.filter((id) => selectedTests.includes(id)).length;
                  return (
                    <div
                      key={pkg.id}
                      className={`profile-card ${isAllSelected ? "active" : ""}`}
                      onClick={() => togglePackage(pkg)}
                    >
                      <div className="profile-card-top">
                        <span className="profile-card-title">{pkg.icon} {pkg.name}</span>
                        <span className="profile-card-badge">
                          {isAllSelected ? "✓ Added" : partialCount > 0 ? `${partialCount}/${pkg.testIds.length}` : `+ ${pkg.badge}`}
                        </span>
                      </div>
                      <div className="profile-card-desc">{pkg.fullname}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Search Bar & Action Controls */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
              <div className="search" style={{ flex: 1, minWidth: 240, margin: 0 }}>
                <Search size={16} />
                <input
                  placeholder="Search 70+ lab tests by name, code, or department..."
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  style={{ fontSize: 13, padding: "7px 10px" }}
                />
                {testSearch && (
                  <button
                    type="button"
                    onClick={() => setTestSearch("")}
                    style={{ border: 0, background: "transparent", cursor: "pointer" }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="tab"
                  style={{ padding: "6px 11px", fontSize: 11 }}
                  onClick={selectAllInCurrentCategory}
                >
                  + Select All in Category
                </button>
                <button
                  type="button"
                  className="tab"
                  style={{ padding: "6px 11px", fontSize: 11 }}
                  onClick={clearAllTests}
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Department Filter Tabs */}
            <div className="dept-filter-tabs">
              {categories.map((cat) => {
                const count = cat === "All" ? tests.length : tests.filter((t) => t.category === cat).length;
                return (
                  <button
                    type="button"
                    key={cat}
                    className={`dept-filter-tab ${activeCategory === cat ? "active" : ""}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Selected Tests Basket */}
            {selectedTests.length > 0 && (
              <div className="test-chips-basket">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b style={{ fontSize: 11.5, color: "#5b0a1a" }}>
                    Selected Tests Basket ({selectedTests.length} tests · Total: {money(calculatedTotal)})
                  </b>
                  <button
                    type="button"
                    onClick={clearAllTests}
                    style={{ border: 0, background: "transparent", color: "#a12929", fontSize: 11, cursor: "pointer", fontWeight: 700 }}
                  >
                    Clear All
                  </button>
                </div>
                <div className="test-chips-list">
                  {selectedTests.map((id) => {
                    const t = tests.find((x) => x.id === id);
                    if (!t) return null;
                    return (
                      <span key={id} className="test-chip">
                        <span>{t.name}</span>
                        <small style={{ color: "#7a6870", fontSize: 9.5 }}>{t.price ? money(t.price) : "Free"}</small>
                        <button
                          type="button"
                          className="test-chip-remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTest(id);
                          }}
                          title={`Remove ${t.name}`}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Individual Tests Grid */}
            <div className="tests-picker-grid" style={{ maxHeight: 460 }}>
              {filteredTests.map((test) => {
                const selected = selectedTests.includes(test.id);
                return (
                  <div
                    key={test.id}
                    className={`test-picker-card ${selected ? "selected" : ""}`}
                    onClick={() => toggleTest(test.id)}
                  >
                    <div style={{ marginTop: 2 }}>
                      {selected ? (
                        <div style={{ width: 18, height: 18, borderRadius: 4, background: "#8b1730", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Check size={12} color="#fff" />
                        </div>
                      ) : (
                        <div style={{ width: 18, height: 18, borderRadius: 4, border: "1.5px solid #dcced3", background: "#fff" }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 800, fontSize: 12, color: "#380a15", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {test.name}
                        </span>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: "#8b1730", marginLeft: 4 }}>
                          {test.price ? money(test.price) : "Free"}
                        </span>
                      </div>
                      <div style={{ fontSize: 9.5, color: "#7a6870", marginTop: 2, display: "flex", gap: 6 }}>
                        <span style={{ background: "#f5edf0", padding: "1px 4px", borderRadius: 3, fontWeight: 600 }}>{test.id}</span>
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{test.category}</span>
                      </div>
                      {test.reference && (
                        <div style={{ fontSize: 9, color: "#888", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          Ref: {test.reference}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* =========================================================
   PAGE: PATIENTS DIRECTORY
   ========================================================= */

function Patients({ navigate, onToast }) {
  const [patients, setPatients] = useStoredData(STORAGE.patients, DEFAULT_PATIENTS);
  const [tests] = useStoredData(STORAGE.tests, DEFAULT_TESTS);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // stores patient id to delete
  const [managingPatientTests, setManagingPatientTests] = useState(null);

  const filtered = patients.filter((patient) =>
    `${patient.name} ${patient.id} ${patient.phone} ${patient.branch}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function remove(id) {
    markItemDeleted("patients", id);
    deleteItemFromBackend(STORAGE.patients, id);
    const next = patients.filter((patient) => patient.id !== id);
    setPatients(next);
    setConfirmDelete(null);
    onToast("Patient record deleted.");
  }

  function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingPatient) return;
    const next = patients.map((p) =>
      p.id === editingPatient.id ? editingPatient : p
    );
    setPatients(next);
    write(STORAGE.patients, next);
    setEditingPatient(null);
    onToast(`Patient ${editingPatient.name} updated successfully!`);
  }

  function handleSavePatientTestsFromList(newTestIds) {
    if (!managingPatientTests) return;
    const updated = patients.map((p) =>
      p.id === managingPatientTests.id ? { ...p, tests: newTestIds } : p
    );
    setPatients(updated);
    write(STORAGE.patients, updated);

    // Update bill
    const allTests = read(STORAGE.tests, DEFAULT_TESTS);
    const newTotal = allTests
      .filter((t) => newTestIds.includes(t.id))
      .reduce((sum, t) => sum + Number(t.price || 0), 0);
    const curBills = read(STORAGE.bills, DEFAULT_BILLS);
    const updatedBills = curBills.map((b) =>
      b.patientId === managingPatientTests.id ? { ...b, amount: newTotal } : b
    );
    write(STORAGE.bills, updatedBills);

    onToast(
      `Tests updated for ${managingPatientTests.name}! (${newTestIds.length} tests enrolled)`,
      "success"
    );
    setManagingPatientTests(null);
  }

  return (
    <>
      <PageHeader
        title="Patients Directory"
        subtitle="Search, view, update, and manage registered patients."
      >
        <Button primary onClick={() => navigate("/patients/new")}>
          <Plus size={16} /> Add Patient
        </Button>
      </PageHeader>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={17} />
            <input
              placeholder="Search by name, patient ID, phone, or branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{ border: 0, background: "transparent", cursor: "pointer" }}
              >
                <X size={15} />
              </button>
            )}
          </div>
          <span className="badge active">
            {filtered.length} Patients
          </span>
        </div>

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Phone</th>
                <th>Age / Gender</th>
                <th>Referred By</th>
                <th>Branch</th>
                <th>Tests</th>
                <th>Reg. Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px 16px", color: "#666" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#5b0a1a", marginBottom: "6px" }}>
                      {search ? "No matching patients found" : "No patients registered yet"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#888", marginBottom: "14px" }}>
                      {search ? "Try searching with a different name, phone, or ID." : "Start fresh by registering your first patient."}
                    </div>
                    {!search && (
                      <Button primary onClick={() => navigate("/patients/new")}>
                        <Plus size={15} /> Add First Patient (PAT001)
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((patient) => (
                  <tr key={patient.id}>
                    <td>
                      <b>{patient.name}</b>
                      <small>{patient.id}</small>
                    </td>
                    <td>{patient.phone}</td>
                    <td>
                      {patient.age} yrs / {patient.gender}
                    </td>
                    <td>{patient.referredBy || "Self"}</td>
                    <td>{patient.branch}</td>
                    <td>
                      <span className="badge">{patient.tests?.length || 0} tests</span>
                    </td>
                    <td>{patient.date}</td>
                    <td className="actions">
                      <button
                        title="Manage / Add Tests"
                        style={{ color: "#0e5a3a" }}
                        onClick={() => setManagingPatientTests(patient)}
                      >
                        <FlaskConical size={16} />
                      </button>
                      <button
                        title="View Details"
                        onClick={() => setSelectedPatient(patient)}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        title="Edit Patient"
                        onClick={() => setEditingPatient({ ...patient })}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        title="View Reports"
                        onClick={() => navigate(`/reports?patient=${patient.id}`)}
                      >
                        <FileText size={16} />
                      </button>
                      <button
                        title="Delete Patient"
                        onClick={() => setConfirmDelete(patient.id)}
                      >
                        <Trash2 size={16} color="#a12929" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW PATIENT MODAL */}
      {selectedPatient && (
        <div className="modalshade">
          <div className="modal">
            <div className="modalhead">
              <h3>Patient Profile — {selectedPatient.id}</h3>
              <button
                className="close"
                type="button"
                onClick={() => setSelectedPatient(null)}
              >
                ×
              </button>
            </div>

            <div className="receipt-box">
              <div className="receipt-row">
                <b>Full Name</b>
                <span>{selectedPatient.name}</span>
              </div>
              <div className="receipt-row">
                <b>Phone</b>
                <span>{selectedPatient.phone}</span>
              </div>
              <div className="receipt-row">
                <b>Age / Gender</b>
                <span>{selectedPatient.age} / {selectedPatient.gender}</span>
              </div>
              <div className="receipt-row">
                <b>Email</b>
                <span>{selectedPatient.email || "Not Provided"}</span>
              </div>
              <div className="receipt-row">
                <b>Branch</b>
                <span>{selectedPatient.branch}</span>
              </div>
              <div className="receipt-row">
                <b>Referred By</b>
                <span>{selectedPatient.referredBy || "Self"}</span>
              </div>
              <div className="receipt-row">
                <b>Registration Date</b>
                <span>{selectedPatient.date}</span>
              </div>
              <div className="receipt-row">
                <b>Enrolled Tests</b>
                <span>{selectedPatient.tests?.join(", ") || "None"}</span>
              </div>
            </div>

            <div className="formactions" style={{ marginTop: 15, flexWrap: "wrap" }}>
              <Button
                style={{ background: "#0e5a3a", color: "#fff", display: "inline-flex", alignItems: "center", gap: 5 }}
                onClick={() => {
                  const p = selectedPatient;
                  setSelectedPatient(null);
                  setManagingPatientTests(p);
                }}
              >
                <FlaskConical size={15} /> Manage / Add Tests
              </Button>
              <Button
                primary
                onClick={() => {
                  const pid = selectedPatient.id;
                  setSelectedPatient(null);
                  navigate(`/reports?patient=${pid}`);
                }}
              >
                <FileText size={15} /> Open Lab Report
              </Button>
              <Button onClick={() => setSelectedPatient(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PATIENT MODAL */}
      {editingPatient && (
        <div className="modalshade">
          <form className="modal" onSubmit={handleSaveEdit}>
            <div className="modalhead">
              <h3>Edit Patient — {editingPatient.id}</h3>
              <button
                className="close"
                type="button"
                onClick={() => setEditingPatient(null)}
              >
                ×
              </button>
            </div>

            <div className="formgrid">
              <div className="field">
                <label>Full Name</label>
                <input
                  required
                  value={editingPatient.name}
                  onChange={(e) =>
                    setEditingPatient({ ...editingPatient, name: e.target.value })
                  }
                />
              </div>

              <div className="field">
                <label>Phone</label>
                <input
                  required
                  value={editingPatient.phone}
                  onChange={(e) =>
                    setEditingPatient({ ...editingPatient, phone: e.target.value })
                  }
                />
              </div>

              <div className="field">
                <label>Age</label>
                <input
                  required
                  value={editingPatient.age}
                  onChange={(e) =>
                    setEditingPatient({ ...editingPatient, age: e.target.value })
                  }
                />
              </div>

              <div className="field">
                <label>Gender</label>
                <select
                  value={editingPatient.gender}
                  onChange={(e) =>
                    setEditingPatient({ ...editingPatient, gender: e.target.value })
                  }
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="field">
                <label>Email</label>
                <input
                  value={editingPatient.email || ""}
                  onChange={(e) =>
                    setEditingPatient({ ...editingPatient, email: e.target.value })
                  }
                />
              </div>

              <div className="field">
                <label>Referred By</label>
                <input
                  value={editingPatient.referredBy || ""}
                  onChange={(e) =>
                    setEditingPatient({ ...editingPatient, referredBy: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="formactions">
              <Button onClick={() => setEditingPatient(null)}>Cancel</Button>
              <Button primary type="submit">
                <Check size={16} /> Save Changes
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {confirmDelete && (
        <div className="modalshade">
          <div className="modal" style={{ maxWidth: 420, textAlign: "center" }}>
            <div style={{ padding: "10px 0 18px" }}>
              <Trash2 size={40} color="#a12929" style={{ marginBottom: 12 }} />
              <h3 style={{ margin: "0 0 8px", color: "#350913" }}>Delete Patient?</h3>
              <p style={{ margin: 0, color: "#836f77", fontSize: 14 }}>
                This will permanently remove the patient record. This action cannot be undone.
              </p>
            </div>
            <div className="formactions" style={{ justifyContent: "center", gap: 12 }}>
              <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <button
                onClick={() => remove(confirmDelete)}
                style={{
                  padding: "9px 22px",
                  borderRadius: 8,
                  border: 0,
                  background: "#a12929",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <Trash2 size={15} /> Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE TESTS MODAL */}
      {managingPatientTests && (
        <ManageTestsModal
          patient={managingPatientTests}
          tests={tests}
          onClose={() => setManagingPatientTests(null)}
          onSave={handleSavePatientTestsFromList}
        />
      )}
    </>
  );
}

/* =========================================================
   PAGE: DOCTORS
   ========================================================= */

function Doctors({ onToast }) {
  const [doctors, setDoctors] = useStoredData(STORAGE.doctors, DEFAULT_DOCTORS);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);

  const [form, setForm] = useState({
    name: "",
    specialization: "",
    phone: "",
    email: "",
  });

  const filtered = doctors.filter((doctor) =>
    `${doctor.name} ${doctor.specialization}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function saveAdd(e) {
    e.preventDefault();
    if (!form.name || !form.specialization) return;

    const newDoc = {
      id: nextId("DOC", doctors),
      name: form.name.trim(),
      specialization: form.specialization.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      status: "Active",
      updatedAt: new Date().toISOString()
    };
    const next = [...doctors, newDoc];
    setDoctors(next);
    setForm({ name: "", specialization: "", phone: "", email: "" });
    setShowAdd(false);
    onToast(`Doctor ${newDoc.name} (${newDoc.id}) added & saved!`);
  }

  function saveEdit(e) {
    e.preventDefault();
    if (!editingDoctor) return;
    const next = doctors.map((d) =>
      d.id === editingDoctor.id ? { ...editingDoctor, updatedAt: new Date().toISOString() } : d
    );
    setDoctors(next);
    setEditingDoctor(null);
    onToast(`Doctor ${editingDoctor.name} updated!`);
  }

  function toggleStatus(id) {
    const next = doctors.map((d) =>
      d.id === id
        ? { ...d, status: d.status === "Active" ? "Inactive" : "Active", updatedAt: new Date().toISOString() }
        : d
    );
    setDoctors(next);
    onToast("Doctor status changed.");
  }

  function remove(id) {
    if (!confirm("Are you sure you want to remove this doctor?")) return;
    markItemDeleted("doctors", id);
    deleteItemFromBackend(STORAGE.doctors, id);
    const next = doctors.filter((d) => d.id !== id);
    setDoctors(next);
    onToast("Doctor removed.");
  }

  return (
    <>
      <PageHeader
        title="Doctors Management"
        subtitle="Manage referring doctors, specializations, and credentials."
      >
        <Button primary onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Doctor
        </Button>
      </PageHeader>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search doctors by name or specialization..."
            />
          </div>
          <span className="badge active">{filtered.length} Doctors</span>
        </div>

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Specialization</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doctor) => (
                <tr key={doctor.id}>
                  <td>
                    <b>{doctor.name}</b>
                    <small>{doctor.id}</small>
                  </td>
                  <td>{doctor.specialization}</td>
                  <td>{doctor.phone}</td>
                  <td>{doctor.email}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => toggleStatus(doctor.id)}
                      className={`badge ${doctor.status === "Active" ? "active" : "inactive"}`}
                      style={{ border: 0, cursor: "pointer" }}
                      title="Click to toggle status"
                    >
                      {doctor.status}
                    </button>
                  </td>
                  <td className="actions">
                    <button
                      title="Edit Doctor"
                      onClick={() => setEditingDoctor({ ...doctor })}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      title="Delete Doctor"
                      onClick={() => remove(doctor.id)}
                    >
                      <Trash2 size={16} color="#a12929" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD DOCTOR MODAL */}
      {showAdd && (
        <div className="modalshade">
          <form className="modal" onSubmit={saveAdd}>
            <div className="modalhead">
              <h3>Add New Doctor</h3>
              <button
                className="close"
                type="button"
                onClick={() => setShowAdd(false)}
              >
                ×
              </button>
            </div>

            <div className="formgrid">
              <div className="field">
                <label>Doctor Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Kumar"
                />
              </div>

              <div className="field">
                <label>Specialization *</label>
                <input
                  required
                  value={form.specialization}
                  onChange={(e) =>
                    setForm({ ...form, specialization: e.target.value })
                  }
                  placeholder="e.g. Pathologist / Cardiologist"
                />
              </div>

              <div className="field">
                <label>Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>

              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Email address"
                />
              </div>
            </div>

            <div className="formactions">
              <Button onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button primary type="submit">
                <Check size={16} /> Save Doctor
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT DOCTOR MODAL */}
      {editingDoctor && (
        <div className="modalshade">
          <form className="modal" onSubmit={saveEdit}>
            <div className="modalhead">
              <h3>Edit Doctor — {editingDoctor.id}</h3>
              <button
                className="close"
                type="button"
                onClick={() => setEditingDoctor(null)}
              >
                ×
              </button>
            </div>

            <div className="formgrid">
              <div className="field">
                <label>Doctor Name</label>
                <input
                  required
                  value={editingDoctor.name}
                  onChange={(e) =>
                    setEditingDoctor({ ...editingDoctor, name: e.target.value })
                  }
                />
              </div>

              <div className="field">
                <label>Specialization</label>
                <input
                  required
                  value={editingDoctor.specialization}
                  onChange={(e) =>
                    setEditingDoctor({
                      ...editingDoctor,
                      specialization: e.target.value,
                    })
                  }
                />
              </div>

              <div className="field">
                <label>Phone</label>
                <input
                  value={editingDoctor.phone}
                  onChange={(e) =>
                    setEditingDoctor({ ...editingDoctor, phone: e.target.value })
                  }
                />
              </div>

              <div className="field">
                <label>Email</label>
                <input
                  value={editingDoctor.email}
                  onChange={(e) =>
                    setEditingDoctor({ ...editingDoctor, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="formactions">
              <Button onClick={() => setEditingDoctor(null)}>Cancel</Button>
              <Button primary type="submit">
                <Check size={16} /> Update Doctor
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

/* =========================================================
   PAGE: TEST MANAGEMENT
   ========================================================= */

function TestManagement({ navigate, onToast }) {
  const [tests, setTests] = useStoredData(STORAGE.tests, DEFAULT_TESTS);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [editingTest, setEditingTest] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    category: "Clinical Pathology",
    unit: "",
    reference: "",
    price: "",
  });

  const categories = [
    "All",
    "Clinical Pathology",
    "Urine Examinations",
    "Bio Chemistry",
    "Liver Function Test",
    "Lipid Profile",
    "Electrolytes",
    "HBA1C",
    "Motion Examination",
    "Semen Analysis",
    "Additional Tests",
  ];

  const filtered = tests.filter((test) => {
    const matchesCategory =
      selectedCategory === "All" || test.category === selectedCategory;
    const matchesSearch = `${test.name} ${test.category}`
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  function toggle(id) {
    const next = tests.map((test) =>
      test.id === id
        ? {
            ...test,
            status: test.status === "Active" ? "Inactive" : "Active",
            updatedAt: new Date().toISOString()
          }
        : test
    );
    setTests(next);
    onToast("Test availability toggled.");
  }

  function remove(id) {
    markItemDeleted("tests", id);
    deleteItemFromBackend(STORAGE.tests, id);
    const next = tests.filter((t) => t.id !== id);
    setTests(next);
    setConfirmDelete(null);
    onToast("Test removed from catalog.");
  }

  function saveAdd(e) {
    e.preventDefault();
    if (!addForm.name) return;

    const newTest = {
      id: nextId("TST", tests),
      name: addForm.name.trim(),
      category: addForm.category,
      unit: addForm.unit.trim(),
      reference: addForm.reference ? addForm.reference.trim() : "",
      price: Number(addForm.price || 0),
      status: "Active",
      updatedAt: new Date().toISOString()
    };

    const next = [...tests, newTest];
    setTests(next);
    setAddForm({ name: "", category: "Clinical Pathology", unit: "", reference: "", price: "" });
    setShowAdd(false);
    onToast(`Test "${newTest.name}" (${newTest.id}) created & saved!`);
  }

  function saveEdit(e) {
    e.preventDefault();
    if (!editingTest) return;
    const next = tests.map((t) =>
      t.id === editingTest.id
        ? {
            ...editingTest,
            reference: editingTest.reference ? String(editingTest.reference).trim() : "",
            price: Number(editingTest.price || 0),
            updatedAt: new Date().toISOString()
          }
        : t
    );
    setTests(next);
    setEditingTest(null);
    onToast(`Test "${editingTest.name}" updated successfully!`);
  }

  return (
    <>
      <PageHeader
        title="Test Management"
        subtitle="Manage laboratory test offerings, active status, and catalog."
      >
        <Button id="btn-add-test-mgmt" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Test
        </Button>
        <Button primary onClick={() => navigate("/test-master")}>
          <ClipboardList size={16} /> Open Test Master
        </Button>
      </PageHeader>

      <div className="stats mini">
        <div className="stat">
          <div className="staticon">
            <Database />
          </div>
          <div>
            <span>Total Tests</span>
            <strong>{tests.length}</strong>
          </div>
        </div>

        <div className="stat">
          <div className="staticon">
            <Check />
          </div>
          <div>
            <span>Active Tests</span>
            <strong>{tests.filter((t) => t.status === "Active").length}</strong>
          </div>
        </div>

        <div className="stat">
          <div className="staticon">
            <AlertCircle />
          </div>
          <div>
            <span>Inactive Tests</span>
            <strong>{tests.filter((t) => t.status !== "Active").length}</strong>
          </div>
        </div>

        <div className="stat">
          <div className="staticon">
            <CreditCard />
          </div>
          <div>
            <span>Avg. Price</span>
            <strong>
              {money(
                tests.reduce((a, b) => a + Number(b.price || 0), 0) /
                  Math.max(1, tests.length)
              )}
            </strong>
          </div>
        </div>
      </div>

      <div className="tabs">
        {categories.map((cat) => (
          <button
            type="button"
            key={cat}
            className={`tab ${selectedCategory === cat ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tests..."
            />
          </div>
        </div>

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Test</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Reference Range</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((test) => (
                <tr key={test.id}>
                  <td>
                    <b>{test.name}</b>
                    <small>{test.id}</small>
                  </td>
                  <td>{test.category}</td>
                  <td>{test.unit}</td>
                  <td style={{ whiteSpace: "pre-line", lineHeight: "1.35", minWidth: 150 }}>{test.reference || "—"}</td>
                  <td>{test.price > 0 ? money(test.price) : "— —"}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => toggle(test.id)}
                      className={`badge ${test.status === "Active" ? "active" : "inactive"}`}
                      style={{ border: 0, cursor: "pointer" }}
                      title="Click to toggle Active / Inactive"
                    >
                      {test.status}
                    </button>
                  </td>
                  <td className="actions">
                    <button
                      title="Edit Test"
                      onClick={() => setEditingTest({ ...test })}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      title="Delete Test"
                      onClick={() => setConfirmDelete(test.id)}
                    >
                      <Trash2 size={16} color="#a12929" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD TEST MODAL */}
      {showAdd && (
        <div className="modalshade">
          <form className="modal" onSubmit={saveAdd}>
            <div className="modalhead">
              <h3>Add Laboratory Test</h3>
              <button
                type="button"
                className="close"
                onClick={() => setShowAdd(false)}
              >
                ×
              </button>
            </div>

            <div className="formgrid">
              <div className="field">
                <label>Test Name *</label>
                <input
                  id="mgmt-test-name"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Serum Creatinine"
                />
              </div>

              <div className="field">
                <label>Category *</label>
                <select
                  value={addForm.category}
                  onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                >
                  {categories.filter((c) => c !== "All").map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Unit</label>
                <input
                  value={addForm.unit}
                  onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                  placeholder="e.g. mg/dL or g/dL"
                />
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Reference Range</span>
                  <span style={{ fontSize: "11px", color: "#8b1730", fontWeight: 600 }}>
                    Press Enter for 2nd & 3rd lines
                  </span>
                </label>
                <textarea
                  id="mgmt-test-ref"
                  rows={3}
                  value={addForm.reference}
                  onChange={(e) => setAddForm({ ...addForm, reference: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                    }
                  }}
                  placeholder={"Line 1: Male: 14 - 17\nLine 2: Female: 12 - 15\nLine 3: Child: 11 - 14"}
                  style={{
                    width: "100%",
                    minHeight: "78px",
                    resize: "vertical",
                    padding: "8px 10px",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    lineHeight: "1.45",
                    borderRadius: "6px",
                    border: "1px solid #d3c4c7",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div className="field">
                <label>Price (₹) *</label>
                <input
                  id="mgmt-test-price"
                  required
                  type="number"
                  min="0"
                  value={addForm.price}
                  onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
                  placeholder="e.g. 250"
                />
              </div>
            </div>

            <div className="formactions">
              <Button onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button id="mgmt-test-save-btn" primary type="submit">
                <Check size={16} /> Save Test
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT TEST MODAL */}
      {editingTest && (
        <div className="modalshade">
          <form className="modal" onSubmit={saveEdit}>
            <div className="modalhead">
              <h3>Edit Test — {editingTest.id}</h3>
              <button type="button" className="close" onClick={() => setEditingTest(null)}>×</button>
            </div>

            <div className="formgrid">
              <div className="field">
                <label>Test Name *</label>
                <input
                  required
                  value={editingTest.name}
                  onChange={(e) => setEditingTest({ ...editingTest, name: e.target.value })}
                  placeholder="e.g. Haemoglobin"
                />
              </div>

              <div className="field">
                <label>Category</label>
                <select
                  value={editingTest.category}
                  onChange={(e) => setEditingTest({ ...editingTest, category: e.target.value })}
                >
                  {categories.filter((c) => c !== "All").map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Unit</label>
                <input
                  value={editingTest.unit || ""}
                  onChange={(e) => setEditingTest({ ...editingTest, unit: e.target.value })}
                  placeholder="e.g. g/dL"
                />
              </div>

              <div className="field">
                <label>Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={editingTest.price || 0}
                  onChange={(e) => setEditingTest({ ...editingTest, price: Number(e.target.value) })}
                  placeholder="e.g. 100"
                />
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Reference Range</span>
                  <span style={{ fontSize: "11px", color: "#8b1730", fontWeight: 600 }}>
                    Press Enter for 2nd & 3rd lines
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={editingTest.reference || ""}
                  onChange={(e) => setEditingTest({ ...editingTest, reference: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                    }
                  }}
                  placeholder={"Line 1: Male: 14 - 17\nLine 2: Female: 12 - 15\nLine 3: Child: 11 - 14"}
                  style={{
                    width: "100%",
                    minHeight: "78px",
                    resize: "vertical",
                    padding: "8px 10px",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    lineHeight: "1.45",
                    borderRadius: "6px",
                    border: "1px solid #d3c4c7",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div className="field">
                <label>Status</label>
                <select
                  value={editingTest.status}
                  onChange={(e) => setEditingTest({ ...editingTest, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="formactions">
              <Button onClick={() => setEditingTest(null)}>Cancel</Button>
              <Button primary type="submit"><Check size={16} /> Save Changes</Button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {confirmDelete && (
        <div className="modalshade">
          <div className="modal" style={{ maxWidth: 420, textAlign: "center" }}>
            <div style={{ padding: "10px 0 18px" }}>
              <Trash2 size={40} color="#a12929" style={{ marginBottom: 12 }} />
              <h3 style={{ margin: "0 0 8px", color: "#350913" }}>Delete Test?</h3>
              <p style={{ margin: 0, color: "#836f77", fontSize: 14 }}>
                This will permanently remove the test from the catalog.
              </p>
            </div>
            <div className="formactions" style={{ justifyContent: "center", gap: 12 }}>
              <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <button
                onClick={() => remove(confirmDelete)}
                style={{
                  padding: "9px 22px", borderRadius: 8, border: 0,
                  background: "#a12929", color: "#fff", fontWeight: 700,
                  fontSize: 14, cursor: "pointer", display: "flex",
                  alignItems: "center", gap: 7,
                }}
              >
                <Trash2 size={15} /> Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   PAGE: TEST MASTER
   ========================================================= */

function TestMaster({ onToast }) {
  const [tests, setTests] = useStoredData(STORAGE.tests, DEFAULT_TESTS);
  const [show, setShow] = useState(false);
  const [editingTest, setEditingTest] = useState(null);

  const [form, setForm] = useState({
    name: "",
    category: "Clinical Pathology",
    unit: "",
    reference: "",
    price: "",
  });

  const masterCategories = [
    "Clinical Pathology",
    "Urine Examinations",
    "Bio Chemistry",
    "Liver Function Test",
    "Lipid Profile",
    "Electrolytes",
    "HBA1C",
    "Motion Examination",
    "Semen Analysis",
    "Additional Tests",
  ];

  function saveAdd(e) {
    e.preventDefault();
    if (!form.name) return;

    const newTest = {
      id: nextId("TST", tests),
      name: form.name.trim(),
      category: form.category,
      unit: form.unit.trim(),
      reference: form.reference ? form.reference.trim() : "",
      price: Number(form.price || 0),
      status: "Active",
      updatedAt: new Date().toISOString()
    };

    const next = [...tests, newTest];
    setTests(next);
    setForm({ name: "", category: "Clinical Pathology", unit: "", reference: "", price: "" });
    setShow(false);
    onToast(`Test ${newTest.name} (${newTest.id}) created & saved!`);
  }

  function saveEdit(e) {
    e.preventDefault();
    if (!editingTest) return;

    const next = tests.map((t) =>
      t.id === editingTest.id
        ? {
            ...editingTest,
            reference: editingTest.reference ? String(editingTest.reference).trim() : "",
            price: Number(editingTest.price || 0),
            updatedAt: new Date().toISOString()
          }
        : t
    );
    setTests(next);
    setEditingTest(null);
    onToast(`Test ${editingTest.name} updated successfully!`);
  }

  function remove(id) {
    if (!confirm("Are you sure you want to delete this test?")) return;
    markItemDeleted("tests", id);
    deleteItemFromBackend(STORAGE.tests, id);
    const next = tests.filter((t) => t.id !== id);
    setTests(next);
    onToast("Test deleted.");
  }

  function resetToDefaultTests() {
    if (!confirm("Reset test master to the full 71 standard tests catalog?")) return;
    setTests(DEFAULT_TESTS);
    write(STORAGE.tests, DEFAULT_TESTS);
    onToast("Reset to 71 standard laboratory tests!");
  }

  return (
    <>
      <PageHeader
        title="Test Master"
        subtitle="Define, price, and maintain comprehensive laboratory tests (71 Clinical Tests across 6 departments)."
      >
        <Button onClick={resetToDefaultTests}>
          <RefreshCw size={16} /> Reset 71 Clinical Tests
        </Button>
        <Button id="btn-add-test-master" primary onClick={() => setShow(true)}>
          <Plus size={16} /> Add Test
        </Button>
      </PageHeader>

      <div className="card">
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Test Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Reference Range</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id}>
                  <td>{test.id}</td>
                  <td>
                    <b>{test.name}</b>
                  </td>
                  <td>{test.category}</td>
                  <td>{test.unit}</td>
                  <td style={{ whiteSpace: "pre-line", lineHeight: "1.35", minWidth: 150 }}>{test.reference || "—"}</td>
                  <td>{test.price > 0 ? money(test.price) : "— —"}</td>
                  <td className="actions">
                    <button
                      title="Edit Test"
                      onClick={() => setEditingTest({ ...test })}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      title="Delete Test"
                      onClick={() => remove(test.id)}
                    >
                      <Trash2 size={16} color="#a12929" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD TEST MODAL */}
      {show && (
        <div className="modalshade">
          <form className="modal" onSubmit={saveAdd}>
            <div className="modalhead">
              <h3>Add Laboratory Test</h3>
              <button
                type="button"
                className="close"
                onClick={() => setShow(false)}
              >
                ×
              </button>
            </div>

            <div className="formgrid">
              <div className="field">
                <label>Test Name *</label>
                <input
                  id="tm-test-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Serum Creatinine"
                />
              </div>

              <div className="field">
                <label>Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {masterCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Unit</label>
                <input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="e.g. mg/dL or g/dL"
                />
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Reference Range</span>
                  <span style={{ fontSize: "11px", color: "#8b1730", fontWeight: 600 }}>
                    Press Enter for 2nd & 3rd lines
                  </span>
                </label>
                <textarea
                  id="tm-test-ref"
                  rows={3}
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                    }
                  }}
                  placeholder={"Line 1: Male: 14 - 17\nLine 2: Female: 12 - 15\nLine 3: Child: 11 - 14"}
                  style={{
                    width: "100%",
                    minHeight: "78px",
                    resize: "vertical",
                    padding: "8px 10px",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    lineHeight: "1.45",
                    borderRadius: "6px",
                    border: "1px solid #d3c4c7",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div className="field">
                <label>Price (₹) *</label>
                <input
                  id="tm-test-price"
                  required
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="e.g. 250"
                />
              </div>
            </div>

            <div className="formactions">
              <Button onClick={() => setShow(false)}>Cancel</Button>
              <Button id="tm-test-save-btn" primary type="submit">
                <Check size={16} /> Save Test
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT TEST MODAL */}
      {editingTest && (
        <div className="modalshade">
          <form className="modal" onSubmit={saveEdit}>
            <div className="modalhead">
              <h3>Edit Test — {editingTest.id}</h3>
              <button
                type="button"
                className="close"
                onClick={() => setEditingTest(null)}
              >
                ×
              </button>
            </div>

            <div className="formgrid">
              <div className="field">
                <label>Test Name</label>
                <input
                  required
                  value={editingTest.name}
                  onChange={(e) =>
                    setEditingTest({ ...editingTest, name: e.target.value })
                  }
                />
              </div>

              <div className="field">
                <label>Category</label>
                <select
                  value={editingTest.category}
                  onChange={(e) =>
                    setEditingTest({ ...editingTest, category: e.target.value })
                  }
                >
                  {masterCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Unit</label>
                <input
                  value={editingTest.unit || ""}
                  onChange={(e) =>
                    setEditingTest({ ...editingTest, unit: e.target.value })
                  }
                />
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Reference Range</span>
                  <span style={{ fontSize: "11px", color: "#8b1730", fontWeight: 600 }}>
                    Press Enter for 2nd & 3rd lines
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={editingTest.reference || ""}
                  onChange={(e) =>
                    setEditingTest({ ...editingTest, reference: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                    }
                  }}
                  placeholder={"Line 1: Male: 14 - 17\nLine 2: Female: 12 - 15\nLine 3: Child: 11 - 14"}
                  style={{
                    width: "100%",
                    minHeight: "78px",
                    resize: "vertical",
                    padding: "8px 10px",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    lineHeight: "1.45",
                    borderRadius: "6px",
                    border: "1px solid #d3c4c7",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div className="field">
                <label>Price (₹)</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={editingTest.price}
                  onChange={(e) =>
                    setEditingTest({ ...editingTest, price: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="formactions">
              <Button onClick={() => setEditingTest(null)}>Cancel</Button>
              <Button primary type="submit">
                <Check size={16} /> Update Test
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

/* =========================================================
   PAGE: PATIENT CLINICAL HISTORY & ARCHIVE
   ========================================================= */

function PatientHistory({ navigate, onToast }) {
  const [patients] = useStoredData(STORAGE.patients, DEFAULT_PATIENTS);
  const [reports] = useStoredData(STORAGE.reports, DEFAULT_REPORTS);
  const [bills] = useStoredData(STORAGE.bills, DEFAULT_BILLS);
  const [tests] = useStoredData(STORAGE.tests, DEFAULT_TESTS);
  const [settings] = useStoredData(STORAGE.settings, {
    labName: "TAZ DIAGNOSTIC",
    phone: "9440985131",
    email: "tazdiagnostic@gmail.com",
    address: "Dr No: 8-200 RAJKUMAR SILKS, Near Raj Kumar Silks Street, Main Road, Tallapudi, Rajahmundry-534341, Andhra Pradesh",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || "");

  const filteredPatients = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.phone && p.phone.toLowerCase().includes(q)) ||
      (p.referredBy && p.referredBy.toLowerCase().includes(q))
    );
  }, [patients, searchTerm]);

  // Keep active patient in sync with search
  const activePatient = useMemo(() => {
    const found = patients.find((p) => p.id === selectedPatientId);
    if (found) return found;
    return filteredPatients[0] || null;
  }, [patients, selectedPatientId, filteredPatients]);

  const patientReports = useMemo(() => {
    if (!activePatient) return [];
    return reports
      .filter((r) => r.patientId === activePatient.id)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [reports, activePatient]);

  const patientBills = useMemo(() => {
    if (!activePatient) return [];
    return bills.filter((b) => b.patientId === activePatient.id);
  }, [bills, activePatient]);

  const totalPaid = patientBills.reduce((sum, b) => sum + Number(b.amount || 0), 0);

  function handlePrintHistoryReport(rep) {
    if (!activePatient || !rep) return;
    const printWin = window.open("", "_blank");
    if (!printWin) {
      onToast("Popup blocked! Please allow popups to print report.", "warning");
      return;
    }

    const assignedIds = activePatient.tests || [];
    const assignedTests = assignedIds
      .map((id) => tests.find((t) => t.id === id))
      .filter(Boolean);

    const extraTests = tests.filter((t) => {
      if (assignedIds.includes(t.id)) return false;
      const val = rep.results?.[t.id];
      return val !== undefined && val !== null && String(val).trim() !== "";
    });

    const repTests = [...assignedTests, ...extraTests];

    const testRows = repTests.map((t, idx) => {
      const val = rep.results?.[t.id] ?? "—";
      const isAbnormal = getAbnormalFlag(val, t.reference, activePatient.gender);
      return `
        <tr>
          <td style="padding: 7px 10px; border-bottom: 1px solid #ddd; font-size: 12px;">${idx + 1}</td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #ddd; font-size: 12px; font-weight: 700; color: #5b0a1a;">
            ${t.name}
            <div style="font-size: 10px; color: #777;">${t.category}</div>
          </td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #ddd; font-size: 13px; font-weight: 800; color: ${isAbnormal ? '#c4183c' : '#111'};">
            ${val} ${isAbnormal ? '<span style="font-size: 10px; color: #c4183c; font-weight: bold;">(ABNORMAL)</span>' : ''}
          </td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #ddd; font-size: 12px;">${t.unit || "—"}</td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #ddd; font-size: 12px; color: #555; white-space: pre-line;">${(t.reference || "—").replace(/\n/g, '<br/>')}</td>
        </tr>
      `;
    }).join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laboratory Report - ${rep.id} - ${activePatient.name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 25px; color: #222; margin: 0; }
            .header { text-align: center; border-bottom: 2px solid #5b0a1a; padding-bottom: 12px; margin-bottom: 18px; }
            .header h1 { margin: 0; color: #5b0a1a; font-size: 22px; }
            .header p { margin: 3px 0 0; color: #666; font-size: 12px; }
            .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 20px; background: #faf5f6; padding: 12px; border-radius: 6px; border: 1px solid #e8d8dc; }
            .info-item { font-size: 12px; }
            .info-item strong { color: #380a15; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #5b0a1a; color: white; padding: 8px 10px; text-align: left; font-size: 12px; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
            .signature { border-top: 1px dashed #777; padding-top: 4px; text-align: center; min-width: 160px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${settings.labName}</h1>
            <p>${settings.address}</p>
            <p style="font-weight: 700; color: #5b0a1a; margin-top: 5px;">CLINICAL PATHOLOGY REPORT</p>
          </div>
          <div class="info-grid">
            <div class="info-item"><strong>Patient ID:</strong> ${activePatient.id}</div>
            <div class="info-item"><strong>Patient Name:</strong> ${activePatient.name}</div>
            <div class="info-item"><strong>Age / Gender:</strong> ${activePatient.age} Yrs / ${activePatient.gender}</div>
            <div class="info-item"><strong>Report ID:</strong> ${rep.id}</div>
            <div class="info-item"><strong>Visit Date:</strong> ${rep.date}</div>
            <div class="info-item"><strong>Referred By:</strong> ${rep.doctor || activePatient.referredBy || "Self"}</div>
            <div class="info-item"><strong>Contact:</strong> ${activePatient.phone}</div>
            <div class="info-item"><strong>Status:</strong> ${rep.status}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Investigation Test</th>
                <th>Result Value</th>
                <th>Units</th>
                <th>Biological Ref Range</th>
              </tr>
            </thead>
            <tbody>
              ${testRows || '<tr><td colspan="5" style="text-align:center; padding: 20px;">No tests recorded</td></tr>'}
            </tbody>
          </table>
          <div class="footer">
            <div>
              <p style="color: #666; font-size: 11px;">Note: Diagnostic results are corroborated with clinical findings.</p>
            </div>
            <div class="signature">
              <strong>Authorized Pathologist</strong><br/>
              <span style="font-size: 10px; color: #666;">${settings.labName}</span>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  }

  return (
    <>
      <PageHeader
        title="Patient History & Clinical Archive"
        subtitle="Search any patient by Name, Phone Number, or ID to view complete lifetime visit history, diagnostic test records, and billing."
      >
        <Button primary onClick={() => navigate("/patients/new")}>
          <Plus size={16} /> New Patient Entry
        </Button>
      </PageHeader>

      {/* SEARCH BAR */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="search" style={{ flex: 1, minWidth: "260px", margin: 0 }}>
            <Search size={18} />
            <input
              placeholder="Search patient by Name, Phone Number (e.g. 9441906474), or Patient ID (e.g. PAT002)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: 14, padding: "10px 12px 10px 42px" }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                style={{ border: 0, background: "transparent", cursor: "pointer", color: "#888" }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#666" }}>
              Matching: <b>{filteredPatients.length}</b> patient(s)
            </span>
            <Button
              onClick={() => {
                setPatients(read(STORAGE.patients, DEFAULT_PATIENTS));
                setReports(read(STORAGE.reports, DEFAULT_REPORTS));
                setBills(read(STORAGE.bills, DEFAULT_BILLS));
                onToast("Refreshed all patient records!");
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <RefreshCw size={14} /> Refresh
            </Button>
          </div>
        </div>

        {/* Quick select chip list if filtered */}
        {searchTerm && filteredPatients.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f0e6e8" }}>
            <span style={{ fontSize: "12px", color: "#5b0a1a", fontWeight: "700", alignSelf: "center" }}>Select:</span>
            {filteredPatients.slice(0, 8).map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => {
                  setSelectedPatientId(p.id);
                  setSearchTerm("");
                }}
                className={`tab ${activePatient?.id === p.id ? "active" : ""}`}
                style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "16px" }}
              >
                {p.name} ({p.id} • {p.phone || "No phone"})
              </button>
            ))}
          </div>
        )}
      </div>

      {activePatient ? (
        <>
          {/* PATIENT PROFILE HEADER CARD */}
          <div
            className="card"
            style={{
              background: "linear-gradient(135deg, #5b0a1a, #82142c)",
              color: "#fff",
              padding: "24px",
              borderRadius: "14px",
              marginBottom: "22px",
              boxShadow: "0 6px 20px rgba(91, 10, 26, 0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
              <div style={{ display: "flex", gap: "18px", alignItems: "center" }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                    border: "2px solid rgba(255,255,255,0.5)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 24,
                    fontWeight: 800,
                  }}
                >
                  {(activePatient.name || "P").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#fff" }}>
                      {activePatient.name}
                    </h2>
                    <span
                      style={{
                        background: "rgba(255,255,255,0.25)",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: 12,
                        fontFamily: "monospace",
                        fontWeight: 700,
                      }}
                    >
                      {activePatient.id}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "16px", marginTop: "6px", fontSize: "13px", opacity: 0.95, flexWrap: "wrap" }}>
                    <span>Age / Gender: <b>{activePatient.age} yrs / {activePatient.gender}</b></span>
                    <span>Phone: <b>{activePatient.phone || "—"}</b></span>
                    <span>Referred By: <b>{activePatient.referredBy || "Self"}</b></span>
                    <span>Registered: <b>{activePatient.date || "—"}</b></span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <Button
                  onClick={() => navigate(`/reports?patient=${activePatient.id}`)}
                  style={{ background: "#ffffff", color: "#5b0a1a", fontWeight: 700 }}
                >
                  <FileText size={15} /> Open in Reports
                </Button>
                <Button
                  onClick={() => navigate(`/billing`)}
                  style={{ background: "rgba(255,255,255,0.15)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.4)" }}
                >
                  <CreditCard size={15} /> View Bills
                </Button>
              </div>
            </div>

            {/* Quick Stats Banner */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "12px",
                marginTop: "20px",
                paddingTop: "16px",
                borderTop: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <div style={{ background: "rgba(0,0,0,0.15)", padding: "10px 14px", borderRadius: 8 }}>
                <small style={{ display: "block", fontSize: 11, opacity: 0.85, textTransform: "uppercase" }}>Total Lab Visits</small>
                <strong style={{ fontSize: 18 }}>{patientReports.length} Visits</strong>
              </div>
              <div style={{ background: "rgba(0,0,0,0.15)", padding: "10px 14px", borderRadius: 8 }}>
                <small style={{ display: "block", fontSize: 11, opacity: 0.85, textTransform: "uppercase" }}>Enrolled Tests</small>
                <strong style={{ fontSize: 18 }}>{activePatient.tests?.length || 0} Tests</strong>
              </div>
              <div style={{ background: "rgba(0,0,0,0.15)", padding: "10px 14px", borderRadius: 8 }}>
                <small style={{ display: "block", fontSize: 11, opacity: 0.85, textTransform: "uppercase" }}>Total Invoiced</small>
                <strong style={{ fontSize: 18 }}>{money(totalPaid)}</strong>
              </div>
              <div style={{ background: "rgba(0,0,0,0.15)", padding: "10px 14px", borderRadius: 8 }}>
                <small style={{ display: "block", fontSize: 11, opacity: 0.85, textTransform: "uppercase" }}>Latest Status</small>
                <strong style={{ fontSize: 18 }}>{patientReports[0]?.status || "Active"}</strong>
              </div>
            </div>
          </div>

          {/* CHRONOLOGICAL VISITS & TEST HISTORY */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="sectiontitle">
              <FlaskConical color="#5b0a1a" />
              <div>
                <h3>Lifetime Diagnostic History & Test Findings ({patientReports.length})</h3>
                <p>Complete record of all pathology tests, visit dates, values, reference limits, and doctor remarks.</p>
              </div>
            </div>

            {patientReports.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", background: "#faf7f8", borderRadius: 10, border: "1px dashed #dec9cf" }}>
                <FlaskConical size={40} color="#b9959e" style={{ marginBottom: 10 }} />
                <h4 style={{ margin: "0 0 6px", color: "#5b0a1a" }}>No Diagnostic Reports on File</h4>
                <p style={{ margin: "0 0 16px", color: "#666", fontSize: 13 }}>
                  No test reports have been generated for {activePatient.name} yet.
                </p>
                <Button primary onClick={() => navigate(`/reports?patient=${activePatient.id}`)}>
                  <Plus size={15} /> Create First Report for {activePatient.name}
                </Button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {patientReports.map((rep, repIdx) => {
                  const assignedIds = activePatient.tests || [];
                  const assignedTests = assignedIds
                    .map((id) => tests.find((t) => t.id === id))
                    .filter(Boolean);

                  const extraTests = tests.filter((t) => {
                    if (assignedIds.includes(t.id)) return false;
                    const val = rep.results?.[t.id];
                    return val !== undefined && val !== null && String(val).trim() !== "";
                  });

                  const repTests = [...assignedTests, ...extraTests];

                  return (
                    <div
                      key={rep.id}
                      style={{
                        border: "1.5px solid #eadde1",
                        borderRadius: "12px",
                        overflow: "hidden",
                        background: "#fff",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                      }}
                    >
                      {/* Visit Header */}
                      <div
                        style={{
                          background: "#faf5f6",
                          padding: "14px 18px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderBottom: "1px solid #eadde1",
                          flexWrap: "wrap",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontWeight: 800, color: "#5b0a1a", fontSize: 16 }}>
                              Visit #{patientReports.length - repIdx}: Report {rep.id}
                            </span>
                            <span
                              className={`badge ${
                                rep.status === "Completed" ? "active" : "inactive"
                              }`}
                              style={{
                                background: rep.status === "Completed" ? "#e6f7ec" : "#fff4e5",
                                color: rep.status === "Completed" ? "#0d7a36" : "#b76e00",
                                border: 0,
                                fontWeight: 700,
                              }}
                            >
                              {rep.status}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "#666", marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <span>📅 Date: <b>{rep.date}</b></span>
                            <span>👨‍⚕️ Doctor: <b>{rep.doctor || activePatient.referredBy || "Self"}</b></span>
                            <span>🧪 Tests Included: <b>{repTests.length}</b></span>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <Button
                            onClick={() => handlePrintHistoryReport(rep)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, padding: "6px 12px" }}
                          >
                            <Printer size={14} /> Print Report
                          </Button>
                          <Button
                            primary
                            onClick={() => navigate(`/reports?patient=${activePatient.id}`)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, padding: "6px 12px" }}
                          >
                            <Edit3 size={14} /> Result Entry
                          </Button>
                        </div>
                      </div>

                      {/* Tests Table for this Visit */}
                      <div className="tablewrap" style={{ margin: 0, border: 0 }}>
                        <table style={{ margin: 0 }}>
                          <thead>
                            <tr style={{ background: "#fff" }}>
                              <th style={{ width: 40 }}>#</th>
                              <th>Test Name</th>
                              <th>Category</th>
                              <th>Result Finding</th>
                              <th>Unit</th>
                              <th>Biological Ref Range</th>
                            </tr>
                          </thead>
                          <tbody>
                            {repTests.map((t, idx) => {
                              const val = rep.results?.[t.id] ?? "—";
                              const isAbnormal = getAbnormalFlag(val, t.reference, activePatient.gender);
                              return (
                                <tr key={t.id}>
                                  <td>{idx + 1}</td>
                                  <td>
                                    <b>{t.name}</b>
                                    <small>{t.id}</small>
                                  </td>
                                  <td>{t.category}</td>
                                  <td>
                                    <span
                                      style={{
                                        fontWeight: 800,
                                        fontSize: 14,
                                        color: isAbnormal ? "#c4183c" : "#222",
                                        background: isAbnormal ? "#ffeef1" : "transparent",
                                        padding: isAbnormal ? "2px 6px" : "0",
                                        borderRadius: 4,
                                      }}
                                    >
                                      {val}
                                    </span>
                                    {isAbnormal && (
                                      <span style={{ fontSize: 10, color: "#c4183c", fontWeight: 700, marginLeft: 6 }}>
                                        ★ ABNORMAL
                                      </span>
                                    )}
                                  </td>
                                  <td>{t.unit || "—"}</td>
                                  <td style={{ color: "#666", whiteSpace: "pre-line", lineHeight: "1.35" }}>{t.reference || "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <User size={48} color="#b9959e" style={{ marginBottom: 12 }} />
          <h3 style={{ color: "#5b0a1a" }}>No Patient Selected</h3>
          <p style={{ color: "#777", maxWidth: 400, margin: "0 auto 20px" }}>
            Search for a patient using their Mobile Number, Patient Name, or Patient ID above.
          </p>
          <Button primary onClick={() => navigate("/patients/new")}>
            <Plus size={16} /> Register New Patient
          </Button>
        </div>
      )}
    </>
  );
}

/* =========================================================
   PAGE: REPORTS WORKFLOW & VIEWER
   ========================================================= */

const CANONICAL_TEST_CATEGORIES = {
  // LIVER FUNCTION TEST
  "TST072": "Liver Function Test",
  "TST073": "Liver Function Test",
  "TST074": "Liver Function Test",
  "TST075": "Liver Function Test",
  "TST076": "Liver Function Test",
  "TST077": "Liver Function Test",
  "TST078": "Liver Function Test",
  "TST079": "Liver Function Test",
  "TST080": "Liver Function Test",
  "TST081": "Liver Function Test",
  "total bilirubin": "Liver Function Test",
  "direct bilirubin": "Liver Function Test",
  "indirect bilirubin": "Liver Function Test",
  "s g p t": "Liver Function Test",
  "sgpt": "Liver Function Test",
  "s g o t": "Liver Function Test",
  "sgot": "Liver Function Test",
  "alkaline phosphatase": "Liver Function Test",
  "total proteins": "Liver Function Test",
  "serum albumin": "Liver Function Test",
  "globulin": "Liver Function Test",
  "a/g ratio": "Liver Function Test",

  // LIPID PROFILE
  "TST082": "Lipid Profile",
  "TST083": "Lipid Profile",
  "TST084": "Lipid Profile",
  "TST085": "Lipid Profile",
  "TST086": "Lipid Profile",
  "TST087": "Lipid Profile",
  "TST088": "Lipid Profile",
  "lipid profile": "Lipid Profile",
  "total cholesterol": "Lipid Profile",
  "h d l cholesterol": "Lipid Profile",
  "hdl cholesterol": "Lipid Profile",
  "tryglycerides": "Lipid Profile",
  "triglycerides": "Lipid Profile",
  "l d l cholesterol": "Lipid Profile",
  "ldl cholesterol": "Lipid Profile",
  "v l d l cholesterol": "Lipid Profile",
  "vldl cholesterol": "Lipid Profile",
  "ldl/hdl": "Lipid Profile",

  // ELECTROLYTES
  "TST089": "Electrolytes",
  "TST090": "Electrolytes",
  "TST091": "Electrolytes",
  "TST092": "Electrolytes",
  "TST093": "Electrolytes",
  "electrolytes profile": "Electrolytes",
  "serum sodium": "Electrolytes",
  "serum potassium": "Electrolytes",
  "serum chloride": "Electrolytes",
  "serum calcium": "Electrolytes",

  // HBA1C
  "TST071": "HBA1C",
  "TST094": "HBA1C",
  "TST095": "HBA1C",
  "hba1c": "HBA1C",
  "glycosylated haemoglobin(hba1c)": "HBA1C",
  "glycosylated haemoglobin(hba1c):": "HBA1C",
  "mean blood glucose": "HBA1C",
};

function getTestCategory(t) {
  if (!t) return "Clinical Pathology";
  if (t.id && CANONICAL_TEST_CATEGORIES[t.id]) {
    return CANONICAL_TEST_CATEGORIES[t.id];
  }
  const nameKey = (t.name || "").toLowerCase().trim();
  if (CANONICAL_TEST_CATEGORIES[nameKey]) {
    return CANONICAL_TEST_CATEGORIES[nameKey];
  }
  return t.category || "Clinical Pathology";
}

const CLINICAL_CATEGORY_HEADERS = {
  "Clinical Pathology": "HAEMATOLOGY REPORT",
  "Hematology": "HAEMATOLOGY REPORT",
  "Haematology": "HAEMATOLOGY REPORT",
  "Bio Chemistry": "BIO-CHEMISTRY REPORT",
  "Biochemistry": "BIO-CHEMISTRY REPORT",
  "Urine Examinations": "COMPLETE URINE EXAMINATION REPORT",
  "Motion Examination": "MOTION EXAMINATION REPORT",
  "Semen Analysis": "SEMEN ANALYSIS REPORT",
  "Additional Tests": "SPECIAL INVESTIGATION REPORT",
  "Special Investigations": "SPECIAL INVESTIGATION REPORT",
  "Liver Function Test": "LIVER FUNCTION TEST",
  "LFT": "LIVER FUNCTION TEST",
  "Lipid Profile": "LIPID PROFILE",
  "Electrolytes": "ELECTROLYTES",
  "HBA1C": "HBA1C",
  "HbA1c": "HBA1C",
};

function formatCategoryHeader(categoryName) {
  if (!categoryName) return "LABORATORY INVESTIGATION REPORT";
  return CLINICAL_CATEGORY_HEADERS[categoryName] || `${categoryName.toUpperCase()} REPORT`;
}

const CLINICAL_TEST_CONFIG = {
  // Haematology
  "H.B.": {
    displayName: "Haemoglobin",
    method: "",
    unit: "gms %",
    referenceLines: [
      "Male: 14 - 17 gms %",
      "Females: 12 - 15 gms %",
      "Child : 11.0 - 14.0 gms %",
    ],
  },
  "Haemoglobin": {
    displayName: "Haemoglobin",
    method: "",
    unit: "gms %",
    referenceLines: [
      "Male: 14 - 17 gms %",
      "Females: 12 - 15 gms %",
      "Child : 11.0 - 14.0 gms %",
    ],
  },
  "Platelet Count": {
    displayName: "Platelet Count",
    method: "",
    unit: "Lakhs/cu.mm",
    referenceLines: ["1.5 - 4.5 Lakhs/cu.mm"],
  },
  "ESR": {
    displayName: "ESR",
    method: "",
    unit: "mm/1st hr",
    referenceLines: ["Male: 0 - 15, Female: 0 - 20 (Westergren)"],
  },
  "E.S.R.": {
    displayName: "ESR",
    method: "",
    unit: "mm/1st hr",
    referenceLines: ["Male: 0 - 15, Female: 0 - 20 (Westergren)"],
  },
  "MP": {
    displayName: "MP",
    method: "",
    unit: "Smear Examination",
    referenceLines: ["Negative / Not Seen"],
  },
  "Smear for MP": {
    displayName: "MP",
    method: "",
    unit: "Smear Examination",
    referenceLines: ["Negative / Not Seen"],
  },
  "Malarial Parasite": {
    displayName: "MP",
    method: "",
    unit: "Smear Examination",
    referenceLines: ["Negative / Not Seen"],
  },
  "TRBC": {
    displayName: "Total R.B.C. Count",
    method: "",
    unit: "mil/cu.mm",
    referenceLines: ["4.5 - 5.5 mil/cu.mm"],
  },
  "TWBC": {
    displayName: "Total W.B.C. Count",
    method: "",
    unit: "/cu.mm",
    referenceLines: ["4,000 - 11,000 /cu.mm"],
  },

  // Complete Urine Examination
  "Sugar": {
    displayName: "Sugar",
    method: "",
    unit: "Qualitative",
    referenceLines: ["Nil / Negative"],
  },
  "Urine Sugar": {
    displayName: "Sugar",
    method: "",
    unit: "Qualitative",
    referenceLines: ["Nil / Negative"],
  },
  "Albumin": {
    displayName: "Albumin",
    method: "",
    unit: "Qualitative",
    referenceLines: ["Nil / Negative"],
  },
  "Urine Albumin": {
    displayName: "Albumin",
    method: "",
    unit: "Qualitative",
    referenceLines: ["Nil / Negative"],
  },
  "Casts": {
    displayName: "Casts",
    method: "",
    unit: "/LPF",
    referenceLines: ["Not Seen / Nil"],
  },
  "Urine Casts": {
    displayName: "Casts",
    method: "",
    unit: "/LPF",
    referenceLines: ["Not Seen / Nil"],
  },

  // Bio-Chemistry
  "Urea": {
    displayName: "Blood Urea",
    method: "",
    unit: "mg/dl",
    referenceLines: ["10 - 45 mg/dl"],
  },
  "Blood Urea": {
    displayName: "Blood Urea",
    method: "",
    unit: "mg/dl",
    referenceLines: ["10 - 45 mg/dl"],
  },
  "Creatinine": {
    displayName: "Serum Creatinine",
    method: "( Method : jaffe's )",
    unit: "mg/dl",
    referenceLines: [
      "Male: 0.6 - 1.5 mg/dl",
      "Female: 0.6 - 1.2 mg/dl",
      "Children: 0.2 - 0.8 mg/dl",
    ],
  },
  "Serum Creatinine": {
    displayName: "Serum Creatinine",
    method: "( Method : jaffe's )",
    unit: "mg/dl",
    referenceLines: [
      "Male: 0.6 - 1.5 mg/dl",
      "Female: 0.6 - 1.2 mg/dl",
      "Children: 0.2 - 0.8 mg/dl",
    ],
  },
  "Serum Glucose (R)": {
    displayName: "Random Blood Sugar",
    method: "( Method : GOD-POD )",
    unit: "mg/dl",
    referenceLines: ["80 - 140 mg/dl"],
  },
  "Random Blood Sugar": {
    displayName: "Random Blood Sugar",
    method: "( Method : GOD-POD )",
    unit: "mg/dl",
    referenceLines: ["80 - 140 mg/dl"],
  },
  "Serum Glucose (F)": {
    displayName: "Fasting Blood Sugar",
    method: "( Method : GOD-POD )",
    unit: "mg/dl",
    referenceLines: ["70 - 110 mg/dl"],
  },
  "Fasting Blood Sugar": {
    displayName: "Fasting Blood Sugar",
    method: "( Method : GOD-POD )",
    unit: "mg/dl",
    referenceLines: ["70 - 110 mg/dl"],
  },
  "Serum Glucose (PP)": {
    displayName: "Post Prandial Blood Sugar",
    method: "( Method : GOD-POD )",
    unit: "mg/dl",
    referenceLines: ["Up to 140 mg/dl"],
  },
  "Post Prandial Blood Sugar": {
    displayName: "Post Prandial Blood Sugar",
    method: "( Method : GOD-POD )",
    unit: "mg/dl",
    referenceLines: ["Up to 140 mg/dl"],
  },
  "Cholesterol": {
    displayName: "Serum Cholesterol",
    method: "( Method : CHOD-PAP )",
    unit: "mg/dl",
    referenceLines: ["130 - 250 mg/dl"],
  },
  "Bilirubin Total": {
    displayName: "Serum Bilirubin (Total)",
    method: "( Method : Malloy & Evelyn )",
    unit: "mg/dl",
    referenceLines: ["0.2 - 1.2 mg/dl"],
  },

  // Special Investigation
  "Vitamin D": {
    displayName: "Vitamin D",
    method: "",
    unit: "ng/mL",
    referenceLines: ["Sufficiency: 30.0 - 100.0"],
  },
  "Vitamin B12": {
    displayName: "Vitamin B12",
    method: "",
    unit: "pg/mL",
    referenceLines: ["211 - 911"],
  },
  "Iron": {
    displayName: "Iron",
    method: "",
    unit: "µg/dL",
    referenceLines: ["Male: 65 - 175; Female: 50 - 170"],
  },
  "Serum Iron": {
    displayName: "Iron",
    method: "",
    unit: "µg/dL",
    referenceLines: ["Male: 65 - 175; Female: 50 - 170"],
  },
  "Thyroid": {
    displayName: "Thyroid",
    method: "",
    unit: "Various",
    referenceLines: ["TSH: 0.4 - 4.2 µIU/mL, T3/74: Normal"],
  },
  "Thyroid Profile": {
    displayName: "Thyroid",
    method: "",
    unit: "Various",
    referenceLines: ["TSH: 0.4 - 4.2 µIU/mL, T3/74: Normal"],
  },
  "HbA1c": {
    displayName: "HbA1c",
    method: "",
    unit: "%",
    referenceLines: ["Normal: < 5.7%, Diabetic: ≥ 6.5%"],
  },

  // LIVER FUNCTION TEST
  "Total Bilirubin": {
    displayName: "Total Bilirubin",
    method: "",
    unit: "mg/dl",
    referenceLines: ["0.1 - 1.2 mg/dl"],
  },
  "Direct Bilirubin": {
    displayName: "Direct Bilirubin",
    method: "",
    unit: "mg/dl",
    referenceLines: ["Up to 0.3 mg/dl"],
  },
  "Indirect Bilirubin": {
    displayName: "Indirect Bilirubin",
    method: "",
    unit: "mg/dl",
    referenceLines: ["0.1 - 0.8 mg/dl"],
  },
  "S G P T": {
    displayName: "S G P T",
    method: "",
    unit: "IU/L",
    referenceLines: ["Male: Up to 45 IU/L", "Female: Up to 34 IU/L"],
  },
  "SGPT": {
    displayName: "S G P T",
    method: "",
    unit: "IU/L",
    referenceLines: ["Male: Up to 45 IU/L", "Female: Up to 34 IU/L"],
  },
  "S G O T": {
    displayName: "S G O T",
    method: "",
    unit: "IU/L",
    referenceLines: ["Male : Up to 45 IU/L", "Female: Up to 37 IU/L"],
  },
  "SGOT": {
    displayName: "S G O T",
    method: "",
    unit: "IU/L",
    referenceLines: ["Male : Up to 45 IU/L", "Female: Up to 37 IU/L"],
  },
  "Alkaline Phosphatase": {
    displayName: "Alkaline Phosphatase",
    method: "",
    unit: "IU/L",
    referenceLines: ["44 - 147 IU/L"],
  },
  "Total Proteins": {
    displayName: "Total Proteins",
    method: "",
    unit: "gm/dl",
    referenceLines: ["6.4 - 8.3 gm/dl"],
  },
  "Serum Albumin": {
    displayName: "Serum Albumin",
    method: "",
    unit: "gm/dl",
    referenceLines: ["3.4 - 5.0 gm/dl"],
  },
  "Globulin": {
    displayName: "Globulin",
    method: "",
    unit: "gm/dl",
    referenceLines: ["2.5 - 3.5 gm/dl"],
  },
  "A/G Ratio": {
    displayName: "A/G Ratio",
    method: "",
    unit: "",
    referenceLines: ["1.0 - 2.1"],
  },

  // LIPID PROFILE
  "Total Cholesterol": {
    displayName: "Total Cholesterol",
    method: "",
    unit: "mg/dl",
    referenceLines: ["50 - 200 mg/dl"],
  },
  "H D L Cholesterol": {
    displayName: "H D L Cholesterol",
    method: "",
    unit: "mg/dl",
    referenceLines: ["30 - 70 mg/dl"],
  },
  "HDL Cholesterol": {
    displayName: "H D L Cholesterol",
    method: "",
    unit: "mg/dl",
    referenceLines: ["30 - 70 mg/dl"],
  },
  "Tryglycerides": {
    displayName: "Tryglycerides",
    method: "",
    unit: "mg/dl",
    referenceLines: ["50 - 160 mg/dl"],
  },
  "Triglycerides": {
    displayName: "Tryglycerides",
    method: "",
    unit: "mg/dl",
    referenceLines: ["50 - 160 mg/dl"],
  },
  "L D L Cholesterol": {
    displayName: "L D L Cholesterol",
    method: "",
    unit: "mg/dl",
    referenceLines: ["30 - 130 mg/dl"],
  },
  "LDL Cholesterol": {
    displayName: "L D L Cholesterol",
    method: "",
    unit: "mg/dl",
    referenceLines: ["30 - 130 mg/dl"],
  },
  "V L D L Cholesterol": {
    displayName: "V L D L Cholesterol",
    method: "",
    unit: "mg/dl",
    referenceLines: ["Up to 30 mg/dl"],
  },
  "VLDL Cholesterol": {
    displayName: "V L D L Cholesterol",
    method: "",
    unit: "mg/dl",
    referenceLines: ["Up to 30 mg/dl"],
  },
  "LDL/HDL": {
    displayName: "LDL/HDL",
    method: "",
    unit: "",
    referenceLines: ["Up to 3.5"],
  },

  // ELECTROLYTES
  "Serum Sodium": {
    displayName: "Serum Sodium",
    method: "( Method: ISE Indirect )",
    unit: "mmol/L",
    referenceLines: ["135 - 150 mmol/L"],
  },
  "Serum Potassium": {
    displayName: "Serum Potassium",
    method: "( Method: ISE Indirect )",
    unit: "mmol/L",
    referenceLines: ["3.5 - 5.0 mmol/L"],
  },
  "Serum Chloride": {
    displayName: "Serum Chloride",
    method: "( Method: ISE Indirect )",
    unit: "mmol/L",
    referenceLines: ["94 - 110 mmol/L"],
  },
  "Serum Calcium": {
    displayName: "Serum Calcium",
    method: "( Method: Arsenazo-111 )",
    unit: "mg/dl",
    referenceLines: ["8.6 - 10.2 mg/dl"],
  },

  // HBA1C
  "Glycosylated Haemoglobin(HBA1C)": {
    displayName: "Glycosylated Haemoglobin(HBA1C):",
    method: "( Method: Fluorescence Immuno Assay )",
    unit: "%",
    referenceLines: [
      "Non Diabetic : 4.0 - 6.0 %",
      "Good Control : 6.0 - 7.0 %",
      "Fair Control : 7.0 - 8.0 %",
      "Poor Control : > 8.0 %",
    ],
  },
  "Glycosylated Haemoglobin(HBA1C):": {
    displayName: "Glycosylated Haemoglobin(HBA1C):",
    method: "( Method: Fluorescence Immuno Assay )",
    unit: "%",
    referenceLines: [
      "Non Diabetic : 4.0 - 6.0 %",
      "Good Control : 6.0 - 7.0 %",
      "Fair Control : 7.0 - 8.0 %",
      "Poor Control : > 8.0 %",
    ],
  },
  "Mean Blood Glucose": {
    displayName: "Mean Blood Glucose",
    method: "",
    unit: "mg/dl",
    referenceLines: ["70 - 126 mg/dl"],
  },
};

function formatLabDate(dateStr) {
  if (!dateStr) return "21-Sep-2026";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mon = months[d.getMonth()];
    const yr = d.getFullYear();
    return `${day}-${mon}-${yr}`;
  } catch {
    return dateStr;
  }
}

function Reports({ onToast, navigate, route }) {
  const [patients, setPatients] = useStoredData(STORAGE.patients, DEFAULT_PATIENTS);
  const [showManageTestsModal, setShowManageTestsModal] = useState(false);
  const [tests] = useStoredData(STORAGE.tests, DEFAULT_TESTS);
  const [reports, setReports] = useStoredData(STORAGE.reports, DEFAULT_REPORTS);
  const [settings] = useStoredData(STORAGE.settings, {
    labName: "TAZ DIAGNOSTIC",
    phone: "9440985131",
    email: "tazdiagnostic@gmail.com",
    address: "Dr No: 8-200 RAJKUMAR SILKS, Near Raj Kumar Silks Street, Main Road, Tallapudi, Rajahmundry-534341, Andhra Pradesh",
    footerNote: "This report is generated electronically.",
  });

  function handleSavePatientTests(newTestIds) {
    if (!patient) return;
    const updatedPatients = patients.map((p) =>
      p.id === patient.id ? { ...p, tests: newTestIds } : p
    );
    setPatients(updatedPatients);
    write(STORAGE.patients, updatedPatients);

    // Update bill in STORAGE.bills
    const allTests = read(STORAGE.tests, DEFAULT_TESTS);
    const newBillTotal = allTests
      .filter((t) => newTestIds.includes(t.id))
      .reduce((sum, t) => sum + Number(t.price || 0), 0);

    const curBills = read(STORAGE.bills, DEFAULT_BILLS);
    const updatedBills = curBills.map((b) =>
      b.patientId === patient.id ? { ...b, amount: newBillTotal } : b
    );
    write(STORAGE.bills, updatedBills);

    setShowManageTestsModal(false);
    onToast(
      `Tests updated for ${patient.name}! Now enrolled in ${newTestIds.length} test(s).`,
      "success"
    );
  }

  const [filterTab, setFilterTab] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Sync patient query param from route or window.location
  useEffect(() => {
    const qStr = route && route.includes("?") ? route.split("?")[1] : window.location.search;
    const params = new URLSearchParams(qStr);
    const pId = params.get("patient");
    if (pId) {
      const match = reports.find((r) => r.patientId === pId);
      if (match) {
        setSelectedReport(match.id);
      } else {
        const pat = patients.find((p) => p.id === pId);
        if (pat) {
          const newId = nextId("REP", reports);
          const newEntry = {
            id: newId,
            patientId: pat.id,
            doctor: pat.referredBy || "Self",
            date: today(),
            status: "Pending",
            results: {},
          };
          const next = [newEntry, ...reports];
          setReports(next);
          write(STORAGE.reports, next);
          setSelectedReport(newId);
          onToast(`Created new Report ${newId} for ${pat.name}!`);
        }
      }
    }
  }, [route]);

  const initialReportId = useMemo(() => {
    const qStr = route && route.includes("?") ? route.split("?")[1] : window.location.search;
    const params = new URLSearchParams(qStr);
    const pId = params.get("patient");
    if (pId) {
      const match = reports.find((r) => r.patientId === pId);
      if (match) return match.id;
    }
    return reports[0]?.id || "";
  }, [route, reports]);

  const [selectedReport, setSelectedReport] = useState(initialReportId);
  const [showCreateReport, setShowCreateReport] = useState(false);
  const [newReportPatientId, setNewReportPatientId] = useState("");

  const filteredReports = useMemo(() => {
    let list = reports;
    if (filterTab === "Pending") list = list.filter((r) => r.status !== "Completed");
    if (filterTab === "Completed") list = list.filter((r) => r.status === "Completed");

    const q = searchTerm.toLowerCase().trim();
    if (!q) return list;

    return list.filter((item) => {
      const p = patients.find((pat) => pat.id === item.patientId);
      return (
        item.id.toLowerCase().includes(q) ||
        (item.patientId && item.patientId.toLowerCase().includes(q)) ||
        (p?.name && p.name.toLowerCase().includes(q)) ||
        (p?.phone && p.phone.toLowerCase().includes(q)) ||
        (p?.id && p.id.toLowerCase().includes(q)) ||
        (item.doctor && item.doctor.toLowerCase().includes(q))
      );
    });
  }, [reports, filterTab, searchTerm, patients]);

  useEffect(() => {
    if (filteredReports.length > 0) {
      const exists = filteredReports.some((r) => r.id === selectedReport);
      if (!exists) {
        setSelectedReport(filteredReports[0].id);
      }
    }
  }, [filterTab, filteredReports, selectedReport]);

  const report = reports.find((r) => r.id === selectedReport);
  const patient = patients.find((p) => p.id === report?.patientId);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const q = searchTerm.toLowerCase().trim();
    if (!q) return;

    if (filteredReports.length > 0) {
      setSelectedReport(filteredReports[0].id);
      const p = patients.find((pat) => pat.id === filteredReports[0].patientId);
      onToast(`Loaded report ${filteredReports[0].id} for ${p?.name || "patient"}!`);
      return;
    }

    const matchReport = reports.find((item) => {
      const p = patients.find((pat) => pat.id === item.patientId);
      return (
        item.id.toLowerCase().includes(q) ||
        (item.patientId && item.patientId.toLowerCase().includes(q)) ||
        (p?.name && p.name.toLowerCase().includes(q)) ||
        (p?.phone && p.phone.toLowerCase().includes(q)) ||
        (p?.id && p.id.toLowerCase().includes(q))
      );
    });

    if (matchReport) {
      setSelectedReport(matchReport.id);
      const p = patients.find((pat) => pat.id === matchReport.patientId);
      onToast(`Loaded report ${matchReport.id} for ${p?.name || "patient"}!`);
      return;
    }

    const matchPatient = patients.find(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.toLowerCase().includes(q))
    );

    if (matchPatient) {
      const newId = nextId("REP", reports);
      const newEntry = {
        id: newId,
        patientId: matchPatient.id,
        doctor: matchPatient.referredBy || "Self",
        date: today(),
        status: "Pending",
        results: {},
      };
      const next = [newEntry, ...reports];
      setReports(next);
      write(STORAGE.reports, next);
      setSelectedReport(newId);
      onToast(`Created new Report ${newId} for ${matchPatient.name}!`);
    } else {
      onToast(`No patient or report found matching "${searchTerm}".`, "warning");
    }
  };

  const CLINICAL_GROUPS = [
    "Clinical Pathology",
    "Urine Examinations",
    "Bio Chemistry",
    "Liver Function Test",
    "Lipid Profile",
    "Electrolytes",
    "HBA1C",
    "Motion Examination",
    "Semen Analysis",
    "Additional Tests",
  ];

  const [activeGroupPage, setActiveGroupPage] = useState("All");
  const [sheetScope, setSheetScope] = useState("prescribed");
  const [panelMode, setPanelMode] = useState("ordered");
  const [resultFilterCategory, setResultFilterCategory] = useState("All");
  const [resultScope, setResultScope] = useState("prescribed");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const selectedTests = patient
    ? tests.filter((test) => patient.tests?.includes(test.id))
    : [];

  const availableGroups = useMemo(() => {
    if (sheetScope === "prescribed" || panelMode === "ordered") {
      if (patient?.tests?.length) {
        const active = CLINICAL_GROUPS.filter((grp) =>
          tests.some((t) => getTestCategory(t) === grp && patient.tests.includes(t.id))
        );
        return active.length ? active : [CLINICAL_GROUPS[0]];
      }
    }
    return CLINICAL_GROUPS;
  }, [sheetScope, panelMode, patient, tests]);

  const displayedGroups = useMemo(() => {
    if (activeGroupPage === "All") return availableGroups;
    if (availableGroups.includes(activeGroupPage)) return [activeGroupPage];
    return availableGroups;
  }, [activeGroupPage, availableGroups]);

  // Build continuous pages based on selected/assigned tests and their entered results
  const continuousReportData = useMemo(() => {
    if (!report || !patient) return { pages: [], totalTests: 0 };

    // 1. All tests assigned to patient in order:
    const assignedIds = patient.tests || [];
    const assignedTests = assignedIds
      .map((id) => tests.find((t) => t.id === id))
      .filter(Boolean);

    // 2. Extra tests that have results:
    const extraTests = tests.filter((t) => {
      if (assignedIds.includes(t.id)) return false;
      const val = report.results?.[t.id];
      return val !== undefined && val !== null && String(val).trim() !== "";
    });

    const combinedTests = [...assignedTests, ...extraTests];

    // 3. Keep all prescribed tests for patient (+ extra tests that have results) when panelMode === "ordered", or all tests when panelMode === "full"
    const activeTests = (panelMode === "full"
      ? tests
      : combinedTests
    );

    if (activeTests.length === 0) {
      return {
        pages: [
          {
            pageNumber: 1,
            items: [],
            isFirstPage: true,
          },
        ],
        totalTests: 0,
      };
    }

    // 4. Normalize category on all active tests & filter out package placeholder headers (unit === 'Profile') when individual tests exist
    const hasIndividualLipid = activeTests.some((t) => ["TST083", "TST084", "TST085", "TST086", "TST087", "TST088"].includes(t.id));
    const hasIndividualElectrolytes = activeTests.some((t) => ["TST090", "TST091", "TST092", "TST093"].includes(t.id));

    const normalizedActiveTests = activeTests
      .filter((t) => {
        if (t.id === "TST082" && hasIndividualLipid) return false;
        if (t.id === "TST089" && hasIndividualElectrolytes) return false;
        return true;
      })
      .map((t) => ({
        ...t,
        category: getTestCategory(t),
      }));

    // 5. Group tests strictly by canonical CLINICAL_GROUPS category order so every test appears under its own heading
    const categoryOrderMap = new Map(CLINICAL_GROUPS.map((grp, idx) => [grp, idx]));
    const groupedTests = [...normalizedActiveTests].sort((a, b) => {
      const orderA = categoryOrderMap.has(a.category) ? categoryOrderMap.get(a.category) : 999;
      const orderB = categoryOrderMap.has(b.category) ? categoryOrderMap.get(b.category) : 999;
      return orderA - orderB;
    });

    // 6. Create an item stream with category group headers
    const itemStream = [];
    let lastCategory = null;

    groupedTests.forEach((t) => {
      if (t.category && t.category !== lastCategory) {
        lastCategory = t.category;
        itemStream.push({ type: "category", categoryName: lastCategory });
      }
      itemStream.push({ type: "test", test: t });
    });

    // 7. Intelligent auto-cut pagination
    // Page 1 capacity: 20 row units (Clinical Pathology + Urine fit cleanly; overflow flows to Page 2, Page 3, etc.)
    // Subsequent pages capacity: 24 row units
    const PAGE_1_CAP = 20;
    const SUB_PAGE_CAP = 24;

    const pages = [];
    let currentPageItems = [];
    let currentUnits = 0;
    let pageNum = 1;
    let maxCap = PAGE_1_CAP;

    itemStream.forEach((item) => {
      const isCat = item.type === "category";
      const isOrphanCat = isCat && (currentUnits + 2 > maxCap);

      if ((currentUnits + 1 > maxCap || isOrphanCat) && currentPageItems.length > 0) {
        pages.push({
          pageNumber: pageNum,
          items: currentPageItems,
          isFirstPage: pageNum === 1,
        });
        pageNum++;
        currentPageItems = [];
        currentUnits = 0;
        maxCap = SUB_PAGE_CAP;
      }

      currentPageItems.push(item);
      currentUnits += 1;
    });

    if (currentPageItems.length > 0) {
      pages.push({
        pageNumber: pageNum,
        items: currentPageItems,
        isFirstPage: pageNum === 1,
      });
    }

    return { pages, totalTests: groupedTests.length };
  }, [report, patient, tests, panelMode]);

  const { pages: continuousPages, totalTests } = continuousReportData;
  const totalPages = continuousPages.length || 1;

  const displayedPages = useMemo(() => {
    if (activeGroupPage === "All") return continuousPages;
    return continuousPages.filter((p) => String(p.pageNumber) === activeGroupPage);
  }, [activeGroupPage, continuousPages]);

  const resultTests = useMemo(() => {
    const base =
      resultScope === "prescribed" && selectedTests.length
        ? selectedTests
        : tests;
    if (resultFilterCategory === "All") return base;
    return base.filter((t) => getTestCategory(t) === resultFilterCategory);
  }, [resultScope, selectedTests, tests, resultFilterCategory]);

  function updateResult(testId, value) {
    if (!report) return;
    const next = reports.map((item) =>
      item.id === report.id
        ? {
            ...item,
            results: {
              ...item.results,
              [testId]: value,
            },
            status: "In Progress",
          }
        : item
    );
    setReports(next);
    write(STORAGE.reports, next);
  }

  function completeReport() {
    if (!report) return;
    const next = reports.map((item) =>
      item.id === report.id ? { ...item, status: "Completed" } : item
    );
    setReports(next);
    write(STORAGE.reports, next);
    onToast(`Report ${report.id} marked as Completed!`);
  }

  function sendReportReadyMessage() {
    if (!patient || !report) return;
    const currentMessages = read(STORAGE.messages, DEFAULT_MESSAGES);
    const newMsg = {
      id: nextId("MSG", currentMessages),
      patient: patient.name,
      phone: patient.phone,
      channel: "WhatsApp",
      type: "Report Ready",
      message: `Dear ${patient.name}, your laboratory report (${report.id}) is now ready at ${settings.labName}. Thank you!`,
      date: today(),
      status: "Sent",
    };
    write(STORAGE.messages, [...currentMessages, newMsg]);
    onToast(`Report notification dispatched to ${patient.name} via WhatsApp!`);
  }

  function printReport() {
    if (!report || !patient) {
      window.print();
      return;
    }
    const patName = (patient.name || "Patient").replace(/\s+/g, "_");
    const repCode = report.id || "REP";
    const originalTitle = document.title;
    document.title = `TAZ_Diagnostic_Report_${patient.id}_${patName}_${repCode}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  }

  async function saveAsPdf() {
    if (!report || !patient) {
      onToast("Please select a valid report first.", "warning");
      return;
    }

    const sheetElements = Array.from(document.querySelectorAll(".paper.report-sheet"));
    if (sheetElements.length === 0) {
      onToast("No report pages found to export.", "error");
      return;
    }

    const patName = (patient.name || "Patient").replace(/[^a-zA-Z0-9]/g, "_");
    const repCode = String(report.id || "REP").replace(/[^a-zA-Z0-9]/g, "_");
    const safeFileName = `TAZ_Report_${patName}_${repCode}`;

    setIsGeneratingPdf(true);
    onToast(`Opening PDF print dialog (${sheetElements.length} page${sheetElements.length > 1 ? "s" : ""})...`, "info");

    try {
      // Collect all styles from the current document
      const styleSheets = Array.from(document.styleSheets)
        .map((ss) => {
          try {
            return Array.from(ss.cssRules || []).map((r) => r.cssText).join("\n");
          } catch {
            // Cross-origin stylesheets — skip
            return "";
          }
        })
        .join("\n");

      // Collect all sheet HTML
      const pagesHtml = sheetElements.map((el) => el.outerHTML).join("\n");

      const printWindow = window.open("", "_blank", "width=900,height=700");
      if (!printWindow) {
        onToast("Popup blocked! Please allow popups for this site, then try again.", "error");
        setIsGeneratingPdf(false);
        return;
      }

      printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${safeFileName}</title>
  <style>
    ${styleSheets}

    /* ── Print / PDF overrides ── */
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }

    body { margin: 0; padding: 0; background: #fff; }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    /* Each sheet = one A4 page */
    .paper.report-sheet {
      width: 210mm !important;
      min-height: 297mm !important;
      max-height: 297mm !important;
      overflow: hidden !important;
      page-break-after: always !important;
      break-after: page !important;
      box-sizing: border-box !important;
      box-shadow: none !important;
      margin: 0 !important;
      padding: 8mm 14mm 10mm 14mm !important;
      border: none !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: flex-start !important;
      background: #ffffff !important;
    }

    .paper.report-sheet:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    .report-sheet-bottom {
      margin-top: auto !important;
    }

    .taz-clean-header,
    .taz-clean-patient-card,
    .taz-clean-status-pill,
    .taz-clean-green-icon,
    .taz-clean-table,
    .taz-clean-footer {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* No screen-only chrome */
    .no-print, .report-toolbar, .sidebar, .topbar,
    nav, header.app-header, .app-sidebar, button, .btn { display: none !important; }
  </style>
</head>
<body>
  ${pagesHtml}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 600);
    };
  <\/script>
</body>
</html>`);

      printWindow.document.close();
      onToast(`PDF dialog opened — choose "Save as PDF" in the print dialog and name it: ${safeFileName}`, "success");
    } catch (err) {
      console.error("PDF generation failed:", err);
      onToast("Failed to open PDF window. Check popup permissions.", "error");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  function createNewReport(e) {
    e.preventDefault();
    if (!newReportPatientId) return;

    const pat = patients.find((p) => p.id === newReportPatientId);
    const newId = nextId("REP", reports);
    const newEntry = {
      id: newId,
      patientId: newReportPatientId,
      doctor: pat?.referredBy || "Self",
      date: today(),
      status: "Pending",
      results: {},
    };

    const next = [newEntry, ...reports];
    setReports(next);
    write(STORAGE.reports, next);
    setSelectedReport(newId);
    setShowCreateReport(false);
    onToast(`New report ${newId} generated for ${pat?.name}!`);
  }

  function deleteReport(id) {
    if (!confirm("Are you sure you want to delete this report?")) return;
    const next = reports.filter((r) => r.id !== id);
    setReports(next);
    write(STORAGE.reports, next);
    if (selectedReport === id) {
      setSelectedReport(next[0]?.id || "");
    }
    onToast("Report deleted.");
  }

  return (
    <>
      <PageHeader
        title="Diagnostic Reports"
        subtitle="Record test findings, verify reference limits, and print authorized reports."
      >
        <Button onClick={() => setShowCreateReport(true)}>
          <Plus size={16} /> New Report
        </Button>
        <Button
          onClick={() => {
            if (!patient) {
              onToast("Please select a report first to manage tests.", "warning");
              return;
            }
            setShowManageTestsModal(true);
          }}
          style={{
            background: "#0e5a3a",
            color: "#ffffff",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontWeight: 700,
          }}
        >
          <FlaskConical size={16} /> + Add / Manage Tests
        </Button>
        <Button
          primary
          disabled={isGeneratingPdf}
          onClick={saveAsPdf}
          style={{
            background: "#7a1126",
            color: "#ffffff",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            opacity: isGeneratingPdf ? 0.75 : 1,
            cursor: isGeneratingPdf ? "not-allowed" : "pointer",
          }}
        >
          {isGeneratingPdf ? (
            <>
              <RefreshCw size={16} className="spin" /> Generating PDF...
            </>
          ) : (
            <>
              <Download size={16} /> Save into PDF
            </>
          )}
        </Button>
        <Button onClick={printReport} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Printer size={16} /> Print Report
        </Button>
      </PageHeader>

      <div className="reportmeta">
        <div>
          <b>Total Reports</b>
          <span>{reports.length}</span>
        </div>
        <div>
          <b>Completed</b>
          <span>{reports.filter((r) => r.status === "Completed").length}</span>
        </div>
        <div>
          <b>Pending</b>
          <span>{reports.filter((r) => r.status !== "Completed").length}</span>
        </div>
        <div>
          <b>Selected</b>
          <span>{report?.id || "None"}</span>
        </div>
      </div>

      <div className="tabs">
        {["All", "Pending", "Completed"].map((tab) => (
          <button
            type="button"
            key={tab}
            className={`tab ${filterTab === tab ? "active" : ""}`}
            onClick={() => setFilterTab(tab)}
          >
            {tab} Reports
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="toolbar" style={{ gap: "12px", flexWrap: "wrap" }}>
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px", flex: 1, minWidth: "280px" }}>
            <div className="search" style={{ flex: 1, margin: 0 }}>
              <Search size={17} />
              <input
                placeholder="Search patient name, phone (e.g. 9441906474), ID, or Report ID..."
                value={searchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchTerm(val);
                  const q = val.toLowerCase().trim();
                  if (q) {
                    const found = reports.find((item) => {
                      const p = patients.find(
                        (patientItem) => patientItem.id === item.patientId
                      );
                      return (
                        item.id.toLowerCase().includes(q) ||
                        (item.patientId && item.patientId.toLowerCase().includes(q)) ||
                        (p?.name && p.name.toLowerCase().includes(q)) ||
                        (p?.phone && p.phone.toLowerCase().includes(q)) ||
                        (p?.id && p.id.toLowerCase().includes(q))
                      );
                    });
                    if (found) setSelectedReport(found.id);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearchSubmit(e);
                  }
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  style={{ border: 0, background: "transparent", cursor: "pointer", color: "#888" }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <Button primary type="submit" style={{ padding: "0 16px", whiteSpace: "nowrap" }}>
              Find Report
            </Button>
          </form>

          <select
            className="smallselect"
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
            style={{ minWidth: "260px" }}
          >
            {filteredReports.map((item) => {
              const p = patients.find(
                (patientItem) => patientItem.id === item.patientId
              );
              return (
                <option key={item.id} value={item.id}>
                  {item.id} — {p?.name || "Unknown"} {p?.phone ? `(${p.phone})` : ""} [{item.status}]
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {report && patient ? (
        <>
          {/* RESULT ENTRY FORM */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="sectiontitle">
              <FileText />
              <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h3>Result Entry — {patient.name} ({report.id})</h3>
                  <p>Input and modify test values. Reference values are populated from Test Master.</p>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <Button
                    onClick={() => setShowManageTestsModal(true)}
                    style={{
                      background: "#0e5a3a",
                      color: "#ffffff",
                      fontSize: "11px",
                      padding: "4px 10px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontWeight: 700,
                    }}
                  >
                    <FlaskConical size={14} /> + Add / Manage Tests ({selectedTests.length})
                  </Button>
                  <button
                    type="button"
                    className={`tab ${resultScope === "all" ? "active" : ""}`}
                    style={{ padding: "4px 10px", fontSize: "11px" }}
                    onClick={() => setResultScope("all")}
                  >
                    All 71 Tests
                  </button>
                  <button
                    type="button"
                    className={`tab ${resultScope === "prescribed" ? "active" : ""}`}
                    style={{ padding: "4px 10px", fontSize: "11px" }}
                    onClick={() => setResultScope("prescribed")}
                  >
                    Prescribed Only ({selectedTests.length})
                  </button>
                  <button
                    type="button"
                    title="Delete Report"
                    className="btn danger"
                    onClick={() => deleteReport(report.id)}
                    style={{ padding: "5px 9px", fontSize: "11px" }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>

            {/* Department Filter Tabs for Result Entry */}
            <div className="tabs" style={{ marginBottom: "12px", flexWrap: "wrap" }}>
              {["All", ...CLINICAL_GROUPS].map((cat) => (
                <button
                  type="button"
                  key={cat}
                  className={`tab ${resultFilterCategory === cat ? "active" : ""}`}
                  style={{ fontSize: "11px", padding: "4px 10px" }}
                  onClick={() => setResultFilterCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="tablewrap">
              <table className="resulttable">
                <thead>
                  <tr>
                    <th>Test Name</th>
                    <th>Category</th>
                    <th>Result Value</th>
                    <th>Unit</th>
                    <th>Reference Range</th>
                  </tr>
                </thead>
                <tbody>
                  {resultTests.map((test) => {
                    const val = report.results?.[test.id] || "";
                    return (
                      <tr key={test.id}>
                        <td>
                          <b>{test.name}</b>
                          <small>{test.id}</small>
                        </td>
                        <td>{test.category}</td>
                        <td style={{ width: 170 }}>
                          <input
                            value={val}
                            placeholder="Enter result..."
                            onChange={(e) =>
                              updateResult(test.id, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const inputs = Array.from(document.querySelectorAll(".resulttable input"));
                                const idx = inputs.indexOf(e.target);
                                if (idx > -1 && idx + 1 < inputs.length) {
                                  inputs[idx + 1].focus();
                                  inputs[idx + 1].select?.();
                                }
                              }
                            }}
                          />
                        </td>
                        <td>{test.unit}</td>
                        <td style={{ whiteSpace: "pre-line", lineHeight: "1.35", minWidth: 150 }}>{test.reference || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="formactions">
              <Button onClick={() => onToast("Draft values preserved.")}>
                Save As Draft
              </Button>
              <Button onClick={sendReportReadyMessage}>
                <MessageSquare size={16} /> Notify Patient (WhatsApp)
              </Button>
              <Button primary onClick={completeReport}>
                <Check size={16} /> Mark Report Completed
              </Button>
            </div>
          </div>

          {/* PRINTABLE LAB REPORT (EXACTLY 1 GROUP PER SEPARATE A4 PAGE — XEROX READY) */}
          <div className="card report-print">
            <div className="a4-toolbar no-print">
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <div className="a4-badge">
                  <FileText size={16} /> Separate A4 Department Sheets (210 × 297 mm)
                </div>
                <span style={{ fontSize: "11px", color: "#6e5962" }}>
                  Exactly 1 Group on 1 Separate A4 Page · Ready for Xerox / Photocopy Printing
                </span>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <select
                  className="smallselect"
                  value={sheetScope}
                  onChange={(e) => {
                    setSheetScope(e.target.value);
                    setActiveGroupPage("All");
                  }}
                  style={{ padding: "5px 8px", fontSize: "11px", fontWeight: 600 }}
                >
                  <option value="prescribed">Patient Active Departments Only</option>
                  <option value="all-6">All 6 Department Sheets (Blank Master Xerox)</option>
                </select>

                <select
                  className="smallselect"
                  value={panelMode}
                  onChange={(e) => setPanelMode(e.target.value)}
                  style={{ padding: "5px 8px", fontSize: "11px", fontWeight: 600 }}
                >
                  <option value="ordered">Selected Tests Only (Nothing Else)</option>
                  <option value="full">All Department Tests (Blank Fill-in Master)</option>
                </select>

                <button
                  type="button"
                  className="btn primary"
                  disabled={isGeneratingPdf}
                  onClick={saveAsPdf}
                  style={{
                    padding: "7px 16px",
                    fontSize: "12px",
                    background: "#7a1126",
                    color: "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    fontWeight: 700,
                    opacity: isGeneratingPdf ? 0.75 : 1,
                    cursor: isGeneratingPdf ? "not-allowed" : "pointer",
                  }}
                >
                  {isGeneratingPdf ? (
                    <>
                      <RefreshCw size={15} className="spin" /> Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download size={15} /> Save into PDF ({totalPages} A4 {totalPages === 1 ? "Page" : "Pages"})
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn"
                  onClick={printReport}
                  style={{
                    padding: "7px 16px",
                    fontSize: "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                  }}
                >
                  <Printer size={15} /> Print Xerox Sheets
                </button>
              </div>
            </div>

            {/* Continuous Page Navigation Tabs */}
            <div className="tabs no-print" style={{ width: "210mm", maxWidth: "100%", marginBottom: "18px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                className={`tab ${activeGroupPage === "All" ? "active" : ""}`}
                onClick={() => setActiveGroupPage("All")}
              >
                All Pages ({totalPages} {totalPages === 1 ? "Sheet" : "Sheets"})
              </button>
              {continuousPages.map((pg) => (
                <button
                  type="button"
                  key={pg.pageNumber}
                  className={`tab ${activeGroupPage === String(pg.pageNumber) ? "active" : ""}`}
                  onClick={() => setActiveGroupPage(String(pg.pageNumber))}
                >
                  Page {pg.pageNumber} of {totalPages}
                </button>
              ))}

              <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#6b1426", fontWeight: 700, padding: "4px 10px", background: "#fdf4f6", borderRadius: "14px", border: "1px solid #ebd3da" }}>
                <Check size={14} color="#16764f" /> {totalTests} Tests · Continuous Auto-Pagination
              </div>
            </div>

            {/* A4 REPORT SHEETS CONTAINER */}
            <div className="report-sheets-container">
              {continuousPages.length === 0 ? (
                <div className="card empty" style={{ maxWidth: "210mm", margin: "40px auto", padding: "40px", textAlign: "center" }}>
                  <h3 style={{ color: "#5b0a1a", marginBottom: "8px" }}>No Results Entered Yet</h3>
                  <p style={{ color: "#666", fontSize: "13px" }}>
                    Enter test result values in the Result Entry form above, then the report pages will appear here automatically.
                  </p>
                </div>
              ) : (
                displayedPages.map(({ pageNumber, items, isFirstPage }) => {
                  const isLastPage = pageNumber === totalPages;

                  return (
                    <div
                      key={`page-${pageNumber}`}
                      style={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <div className="sheet-page-tag no-print">
                        <span>PAGE {pageNumber} OF {totalPages}</span>
                        <strong>{isFirstPage ? "INITIAL SHEET — CLINICAL DIAGNOSTIC REPORT" : "CONTINUATION SHEET"}</strong>
                        <span>{items.filter((i) => i.type === "test").length} Test Parameters</span>
                      </div>

                      <div
                        className="paper report-sheet"
                        id={`sheet-page-${pageNumber}`}
                        style={{ pageBreakAfter: !isLastPage ? "always" : "avoid" }}
                      >
                        {/* Top Section: Lab Header + Demographics / Continuation Header + Table */}
                        <div className="report-sheet-top">
                          {isFirstPage ? (
                            <>
                              {/* PAGE NUMBER (TOP RIGHT) */}
                              <div className="taz-clean-top-page">
                                PAGE {pageNumber} OF {totalPages}
                              </div>

                              {/* 3-COLUMN HEADER: LOGO/BRAND | CONTACT | TRUST */}
                              <div className="taz-clean-header">
                                {/* Left: Brand Logo & Title */}
                                <div className="taz-clean-brand-col">
                                  <div className="taz-clean-logo-badge">
                                    <svg viewBox="0 0 100 100" className="taz-clean-logo-svg">
                                      {/* Leaf wreath and crescent */}
                                      <path d="M 22 75 C 10 65 6 45 14 30 C 18 22 26 15 36 10 C 33 18 33 28 38 36 C 42 42 49 46 56 46 C 48 48 38 52 30 58 C 24 63 22 69 22 75 Z" fill="#2d6a4f" opacity="0.9" />
                                      <path d="M 16 48 C 10 38 12 25 22 17 C 22 25 26 32 32 37 C 26 40 20 43 16 48 Z" fill="#40916c" />
                                      <path d="M 12 62 C 6 54 8 42 16 36 C 16 44 20 50 26 54 C 20 56 15 58 12 62 Z" fill="#52b788" />
                                      {/* Base of microscope */}
                                      <path d="M 32 82 L 68 82 C 70 82 72 80 72 78 L 28 78 C 28 80 30 82 32 82 Z" fill="#1b4332" />
                                      <path d="M 44 78 L 56 78 L 56 72 L 44 72 Z" fill="#1b4332" />
                                      {/* Curved arm */}
                                      <path d="M 54 72 C 66 70 74 58 72 44 C 70 34 62 26 50 26 L 48 26 L 48 32 L 50 32 C 58 32 64 38 65 46 C 66 54 60 62 52 64 L 50 64 L 50 72 Z" fill="#2d6a4f" />
                                      {/* Body tube and eyepiece */}
                                      <g transform="rotate(-30 45 42)">
                                        <rect x="42" y="14" width="10" height="6" rx="1.5" fill="#1b4332" />
                                        <rect x="44.5" y="20" width="5" height="10" fill="#2d6a4f" />
                                        <rect x="40" y="30" width="14" height="26" rx="2" fill="#1b4332" />
                                        <path d="M 42 56 L 52 56 L 50 64 L 44 64 Z" fill="#40916c" />
                                        <rect x="45" y="64" width="4" height="8" rx="1" fill="#1b4332" />
                                      </g>
                                      {/* Stage */}
                                      <rect x="34" y="60" width="24" height="4" rx="1" fill="#1b4332" />
                                      <circle cx="58" cy="52" r="3.5" fill="#40916c" />
                                      <circle cx="46" cy="70" r="3" fill="#74c69d" />
                                    </svg>
                                  </div>

                                  <div className="taz-clean-brand-text">
                                    <div className="taz-clean-title-main">TAZ</div>
                                    <div className="taz-clean-title-sub">DIAGNOSTIC</div>
                                    <div className="taz-clean-title-desc">{settings.subTitle || "LABORATORY & DIAGNOSTIC CENTRE"}</div>
                                    <div className="taz-clean-title-accred">NABL ACCREDITED MEDICAL LAB &nbsp;|&nbsp; ISO 9001:2015</div>
                                  </div>
                                </div>

                                {/* Center: Contact Info */}
                                <div className="taz-clean-contact-col">
                                  <div className="taz-clean-contact-row">
                                    <Phone size={13} className="taz-clean-green-icon" />
                                    <span className="taz-clean-phone-val">{settings.phone || "9440985131"}</span>
                                  </div>

                                  <div className="taz-clean-contact-row">
                                    <Mail size={13} className="taz-clean-green-icon" />
                                    <span className="taz-clean-email-val">{settings.email || "tazdiagnostic@gmail.com"}</span>
                                  </div>

                                  <div className="taz-clean-contact-row taz-clean-align-top">
                                    <MapPin size={13} className="taz-clean-green-icon" style={{ marginTop: "2px" }} />
                                    <div className="taz-clean-addr-val">
                                      {settings.address ? (
                                        settings.address.split(", ").map((part, i, arr) => (
                                          <React.Fragment key={i}>
                                            {part}{i < arr.length - 1 ? "," : ""}
                                            {i === 0 || i === 2 ? <br /> : " "}
                                          </React.Fragment>
                                        ))
                                      ) : (
                                        <>
                                          Dr No: 6-200 KA-MUMAK SILKA,<br />
                                          Nisar Rd Kannar Sise Strvev, Main Road,<br />
                                          Tallapuat, Rajamundry-580311, Andhra Pradesh
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="taz-clean-contact-row">
                                    <Clock size={13} className="taz-clean-green-icon" />
                                    <span className="taz-clean-lab-247">24/7 Computerized Automated Lab</span>
                                  </div>
                                </div>

                                {/* Right: Trust Badges */}
                                <div className="taz-clean-trust-col">
                                  <div className="taz-clean-trust-badge">
                                    <FlaskConical size={14} className="taz-clean-green-icon" />
                                    <span className="taz-clean-trust-text">ACCURATE<br />RESULTS</span>
                                  </div>

                                  <div className="taz-clean-trust-badge">
                                    <ShieldCheck size={14} className="taz-clean-green-icon" />
                                    <span className="taz-clean-trust-text">TRUSTED<br />CARE</span>
                                  </div>

                                  <div className="taz-clean-trust-badge">
                                    <Users size={14} className="taz-clean-green-icon" />
                                    <span className="taz-clean-trust-text">HEALTHIER<br />TOMORROW</span>
                                  </div>
                                </div>
                              </div>

                              {/* PATIENT INFORMATION BOX */}
                              <div className="taz-clean-patient-heading">
                                PATIENT INFORMATION
                              </div>
                              <div className="taz-clean-patient-card">
                                {/* Left Column */}
                                <div className="taz-clean-pi-col">
                                  <div className="taz-clean-pi-row">
                                    <CreditCard size={14} className="taz-clean-pi-icon" />
                                    <span className="taz-clean-pi-label">Patient ID</span>
                                    <span className="taz-clean-pi-sep">:</span>
                                    <span className="taz-clean-pi-val">{patient.id}</span>
                                  </div>
                                  <div className="taz-clean-pi-row">
                                    <User size={14} className="taz-clean-pi-icon" />
                                    <span className="taz-clean-pi-label">Patient Name</span>
                                    <span className="taz-clean-pi-sep">:</span>
                                    <span className="taz-clean-pi-val bold-name">{patient.name}</span>
                                  </div>
                                  <div className="taz-clean-pi-row">
                                    <Users size={14} className="taz-clean-pi-icon" />
                                    <span className="taz-clean-pi-label">Age / Gender</span>
                                    <span className="taz-clean-pi-sep">:</span>
                                    <span className="taz-clean-pi-val">{patient.age} Yrs / {patient.gender}</span>
                                  </div>
                                  <div className="taz-clean-pi-row">
                                    <Phone size={14} className="taz-clean-pi-icon" />
                                    <span className="taz-clean-pi-label">Phone</span>
                                    <span className="taz-clean-pi-sep">:</span>
                                    <span className="taz-clean-pi-val">{patient.phone}</span>
                                  </div>
                                </div>

                                {/* Right Column */}
                                <div className="taz-clean-pi-col">
                                  <div className="taz-clean-pi-row">
                                    <FileText size={14} className="taz-clean-pi-icon" />
                                    <span className="taz-clean-pi-label">Report Code</span>
                                    <span className="taz-clean-pi-sep">:</span>
                                    <span className="taz-clean-pi-val bold-code">{report.id}</span>
                                  </div>
                                  <div className="taz-clean-pi-row">
                                    <Calendar size={14} className="taz-clean-pi-icon" />
                                    <span className="taz-clean-pi-label">Report Date</span>
                                    <span className="taz-clean-pi-sep">:</span>
                                    <span className="taz-clean-pi-val">{formatLabDate(report.date)}</span>
                                  </div>
                                  <div className="taz-clean-pi-row">
                                    <Stethoscope size={14} className="taz-clean-pi-icon" />
                                    <span className="taz-clean-pi-label">Referred By</span>
                                    <span className="taz-clean-pi-sep">:</span>
                                    <span className="taz-clean-pi-val">{patient.referredBy || report.doctor || "raman"}</span>
                                  </div>
                                  <div className="taz-clean-pi-row">
                                    <Activity size={14} className="taz-clean-pi-icon" />
                                    <span className="taz-clean-pi-label">Status</span>
                                    <span className="taz-clean-pi-sep">:</span>
                                    <span className="taz-clean-pi-val">
                                      <span className={`taz-clean-status-pill ${String(report.status).toLowerCase() === "completed" ? "completed" : "pending"}`}>
                                        {report.status || "Completed"}
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="taz-clean-continuation-header">
                              <div className="taz-clean-top-page">
                                PAGE {pageNumber} OF {totalPages}
                              </div>
                              <div className="taz-clean-patient-heading">
                                PATIENT INFORMATION (CONTINUATION)
                              </div>
                              <div className="taz-clean-patient-card" style={{ padding: "8px 14px", marginTop: "4px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#222", flexWrap: "wrap", gap: "10px", width: "100%" }}>
                                  <div><span style={{ fontWeight: 700 }}>Patient ID:</span> {patient.id}</div>
                                  <div><span style={{ fontWeight: 700 }}>Patient Name:</span> <strong style={{ color: "#000" }}>{patient.name}</strong></div>
                                  <div><span style={{ fontWeight: 700 }}>Age/Gender:</span> {patient.age} Yrs / {patient.gender}</div>
                                  <div><span style={{ fontWeight: 700 }}>Report Code:</span> <strong>{report.id}</strong></div>
                                  <div><span style={{ fontWeight: 700 }}>Date:</span> {formatLabDate(report.date)}</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Test Results Table */}
                          <div className="taz-clean-table-wrap">
                            <table className="taz-clean-table">
                              <thead>
                                <tr>
                                  <th style={{ width: "33%", textAlign: "left" }}>TEST DESCRIPTION</th>
                                  <th style={{ width: "16%", textAlign: "left" }}>RESULT</th>
                                  <th style={{ width: "15%", textAlign: "left" }}>UNITS</th>
                                  <th style={{ width: "36%", textAlign: "center" }}>BIOLOGICAL REFERENCE RANGES</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.length === 0 ? (
                                  <tr>
                                    <td colSpan={4} style={{ textAlign: "center", padding: "28px", color: "#666", fontSize: "12px", fontStyle: "italic" }}>
                                      No test parameters assigned to this report yet. Click "+ Add / Manage Tests" above to add tests.
                                    </td>
                                  </tr>
                                ) : (
                                  items.map((item, rowIdx) => {
                                    if (item.type === "category") {
                                      return (
                                        <tr key={`cat-${item.categoryName}-${rowIdx}`} className="taz-clean-cat-row">
                                          <td colSpan={4}>
                                            <div className="taz-clean-cat-divider">
                                              <span className="taz-clean-cat-line"></span>
                                              <span className="taz-clean-cat-text">
                                                {formatCategoryHeader(item.categoryName)}
                                              </span>
                                              <span className="taz-clean-cat-line"></span>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    }

                                    const test = item.test;
                                    const result = report.results?.[test.id];
                                    const cfg = CLINICAL_TEST_CONFIG[test.name] || {};
                                    const displayName = cfg.displayName || test.name;
                                    const method = cfg.method || "";
                                    const unit = cfg.unit || test.unit || "";
                                    const refLines = (test.reference && String(test.reference).includes("\n"))
                                      ? String(test.reference).split("\n").map((l) => l.trim()).filter(Boolean)
                                      : (cfg.referenceLines && cfg.referenceLines.length)
                                        ? cfg.referenceLines
                                        : (test.reference ? String(test.reference).split("\n").map((l) => l.trim()).filter(Boolean) : []);

                                    return (
                                      <tr key={test.id} className="taz-clean-test-row">
                                        <td className="taz-col-desc">
                                          <div className="taz-test-name">{displayName}</div>
                                          {method && <div className="taz-test-method">{method}</div>}
                                        </td>
                                        <td className="taz-col-result">
                                          <span className="taz-result-val">
                                            {result !== undefined && result !== null && String(result).trim() !== "" ? result : "—"}
                                          </span>
                                        </td>
                                        <td className="taz-col-unit">{unit}</td>
                                        <td className="taz-col-ref">
                                          {refLines.map((line, lIdx) => (
                                            <div key={lIdx} className="taz-ref-item">{line}</div>
                                          ))}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Bottom Section: Dashed Line + End of Report + Permanent Technician Signature */}
                        <div className="taz-clean-footer">
                          {isLastPage ? (
                            <>
                              <div className="taz-clean-end-text">------- End of the report -------</div>
                              <div className="taz-clean-sig-block">
                                <img
                                  src={TECHNICIAN_SIGNATURE_SRC}
                                  alt="Lab Technician Signature"
                                  className="taz-clean-sig-img"
                                />
                                <div className="taz-clean-sig-tech">Lab Technician</div>
                                <div className="taz-clean-sig-lab">TAZ DIAGNOSTICS</div>
                                <div className="taz-clean-sig-code">Digital #2024 11:33:23 07/TC</div>
                              </div>
                            </>
                          ) : (
                            <div style={{ textAlign: "right", fontSize: "10.5px", fontWeight: 700, color: "#555", padding: "4px 0" }}>
                              Continued on Page {pageNumber + 1} ...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="card empty" style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#5b0a1a", marginBottom: "8px" }}>
            No Laboratory Reports Yet
          </div>
          <div style={{ fontSize: "13px", color: "#666", maxWidth: "480px", margin: "0 auto 18px" }}>
            Reports are automatically generated when registering a patient in <strong>Patient Entry</strong>, or you can click <strong>"+ New Report"</strong> above to create one.
          </div>
          {navigate && (
            <Button primary onClick={() => navigate("/patients/new")}>
              <Plus size={16} /> Go to Patient Entry
            </Button>
          )}
        </div>
      )}

      {/* CREATE NEW REPORT MODAL */}
      {showCreateReport && (
        <div className="modalshade">
          <form className="modal" onSubmit={createNewReport}>
            <div className="modalhead">
              <h3>Create New Laboratory Report</h3>
              <button
                type="button"
                className="close"
                onClick={() => setShowCreateReport(false)}
              >
                ×
              </button>
            </div>

            <div className="field" style={{ marginBottom: 20 }}>
              <label>Select Patient</label>
              <select
                required
                value={newReportPatientId}
                onChange={(e) => setNewReportPatientId(e.target.value)}
              >
                <option value="">-- Choose Registered Patient --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.name} ({p.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="formactions">
              <Button onClick={() => setShowCreateReport(false)}>Cancel</Button>
              <Button primary type="submit">
                <Check size={16} /> Create Report
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MANAGE TESTS MODAL FOR CURRENT REPORT */}
      {showManageTestsModal && patient && (
        <ManageTestsModal
          patient={patient}
          tests={tests}
          onClose={() => setShowManageTestsModal(false)}
          onSave={handleSavePatientTests}
        />
      )}
    </>
  );
}

/* =========================================================
   PAGE: MESSAGING & REMINDERS
   ========================================================= */

function Messages({ onToast }) {
  const [patients] = useStoredData(STORAGE.patients, DEFAULT_PATIENTS);
  const [messages, setMessages] = useStoredData(STORAGE.messages, DEFAULT_MESSAGES);

  const [filter, setFilter] = useState("All");
  const [showCompose, setShowCompose] = useState(false);

  const [form, setForm] = useState({
    patientId: "",
    channel: "WhatsApp",
    type: "Report Ready",
    customMessage: "",
  });

  const filtered = messages.filter((m) => {
    if (filter === "Sent") return m.status === "Sent";
    if (filter === "Pending") return m.status === "Pending";
    return true;
  });

  async function triggerWhatsAppSend(phone, name, messageBody) {
    if (!phone) return;
    const cleanPhone = String(phone).replace(/\D/g, "");

    // 1. Trigger backend Express API -> UltraMsg live send
    try {
      await fetch("/api/reminders/send-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          patientName: name || "Patient",
          message: messageBody
        })
      });
    } catch (err) {
      console.warn("Backend UltraMsg API dispatch fallback:", err);
    }

    // 2. Open WhatsApp Web direct link as instant fallback / confirmation
    const encoded = encodeURIComponent(messageBody);
    window.open(`https://wa.me/${cleanPhone.length === 10 ? "91" + cleanPhone : cleanPhone}?text=${encoded}`, "_blank");
  }

  function markSent(id) {
    const target = messages.find((m) => m.id === id);
    if (target) {
      triggerWhatsAppSend(target.phone, target.patient, target.message || target.whatsappMessage);
    }

    const next = messages.map((message) =>
      message.id === id ? { ...message, status: "Sent" } : message
    );
    setMessages(next);
    write(STORAGE.messages, next);
    onToast("WhatsApp message dispatched!");
  }

  function resend(id) {
    const target = messages.find((m) => m.id === id);
    if (target) {
      triggerWhatsAppSend(target.phone, target.patient, target.message || target.whatsappMessage);
    }
    onToast("Message re-sent to patient phone!");
  }

  function remove(id) {
    if (!confirm("Delete this message record?")) return;
    const next = messages.filter((m) => m.id !== id);
    setMessages(next);
    write(STORAGE.messages, next);
    onToast("Message record deleted.");
  }

  function handleComposeSubmit(e) {
    e.preventDefault();
    const pat = patients.find((p) => p.id === form.patientId);
    if (!pat) {
      alert("Please select a valid patient.");
      return;
    }

    let body = form.customMessage;
    if (!body) {
      if (form.type === "Report Ready") {
        body = `Dear ${pat.name}, your diagnostic report from TAZ DIAGNOSTIC is ready for collection.`;
      } else if (form.type === "Payment Reminder") {
        body = `Dear ${pat.name}, this is a gentle reminder regarding your pending balance at TAZ DIAGNOSTIC.`;
      } else {
        body = `Hello ${pat.name}, greetings from TAZ DIAGNOSTIC.`;
      }
    }

    const newMsg = {
      id: nextId("MSG", messages),
      patient: pat.name,
      phone: pat.phone,
      channel: form.channel,
      type: form.type,
      message: body,
      date: today(),
      status: "Sent",
    };

    triggerWhatsAppSend(pat.phone, pat.name, body);

    const next = [newMsg, ...messages];
    setMessages(next);
    write(STORAGE.messages, next);
    setShowCompose(false);
    onToast(`Message dispatched to ${pat.name} via ${form.channel}!`);
  }

  async function triggerBatchMonthlyReminders() {
    onToast("Sending batch monthly WhatsApp retest reminders...");
    try {
      const res = await fetch("/api/reminders/process-due", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        onToast(`Batch complete: ${data.message}`);
        return;
      }
    } catch {
      // Fallback local batch dispatch for all patients
    }

    const allPatients = read(STORAGE.patients, []);
    let count = 0;
    allPatients.forEach((pat) => {
      if (pat.phone) {
        const testListStr = Array.isArray(pat.tests) && pat.tests.length > 0
          ? pat.tests.map((t) => t.name || t).join(", ")
          : "Routine Diagnostic Profile";

        const msg = [
          `Dear ${pat.name}, greetings from TAZ Diagnostic Laboratory.`,
          `Your monthly diagnostic retest is due for routine check-up.`,
          `Recommended Profile: ${testListStr}.`,
          `Please visit our laboratory or reply to schedule a home sample collection.`,
          `Contact: 040-24567890 | Thank you, TAZ Diagnostic Team.`
        ].join("\n");

        triggerWhatsAppSend(pat.phone, pat.name, msg);
        count++;
      }
    });

    onToast(`Dispatched batch monthly retest reminders to ${count} patients!`);
  }

  return (
    <>
      <PageHeader
        title="Patient Messages & Reminders"
        subtitle="Manage automated and manual WhatsApp/SMS communication."
      >
        <Button
          style={{ background: "#5b0a1a", color: "#fff", borderColor: "#3a0610" }}
          onClick={triggerBatchMonthlyReminders}
        >
          <RefreshCw size={16} /> 🚀 Send Batch Monthly Reminders
        </Button>
        <Button primary onClick={() => setShowCompose(true)}>
          <Plus size={16} /> New Message
        </Button>
      </PageHeader>

      <div className="stats mini">
        <div className="stat">
          <div className="staticon">
            <MessageSquare />
          </div>
          <div>
            <span>Total Messages</span>
            <strong>{messages.length}</strong>
          </div>
        </div>

        <div className="stat">
          <div className="staticon">
            <Check />
          </div>
          <div>
            <span>Sent Messages</span>
            <strong>{messages.filter((m) => m.status === "Sent").length}</strong>
          </div>
        </div>

        <div className="stat">
          <div className="staticon">
            <Bell />
          </div>
          <div>
            <span>Pending Delivery</span>
            <strong>{messages.filter((m) => m.status !== "Sent").length}</strong>
          </div>
        </div>

        <div className="stat">
          <div className="staticon">
            <Phone />
          </div>
          <div>
            <span>Channels</span>
            <strong>WhatsApp / SMS</strong>
          </div>
        </div>
      </div>

      <div className="tabs">
        {["All", "Sent", "Pending"].map((tab) => (
          <button
            type="button"
            key={tab}
            className={`tab ${filter === tab ? "active" : ""}`}
            onClick={() => setFilter(tab)}
          >
            {tab} Messages
          </button>
        ))}
      </div>

      <div className="card">
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Phone</th>
                <th>Channel</th>
                <th>Type</th>
                <th>Message Content</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "36px 16px", color: "#666" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#5b0a1a", marginBottom: "6px" }}>
                      No messages or notifications sent yet
                    </div>
                    <div style={{ fontSize: "12px", color: "#888", marginBottom: "14px" }}>
                      Automated WhatsApp report notifications and monthly retest reminders will appear here.
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((message) => (
                  <tr key={message.id}>
                    <td>
                      <b>{message.patient}</b>
                    </td>
                    <td>{message.phone}</td>
                    <td>
                      <span className="badge">{message.channel || "SMS"}</span>
                    </td>
                    <td>{message.type}</td>
                    <td style={{ maxWidth: 350 }}>
                      <div style={{ wordBreak: "break-word" }}>{message.message}</div>
                    </td>
                    <td>{message.date}</td>
                    <td>
                      <span
                        className={`badge ${
                          message.status === "Sent" ? "sent" : "pending"
                        }`}
                      >
                        {message.status}
                      </span>
                    </td>
                    <td className="actions">
                      {message.status !== "Sent" ? (
                        <button
                          className="btn primary btn-sm"
                          onClick={() => markSent(message.id)}
                        >
                          Send Now
                        </button>
                      ) : (
                        <button
                          title="Resend Message"
                          onClick={() => resend(message.id)}
                        >
                          <RefreshCw size={15} />
                        </button>
                      )}
                      <button
                        title="Delete Record"
                        onClick={() => remove(message.id)}
                      >
                        <Trash2 size={16} color="#a12929" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPOSE MESSAGE MODAL */}
      {showCompose && (
        <div className="modalshade">
          <form className="modal" onSubmit={handleComposeSubmit}>
            <div className="modalhead">
              <h3>Compose Patient Notification</h3>
              <button
                type="button"
                className="close"
                onClick={() => setShowCompose(false)}
              >
                ×
              </button>
            </div>

            <div className="formgrid">
              <div className="field">
                <label>Target Patient *</label>
                <select
                  required
                  value={form.patientId}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Dispatch Channel</label>
                <select
                  value={form.channel}
                  onChange={(e) => setForm({ ...form, channel: e.target.value })}
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="SMS">Direct SMS</option>
                </select>
              </div>

              <div className="field">
                <label>Message Template Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="Report Ready">Report Ready Notification</option>
                  <option value="Payment Reminder">Payment Reminder</option>
                  <option value="Custom Message">Custom Clinical Note</option>
                </select>
              </div>
            </div>

            <div className="field" style={{ marginTop: 15 }}>
              <label>Custom Body (leave blank to use system template)</label>
              <textarea
                rows={3}
                value={form.customMessage}
                onChange={(e) =>
                  setForm({ ...form, customMessage: e.target.value })
                }
                placeholder="Type customized SMS / WhatsApp text..."
              />
            </div>

            <div className="formactions">
              <Button onClick={() => setShowCompose(false)}>Cancel</Button>
              <Button primary type="submit">
                <Check size={16} /> Send Notification
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

/* =========================================================
   PAGE: BILLING & PAYMENTS
   ========================================================= */

function Billing({ onToast }) {
  const [patients] = useStoredData(STORAGE.patients, DEFAULT_PATIENTS);
  const [bills, setBills] = useStoredData(STORAGE.bills, DEFAULT_BILLS);
  const [filter, setFilter] = useState("All");

  const [showCreateBill, setShowCreateBill] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [collectingBill, setCollectingBill] = useState(null);

  const [newBill, setNewBill] = useState({
    patientId: "",
    amount: "",
    paid: "",
    mode: "Cash",
  });

  const total = bills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  const paid = bills.reduce((sum, bill) => sum + Number(bill.paid || 0), 0);
  const pending = total - paid;

  const filteredBills = bills.filter((b) => {
    if (filter === "Paid") return b.status === "Paid";
    if (filter === "Pending") return b.status !== "Paid";
    return true;
  });

  function collect(id) {
    const next = bills.map((bill) =>
      bill.id === id
        ? {
            ...bill,
            paid: bill.amount,
            status: "Paid",
          }
        : bill
    );
    setBills(next);
    write(STORAGE.bills, next);
    onToast("Payment collected! Invoice marked as Paid.");
  }

  function handleCreateBillSubmit(e) {
    e.preventDefault();
    if (!newBill.patientId || !newBill.amount) return;

    const amt = Number(newBill.amount || 0);
    const pd = Number(newBill.paid || 0);

    const bill = {
      id: nextId("BILL", bills),
      patientId: newBill.patientId,
      date: today(),
      amount: amt,
      paid: pd,
      mode: newBill.mode,
      status: pd >= amt ? "Paid" : pd > 0 ? "Partial" : "Pending",
    };

    const next = [bill, ...bills];
    setBills(next);
    write(STORAGE.bills, next);
    setShowCreateBill(false);
    setNewBill({ patientId: "", amount: "", paid: "", mode: "Cash" });
    onToast(`Invoice ${bill.id} created successfully!`);
  }

  function remove(id) {
    if (!confirm("Are you sure you want to delete this bill record?")) return;
    const next = bills.filter((b) => b.id !== id);
    setBills(next);
    write(STORAGE.bills, next);
    onToast("Bill removed.");
  }

  return (
    <>
      <PageHeader
        title="Billing & Collections"
        subtitle="Generate diagnostic invoices, manage payments, and print receipts."
      >
        <Button primary onClick={() => setShowCreateBill(true)}>
          <Plus size={16} /> Create Invoice
        </Button>
      </PageHeader>

      <div className="stats">
        <div className="stat">
          <div className="staticon">
            <CreditCard />
          </div>
          <div>
            <span>Total Invoiced</span>
            <strong>{money(total)}</strong>
          </div>
        </div>

        <div className="stat">
          <div className="staticon">
            <Check />
          </div>
          <div>
            <span>Collected Cash/UPI</span>
            <strong>{money(paid)}</strong>
          </div>
        </div>

        <div className="stat">
          <div className="staticon">
            <AlertCircle />
          </div>
          <div>
            <span>Outstanding Due</span>
            <strong>{money(pending)}</strong>
          </div>
        </div>
      </div>

      <div className="tabs">
        {["All", "Paid", "Pending"].map((tab) => (
          <button
            type="button"
            key={tab}
            className={`tab ${filter === tab ? "active" : ""}`}
            onClick={() => setFilter(tab)}
          >
            {tab} Invoices
          </button>
        ))}
      </div>

      <div className="card">
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Bill ID</th>
                <th>Patient</th>
                <th>Date</th>
                <th>Mode</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "36px 16px", color: "#666" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#5b0a1a", marginBottom: "6px" }}>
                      No billing invoices recorded yet
                    </div>
                    <div style={{ fontSize: "12px", color: "#888", marginBottom: "14px" }}>
                      Diagnostic billing invoices will automatically generate upon patient registration.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => {
                  const patient = patients.find((p) => p.id === bill.patientId);
                  const balance = Number(bill.amount || 0) - Number(bill.paid || 0);

                  return (
                    <tr key={bill.id}>
                      <td>
                        <b>{bill.id}</b>
                      </td>
                      <td>
                        {patient?.name}
                        <small>{bill.patientId}</small>
                      </td>
                      <td>{bill.date}</td>
                      <td>
                        <span className="badge">{bill.mode || "Cash"}</span>
                      </td>
                      <td>{money(bill.amount)}</td>
                      <td>{money(bill.paid)}</td>
                      <td>
                        <b style={{ color: balance > 0 ? "#b42318" : "#147344" }}>
                          {money(balance)}
                        </b>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            bill.status === "Paid" ? "paid" : "partial"
                          }`}
                        >
                          {bill.status}
                        </span>
                      </td>
                      <td className="actions">
                        {bill.status !== "Paid" && (
                          <button
                            className="btn primary btn-sm"
                            onClick={() => collect(bill.id)}
                            title="Collect full payment"
                          >
                            Collect
                          </button>
                        )}
                        <button
                          title="View / Print Receipt"
                          onClick={() => setSelectedReceipt(bill)}
                        >
                          <FileText size={16} />
                        </button>
                        <button
                          title="Delete Bill"
                          onClick={() => remove(bill.id)}
                        >
                          <Trash2 size={16} color="#a12929" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE BILL MODAL */}
      {showCreateBill && (
        <div className="modalshade">
          <form className="modal" onSubmit={handleCreateBillSubmit}>
            <div className="modalhead">
              <h3>Create Diagnostic Invoice</h3>
              <button
                type="button"
                className="close"
                onClick={() => setShowCreateBill(false)}
              >
                ×
              </button>
            </div>

            <div className="formgrid">
              <div className="field">
                <label>Select Patient *</label>
                <select
                  required
                  value={newBill.patientId}
                  onChange={(e) =>
                    setNewBill({ ...newBill, patientId: e.target.value })
                  }
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.name} ({p.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Payment Method</label>
                <select
                  value={newBill.mode}
                  onChange={(e) =>
                    setNewBill({ ...newBill, mode: e.target.value })
                  }
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI / QR">UPI / QR Code</option>
                  <option value="Credit/Debit Card">Credit/Debit Card</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>

              <div className="field">
                <label>Total Invoiced Amount (₹) *</label>
                <input
                  required
                  type="number"
                  value={newBill.amount}
                  onChange={(e) =>
                    setNewBill({ ...newBill, amount: e.target.value })
                  }
                  placeholder="e.g. 1200"
                />
              </div>

              <div className="field">
                <label>Amount Received Today (₹)</label>
                <input
                  type="number"
                  value={newBill.paid}
                  onChange={(e) =>
                    setNewBill({ ...newBill, paid: e.target.value })
                  }
                  placeholder="e.g. 1200 or 0"
                />
              </div>
            </div>

            <div className="formactions">
              <Button onClick={() => setShowCreateBill(false)}>Cancel</Button>
              <Button primary type="submit">
                <Check size={16} /> Generate Invoice
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="modalshade">
          <div className="modal">
            <div className="modalhead">
              <h3>Diagnostic Payment Receipt</h3>
              <button
                type="button"
                className="close"
                onClick={() => setSelectedReceipt(null)}
              >
                ×
              </button>
            </div>

            <div className="receipt-box">
              <div className="receipt-header">
                <strong style={{ fontSize: 18, color: "#5b0a1a" }}>
                  TAZ DIAGNOSTIC
                </strong>
                <div style={{ fontSize: 11, color: "#8c7980" }}>
                  Official Diagnostic Payment Voucher
                </div>
              </div>

              <div className="receipt-row">
                <b>Receipt / Bill ID:</b>
                <span>{selectedReceipt.id}</span>
              </div>
              <div className="receipt-row">
                <b>Date:</b>
                <span>{selectedReceipt.date}</span>
              </div>
              <div className="receipt-row">
                <b>Patient:</b>
                <span>
                  {
                    patients.find((p) => p.id === selectedReceipt.patientId)
                      ?.name
                  }{" "}
                  ({selectedReceipt.patientId})
                </span>
              </div>
              <div className="receipt-row">
                <b>Payment Mode:</b>
                <span>{selectedReceipt.mode || "Cash"}</span>
              </div>
              <div className="receipt-row">
                <b>Total Billed:</b>
                <span>{money(selectedReceipt.amount)}</span>
              </div>
              <div className="receipt-row">
                <b>Amount Paid:</b>
                <span style={{ color: "#147344", fontWeight: 700 }}>
                  {money(selectedReceipt.paid)}
                </span>
              </div>
              <div className="receipt-row" style={{ borderBottom: 0 }}>
                <b>Balance Due:</b>
                <span style={{ color: "#b42318", fontWeight: 700 }}>
                  {money(
                    Number(selectedReceipt.amount || 0) -
                      Number(selectedReceipt.paid || 0)
                  )}
                </span>
              </div>
            </div>

            <div className="formactions">
              <Button onClick={() => window.print()}>
                <Printer size={15} /> Print Receipt
              </Button>
              <Button primary onClick={() => setSelectedReceipt(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   PAGE: ANALYTICS & INSIGHTS
   ========================================================= */

function Analytics({ onToast }) {
  const patients = read(STORAGE.patients, DEFAULT_PATIENTS);
  const reports = read(STORAGE.reports, DEFAULT_REPORTS);
  const bills = read(STORAGE.bills, DEFAULT_BILLS);
  const tests = read(STORAGE.tests, DEFAULT_TESTS);

  const [period, setPeriod] = useState("All Time");

  const completed = reports.filter((report) => report.status === "Completed").length;
  const revenue = bills.reduce((sum, bill) => sum + Number(bill.paid || 0), 0);

  return (
    <>
      <PageHeader
        title="Analytics & Laboratory Statistics"
        subtitle="Operational metrics, patient throughput, and financial performance."
      >
        <Button onClick={() => window.print()}>
          <Printer size={16} /> Print Report
        </Button>
      </PageHeader>

      <div className="tabs">
        {["Today", "This Week", "This Month", "All Time"].map((p) => (
          <button
            type="button"
            key={p}
            className={`tab ${period === p ? "active" : ""}`}
            onClick={() => {
              setPeriod(p);
              onToast(`Analytics filtered by ${p}`);
            }}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="stats">
        <div className="stat">
          <div className="staticon">
            <Users />
          </div>
          <div>
            <span>Patients Registered</span>
            <strong>{patients.length}</strong>
          </div>
        </div>

        <div className="stat">
          <div className="staticon">
            <FileText />
          </div>
          <div>
            <span>Total Reports</span>
            <strong>{reports.length}</strong>
          </div>
        </div>

        <div className="stat">
          <div className="staticon">
            <Check />
          </div>
          <div>
            <span>Report Completion</span>
            <strong>
              {reports.length
                ? Math.round((completed / reports.length) * 100)
                : 0}{" "}
              %
            </strong>
          </div>
        </div>

        <div className="stat">
          <div className="staticon">
            <CreditCard />
          </div>
          <div>
            <span>Total Revenue</span>
            <strong>{money(revenue)}</strong>
          </div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="cardhead">
            <div>
              <h3>Test Categories Share</h3>
              <p>Breakdown across medical departments.</p>
            </div>
            <FlaskConical />
          </div>

          {[
            "Clinical Pathology",
            "Urine Examinations",
            "Bio Chemistry",
            "Motion Examination",
            "Semen Analysis",
            "Additional Tests",
          ].map((category) => {
            const count = tests.filter((test) => test.category === category).length;
            const percentage = Math.round(
              (count / Math.max(1, tests.length)) * 100
            );

            return (
              <div className="metricbar" key={category}>
                <div>
                  <span>{category}</span>
                  <b>{count} Tests</b>
                </div>
                <div className="track">
                  <i style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <div className="cardhead">
            <div>
              <h3>Workplace Status</h3>
              <p>Daily workflow turnaround statistics.</p>
            </div>
            <Activity />
          </div>

          <div className="summaryrow">
            <span>Completed Investigations</span>
            <b style={{ color: "#147344" }}>{completed}</b>
          </div>
          <div className="summaryrow">
            <span>In Progress / Pending</span>
            <b style={{ color: "#b42318" }}>{reports.length - completed}</b>
          </div>
          <div className="summaryrow">
            <span>Overall Diagnostic Orders</span>
            <b>{reports.length}</b>
          </div>
        </div>
      </div>
    </>
  );
}

/* =========================================================
   PAGE: BRANCHES
   ========================================================= */

function Branches({ onToast }) {
  const [branches, setBranches] = useStoredData(STORAGE.branches, DEFAULT_BRANCHES);
  const [showAdd, setShowAdd] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
  });

  function toggle(id) {
    const next = branches.map((b) =>
      b.id === id
        ? { ...b, status: b.status === "Active" ? "Inactive" : "Active" }
        : b
    );
    setBranches(next);
    onToast("Branch status updated.");
  }

  function saveAdd(e) {
    e.preventDefault();
    if (!form.name) return;

    const next = [
      ...branches,
      {
        id: nextId("BR", branches),
        ...form,
        status: "Active",
      },
    ];
    setBranches(next);
    setForm({ name: "", address: "", phone: "" });
    setShowAdd(false);
    onToast(`Branch ${form.name} created successfully!`);
  }

  function saveEdit(e) {
    e.preventDefault();
    if (!editingBranch) return;

    const next = branches.map((b) =>
      b.id === editingBranch.id ? editingBranch : b
    );
    setBranches(next);
    setEditingBranch(null);
    onToast(`Branch ${editingBranch.name} updated!`);
  }

  function remove(id) {
    if (!confirm("Are you sure you want to remove this branch?")) return;
    const next = branches.filter((b) => b.id !== id);
    setBranches(next);
    write(STORAGE.branches, next);
    onToast("Branch deleted.");
  }

  return (
    <>
      <PageHeader
        title="Branches & Centers"
        subtitle="Manage multi-center locations, contact info, and operation status."
      >
        <Button primary onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Branch
        </Button>
      </PageHeader>

      <div className="branchgrid">
        {branches.map((branch) => (
          <div className="card branch" key={branch.id}>
            <div className="branchicon">
              <Building2 />
            </div>
            <h3>{branch.name}</h3>
            <p>
              <b>Code:</b> {branch.id}
            </p>
            <p>{branch.address}</p>
            <p>
              <b>Contact:</b> {branch.phone}
            </p>

            <div className="cardactions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => toggle(branch.id)}
                className={`badge ${
                  branch.status === "Active" ? "active" : "inactive"
                }`}
                style={{ border: 0, cursor: "pointer" }}
                title="Click to toggle status"
              >
                {branch.status}
              </button>

              <div className="actions">
                <button
                  title="Edit Branch"
                  onClick={() => setEditingBranch({ ...branch })}
                >
                  <Edit3 size={15} />
                </button>
                <button
                  title="Delete Branch"
                  onClick={() => remove(branch.id)}
                >
                  <Trash2 size={15} color="#a12929" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ADD BRANCH MODAL */}
      {showAdd && (
        <div className="modalshade">
          <form className="modal" onSubmit={saveAdd}>
            <div className="modalhead">
              <h3>Add New Center Branch</h3>
              <button
                type="button"
                className="close"
                onClick={() => setShowAdd(false)}
              >
                ×
              </button>
            </div>

            <div className="formgrid">
              <div className="field">
                <label>Branch Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Hitech City Branch"
                />
              </div>

              <div className="field">
                <label>Phone Number</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="040-xxxxxxx"
                />
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street address, City"
                />
              </div>
            </div>

            <div className="formactions">
              <Button onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button primary type="submit">
                <Check size={16} /> Save Branch
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT BRANCH MODAL */}
      {editingBranch && (
        <div className="modalshade">
          <form className="modal" onSubmit={saveEdit}>
            <div className="modalhead">
              <h3>Edit Branch — {editingBranch.id}</h3>
              <button
                type="button"
                className="close"
                onClick={() => setEditingBranch(null)}
              >
                ×
              </button>
            </div>

            <div className="formgrid">
              <div className="field">
                <label>Branch Name</label>
                <input
                  required
                  value={editingBranch.name}
                  onChange={(e) =>
                    setEditingBranch({ ...editingBranch, name: e.target.value })
                  }
                />
              </div>

              <div className="field">
                <label>Phone Number</label>
                <input
                  value={editingBranch.phone}
                  onChange={(e) =>
                    setEditingBranch({ ...editingBranch, phone: e.target.value })
                  }
                />
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Address</label>
                <input
                  value={editingBranch.address}
                  onChange={(e) =>
                    setEditingBranch({
                      ...editingBranch,
                      address: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="formactions">
              <Button onClick={() => setEditingBranch(null)}>Cancel</Button>
              <Button primary type="submit">
                <Check size={16} /> Update Branch
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

/* =========================================================
   PAGE: USERS & ACCESS CONTROL
   ========================================================= */

function UsersPage({ session, onToast }) {
  const [users, setUsers] = useStoredData(STORAGE.users, DEFAULT_USERS);
  const [showAdd, setShowAdd] = useState(false);

  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "Lab Technician",
  });

  function toggle(id) {
    const next = users.map((user) =>
      user.id === id
        ? {
            ...user,
            status: user.status === "Active" ? "Inactive" : "Active",
          }
        : user
    );
    setUsers(next);
    onToast("User account status updated.");
  }

  function saveAdd(e) {
    e.preventDefault();
    if (!form.username || !form.password) return;

    if (users.find((u) => u.username === form.username)) {
      alert("A user with this username already exists.");
      return;
    }

    const next = [
      ...users,
      {
        id: nextId("USR", users),
        ...form,
        status: "Active",
      },
    ];
    setUsers(next);
    setForm({ name: "", username: "", password: "", role: "Lab Technician" });
    setShowAdd(false);
    onToast(`User account ${form.username} created!`);
  }

  function remove(id) {
    const u = users.find((item) => item.id === id);
    if (u?.username === session?.username) {
      alert("You cannot delete the account you are currently logged into.");
      return;
    }
    if (!confirm(`Delete user ${u?.name}?`)) return;

    const next = users.filter((user) => user.id !== id);
    setUsers(next);
    write(STORAGE.users, next);
    onToast("User account removed.");
  }

  return (
    <>
      <PageHeader
        title="Users & Access Permissions"
        subtitle="Manage laboratory staff accounts, system roles, and credentials."
      >
        <Button primary onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add User
        </Button>
      </PageHeader>

      <div className="card">
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <b>{user.name}</b>
                    <small>{user.id}</small>
                  </td>
                  <td>
                    <code>{user.username}</code>
                  </td>
                  <td>
                    <span className="badge">{user.role}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => toggle(user.id)}
                      className={`badge ${
                        user.status === "Active" ? "active" : "inactive"
                      }`}
                      style={{ border: 0, cursor: "pointer" }}
                      title="Click to toggle status"
                    >
                      {user.status}
                    </button>
                  </td>
                  <td className="actions">
                    <button
                      className="btn btn-sm"
                      onClick={() => toggle(user.id)}
                    >
                      Toggle Status
                    </button>
                    <button
                      title="Delete User"
                      onClick={() => remove(user.id)}
                    >
                      <Trash2 size={16} color="#a12929" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      {showAdd && (
        <div className="modalshade">
          <form className="modal" onSubmit={saveAdd}>
            <div className="modalhead">
              <h3>Create Staff User Account</h3>
              <button
                type="button"
                className="close"
                onClick={() => setShowAdd(false)}
              >
                ×
              </button>
            </div>

            <div className="formgrid">
              <div className="field">
                <label>Full Staff Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Sara Ahmed"
                />
              </div>

              <div className="field">
                <label>System Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="Administrator">Administrator</option>
                  <option value="Lab Technician">Lab Technician</option>
                  <option value="Receptionist">Receptionist / Billing Clerk</option>
                </select>
              </div>

              <div className="field">
                <label>Username *</label>
                <input
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="login username"
                />
              </div>

              <div className="field">
                <label>Initial Password *</label>
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Secure password"
                />
              </div>
            </div>

            <div className="formactions">
              <Button onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button primary type="submit">
                <Check size={16} /> Create User
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

/* =========================================================
   PAGE: SETTINGS
   ========================================================= */

function SettingsPage({ onToast }) {
  const [settings, setSettings] = useStoredData(STORAGE.settings, {
    labName: "TAZ DIAGNOSTIC",
    phone: "9440985131",
    email: "tazdiagnostic@gmail.com",
    address: "Dr No: 8-200 RAJKUMAR SILKS, Near Raj Kumar Silks Street, Main Road, Tallapudi, Rajahmundry-534341, Andhra Pradesh",
    footerNote:
      "This laboratory report is generated electronically. Please consult your physician for clinical interpretation.",
  });

  const [saved, setSaved] = useState(false);

  function save(e) {
    e.preventDefault();
    setSettings(settings);
    setSaved(true);
    onToast("System settings saved successfully!");
    setTimeout(() => setSaved(false), 2000);
  }

  function handleExportBackup() {
    const backup = {
      version: 1,
      createdAt: new Date().toISOString(),
      labName: settings.labName || "TAZ DIAGNOSTIC",
      data: {
        patients: read(STORAGE.patients, []),
        doctors: read(STORAGE.doctors, []),
        tests: read(STORAGE.tests, []),
        reports: read(STORAGE.reports, []),
        bills: read(STORAGE.bills, []),
        branches: read(STORAGE.branches, []),
        users: read(STORAGE.users, []),
        messages: read(STORAGE.messages, []),
        settings: read(STORAGE.settings, {}),
      }
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `TAZ_DIAGNOSTIC_FULL_BACKUP_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast("Clinic database backup downloaded successfully! Keep this file safe.");
  }

  function handleImportBackup(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Restore database from this backup file? Existing records will be updated with the backup data.")) {
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = ev.target.result;
        const backup = JSON.parse(raw);
        const data = backup.data || backup;

        if (!data || typeof data !== "object") {
          throw new Error("Invalid backup format");
        }

        if (Array.isArray(data.patients)) write(STORAGE.patients, data.patients);
        if (Array.isArray(data.doctors)) write(STORAGE.doctors, data.doctors);
        if (Array.isArray(data.tests)) write(STORAGE.tests, data.tests);
        if (Array.isArray(data.reports)) write(STORAGE.reports, data.reports);
        if (Array.isArray(data.bills)) write(STORAGE.bills, data.bills);
        if (Array.isArray(data.branches)) write(STORAGE.branches, data.branches);
        if (Array.isArray(data.users)) write(STORAGE.users, data.users);
        if (Array.isArray(data.messages)) write(STORAGE.messages, data.messages);
        if (data.settings && typeof data.settings === "object") write(STORAGE.settings, data.settings);

        onToast("Database restored successfully from backup file! Syncing with server...");
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        alert("Failed to restore backup: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleStartFresh() {
    if (
      !confirm(
        "Clear all patients, diagnostic reports, invoices, and message history to start completely fresh from Day 1 (PAT001)? Test catalogs, doctors, branches, and lab settings will remain safe."
      )
    ) {
      return;
    }
    write(STORAGE.patients, []);
    write(STORAGE.reports, []);
    write(STORAGE.bills, []);
    write(STORAGE.messages, []);
    write("taz_fresh_start_v", 3);
    onToast("System cleared! Ready for fresh patient entries from Day 1.");
    setTimeout(() => {
      window.location.reload();
    }, 600);
  }

  return (
    <>
      <PageHeader
        title="System Settings & Preferences"
        subtitle="Configure laboratory letterhead, report headers, and administrative controls."
      />

      <form className="card formcard" onSubmit={save}>
        <div className="sectiontitle">
          <SettingsIcon />
          <div>
            <h3>Laboratory Identity & Header</h3>
            <p>These details are automatically printed on reports and invoices.</p>
          </div>
        </div>

        <div className="formgrid">
          <div className="field">
            <label>Laboratory Name</label>
            <input
              required
              value={settings.labName}
              onChange={(e) =>
                setSettings({ ...settings, labName: e.target.value })
              }
            />
          </div>

          <div className="field">
            <label>Helpline Phone</label>
            <input
              value={settings.phone}
              onChange={(e) =>
                setSettings({ ...settings, phone: e.target.value })
              }
            />
          </div>

          <div className="field">
            <label>Contact Email</label>
            <input
              value={settings.email}
              onChange={(e) =>
                setSettings({ ...settings, email: e.target.value })
              }
            />
          </div>

          <div className="field">
            <label>Headquarters Address</label>
            <input
              value={settings.address}
              onChange={(e) =>
                setSettings({ ...settings, address: e.target.value })
              }
            />
          </div>

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Report Footer Disclaimer Note</label>
            <textarea
              rows={3}
              value={settings.footerNote}
              onChange={(e) =>
                setSettings({ ...settings, footerNote: e.target.value })
              }
            />
          </div>

          <div className="field">
            <label>Technician Designation Title</label>
            <input
              value={settings.technicianTitle || "Lab Pathologist / Technician"}
              onChange={(e) =>
                setSettings({ ...settings, technicianTitle: e.target.value })
              }
            />
          </div>

          <div className="field">
            <label>Technician Registration / Subtext</label>
            <input
              value={settings.technicianSubtext || "Authorized Signatory · Reg. #LP-88421"}
              onChange={(e) =>
                setSettings({ ...settings, technicianSubtext: e.target.value })
              }
            />
          </div>

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Technician Digital Signature Image</label>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", marginTop: "6px" }}>
              {settings.technicianSignature ? (
                <div style={{ padding: "6px 12px", background: "#fdf8f9", border: "1px solid #ebd4db", borderRadius: "6px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <img
                    src={settings.technicianSignature}
                    alt="Technician signature preview"
                    style={{ maxHeight: "42px", maxWidth: "150px", objectFit: "contain" }}
                  />
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const upd = { ...settings };
                      delete upd.technicianSignature;
                      setSettings(upd);
                      localStorage.removeItem("taz_technician_signature");
                    }}
                    style={{ color: "#b71c1c", fontSize: "11px", padding: "4px 8px" }}
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: "12px", color: "#888" }}>No digital signature image uploaded.</span>
              )}

              <label className="btn" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "6px 14px" }}>
                <Upload size={14} />
                {settings.technicianSignature ? "Upload New Signature" : "Upload Signature Image"}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const base64 = ev.target.result;
                        setSettings((prev) => ({ ...prev, technicianSignature: base64 }));
                        localStorage.setItem("taz_technician_signature", base64);
                      };
                      reader.readAsDataURL(file);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
            <p style={{ fontSize: "11px", color: "#777", marginTop: "5px" }}>
              PNG or JPEG with transparent or clean white background. This signature will automatically appear on the right side of printed test report sheets.
            </p>
          </div>
        </div>

        {saved && (
          <div className="success">
            Settings saved successfully to workstation storage.
          </div>
        )}

        <div
          className="formactions"
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 25,
            paddingTop: 15,
            borderTop: "1px solid #eadde1",
          }}
        >
          <Button danger onClick={handleStartFresh}>
            <RefreshCw size={15} /> Clear Test Data / Start Fresh (Day 1)
          </Button>

          <Button primary type="submit">
            <Check size={16} /> Save Settings
          </Button>
        </div>
      </form>

      <div className="card" style={{ marginTop: 24, border: "1px solid #c7d2fe", background: "#f8faff" }}>
        <div className="sectiontitle">
          <Database size={22} color="#3730a3" />
          <div>
            <h3 style={{ color: "#312e81" }}>Lifetime Data Safety & Database Backups</h3>
            <p>Download a complete local backup of all patients, bills, reports, and lab data to keep safely on a pen drive or computer.</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: 16 }}>
          <Button onClick={handleExportBackup} primary style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#4338ca" }}>
            <Download size={16} /> Download Full Database Backup (.JSON)
          </Button>

          <label className="btn" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", background: "#ffffff", border: "1px solid #c7d2fe", padding: "10px 18px", borderRadius: "8px", fontWeight: "600", fontSize: "14px", color: "#3730a3" }}>
            <Upload size={16} /> Restore Database from Backup File
            <input
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={handleImportBackup}
            />
          </label>
        </div>
        <p style={{ fontSize: "12px", color: "#4f46e5", marginTop: "14px", lineHeight: "1.6" }}>
          🛡️ <b>Lifetime Guarantee:</b> Click <b>"Download Full Database Backup"</b> once a week or month and save it to your computer or email. Even if a computer breaks, is formatted, or replaced, you can click "Restore Database" on any device and all your records are restored in 3 seconds!
        </p>
      </div>
    </>
  );
}

/* =========================================================
   MAIN APP ROUTER & COMPONENT
   ========================================================= */

export default function App() {
  const [session, setSession] = useState(() =>
    read(STORAGE.session, null)
  );

  const [route, setRoute] = useState(
    (window.location.pathname || "/dashboard") + (window.location.search || "")
  );

  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    seed();
    const cleanupSync = startLiveSync();

    const onPop = () => {
      setRoute((window.location.pathname || "/dashboard") + (window.location.search || ""));
    };

    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (cleanupSync) cleanupSync();
    };
  }, []);

  function navigate(path) {
    if ((window.location.pathname + window.location.search) !== path) {
      window.history.pushState({}, "", path);
    }
    setRoute(path);
  }

  function login(user) {
    write(STORAGE.session, user);
    setSession(user);
    navigate("/dashboard");
    showToast(`Welcome back, ${user.name}!`);
  }

  function logout() {
    localStorage.removeItem(STORAGE.session);
    setSession(null);
    navigate("/dashboard");
  }

  if (!session) {
    return (
      <>
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
        <Login onLogin={login} />
      </>
    );
  }

  const currentPath = (route || "").split("?")[0] || "/dashboard";
  let page;

  if (currentPath === "/dashboard" || currentPath === "/") {
    page = <Dashboard navigate={navigate} onToast={showToast} />;
  } else if (currentPath === "/patients/new") {
    page = <PatientEntry navigate={navigate} onToast={showToast} />;
  } else if (currentPath === "/patients") {
    page = <Patients navigate={navigate} onToast={showToast} />;
  } else if (currentPath === "/patient-history") {
    page = <PatientHistory navigate={navigate} onToast={showToast} />;
  } else if (currentPath === "/doctors") {
    page = <Doctors onToast={showToast} />;
  } else if (currentPath === "/tests") {
    page = <TestManagement navigate={navigate} onToast={showToast} />;
  } else if (currentPath === "/test-master") {
    page = <TestMaster onToast={showToast} />;
  } else if (currentPath === "/reports") {
    page = <Reports navigate={navigate} onToast={showToast} route={route} />;
  } else if (currentPath === "/messages") {
    page = <Messages onToast={showToast} />;
  } else if (currentPath === "/billing") {
    page = <Billing onToast={showToast} />;
  } else if (currentPath === "/analytics") {
    page = <Analytics onToast={showToast} />;
  } else if (currentPath === "/branches") {
    page = <Branches onToast={showToast} />;
  } else if (currentPath === "/users") {
    page = <UsersPage session={session} onToast={showToast} />;
  } else if (currentPath === "/settings") {
    page = <SettingsPage onToast={showToast} />;
  } else {
    page = <Dashboard navigate={navigate} onToast={showToast} />;
  }

  return (
    <>
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      <Layout
        route={route}
        navigate={navigate}
        session={session}
        logout={logout}
        onToast={showToast}
      >
        {page}
      </Layout>
    </>
  );
}

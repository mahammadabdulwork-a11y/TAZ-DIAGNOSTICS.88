import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  X,
  FlaskConical,
} from "lucide-react";

const STORAGE_KEY = "taz_company_tests";

const defaultTests = [
  {
    testId: "TST001",
    name: "Complete Blood Count",
    category: "Hematology",
    unit: "cells/µL",
    referenceRange: "4,000 - 11,000",
    price: 450,
    status: "Active",
  },
  {
    testId: "TST002",
    name: "Blood Glucose",
    category: "Biochemistry",
    unit: "mg/dL",
    referenceRange: "70 - 110",
    price: 150,
    status: "Active",
  },
  {
    testId: "TST003",
    name: "Lipid Profile",
    category: "Biochemistry",
    unit: "mg/dL",
    referenceRange: "See report",
    price: 700,
    status: "Active",
  },
];

const emptyForm = {
  name: "",
  category: "",
  unit: "",
  referenceRange: "",
  price: "",
  status: "Active",
};

const createTestId = (tests) => {
  const numbers = tests
    .map((t) => parseInt(String(t.testId || "").replace(/\D/g, ""), 10))
    .filter((n) => !Number.isNaN(n));

  const next = numbers.length ? Math.max(...numbers) + 1 : 1;

  return `TST${String(next).padStart(3, "0")}`;
};

export default function Tests() {
  const [tests, setTests] = useState([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        setTests(JSON.parse(saved));
      } catch {
        setTests(defaultTests);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultTests));
      }
    } else {
      setTests(defaultTests);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultTests));
    }
  }, []);

  const save = (data) => {
    setTests(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    // Keep Test Master synchronized.
    localStorage.setItem("taz_company_test_master", JSON.stringify(data));
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return tests;

    return tests.filter((t) =>
      [
        t.testId,
        t.name,
        t.category,
        t.unit,
        t.referenceRange,
        t.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [tests, search]);

  const openAdd = () => {
    setForm(emptyForm);
    setModal("add");
  };

  const openEdit = (test) => {
    setSelected(test);
    setForm({
      name: test.name || "",
      category: test.category || "",
      unit: test.unit || "",
      referenceRange: test.referenceRange || "",
      price: test.price || "",
      status: test.status || "Active",
    });
    setModal("edit");
  };

  const submit = (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Enter test name.");
      return;
    }

    if (modal === "add") {
      const newTest = {
        testId: createTestId(tests),
        ...form,
        price: Number(form.price) || 0,
        createdAt: new Date().toISOString(),
      };

      save([newTest, ...tests]);
    } else {
      save(
        tests.map((t) =>
          t.testId === selected.testId
            ? {
                ...t,
                ...form,
                price: Number(form.price) || 0,
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );
    }

    setModal(null);
    setSelected(null);
    setForm(emptyForm);
  };

  const remove = (test) => {
    if (!window.confirm(`Delete ${test.name}?`)) return;

    save(tests.filter((t) => t.testId !== test.testId));
  };

  return (
    <div className="tests-page">
      <style>{`
        .tests-page {
          padding: 28px;
          background: #f7f5f6;
          min-height: calc(100vh - 80px);
          color: #241d20;
        }

        .head {
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:24px;
          gap:15px;
        }

        .head h1 {
          margin:0;
          color:#3a0610;
          font-size:28px;
        }

        .head p {
          margin:7px 0 0;
          color:#777;
        }

        .btn {
          border:0;
          border-radius:8px;
          padding:11px 16px;
          display:inline-flex;
          align-items:center;
          gap:8px;
          cursor:pointer;
          font-weight:600;
        }

        .primary {
          background:#5b0a1a;
          color:white;
        }

        .light {
          background:white;
          color:#5b0a1a;
          border:1px solid #ddd;
        }

        .toolbar {
          background:white;
          border:1px solid #eadfe2;
          border-radius:12px;
          padding:16px;
          display:flex;
          gap:12px;
          margin-bottom:18px;
        }

        .search {
          position:relative;
          flex:1;
        }

        .search svg {
          position:absolute;
          left:12px;
          top:50%;
          transform:translateY(-50%);
          color:#888;
        }

        .search input {
          width:100%;
          box-sizing:border-box;
          padding:12px 12px 12px 40px;
          border:1px solid #ddd;
          border-radius:8px;
          outline:none;
        }

        .card {
          background:white;
          border:1px solid #eadfe2;
          border-radius:12px;
          overflow:hidden;
        }

        table {
          width:100%;
          border-collapse:collapse;
        }

        th {
          background:#faf7f8;
          color:#5b0a1a;
          text-align:left;
          padding:14px;
          font-size:13px;
        }

        td {
          padding:14px;
          border-top:1px solid #f0ebed;
          font-size:14px;
        }

        .test-name {
          color:#3a0610;
          font-weight:700;
        }

        .test-id {
          color:#888;
          font-size:12px;
          margin-top:3px;
        }

        .status {
          display:inline-block;
          padding:5px 9px;
          border-radius:20px;
          font-size:12px;
          font-weight:700;
        }

        .active {
          background:#e9f7ef;
          color:#19713c;
        }

        .inactive {
          background:#f8e8eb;
          color:#8b1730;
        }

        .actions {
          display:flex;
          gap:6px;
        }

        .icon {
          width:34px;
          height:34px;
          display:grid;
          place-items:center;
          border:1px solid #e2d9dc;
          background:white;
          color:#5b0a1a;
          border-radius:7px;
          cursor:pointer;
        }

        .empty {
          text-align:center;
          padding:60px 20px;
          color:#888;
        }

        .modal-overlay {
          position:fixed;
          inset:0;
          background:rgba(20,5,10,.55);
          z-index:1000;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:20px;
        }

        .modal {
          width:min(680px,100%);
          max-height:90vh;
          overflow:auto;
          background:white;
          border-radius:14px;
        }

        .modal-head {
          padding:18px 22px;
          display:flex;
          justify-content:space-between;
          border-bottom:1px solid #eee;
        }

        .modal-head h2 {
          margin:0;
          color:#3a0610;
        }

        .close {
          border:0;
          background:none;
          cursor:pointer;
        }

        .form {
          padding:22px;
        }

        .grid {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:16px;
        }

        .field {
          display:flex;
          flex-direction:column;
          gap:7px;
        }

        .field.full {
          grid-column:1/-1;
        }

        label {
          font-size:13px;
          font-weight:600;
          color:#555;
        }

        input, select {
          padding:11px 12px;
          border:1px solid #ddd;
          border-radius:8px;
          outline:none;
        }

        input:focus, select:focus {
          border-color:#8b1730;
        }

        .footer {
          padding:16px 22px;
          border-top:1px solid #eee;
          display:flex;
          justify-content:flex-end;
          gap:10px;
        }

        @media(max-width:800px) {
          .tests-page { padding:16px; }
          .head { flex-direction:column; align-items:flex-start; }
          .grid { grid-template-columns:1fr; }
          .card { overflow-x:auto; }
          table { min-width:900px; }
        }
      `}</style>

      <div className="head">
        <div>
          <h1>Test Management</h1>
          <p>Manage your laboratory test history and services</p>
        </div>

        <button className="btn primary" onClick={openAdd}>
          <Plus size={18} />
          Add Test
        </button>
      </div>

      <div className="toolbar">
        <div className="search">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search test ID, test name, category..."
          />
        </div>

        <button
          className="btn light"
          onClick={() => {
            const saved = localStorage.getItem(STORAGE_KEY);
            setTests(saved ? JSON.parse(saved) : []);
          }}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty">
            <FlaskConical size={45} />
            <h3>No test history available</h3>
            <p>Add tests and they will remain available here.</p>
            <button className="btn primary" onClick={openAdd}>
              <Plus size={17} />
              Add Test
            </button>
          </div>
        ) : (
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
                <tr key={test.testId}>
                  <td>
                    <div className="test-name">{test.name}</div>
                    <div className="test-id">{test.testId}</div>
                  </td>

                  <td>{test.category || "-"}</td>
                  <td>{test.unit || "-"}</td>
                  <td style={{ whiteSpace: "pre-line", lineHeight: "1.35", minWidth: 150 }}>{test.referenceRange || "-"}</td>
                  <td>₹{Number(test.price || 0).toLocaleString("en-IN")}</td>

                  <td>
                    <span
                      className={`status ${
                        test.status === "Active" ? "active" : "inactive"
                      }`}
                    >
                      {test.status}
                    </span>
                  </td>

                  <td>
                    <div className="actions">
                      <button
                        className="icon"
                        onClick={() => {
                          setSelected(test);
                          setModal("view");
                        }}
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        className="icon"
                        onClick={() => openEdit(test)}
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        className="icon"
                        onClick={() => remove(test)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(modal === "add" || modal === "edit") && (
        <div className="modal-overlay" onMouseDown={() => setModal(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{modal === "add" ? "Add Test" : "Edit Test"}</h2>

              <button className="close" onClick={() => setModal(null)}>
                <X />
              </button>
            </div>

            <form className="form" onSubmit={submit}>
              <div className="grid">
                <div className="field">
                  <label>Test Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="field">
                  <label>Category</label>
                  <input
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  />
                </div>

                <div className="field">
                  <label>Unit</label>
                  <input
                    value={form.unit}
                    onChange={(e) =>
                      setForm({ ...form, unit: e.target.value })
                    }
                  />
                </div>

                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Reference Range</span>
                    <span style={{ fontSize: "11px", color: "#8b1730" }}>Press Enter for 2nd & 3rd lines</span>
                  </label>
                  <textarea
                    rows={3}
                    value={form.referenceRange}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        referenceRange: e.target.value,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                      }
                    }}
                    placeholder={"Line 1: Male: 14 - 17\nLine 2: Female: 12 - 15\nLine 3: Child: 11 - 14"}
                    style={{
                      width: "100%",
                      minHeight: "75px",
                      resize: "vertical",
                      padding: "8px 10px",
                      fontFamily: "inherit",
                      fontSize: "13px",
                      lineHeight: "1.4",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div className="field">
                  <label>Price</label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                  />
                </div>

                <div className="field">
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>

              <div className="footer">
                <button
                  type="button"
                  className="btn light"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>

                <button type="submit" className="btn primary">
                  {modal === "add" ? "Save Test" : "Update Test"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "view" && selected && (
        <div className="modal-overlay" onMouseDown={() => setModal(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Test Details</h2>

              <button className="close" onClick={() => setModal(null)}>
                <X />
              </button>
            </div>

            <div className="form">
              <p>
                <strong>Test ID:</strong> {selected.testId}
              </p>
              <p>
                <strong>Name:</strong> {selected.name}
              </p>
              <p>
                <strong>Category:</strong> {selected.category || "-"}
              </p>
              <p>
                <strong>Unit:</strong> {selected.unit || "-"}
              </p>
              <p>
                <strong>Reference Range:</strong>{" "}
                {selected.referenceRange || "-"}
              </p>
              <p>
                <strong>Price:</strong> ₹
                {Number(selected.price || 0).toLocaleString("en-IN")}
              </p>
              <p>
                <strong>Status:</strong> {selected.status}
              </p>
            </div>

            <div className="footer">
              <button className="btn light" onClick={() => setModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
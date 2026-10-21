import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  RefreshCw,
  FlaskConical,
  Power,
} from "lucide-react";

const STORAGE_KEY = "taz_company_test_master";

const DEFAULT_TESTS = [
  {
    id: "TEST001",
    name: "Hemoglobin (Hb)",
    category: "Hematology",
    specimen: "Blood",
    unit: "g/dL",
    referenceRange: "Male: 13.0 - 17.0, Female: 12.0 - 15.0",
    price: 100,
    status: "Active",
  },
  {
    id: "TEST002",
    name: "CBC – Complete Blood Count",
    category: "Hematology",
    specimen: "Blood",
    unit: "Various",
    referenceRange: "TLC: 4,000 - 11,000 /µL, Plt: 1.5 - 4.5 Lakhs",
    price: 300,
    status: "Active",
  },
  {
    id: "TEST003",
    name: "ESR",
    category: "Hematology",
    specimen: "Blood",
    unit: "mm/hr",
    referenceRange: "Male: 0 - 15, Female: 0 - 20 (Westergren)",
    price: 100,
    status: "Active",
  },
  {
    id: "TEST004",
    name: "Bleeding Time",
    category: "Hematology",
    specimen: "Blood",
    unit: "min:sec",
    referenceRange: "2 - 7 mins (Duke's method)",
    price: 50,
    status: "Active",
  },
  {
    id: "TEST005",
    name: "Clotting Time",
    category: "Hematology",
    specimen: "Blood",
    unit: "min:sec",
    referenceRange: "3 - 8 mins (Lee-White method)",
    price: 50,
    status: "Active",
  },
  {
    id: "TEST006",
    name: "MP – Malaria Parasite",
    category: "Hematology",
    specimen: "Blood",
    unit: "Smear Examination",
    referenceRange: "Negative / Not Seen",
    price: 150,
    status: "Active",
  },
  {
    id: "TEST007",
    name: "MF – Microfilaria",
    category: "Hematology",
    specimen: "Blood",
    unit: "Smear Examination",
    referenceRange: "Negative / Not Seen",
    price: 200,
    status: "Active",
  },
  {
    id: "TEST008",
    name: "Blood Group & Rh Type",
    category: "Hematology",
    specimen: "Blood",
    unit: "Agglutination",
    referenceRange: "A / B / AB / O (Rh +/-)",
    price: 100,
    status: "Active",
  },
  {
    id: "TEST009",
    name: "RA Test",
    category: "Serology",
    specimen: "Serum",
    unit: "IU/mL",
    referenceRange: "< 20 IU/mL (Negative)",
    price: 200,
    status: "Active",
  },
  {
    id: "TEST010",
    name: "VDRL",
    category: "Serology",
    specimen: "Serum",
    unit: "Qualitative",
    referenceRange: "Non-Reactive",
    price: 200,
    status: "Active",
  },
  {
    id: "TEST011",
    name: "Widal Test",
    category: "Serology",
    specimen: "Serum",
    unit: "Titer",
    referenceRange: "S. Typhi 'O' & 'H' < 1:80",
    price: 100,
    status: "Active",
  },
  {
    id: "TEST012",
    name: "Mantoux Test",
    category: "Clinical Pathology",
    specimen: "Intradermal",
    unit: "mm (induration)",
    referenceRange: "< 5 mm: Negative, > 10 mm: Positive",
    price: 300,
    status: "Active",
  },
  {
    id: "TEST013",
    name: "Urine Sugar + Albumin",
    category: "Clinical Pathology",
    specimen: "Urine",
    unit: "Qualitative",
    referenceRange: "Nil / Negative",
    price: 50,
    status: "Active",
  },
  {
    id: "TEST014",
    name: "Urine Bile Salts + Bile Pigments",
    category: "Clinical Pathology",
    specimen: "Urine",
    unit: "Qualitative",
    referenceRange: "Negative / Not Detected",
    price: 50,
    status: "Active",
  },
  {
    id: "TEST015",
    name: "Urine Microscopy / Pus Cells",
    category: "Clinical Pathology",
    specimen: "Urine",
    unit: "/HPF",
    referenceRange: "Pus Cells: 0 - 4 /HPF, RBCs: Nil",
    price: 50,
    status: "Active",
  },
  {
    id: "TEST016",
    name: "Serum Glucose – Fasting (F)",
    category: "Biochemistry",
    specimen: "Fluoride Plasma",
    unit: "mg/dL",
    referenceRange: "70 - 100",
    price: 50,
    status: "Active",
  },
  {
    id: "TEST017",
    name: "Serum Glucose – Random (R)",
    category: "Biochemistry",
    specimen: "Fluoride Plasma",
    unit: "mg/dL",
    referenceRange: "70 - 140",
    price: 50,
    status: "Active",
  },
  {
    id: "TEST018",
    name: "Serum Glucose – Post-Prandial (PP)",
    category: "Biochemistry",
    specimen: "Fluoride Plasma",
    unit: "mg/dL",
    referenceRange: "< 140",
    price: 50,
    status: "Active",
  },
  {
    id: "TEST019",
    name: "Urea",
    category: "Biochemistry",
    specimen: "Serum",
    unit: "mg/dL",
    referenceRange: "15 - 40",
    price: 150,
    status: "Active",
  },
  {
    id: "TEST020",
    name: "Creatinine",
    category: "Biochemistry",
    specimen: "Serum",
    unit: "mg/dL",
    referenceRange: "Male: 0.7 - 1.3, Female: 0.6 - 1.1",
    price: 150,
    status: "Active",
  },
  {
    id: "TEST021",
    name: "Cholesterol",
    category: "Biochemistry",
    specimen: "Serum",
    unit: "mg/dL",
    referenceRange: "Desirable: < 200",
    price: 100,
    status: "Active",
  },
  {
    id: "TEST022",
    name: "Bilirubin Total",
    category: "Biochemistry",
    specimen: "Serum",
    unit: "mg/dL",
    referenceRange: "0.2 - 1.2",
    price: 100,
    status: "Active",
  },
  {
    id: "TEST023",
    name: "Vanden Bergh Reaction",
    category: "Biochemistry",
    specimen: "Serum",
    unit: "Reaction",
    referenceRange: "Negative / Indirect",
    price: 100,
    status: "Active",
  },
  {
    id: "TEST024",
    name: "HIV – TRI DOT 1 & 2 Method",
    category: "Serology",
    specimen: "Serum",
    unit: "Qualitative",
    referenceRange: "Non-Reactive",
    price: 300,
    status: "Active",
  },
  {
    id: "TEST025",
    name: "HCV",
    category: "Serology",
    specimen: "Serum",
    unit: "Qualitative",
    referenceRange: "Non-Reactive",
    price: 300,
    status: "Active",
  },
  {
    id: "TEST026",
    name: "HBsAg",
    category: "Serology",
    specimen: "Serum",
    unit: "Qualitative",
    referenceRange: "Non-Reactive",
    price: 300,
    status: "Active",
  },
  {
    id: "TEST027",
    name: "Motion Examination",
    category: "Clinical Pathology",
    specimen: "Stool",
    unit: "Microscopy",
    referenceRange: "Normal (No ova / cysts / occult blood)",
    price: 300,
    status: "Active",
  },
  {
    id: "TEST028",
    name: "Semen Analysis",
    category: "Clinical Pathology",
    specimen: "Semen",
    unit: "Microscopy",
    referenceRange: "Count > 15 Million/mL, Motility > 40%",
    price: 350,
    status: "Active",
  },
  {
    id: "TEST029",
    name: "Thyroid Profile",
    category: "Hormones",
    specimen: "Serum",
    unit: "Various",
    referenceRange: "TSH: 0.4 - 4.2 µIU/mL, T3/T4: Normal",
    price: 500,
    status: "Active",
  },
  {
    id: "TEST030",
    name: "LFT – Liver Function Test",
    category: "Biochemistry",
    specimen: "Serum",
    unit: "Various",
    referenceRange: "Bilirubin: 0.2-1.2, SGOT: 5-40, SGPT: 7-56 U/L",
    price: 800,
    status: "Active",
  },
  {
    id: "TEST031",
    name: "Vitamin D",
    category: "Biochemistry",
    specimen: "Serum",
    unit: "ng/mL",
    referenceRange: "Sufficiency: 30.0 - 100.0",
    price: 1000,
    status: "Active",
  },
  {
    id: "TEST032",
    name: "Vitamin B12",
    category: "Biochemistry",
    specimen: "Serum",
    unit: "pg/mL",
    referenceRange: "211 - 911",
    price: 1000,
    status: "Active",
  },
  {
    id: "TEST033",
    name: "Iron",
    category: "Biochemistry",
    specimen: "Serum",
    unit: "µg/dL",
    referenceRange: "Male: 65 - 175, Female: 50 - 170",
    price: 800,
    status: "Active",
  },
  {
    id: "TEST034",
    name: "CRP",
    category: "Serology",
    specimen: "Serum",
    unit: "mg/L",
    referenceRange: "< 6.0 mg/L (Normal)",
    price: 500,
    status: "Active",
  },
  {
    id: "TEST035",
    name: "HbA1c",
    category: "Biochemistry",
    specimen: "Whole Blood",
    unit: "%",
    referenceRange: "Normal: < 5.7%, Diabetic: ≥ 6.5%",
    price: 500,
    status: "Active",
  },
];

function getStoredTests() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TESTS));
      return DEFAULT_TESTS;
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TESTS));
      return DEFAULT_TESTS;
    }

    return parsed;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TESTS));
    return DEFAULT_TESTS;
  }
}

function generateTestId(tests) {
  let maxNumber = 0;

  tests.forEach((test) => {
    const match = String(test.id || "").match(/TEST(\d+)/i);

    if (match) {
      maxNumber = Math.max(maxNumber, Number(match[1]));
    }
  });

  return `TEST${String(maxNumber + 1).padStart(3, "0")}`;
}

export default function TestMaster() {
  const [tests, setTests] = useState(getStoredTests);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const [editingTest, setEditingTest] = useState(null);
  const [viewingTest, setViewingTest] = useState(null);

  const emptyForm = {
    id: "",
    name: "",
    category: "",
    specimen: "",
    unit: "",
    referenceRange: "",
    price: "",
    status: "Active",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
  }, [tests]);

  const categories = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          tests
            .map((test) => test.category)
            .filter(Boolean)
        )
      ).sort(),
    ];
  }, [tests]);

  const filteredTests = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return tests.filter((test) => {
      const matchesSearch =
        !searchText ||
        String(test.id).toLowerCase().includes(searchText) ||
        String(test.name).toLowerCase().includes(searchText) ||
        String(test.category).toLowerCase().includes(searchText) ||
        String(test.specimen).toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        String(test.status).toLowerCase() === statusFilter.toLowerCase();

      const matchesCategory =
        categoryFilter === "All" ||
        test.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [tests, search, statusFilter, categoryFilter]);

  const activeCount = tests.filter(
    (test) => test.status === "Active"
  ).length;

  const inactiveCount = tests.filter(
    (test) => test.status === "Inactive"
  ).length;

  const openAdd = () => {
    setEditingTest(null);

    setForm({
      ...emptyForm,
      id: generateTestId(tests),
      status: "Active",
    });

    setModalOpen(true);
  };

  const openEdit = (test) => {
    setEditingTest(test);

    setForm({
      id: test.id || "",
      name: test.name || "",
      category: test.category || "",
      specimen: test.specimen || "",
      unit: test.unit || "",
      referenceRange: test.referenceRange || "",
      price: test.price ?? "",
      status: test.status || "Active",
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTest(null);
    setForm(emptyForm);
  };

  const openView = (test) => {
    setViewingTest(test);
    setViewOpen(true);
  };

  const closeView = () => {
    setViewingTest(null);
    setViewOpen(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const saveTest = (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter test name.");
      return;
    }

    if (!form.category.trim()) {
      alert("Please enter category.");
      return;
    }

    if (!form.specimen.trim()) {
      alert("Please enter specimen.");
      return;
    }

    if (!form.unit.trim()) {
      alert("Please enter unit.");
      return;
    }

    if (!form.referenceRange.trim()) {
      alert("Please enter reference range.");
      return;
    }

    if (form.price === "" || Number(form.price) < 0) {
      alert("Please enter a valid price.");
      return;
    }

    const cleanedTest = {
      id: form.id,
      name: form.name.trim(),
      category: form.category.trim(),
      specimen: form.specimen.trim(),
      unit: form.unit.trim(),
      referenceRange: form.referenceRange.trim(),
      price: Number(form.price),
      status: form.status,
    };

    if (editingTest) {
      setTests((previous) =>
        previous.map((test) =>
          test.id === editingTest.id ? cleanedTest : test
        )
      );
    } else {
      setTests((previous) => [...previous, cleanedTest]);
    }

    closeModal();
  };

  const toggleStatus = (testId) => {
    setTests((previous) =>
      previous.map((test) => {
        if (test.id !== testId) {
          return test;
        }

        return {
          ...test,
          status: test.status === "Active" ? "Inactive" : "Active",
        };
      })
    );
  };

  const deleteTest = (test) => {
    const confirmed = window.confirm(
      `Delete "${test.name}"?\n\nThis test will no longer appear in the Test Master.`
    );

    if (!confirmed) {
      return;
    }

    setTests((previous) =>
      previous.filter((item) => item.id !== test.id)
    );
  };

  const activateAll = () => {
    setTests((previous) =>
      previous.map((test) => ({
        ...test,
        status: "Active",
      }))
    );
  };

  const deactivateAll = () => {
    const confirmed = window.confirm(
      "Deactivate all tests?"
    );

    if (!confirmed) {
      return;
    }

    setTests((previous) =>
      previous.map((test) => ({
        ...test,
        status: "Inactive",
      }))
    );
  };

  const resetTests = () => {
    const confirmed = window.confirm(
      "Reset Test Master to the default tests?"
    );

    if (!confirmed) {
      return;
    }

    setTests(DEFAULT_TESTS);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(DEFAULT_TESTS)
    );
  };

  return (
    <div className="test-master-page">
      <div className="tm-header">
        <div>
          <div className="tm-breadcrumb">
            <span>TAZ COMPANY</span>
            <span>›</span>
            <strong>Test Master</strong>
          </div>

          <h1>Test Master</h1>

          <p>
            Maintain all laboratory tests, units and reference ranges.
          </p>
        </div>

        <button className="tm-primary-btn" onClick={openAdd}>
          <Plus size={18} />
          Add Test
        </button>
      </div>

      <div className="tm-stat-grid">
        <div className="tm-stat-card">
          <div className="tm-stat-icon">
            <FlaskConical size={22} />
          </div>

          <div>
            <span>Total Tests</span>
            <strong>{tests.length}</strong>
          </div>
        </div>

        <div className="tm-stat-card">
          <div className="tm-stat-icon active">
            <CheckCircle2 size={22} />
          </div>

          <div>
            <span>Active Tests</span>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className="tm-stat-card">
          <div className="tm-stat-icon inactive">
            <XCircle size={22} />
          </div>

          <div>
            <span>Inactive Tests</span>
            <strong>{inactiveCount}</strong>
          </div>
        </div>
      </div>

      <div className="tm-toolbar">
        <div className="tm-search">
          <Search size={19} />

          <input
            type="text"
            placeholder="Search tests..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(event) =>
            setCategoryFilter(event.target.value)
          }
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category === "All"
                ? "All Categories"
                : category}
            </option>
          ))}
        </select>

        <button
          className="tm-small-btn"
          onClick={activateAll}
          title="Activate all tests"
        >
          <CheckCircle2 size={16} />
          Activate All
        </button>

        <button
          className="tm-small-btn danger"
          onClick={deactivateAll}
          title="Deactivate all tests"
        >
          <XCircle size={16} />
          Deactivate All
        </button>

        <button
          className="tm-icon-btn"
          onClick={resetTests}
          title="Reset default tests"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      <div className="tm-help-box">
        <Power size={18} />

        <div>
          <strong>Test activation</strong>

          <span>
            Active tests will appear in Patient Entry and Reports.
            Inactive tests will be hidden from test selection.
          </span>
        </div>
      </div>

      <div className="tm-table-card">
        <div className="tm-table-head">
          <div>
            <h2>Laboratory Tests</h2>
            <span>
              Showing {filteredTests.length} of {tests.length} tests
            </span>
          </div>
        </div>

        <div className="tm-table-wrap">
          <table className="tm-table">
            <thead>
              <tr>
                <th>TEST ID</th>
                <th>TEST NAME</th>
                <th>CATEGORY</th>
                <th>SPECIMEN</th>
                <th>UNIT</th>
                <th>REFERENCE RANGE</th>
                <th>PRICE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {filteredTests.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    className="tm-empty"
                  >
                    <FlaskConical size={34} />

                    <strong>No tests found</strong>

                    <span>
                      Try another search or add a new test.
                    </span>
                  </td>
                </tr>
              ) : (
                filteredTests.map((test) => (
                  <tr key={test.id}>
                    <td>
                      <strong className="tm-test-id">
                        {test.id}
                      </strong>
                    </td>

                    <td>
                      <button
                        className="tm-name-button"
                        onClick={() => openView(test)}
                      >
                        {test.name}
                      </button>
                    </td>

                    <td>{test.category}</td>

                    <td>{test.specimen}</td>

                    <td>{test.unit}</td>

                    <td style={{ whiteSpace: "pre-line", lineHeight: "1.35", minWidth: 150 }}>{test.referenceRange || "—"}</td>

                    <td>
                      <strong>
                        ₹{Number(test.price).toLocaleString("en-IN")}
                      </strong>
                    </td>

                    <td>
                      <button
                        className={
                          test.status === "Active"
                            ? "tm-status active"
                            : "tm-status inactive"
                        }
                        onClick={() => toggleStatus(test.id)}
                        title={
                          test.status === "Active"
                            ? "Click to deactivate"
                            : "Click to activate"
                        }
                      >
                        {test.status === "Active" ? (
                          <>
                            <CheckCircle2 size={14} />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle size={14} />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>

                    <td>
                      <div className="tm-actions">
                        <button
                          className="tm-action view"
                          onClick={() => openView(test)}
                        >
                          View
                        </button>

                        <button
                          className="tm-action edit"
                          onClick={() => openEdit(test)}
                        >
                          <Pencil size={14} />
                          Edit
                        </button>

                        <button
                          className={
                            test.status === "Active"
                              ? "tm-action deactivate"
                              : "tm-action activate"
                          }
                          onClick={() =>
                            toggleStatus(test.id)
                          }
                        >
                          {test.status === "Active"
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        <button
                          className="tm-action delete"
                          onClick={() => deleteTest(test)}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div
          className="tm-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="tm-modal">
            <div className="tm-modal-header">
              <div>
                <h2>
                  {editingTest ? "Edit Test" : "Add New Test"}
                </h2>

                <p>
                  Enter the laboratory test information.
                </p>
              </div>

              <button
                className="tm-close"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveTest}>
              <div className="tm-form-grid">
                <div className="tm-field">
                  <label>Test ID</label>

                  <input
                    value={form.id}
                    disabled
                  />
                </div>

                <div className="tm-field">
                  <label>
                    Test Name <b>*</b>
                  </label>

                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter test name"
                  />
                </div>

                <div className="tm-field">
                  <label>
                    Category <b>*</b>
                  </label>

                  <input
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    placeholder="Example: Hematology"
                  />
                </div>

                <div className="tm-field">
                  <label>
                    Specimen <b>*</b>
                  </label>

                  <input
                    name="specimen"
                    value={form.specimen}
                    onChange={handleChange}
                    placeholder="Example: Blood"
                  />
                </div>

                <div className="tm-field">
                  <label>
                    Unit <b>*</b>
                  </label>

                  <input
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    placeholder="Example: mg/dL"
                  />
                </div>

                <div className="tm-field">
                  <label>
                    Reference Range <b>*</b>
                  </label>

                  <textarea
                    rows={3}
                    name="referenceRange"
                    value={form.referenceRange}
                    onChange={handleChange}
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

                <div className="tm-field">
                  <label>
                    Price (₹) <b>*</b>
                  </label>

                  <input
                    type="number"
                    min="0"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="Enter price"
                  />
                </div>

                <div className="tm-field">
                  <label>Status</label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="Active">
                      Active
                    </option>

                    <option value="Inactive">
                      Inactive
                    </option>
                  </select>
                </div>
              </div>

              <div className="tm-modal-footer">
                <button
                  type="button"
                  className="tm-cancel"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="tm-primary-btn"
                >
                  {editingTest
                    ? "Update Test"
                    : "Save Test"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewOpen && viewingTest && (
        <div
          className="tm-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeView();
            }
          }}
        >
          <div className="tm-view-modal">
            <div className="tm-modal-header">
              <div>
                <h2>Test Details</h2>

                <p>{viewingTest.id}</p>
              </div>

              <button
                className="tm-close"
                onClick={closeView}
              >
                <X size={20} />
              </button>
            </div>

            <div className="tm-view-content">
              <div className="tm-view-title">
                <div className="tm-big-icon">
                  <FlaskConical size={28} />
                </div>

                <div>
                  <h3>{viewingTest.name}</h3>

                  <span
                    className={
                      viewingTest.status === "Active"
                        ? "tm-status active"
                        : "tm-status inactive"
                    }
                  >
                    {viewingTest.status}
                  </span>
                </div>
              </div>

              <div className="tm-details-grid">
                <div>
                  <span>Test ID</span>
                  <strong>{viewingTest.id}</strong>
                </div>

                <div>
                  <span>Category</span>
                  <strong>{viewingTest.category}</strong>
                </div>

                <div>
                  <span>Specimen</span>
                  <strong>{viewingTest.specimen}</strong>
                </div>

                <div>
                  <span>Unit</span>
                  <strong>{viewingTest.unit}</strong>
                </div>

                <div>
                  <span>Reference Range</span>
                  <strong>{viewingTest.referenceRange}</strong>
                </div>

                <div>
                  <span>Price</span>
                  <strong>
                    ₹
                    {Number(
                      viewingTest.price
                    ).toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>
            </div>

            <div className="tm-modal-footer">
              <button
                className="tm-cancel"
                onClick={closeView}
              >
                Close
              </button>

              <button
                className="tm-primary-btn"
                onClick={() => {
                  closeView();
                  openEdit(viewingTest);
                }}
              >
                <Pencil size={16} />
                Edit Test
              </button>

              <button
                className={
                  viewingTest.status === "Active"
                    ? "tm-danger-btn"
                    : "tm-primary-btn"
                }
                onClick={() => {
                  toggleStatus(viewingTest.id);

                  setViewingTest({
                    ...viewingTest,
                    status:
                      viewingTest.status === "Active"
                        ? "Inactive"
                        : "Active",
                  });
                }}
              >
                <Power size={16} />

                {viewingTest.status === "Active"
                  ? "Deactivate"
                  : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .test-master-page {
          padding: 28px 34px 50px;
          background: #fbf8f9;
          min-height: calc(100vh - 90px);
          color: #3a0610;
        }

        .tm-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 24px;
        }

        .tm-breadcrumb {
          display: flex;
          gap: 10px;
          align-items: center;
          color: #9a8790;
          font-size: 13px;
          margin-bottom: 12px;
        }

        .tm-breadcrumb strong {
          color: #5b0a1a;
        }

        .tm-header h1 {
          margin: 0;
          font-size: 28px;
          color: #3a0610;
        }

        .tm-header p {
          margin: 7px 0 0;
          color: #88747c;
        }

        .tm-primary-btn {
          border: none;
          background: #5b0a1a;
          color: white;
          border-radius: 10px;
          padding: 12px 18px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          white-space: nowrap;
        }

        .tm-primary-btn:hover {
          background: #3a0610;
        }

        .tm-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          margin-bottom: 20px;
        }

        .tm-stat-card {
          background: white;
          border: 1px solid #eadde1;
          border-radius: 14px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 5px 18px rgba(91, 10, 26, 0.04);
        }

        .tm-stat-icon {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8e8ed;
          color: #5b0a1a;
        }

        .tm-stat-icon.active {
          background: #e9f8ef;
          color: #168047;
        }

        .tm-stat-icon.inactive {
          background: #f8e9e9;
          color: #a13b3b;
        }

        .tm-stat-card span {
          display: block;
          color: #8b777f;
          font-size: 13px;
          margin-bottom: 5px;
        }

        .tm-stat-card strong {
          font-size: 22px;
          color: #3a0610;
        }

        .tm-toolbar {
          background: white;
          border: 1px solid #eadde1;
          border-radius: 14px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .tm-search {
          min-width: 280px;
          flex: 1;
          height: 44px;
          border: 1px solid #e5d5da;
          border-radius: 9px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 13px;
          color: #8d7880;
        }

        .tm-search input {
          width: 100%;
          border: none;
          outline: none;
          font-size: 14px;
          color: #3a0610;
        }

        .tm-toolbar select {
          height: 44px;
          border: 1px solid #e5d5da;
          border-radius: 9px;
          background: white;
          padding: 0 12px;
          color: #4d353c;
          outline: none;
          cursor: pointer;
        }

        .tm-small-btn,
        .tm-icon-btn {
          height: 44px;
          border: 1px solid #dfcbd1;
          background: white;
          color: #5b0a1a;
          border-radius: 9px;
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          cursor: pointer;
        }

        .tm-small-btn:hover {
          background: #f9edf0;
        }

        .tm-small-btn.danger {
          color: #a13b3b;
        }

        .tm-icon-btn {
          padding: 0 12px;
        }

        .tm-help-box {
          background: #fff6f8;
          border: 1px solid #efd5dc;
          border-radius: 12px;
          padding: 13px 16px;
          display: flex;
          gap: 11px;
          align-items: flex-start;
          margin-bottom: 18px;
          color: #5b0a1a;
        }

        .tm-help-box strong {
          display: block;
          margin-bottom: 3px;
        }

        .tm-help-box span {
          display: block;
          color: #806b73;
          font-size: 13px;
        }

        .tm-table-card {
          background: white;
          border: 1px solid #eadde1;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 5px 18px rgba(91, 10, 26, 0.04);
        }

        .tm-table-head {
          padding: 18px 20px;
          border-bottom: 1px solid #eee1e5;
        }

        .tm-table-head h2 {
          margin: 0 0 4px;
          font-size: 17px;
        }

        .tm-table-head span {
          font-size: 13px;
          color: #927f86;
        }

        .tm-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .tm-table {
          width: 100%;
          min-width: 1180px;
          border-collapse: collapse;
        }

        .tm-table th {
          text-align: left;
          padding: 13px 16px;
          background: #fcf7f9;
          color: #765f68;
          font-size: 11px;
          letter-spacing: .4px;
          white-space: nowrap;
        }

        .tm-table td {
          padding: 14px 16px;
          border-top: 1px solid #f0e5e8;
          color: #4e3941;
          font-size: 13px;
          white-space: nowrap;
        }

        .tm-test-id {
          color: #5b0a1a;
        }

        .tm-name-button {
          border: none;
          background: none;
          padding: 0;
          color: #3a0610;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          text-align: left;
        }

        .tm-name-button:hover {
          text-decoration: underline;
        }

        .tm-status {
          border: none;
          border-radius: 999px;
          padding: 6px 10px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .tm-status.active {
          color: #167545;
          background: #e9f8ef;
        }

        .tm-status.inactive {
          color: #a13b3b;
          background: #faeaea;
        }

        .tm-actions {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .tm-action {
          border: 1px solid #e3d2d7;
          background: white;
          color: #5b0a1a;
          border-radius: 7px;
          padding: 7px 9px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .tm-action:hover {
          background: #f9edf0;
        }

        .tm-action.activate {
          color: #167545;
          border-color: #cce9d7;
        }

        .tm-action.deactivate {
          color: #a13b3b;
          border-color: #efd0d0;
        }

        .tm-action.delete {
          color: #a13b3b;
        }

        .tm-empty {
          height: 220px;
          text-align: center !important;
          vertical-align: middle;
        }

        .tm-empty svg {
          display: block;
          margin: 0 auto 9px;
          color: #bca7ae;
        }

        .tm-empty strong,
        .tm-empty span {
          display: block;
        }

        .tm-empty span {
          margin-top: 5px;
          color: #927f86;
        }

        .tm-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(40, 8, 16, .58);
          z-index: 9999;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 25px;
        }

        .tm-modal,
        .tm-view-modal {
          background: white;
          width: min(850px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          border-radius: 16px;
          box-shadow: 0 25px 80px rgba(0, 0, 0, .25);
        }

        .tm-view-modal {
          width: min(650px, 100%);
        }

        .tm-modal-header {
          padding: 20px 22px;
          border-bottom: 1px solid #eee1e5;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .tm-modal-header h2 {
          margin: 0;
          color: #5b0a1a;
          font-size: 20px;
        }

        .tm-modal-header p {
          margin: 5px 0 0;
          color: #927f86;
          font-size: 13px;
        }

        .tm-close {
          width: 38px;
          height: 38px;
          border: none;
          background: #f9e9ee;
          color: #5b0a1a;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .tm-form-grid {
          padding: 22px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 17px;
        }

        .tm-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .tm-field label {
          font-size: 13px;
          font-weight: 700;
          color: #4c353d;
        }

        .tm-field label b {
          color: #a31331;
        }

        .tm-field input,
        .tm-field select {
          width: 100%;
          height: 44px;
          border: 1px solid #e0d1d6;
          border-radius: 9px;
          padding: 0 12px;
          outline: none;
          color: #3a0610;
          background: white;
          box-sizing: border-box;
        }

        .tm-field input:focus,
        .tm-field select:focus {
          border-color: #8b1730;
          box-shadow: 0 0 0 3px rgba(139, 23, 48, .08);
        }

        .tm-field input:disabled {
          background: #f7f1f3;
          color: #8e7a82;
        }

        .tm-modal-footer {
          padding: 16px 22px 20px;
          border-top: 1px solid #eee1e5;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 9px;
        }

        .tm-cancel,
        .tm-danger-btn {
          height: 42px;
          border-radius: 9px;
          padding: 0 16px;
          border: 1px solid #dfcfd4;
          background: white;
          color: #5b0a1a;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .tm-danger-btn {
          color: #a13b3b;
          border-color: #efcaca;
        }

        .tm-view-content {
          padding: 22px;
        }

        .tm-view-title {
          display: flex;
          gap: 14px;
          align-items: center;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee1e5;
        }

        .tm-big-icon {
          width: 55px;
          height: 55px;
          background: #f8e8ed;
          color: #5b0a1a;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tm-view-title h3 {
          margin: 0 0 7px;
          font-size: 19px;
          color: #3a0610;
        }

        .tm-details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1px;
          margin-top: 20px;
          background: #eee1e5;
          border: 1px solid #eee1e5;
          border-radius: 10px;
          overflow: hidden;
        }

        .tm-details-grid > div {
          background: white;
          padding: 15px;
        }

        .tm-details-grid span {
          display: block;
          color: #927f86;
          font-size: 12px;
          margin-bottom: 5px;
        }

        .tm-details-grid strong {
          color: #3a0610;
          font-size: 14px;
        }

        @media (max-width: 900px) {
          .tm-stat-grid {
            grid-template-columns: 1fr;
          }

          .tm-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .tm-form-grid {
            grid-template-columns: 1fr;
          }

          .tm-details-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .test-master-page {
            padding: 18px 14px 35px;
          }

          .tm-toolbar {
            align-items: stretch;
          }

          .tm-search {
            min-width: 100%;
          }

          .tm-toolbar select,
          .tm-small-btn {
            flex: 1;
          }

          .tm-modal-overlay {
            padding: 10px;
          }
        }
      `}</style>
    </div>
  );
}
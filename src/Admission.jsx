import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "./firebase";

import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

import jsPDF from "jspdf";

const OWNER_NUMBER = "9826157790";
const LIBRARY_NAME = "SKYLINE LIBRARY";

function App() {
  // =====================================================
  // LOGIN
  // =====================================================

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // =====================================================
  // DATA
  // =====================================================

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // =====================================================
  // NAVIGATION
  // =====================================================

  const [activeSection, setActiveSection] = useState("dashboard");

  // =====================================================
  // SEARCH
  // =====================================================

  const [search, setSearch] = useState("");
  const [sectionSearch, setSectionSearch] = useState({
    pending: "",
    expiring: "",
    fees: "",
    seats: "",
    dashboard: ""
  });

  const getSectionSearch = (section) => sectionSearch[section] || "";
  const setSectionSearchValue = (section, value) =>
    setSectionSearch((prev) => ({ ...prev, [section]: value }));

  // =====================================================
  // FORM
  // =====================================================

  const [editId, setEditId] = useState(null);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [gender, setGender] = useState("");
  const [seat, setSeat] = useState("");
  const [regDate, setRegDate] = useState("");
  const [expireDate, setExpireDate] = useState("");
  const [fee, setFee] = useState("");

  const [photoPreview, setPhotoPreview] = useState("");

  const focusFieldRef = useRef(null);
  const cursorPositionRef = useRef(null);

  const keepFocus = (field, event) => {
    focusFieldRef.current = field;
    cursorPositionRef.current = event.currentTarget.selectionStart ?? event.currentTarget.value.length;
  };

  useEffect(() => {
    if (!focusFieldRef.current) return;
    const el = document.querySelector(`[data-focus-field="${focusFieldRef.current}"]`);
    if (!el) return;
    if (document.activeElement !== el) {
      el.focus();
      const pos = cursorPositionRef.current ?? el.value.length;
      try { el.setSelectionRange(pos, pos); } catch {}
    }
  });

  // =====================================================
  // FIRESTORE
  // =====================================================

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "students"),
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          firebaseId: item.id,
          ...item.data(),
          status: item.data().status || "Approved",
        }));

        setStudents(data);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        alert("Firebase Error: " + error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // =====================================================
  // LOGIN
  // =====================================================

  const login = () => {
    if (username === "rupesh" && password === "9993548283") {
      setIsLoggedIn(true);
      setActiveSection("dashboard");
    } else {
      alert("Wrong Username or Password");
    }
  };

  // =====================================================
  // DATE
  // =====================================================

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isExpired = (date) => {
    if (!date) return false;

    const expiry = new Date(date);
    expiry.setHours(0, 0, 0, 0);

    return expiry < today;
  };

  const isActive = (student) => {
    if (student.status !== "Approved") return false;

    if (!student.expireDate) return true;

    return !isExpired(student.expireDate);
  };

  // =====================================================
  // FILTER DATA
  // =====================================================

  const approvedStudents = useMemo(
    () => students.filter((student) => isActive(student)),
    [students]
  );

  const pendingStudents = useMemo(
    () =>
      students.filter(
        (student) => student.status === "Pending"
      ),
    [students]
  );

  const expiredStudents = useMemo(
    () =>
      students.filter((student) =>
        isExpired(student.expireDate)
      ),
    [students]
  );

  const expiringSoon = useMemo(() => {
    return approvedStudents.filter((student) => {
      if (!student.expireDate) return false;

      const expiry = new Date(student.expireDate);
      expiry.setHours(0, 0, 0, 0);

      const difference =
        (expiry.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24);

      return difference >= 0 && difference <= 7;
    });
  }, [approvedStudents]);

  // =====================================================
  // SEARCH
  // =====================================================

  const searchStudents = (list) => {
    const value = search.toLowerCase().trim();

    if (!value) return list;

    return list.filter((student) =>
      String(student.name || "")
        .toLowerCase()
        .includes(value)
    );
  };

  // =====================================================
  // SEATS
  // =====================================================

  const availableSeats = [];

  for (let i = 1; i <= 36; i++) {
    const seatNo = String(i);

    if (
      !students.some(
        (student) => student.seat === seatNo
      )
    ) {
      availableSeats.push(seatNo);
    }
  }

  for (let i = 1; i <= 36; i++) {
    const seatNo = `N ${i}`;

    if (
      !students.some(
        (student) => student.seat === seatNo
      )
    ) {
      availableSeats.push(seatNo);
    }
  }

  // =====================================================
  // PHOTO
  // =====================================================

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setPhotoPreview(reader.result);
    };

    reader.readAsDataURL(file);
  };

  // =====================================================
  // RESET
  // =====================================================

  const resetForm = () => {
    setEditId(null);
    setName("");
    setMobile("");
    setGender("");
    setSeat("");
    setRegDate("");
    setExpireDate("");
    setFee("");
    setPhotoPreview("");
  };

  // =====================================================
  // ADD STUDENT
  // =====================================================

  const addStudent = async () => {
    if (
      !name ||
      !mobile ||
      !gender ||
      !seat ||
      !regDate ||
      !expireDate ||
      !fee
    ) {
      alert("Please fill all fields");
      return;
    }

    const seatUsed = students.some(
      (student) => student.seat === seat
    );

    if (seatUsed) {
      alert("This seat is already occupied");
      return;
    }

    try {
      await addDoc(collection(db, "students"), {
        name,
        mobile,
        gender,
        seat,
        regDate,
        expireDate,
        fee: Number(fee),
        photoURL: photoPreview || "",
        status: "Approved",
        createdAt: new Date().toISOString(),
      });

      resetForm();

      alert("Student Added Successfully");

      setActiveSection("students");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  // =====================================================
  // UPDATE
  // =====================================================

  const updateStudent = async () => {
    if (!editId) return;

    try {
      await updateDoc(
        doc(db, "students", editId),
        {
          name,
          mobile,
          gender,
          seat,
          regDate,
          expireDate,
          fee: Number(fee),
          photoURL: photoPreview || "",
        }
      );

      resetForm();

      alert("Student Updated Successfully");

      setActiveSection("students");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  // =====================================================
  // EDIT
  // =====================================================

  const editStudent = (student) => {
    setEditId(student.firebaseId);

    setName(student.name || "");
    setMobile(student.mobile || "");
    setGender(student.gender || "");
    setSeat(student.seat || "");
    setRegDate(student.regDate || "");
    setExpireDate(student.expireDate || "");
    setFee(student.fee || "");
    setPhotoPreview(student.photoURL || "");

    setActiveSection("add");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // RENEW
  // =====================================================

  const renewStudent = (student) => {
    const todayString = new Date()
      .toISOString()
      .split("T")[0];

    const expiry = new Date();

    expiry.setDate(expiry.getDate() + 30);

    const expiryString = expiry
      .toISOString()
      .split("T")[0];

    setEditId(student.firebaseId);

    setName(student.name || "");
    setMobile(student.mobile || "");
    setGender(student.gender || "");
    setSeat(student.seat || "");

    setRegDate(todayString);
    setExpireDate(expiryString);

    setFee(student.fee || "");
    setPhotoPreview(student.photoURL || "");

    setActiveSection("add");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // DELETE
  // =====================================================

  const deleteStudent = async (id) => {
    const yes = window.confirm(
      "Are you sure you want to delete this student?"
    );

    if (!yes) return;

    try {
      await deleteDoc(
        doc(db, "students", id)
      );
    } catch (error) {
      alert(error.message);
    }
  };

  // =====================================================
  // APPROVE
  // =====================================================

  const approveStudent = async (id) => {
    try {
      await updateDoc(
        doc(db, "students", id),
        {
          status: "Approved",
        }
      );
    } catch (error) {
      alert(error.message);
    }
  };

  // =====================================================
  // WHATSAPP
  // =====================================================

  const whatsapp = (student, expired = false) => {
    const message = expired
      ? `Hello ${student.name},

Your Skyline Library membership has expired.

Expiry Date: ${student.expireDate}

Please renew your membership.

Owner Contact: ${OWNER_NUMBER}

Thank You.
Skyline Library`
      : `Hello ${student.name},

Your Skyline Library membership will expire soon.

Expiry Date: ${student.expireDate}

Please renew your membership.

Owner Contact: ${OWNER_NUMBER}

Thank You.
Skyline Library`;

    const number = String(
      student.mobile || ""
    ).replace(/\D/g, "");

    window.open(
      `https://wa.me/91${number}?text=${encodeURIComponent(
        message
      )}`,
      "_blank"
    );
  };

  // =====================================================
  // RECEIPT
  // =====================================================

  const generateReceipt = (student) => {
    const pdf = new jsPDF();

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);

    pdf.text(
      LIBRARY_NAME,
      105,
      20,
      { align: "center" }
    );

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    pdf.text(
      "Library Membership & Fee Receipt",
      105,
      28,
      { align: "center" }
    );

    pdf.text(
      `Owner Contact: ${OWNER_NUMBER}`,
      105,
      35,
      { align: "center" }
    );

    pdf.line(20, 42, 190, 42);

    // Student photo
    if (student.photoURL) {
      try {
        const format = String(student.photoURL).startsWith("data:image/png") ? "PNG" : "JPEG";
        pdf.addImage(student.photoURL, format, 150, 48, 35, 42);
        pdf.rect(150, 48, 35, 42);
      } catch (photoError) {
        console.warn("Could not add student photo to receipt", photoError);
      }
    }

    pdf.setFontSize(15);
    pdf.setFont("helvetica", "bold");

    pdf.text(
      "LIBRARY FEE RECEIPT",
      20,
      57
    );

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);

    const details = [
      `Student Name: ${student.name || ""}`,
      `Mobile: ${student.mobile || ""}`,
      `Gender: ${student.gender || ""}`,
      `Seat No: ${student.seat || ""}`,
      `Registration Date: ${student.regDate || ""}`,
      `Expiry Date: ${student.expireDate || ""}`,
      `Monthly Fee: Rs. ${student.fee || 0}`,
    ];

    let y = 75;

    details.forEach((text) => {
      pdf.text(text, 20, y);
      y += 13;
    });

    pdf.line(20, y, 190, y);

    y += 15;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);

    pdf.text(
      `Total Paid: Rs. ${student.fee || 0}`,
      20,
      y
    );

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);

    pdf.text(
      "Thank You for choosing Skyline Library!",
      105,
      210,
      { align: "center" }
    );

    pdf.text(
      `Owner Contact: ${OWNER_NUMBER}`,
      105,
      220,
      { align: "center" }
    );

    pdf.save(
      `Skyline-Receipt-${student.name || "Student"}.pdf`
    );
  };

  // =====================================================
  // TOTAL INCOME
  // =====================================================

  const totalIncome = students.reduce(
    (total, student) =>
      total + Number(student.fee || 0),
    0
  );

  // =====================================================
  // LOGIN
  // =====================================================

  if (!isLoggedIn) {
    return (
      <>
        <style>{styles}</style>

        <div className="login-page">
          <div className="login-box">
            <div className="logo-circle">
              📚
            </div>

            <h1>Skyline Library</h1>

            <p>Library Management System</p>

            <input
              placeholder="Username"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  login();
                }
              }}
            />

            <button
              type="button"
              className="primary-btn"
              onClick={login}
            >
              Login
            </button>
          </div>
        </div>
      </>
    );
  }

  // =====================================================
  // NAVIGATION BUTTON
  // =====================================================

  const NavButton = ({
    id,
    icon,
    title,
  }) => (
    <button
      type="button"
      className={
        activeSection === id
          ? "nav-btn active"
          : "nav-btn"
      }
      onClick={() => setActiveSection(id)}
    >
      <span>{icon}</span>
      {title}
    </button>
  );

  // =====================================================
  // STUDENT CARD
  // =====================================================

  const StudentCard = ({
    student,
    expired = false,
    pending = false,
  }) => (
    <div
      className={
        expired
          ? "student-card expired-card"
          : "student-card"
      }
    >
      {student.photoURL ? (
        <img
          className="student-photo"
          src={student.photoURL}
          alt={student.name}
        />
      ) : (
        <div className="student-photo no-photo">
          👤
        </div>
      )}

      <h3>{student.name}</h3>

      <div className="student-info">
        <p>📞 {student.mobile}</p>
        <p>💺 Seat: {student.seat}</p>
        <p>🚻 {student.gender}</p>
        <p>📅 {student.regDate}</p>
        <p>⏰ {student.expireDate}</p>
        <p>💰 ₹{student.fee || 0}</p>
      </div>

      {expired && (
        <div className="expired-label">
          🔴 EXPIRED
        </div>
      )}

      {pending && (
        <div className="pending-label">
          🟡 PENDING
        </div>
      )}

      <div className="card-buttons">
        {!pending && !expired && (
          <>
            <button
              type="button"
              className="blue-btn"
              onClick={() =>
                generateReceipt(student)
              }
            >
              🧾 Receipt
            </button>

            <button
              type="button"
              className="green-btn"
              onClick={() =>
                whatsapp(student)
              }
            >
              📲 WhatsApp
            </button>

            <button
              type="button"
              className="orange-btn"
              onClick={() =>
                editStudent(student)
              }
            >
              ✏️ Edit
            </button>
          </>
        )}

        {pending && (
          <button
            type="button"
            className="green-btn"
            onClick={() =>
              approveStudent(
                student.firebaseId
              )
            }
          >
            ✅ Approve
          </button>
        )}

        {expired && (
          <>
            <button
              type="button"
              className="blue-btn"
              onClick={() =>
                renewStudent(student)
              }
            >
              🔄 Renew
            </button>

            <button
              type="button"
              className="green-btn"
              onClick={() =>
                whatsapp(student, true)
              }
            >
              📲 WhatsApp
            </button>

            <button
              type="button"
              className="purple-btn"
              onClick={() =>
                generateReceipt(student)
              }
            >
              🧾 Old Receipt
            </button>
          </>
        )}

        <button
          className="red-btn"
          onClick={() =>
            deleteStudent(
              student.firebaseId
            )
          }
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );

  // =====================================================
  // DASHBOARD
  // =====================================================

  const Dashboard = () => (
    <div className="section-page">
      <div className="page-heading">
        <div>
          <h1>Dashboard</h1>
          <p>
            Welcome back to Skyline Library
          </p>
        </div>
      </div>

      <div className="search-box section-search">
        🔍
        <input
          placeholder="Search students from dashboard..."
          value={getSectionSearch("dashboard")}
          onChange={(e) =>
            setSectionSearchValue("dashboard", e.target.value)
          }
        />
      </div>

      <div className="stats-grid">
        <div
          className="stat-card blue"
          onClick={() =>
            setActiveSection("students")
          }
        >
          <span>👨‍🎓</span>
          <h3>Total Students</h3>
          <strong>{students.length}</strong>
        </div>

        <div
          className="stat-card green"
          onClick={() =>
            setActiveSection("students")
          }
        >
          <span>✅</span>
          <h3>Active Students</h3>
          <strong>
            {approvedStudents.length}
          </strong>
        </div>

        <div
          className="stat-card yellow"
          onClick={() =>
            setActiveSection("pending")
          }
        >
          <span>⏳</span>
          <h3>Pending</h3>
          <strong>
            {pendingStudents.length}
          </strong>
        </div>

        <div
          className="stat-card red"
          onClick={() =>
            setActiveSection("expired")
          }
        >
          <span>🔴</span>
          <h3>Expired</h3>
          <strong>
            {expiredStudents.length}
          </strong>
        </div>

        <div
          className="stat-card orange"
          onClick={() =>
            setActiveSection("expiring")
          }
        >
          <span>⚠️</span>
          <h3>Expiring Soon</h3>
          <strong>
            {expiringSoon.length}
          </strong>
        </div>

        <div
          className="stat-card purple"
          onClick={() =>
            setActiveSection("fees")
          }
        >
          <span>💰</span>
          <h3>Total Fees</h3>
          <strong>
            ₹{totalIncome}
          </strong>
        </div>
      </div>

      {getSectionSearch("dashboard").trim() && (
        <div className="dashboard-search-results">
          <h3>🔎 Matching Students</h3>
          <div className="students-grid compact-grid">
            {students.filter((student) => {
              const q = getSectionSearch("dashboard").toLowerCase().trim();
              return [student.name, student.mobile, student.seat, student.gender]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(q));
            }).map((student) => (
              <StudentCard key={student.firebaseId} student={student} />
            ))}
          </div>
          {students.filter((student) => {
            const q = getSectionSearch("dashboard").toLowerCase().trim();
            return [student.name, student.mobile, student.seat, student.gender]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(q));
          }).length === 0 && (
            <div className="empty">No matching students found.</div>
          )}
        </div>
      )}

      <div className="welcome-card">
        <div>
          <h2>📚 Skyline Library</h2>
          <p>
            Manage students, seats, memberships
            and fees from one place.
          </p>
        </div>

        <button
          className="primary-btn small"
          onClick={() =>
            setActiveSection("add")
          }
        >
          ➕ Add Student
        </button>
      </div>
    </div>
  );

  // =====================================================
  // ADD STUDENT
  // =====================================================

  const AddStudent = () => (
    <div className="section-page">
      <div className="page-heading">
        <div>
          <h1>
            {editId
              ? "✏️ Update Student"
              : "➕ Add Student"}
          </h1>

          <p>
            Enter student membership details
          </p>
        </div>
      </div>

      <div className="form-card">
        <div className="form-grid">
          <input
            placeholder="Student Name"
            value={name}
            onChange={(e) => {
              keepFocus("student-name", e);
              setName(e.target.value);
            }}
            data-focus-field="student-name"
          />

          <input
            placeholder="Mobile Number"
            value={mobile}
            onChange={(e) => {
              keepFocus("student-mobile", e);
              setMobile(e.target.value);
            }}
            data-focus-field="student-mobile"
          />

          <select
            value={gender}
            onChange={(e) =>
              setGender(e.target.value)
            }
          >
            <option value="">
              Select Gender
            </option>

            <option value="Male">
              Male
            </option>

            <option value="Female">
              Female
            </option>
          </select>

          <select
            value={seat}
            onChange={(e) =>
              setSeat(e.target.value)
            }
          >
            <option value="">
              Select Seat
            </option>

            {availableSeats.map(
              (seatNo) => (
                <option
                  key={seatNo}
                  value={seatNo}
                >
                  {seatNo}
                </option>
              )
            )}
          </select>

          <div>
            <label>
              Registration Date
            </label>

            <input
              type="date"
              value={regDate}
              onChange={(e) =>
                setRegDate(e.target.value)
              }
            />
          </div>

          <div>
            <label>
              Expiry Date
            </label>

            <input
              type="date"
              value={expireDate}
              onChange={(e) =>
                setExpireDate(e.target.value)
              }
            />
          </div>

          <input
            type="number"
            placeholder="Monthly Fee"
            value={fee}
            onChange={(e) => {
              keepFocus("student-fee", e);
              setFee(e.target.value);
            }}
            data-focus-field="student-fee"
          />

          <div className="photo-box">
            <label>
              📸 Student Photo
            </label>

            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={handlePhoto}
            />

            {photoPreview && (
              <img
                src={photoPreview}
                className="form-photo"
                alt="Preview"
              />
            )}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="primary-btn"
            onClick={
              editId
                ? updateStudent
                : addStudent
            }
          >
            {editId
              ? "💾 Update Student"
              : "➕ Add Student"}
          </button>

          {editId && (
            <button
              type="button"
              className="secondary-btn"
              onClick={resetForm}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // =====================================================
  // STUDENTS
  // =====================================================

  const Students = () => (
    <div className="section-page">
      <div className="page-heading">
        <div>
          <h1>🟢 Active Students</h1>
          <p>
            All currently active members
          </p>
        </div>

        <button
          className="primary-btn small"
          onClick={() =>
            setActiveSection("add")
          }
        >
          ➕ Add Student
        </button>
      </div>

      <div className="search-box">
        🔍

        <input
          placeholder="Search student name..."
          value={search}
          onChange={(e) => {
            keepFocus("student-search", e);
            setSearch(e.target.value);
          }}
          data-focus-field="student-search"
        />
      </div>

      {loading ? (
        <div className="empty">
          Loading students...
        </div>
      ) : searchStudents(
          approvedStudents
        ).length === 0 ? (
        <div className="empty">
          No active students found.
        </div>
      ) : (
        <div className="students-grid">
          {searchStudents(
            approvedStudents
          ).map((student) => (
            <StudentCard
              key={student.firebaseId}
              student={student}
            />
          ))}
        </div>
      )}
    </div>
  );

  // =====================================================
  // PENDING
  // =====================================================

  const Pending = () => (
    <div className="section-page">
      <div className="page-heading">
        <div>
          <h1>🟡 Pending Students</h1>
          <p>
            Students waiting for approval
          </p>
        </div>
      </div>

      <div className="search-box section-search">
        🔍
        <input
          placeholder="Search pending student..."
          value={getSectionSearch("pending")}
          onChange={(e) => {
            keepFocus("pending-search", e);
            setSectionSearchValue("pending", e.target.value);
          }}
          data-focus-field="pending-search"
        />
      </div>

      <div className="students-grid">
        {searchStudents(
          pendingStudents.filter((student) => {
            const q = getSectionSearch("pending").toLowerCase().trim();
            if (!q) return true;
            return [student.name, student.mobile, student.seat]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(q));
          })
        ).map((student) => (
          <StudentCard
            key={student.firebaseId}
            student={student}
            pending
          />
        ))}
      </div>

      {pendingStudents.length === 0 && (
        <div className="empty">
          No pending students.
        </div>
      )}
    </div>
  );

  // =====================================================
  // EXPIRED
  // =====================================================

  const Expired = () => (
    <div className="section-page">
      <div className="page-heading">
        <div>
          <h1 className="red-text">
            🔴 Expired Students
          </h1>

          <p>
            Memberships whose expiry date has
            passed
          </p>
        </div>
      </div>

      <div className="search-box">
        🔍

        <input
          placeholder="Search expired student..."
          value={search}
          onChange={(e) => {
            keepFocus("student-search", e);
            setSearch(e.target.value);
          }}
          data-focus-field="student-search"
        />
      </div>

      <div className="students-grid">
        {searchStudents(
          expiredStudents
        ).map((student) => (
          <StudentCard
            key={student.firebaseId}
            student={student}
            expired
          />
        ))}
      </div>

      {expiredStudents.length === 0 && (
        <div className="empty">
          🎉 No expired students.
        </div>
      )}
    </div>
  );

  // =====================================================
  // EXPIRING
  // =====================================================

  const Expiring = () => (
    <div className="section-page">
      <div className="page-heading">
        <div>
          <h1 className="yellow-text">
            ⚠️ Expiring Soon
          </h1>

          <p>
            Memberships expiring within 7 days
          </p>
        </div>
      </div>

      <div className="search-box section-search">
        🔍
        <input
          placeholder="Search expiring student..."
          value={getSectionSearch("expiring")}
          onChange={(e) => {
            keepFocus("expiring-search", e);
            setSectionSearchValue("expiring", e.target.value);
          }}
          data-focus-field="expiring-search"
        />
      </div>

      {expiringSoon.filter((student) => {
        const q = getSectionSearch("expiring").toLowerCase().trim();
        if (!q) return true;
        return [student.name, student.mobile, student.seat, student.expireDate]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      }).length === 0 ? (
        <div className="empty">
          No memberships expiring within
          7 days.
        </div>
      ) : (
        <div className="students-grid">
          {expiringSoon.filter((student) => {
            const q = getSectionSearch("expiring").toLowerCase().trim();
            if (!q) return true;
            return [student.name, student.mobile, student.seat, student.expireDate]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(q));
          }).map((student) => (
            <div
              className="student-card warning-card"
              key={student.firebaseId}
            >
              {student.photoURL && (
                <img
                  className="student-photo"
                  src={student.photoURL}
                  alt={student.name}
                />
              )}

              <h3>{student.name}</h3>

              <p>
                💺 Seat: {student.seat}
              </p>

              <p>
                ⏰ Expiry:{" "}
                {student.expireDate}
              </p>

              <button
                className="green-btn full"
                onClick={() =>
                  whatsapp(student)
                }
              >
                📲 Send Reminder
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // =====================================================
  // FEES
  // =====================================================

  const Fees = () => (
    <div className="section-page">
      <div className="page-heading">
        <div>
          <h1>💰 Fees</h1>
          <p>
            Library fee overview
          </p>
        </div>
      </div>

      <div className="fee-summary">
        <div>
          <span>Total Collection</span>
          <strong>
            ₹{totalIncome}
          </strong>
        </div>

        <div>
          <span>Total Students</span>
          <strong>
            {students.length}
          </strong>
        </div>

        <div>
          <span>Active Students</span>
          <strong>
            {approvedStudents.length}
          </strong>
        </div>
      </div>

      <div className="search-box section-search">
        🔍
        <input
          placeholder="Search student, mobile or seat..."
          value={getSectionSearch("fees")}
          onChange={(e) => {
            keepFocus("fees-search", e);
            setSectionSearchValue("fees", e.target.value);
          }}
          data-focus-field="fees-search"
        />
      </div>

      <div className="fee-list">
        {students.filter((student) => {
          const q = getSectionSearch("fees").toLowerCase().trim();
          if (!q) return true;
          return [student.name, student.mobile, student.seat, student.fee]
            .filter((value) => value !== undefined && value !== null)
            .some((value) => String(value).toLowerCase().includes(q));
        }).map((student) => (
          <div
            className="fee-row"
            key={student.firebaseId}
          >
            <div>
              <b>{student.name}</b>
              <small>
                Seat {student.seat}
              </small>
            </div>

            <strong>
              ₹{student.fee || 0}
            </strong>

            <button
              type="button"
              className="blue-btn"
              onClick={() =>
                generateReceipt(student)
              }
            >
              🧾 Receipt
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  // =====================================================
  // SEATS
  // =====================================================

  const Seats = () => {
    const renderSeats = (prefix) =>
      Array.from(
        { length: 36 },
        (_, index) => {
          const seatNo = prefix
            ? `N ${index + 1}`
            : String(index + 1);

          const student = students.find(
            (s) => s.seat === seatNo
          );

          const expired =
            student &&
            isExpired(
              student.expireDate
            );

          const seatQuery = getSectionSearch("seats").toLowerCase().trim();
          const seatMatches = !seatQuery ||
            seatNo.toLowerCase().includes(seatQuery) ||
            String(student?.name || "").toLowerCase().includes(seatQuery);

          if (!seatMatches) return null;

          return (
            <div
              key={seatNo}
              className={
                student
                  ? expired
                    ? "seat occupied-expired"
                    : "seat occupied"
                  : "seat vacant"
              }
              onClick={() => {
                if (student) {
                  alert(
                    `${student.name}\nSeat: ${student.seat}\nExpiry: ${student.expireDate}`
                  );
                }
              }}
            >
              <b>{seatNo}</b>

              {student ? (
                <>
                  <strong className="seat-student-name">
                    {student.name || "Student"}
                  </strong>
                  <small>
                    {expired ? "Expired" : "Occupied"}
                  </small>
                </>
              ) : (
                <small>Vacant</small>
              )}
            </div>
          );
        }
      );

    return (
      <div className="section-page">
        <div className="page-heading">
          <div>
            <h1>💺 Seats</h1>
            <p>
              Ground and first floor seat status
            </p>
          </div>
        </div>

        <div className="search-box section-search">
          🔍
          <input
            placeholder="Search seat no. or student name..."
            value={getSectionSearch("seats")}
            onChange={(e) => {
            keepFocus("seats-search", e);
            setSectionSearchValue("seats", e.target.value);
          }}
          data-focus-field="seats-search"
          />
        </div>

        <h2>Ground Floor</h2>

        <div className="seats-grid">
          {renderSeats(false)}
        </div>

        <h2>First Floor</h2>

        <div className="seats-grid">
          {renderSeats(true)}
        </div>
      </div>
    );
  };

  // =====================================================
  // MAIN
  // =====================================================

  return (
    <>
      <style>{styles}</style>

      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">
              📚
            </div>

            <div>
              <h2>Skyline</h2>
              <span>Library</span>
            </div>
          </div>

          <nav>
            <NavButton
              id="dashboard"
              icon="🏠"
              title="Dashboard"
            />

            <NavButton
              id="add"
              icon="➕"
              title="Add Student"
            />

            <NavButton
              id="students"
              icon="👨‍🎓"
              title="Students"
            />

            <NavButton
              id="seats"
              icon="💺"
              title="Seats"
            />

            <NavButton
              id="fees"
              icon="💰"
              title="Fees"
            />

            <NavButton
              id="expiring"
              icon="⚠️"
              title="Expiring Soon"
            />

            <NavButton
              id="expired"
              icon="🔴"
              title="Expired Students"
            />

            <NavButton
              id="pending"
              icon="⏳"
              title="Pending"
            />
          </nav>

          <div className="sidebar-bottom">
            <small>
              Owner Contact
            </small>

            <b>
              📞 {OWNER_NUMBER}
            </b>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div>
              <span>
                SKYLINE LIBRARY MANAGEMENT
              </span>
            </div>

            <div className="top-status">
              🟢 System Online
            </div>
          </header>

          {activeSection === "dashboard" && Dashboard()}

          {activeSection === "add" && AddStudent()}

          {activeSection === "students" && Students()}

          {activeSection === "seats" && Seats()}

          {activeSection === "fees" && Fees()}

          {activeSection === "expiring" && Expiring()}

          {activeSection === "expired" && Expired()}

          {activeSection === "pending" && Pending()}
        </main>
      </div>
    </>
  );
}

// =====================================================
// CSS
// =====================================================

const styles = `
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Inter, Arial, sans-serif;
  background: #07111f;
  color: white;
}

button,
input,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

.app {
  min-height: 100vh;
  display: flex;
  background:
    radial-gradient(
      circle at top right,
      rgba(37, 99, 235, .15),
      transparent 35%
    ),
    #07111f;
}

/* LOGIN */

.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;

  background:
    radial-gradient(
      circle at top,
      #12315c,
      #07111f 60%
    );
}

.login-box {
  width: 390px;
  max-width: 100%;
  padding: 40px;
  border-radius: 25px;

  background: rgba(15, 23, 42, .9);

  border: 1px solid rgba(255,255,255,.1);

  box-shadow:
    0 30px 80px rgba(0,0,0,.45);

  text-align: center;

  animation: loginIn .6s ease;
}

@keyframes loginIn {
  from {
    opacity: 0;
    transform: translateY(30px) scale(.95);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.logo-circle {
  width: 80px;
  height: 80px;
  margin: auto;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background: linear-gradient(
    135deg,
    #2563eb,
    #38bdf8
  );

  font-size: 38px;
}

.login-box h1 {
  margin-bottom: 5px;
  color: #38bdf8;
}

.login-box p {
  color: #94a3b8;
}

.login-box input {
  width: 100%;
  padding: 14px;
  margin-top: 14px;

  border: 1px solid #334155;
  border-radius: 12px;

  background: #0f172a;
  color: white;

  outline: none;
}

.login-box input:focus {
  border-color: #38bdf8;
}

/* SIDEBAR */

.sidebar {
  width: 250px;
  min-height: 100vh;

  position: sticky;
  top: 0;

  background: rgba(15, 23, 42, .92);

  border-right:
    1px solid rgba(255,255,255,.08);

  padding: 20px;

  display: flex;
  flex-direction: column;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 30px;
}

.brand-icon {
  width: 48px;
  height: 48px;

  border-radius: 14px;

  display: flex;
  align-items: center;
  justify-content: center;

  background:
    linear-gradient(
      135deg,
      #2563eb,
      #38bdf8
    );

  font-size: 24px;
}

.brand h2 {
  margin: 0;
}

.brand span {
  color: #38bdf8;
  font-size: 13px;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.nav-btn {
  border: none;
  background: transparent;
  color: #94a3b8;

  text-align: left;

  padding: 13px;

  border-radius: 12px;

  display: flex;
  gap: 12px;
  align-items: center;

  transition: .2s;
}

.nav-btn:hover {
  color: white;
  background: #1e293b;
  transform: translateX(3px);
}

.nav-btn.active {
  color: white;

  background:
    linear-gradient(
      90deg,
      #2563eb,
      #1d4ed8
    );

  box-shadow:
    0 8px 20px rgba(37,99,235,.25);
}

.sidebar-bottom {
  margin-top: auto;

  padding: 15px;

  border-radius: 15px;

  background: #111c2e;

  display: flex;
  flex-direction: column;
  gap: 5px;
}

.sidebar-bottom small {
  color: #64748b;
}

.sidebar-bottom b {
  font-size: 13px;
}

/* MAIN */

.main {
  flex: 1;
  min-width: 0;
  overflow-x: hidden;
}

.topbar {
  height: 65px;

  padding: 0 30px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  border-bottom:
    1px solid rgba(255,255,255,.07);

  background: rgba(7,17,31,.7);

  backdrop-filter: blur(10px);
}

.topbar span {
  color: #64748b;
  font-size: 12px;
  letter-spacing: 1px;
}

.top-status {
  color: #22c55e;
  font-size: 13px;
}

/* PAGE */

.section-page {
  padding: 30px;

  animation: none;
}

@keyframes sectionIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;

  margin-bottom: 25px;
}

.page-heading h1 {
  margin: 0 0 5px;
  font-size: 30px;
}

.page-heading p {
  margin: 0;
  color: #64748b;
}

/* STATS */

.stats-grid {
  display: grid;

  grid-template-columns:
    repeat(auto-fit, minmax(190px, 1fr));

  gap: 18px;
}

.stat-card {
  padding: 23px;

  border-radius: 20px;

  border: 1px solid rgba(255,255,255,.08);

  background: #111c2e;

  transition: .25s;

  cursor: pointer;

  position: relative;

  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-5px);

  box-shadow:
    0 15px 35px rgba(0,0,0,.25);
}

.stat-card span {
  font-size: 27px;
}

.stat-card h3 {
  color: #94a3b8;
  margin: 15px 0 5px;
}

.stat-card strong {
  font-size: 30px;
}

.stat-card.blue {
  border-left: 4px solid #38bdf8;
}

.stat-card.green {
  border-left: 4px solid #22c55e;
}

.stat-card.yellow {
  border-left: 4px solid #facc15;
}

.stat-card.red {
  border-left: 4px solid #ef4444;
}

.stat-card.orange {
  border-left: 4px solid #f97316;
}

.stat-card.purple {
  border-left: 4px solid #a855f7;
}

/* WELCOME */

.welcome-card {
  margin-top: 25px;

  padding: 25px;

  border-radius: 20px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 20px;

  background:
    linear-gradient(
      135deg,
      rgba(37,99,235,.18),
      rgba(56,189,248,.06)
    );

  border:
    1px solid rgba(56,189,248,.15);
}

.welcome-card p {
  color: #94a3b8;
}

/* BUTTONS */

.primary-btn,
.secondary-btn,
.blue-btn,
.green-btn,
.orange-btn,
.red-btn,
.purple-btn {
  border: none;

  color: white;

  padding: 11px 15px;

  border-radius: 10px;

  transition: .2s;
}

.primary-btn {
  background:
    linear-gradient(
      135deg,
      #2563eb,
      #1d4ed8
    );
}

.primary-btn.small {
  padding: 10px 16px;
}

.secondary-btn {
  background: #475569;
}

.blue-btn {
  background: #2563eb;
}

.green-btn {
  background: #16a34a;
}

.orange-btn {
  background: #f59e0b;
}

.red-btn {
  background: #dc2626;
}

.purple-btn {
  background: #7c3aed;
}

.primary-btn:hover,
.blue-btn:hover,
.green-btn:hover,
.orange-btn:hover,
.red-btn:hover,
.purple-btn:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
}

.full {
  width: 100%;
}

/* FORM */

.form-card {
  max-width: 900px;

  padding: 25px;

  border-radius: 20px;

  background: #111c2e;

  border:
    1px solid rgba(255,255,255,.07);
}

.form-grid {
  display: grid;

  grid-template-columns:
    repeat(2, 1fr);

  gap: 15px;
}

.form-grid input,
.form-grid select {
  width: 100%;

  padding: 13px;

  border:
    1px solid #334155;

  border-radius: 10px;

  background: #0f172a;

  color: white;

  outline: none;
}

.form-grid input:focus,
.form-grid select:focus {
  border-color: #38bdf8;
}

.form-grid label {
  display: block;
  color: #94a3b8;
  font-size: 13px;
  margin-bottom: 6px;
}

.photo-box {
  padding: 15px;

  border-radius: 15px;

  border:
    1px dashed #334155;
}

.photo-box input {
  margin-top: 8px;
}

.form-photo {
  width: 110px;
  height: 110px;

  display: block;

  margin: 15px auto 0;

  object-fit: cover;

  border-radius: 50%;

  border: 4px solid #38bdf8;
}

.form-actions {
  display: flex;

  gap: 10px;

  margin-top: 20px;
}

/* SEARCH */

.section-search {
  margin-bottom: 22px;
}

.dashboard-search-results {
  margin: 8px 0 24px;
}

.dashboard-search-results h3 {
  margin: 0 0 14px;
}

.compact-grid {
  margin-top: 0;
}

.search-box {
  width: 400px;
  max-width: 100%;

  display: flex;

  align-items: center;

  gap: 8px;

  padding: 12px 15px;

  margin-bottom: 25px;

  border-radius: 12px;

  background: #111c2e;

  border: 1px solid #334155;
}

.search-box input {
  flex: 1;

  border: none;

  outline: none;

  background: transparent;

  color: white;
}

/* STUDENTS */

.students-grid {
  display: grid;

  grid-template-columns:
    repeat(auto-fill, minmax(270px, 1fr));

  gap: 20px;
}

.student-card {
  background: #111c2e;

  border:
    1px solid rgba(255,255,255,.07);

  border-radius: 20px;

  padding: 20px;

  transition: .25s;

  animation: cardIn .35s ease;
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.student-card:hover {
  transform: translateY(-4px);

  box-shadow:
    0 15px 35px rgba(0,0,0,.3);
}

.student-photo {
  width: 110px;
  height: 110px;

  border-radius: 50%;

  object-fit: cover;

  display: block;

  margin: 0 auto 15px;

  border: 4px solid #2563eb;
}

.no-photo {
  display: flex;

  align-items: center;
  justify-content: center;

  background: #1e293b;

  font-size: 35px;
}

.student-card h3 {
  text-align: center;

  margin: 8px 0 15px;

  font-size: 20px;
}

.student-info {
  color: #cbd5e1;
  line-height: 1.4;
}

.student-info p {
  margin: 7px 0;
}

.card-buttons {
  display: flex;

  flex-direction: column;

  gap: 8px;

  margin-top: 15px;
}

.expired-card {
  border:
    1px solid rgba(239,68,68,.5);
}

.warning-card {
  border:
    1px solid rgba(250,204,21,.45);
}

.expired-label,
.pending-label {
  text-align: center;

  padding: 8px;

  border-radius: 8px;

  margin: 10px 0;

  font-weight: bold;
}

.expired-label {
  background: rgba(239,68,68,.15);
  color: #f87171;
}

.pending-label {
  background: rgba(250,204,21,.15);
  color: #facc15;
}

.red-text {
  color: #ef4444;
}

.yellow-text {
  color: #facc15;
}

/* FEES */

.fee-summary {
  display: grid;

  grid-template-columns:
    repeat(auto-fit, minmax(200px, 1fr));

  gap: 18px;

  margin-bottom: 25px;
}

.fee-summary > div {
  padding: 25px;

  background: #111c2e;

  border-radius: 18px;

  display: flex;

  flex-direction: column;

  gap: 8px;
}

.fee-summary span {
  color: #64748b;
}

.fee-summary strong {
  font-size: 28px;
  color: #22c55e;
}

.fee-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fee-row {
  display: grid;

  grid-template-columns:
    1fr auto auto;

  gap: 20px;

  align-items: center;

  padding: 15px 18px;

  border-radius: 14px;

  background: #111c2e;

  border:
    1px solid rgba(255,255,255,.06);
}

.fee-row div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fee-row small {
  color: #64748b;
}

/* SEATS */

.seats-grid {
  display: grid;

  grid-template-columns:
    repeat(6, minmax(70px, 1fr));

  gap: 12px;

  margin: 20px 0 35px;
}

.seat {
  padding: 15px 8px;

  border-radius: 12px;

  text-align: center;

  cursor: pointer;

  transition: .2s;
}

.seat:hover {
  transform: scale(1.04);
}

.seat b,
.seat small {
  display: block;
}

.seat small {
  margin-top: 5px;
  font-size: 11px;
}

.vacant {
  background: #14532d;
  border: 1px solid #22c55e;
}

.seat-student-name {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.15;
  white-space: normal;
  overflow-wrap: anywhere;
}

.occupied {
  background: #7f1d1d;
  border: 1px solid #ef4444;
}

.occupied-expired {
  background: #450a0a;
  border: 2px solid #f97316;
  color: #fb923c;
}

/* EMPTY */

.empty {
  padding: 50px 20px;

  text-align: center;

  border-radius: 18px;

  background: #111c2e;

  color: #64748b;
}

/* MOBILE */

@media (max-width: 900px) {
  .sidebar {
    width: 210px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .seats-grid {
    grid-template-columns:
      repeat(6, 70px);

    overflow-x: auto;
  }
}

@media (max-width: 700px) {
  .app {
    display: block;
  }

  .sidebar {
    width: 100%;

    min-height: auto;

    position: relative;

    padding: 12px;
  }

  .brand {
    margin-bottom: 12px;
  }

  nav {
    display: grid;

    grid-template-columns:
      repeat(4, 1fr);
  }

  .nav-btn {
    justify-content: center;

    flex-direction: column;

    gap: 3px;

    padding: 8px;

    font-size: 11px;

    text-align: center;
  }

  .sidebar-bottom {
    display: none;
  }

  .topbar {
    padding: 0 15px;
  }

  .section-page {
    padding: 18px;
  }

  .page-heading {
    align-items: flex-start;

    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .welcome-card {
    flex-direction: column;

    align-items: flex-start;
  }

  .fee-row {
    grid-template-columns: 1fr;

    gap: 10px;
  }
}

@media (max-width: 450px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .login-box {
    padding: 25px;
  }
}
`;

export default App;
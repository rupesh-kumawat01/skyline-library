import { useEffect, useMemo, useState } from "react";
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeSection, setActiveSection] = useState("dashboard");

  const [search, setSearch] = useState("");

  const [sectionSearch, setSectionSearch] = useState({
    dashboard: "",
    students: "",
    pending: "",
    expired: "",
    expiring: "",
    fees: "",
    seats: "",
  });

  const getSectionSearch = (section) =>
    sectionSearch[section] || "";

  const setSectionSearchValue = (section, value) => {
    setSectionSearch((prev) => ({
      ...prev,
      [section]: value,
    }));
  };

  const [editId, setEditId] = useState(null);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [gender, setGender] = useState("");
  const [seat, setSeat] = useState("");
  const [regDate, setRegDate] = useState("");
  const [expireDate, setExpireDate] = useState("");
  const [fee, setFee] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");

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

  const login = () => {
    if (
      username.trim() === "rupesh" &&
      password === "9993548283"
    ) {
      setIsLoggedIn(true);
      setActiveSection("dashboard");
    } else {
      alert("Wrong Username or Password");
    }
  };

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

  const filterStudents = (list, query) => {
    const value = String(query || "")
      .toLowerCase()
      .trim();

    if (!value) return list;

    return list.filter((student) =>
      [
        student.name,
        student.mobile,
        student.seat,
        student.gender,
        student.regDate,
        student.expireDate,
        student.fee,
      ]
        .filter(
          (item) =>
            item !== undefined &&
            item !== null
        )
        .some((item) =>
          String(item)
            .toLowerCase()
            .includes(value)
        )
    );
  };

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

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Photo should be less than 2 MB");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setPhotoPreview(reader.result);
    };

    reader.readAsDataURL(file);
  };

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

  const addStudent = async () => {
    const cleanName = name.trim();
    const cleanMobile = mobile.trim();
    const cleanSeat = seat.trim();

    if (
      !cleanName ||
      !cleanMobile ||
      !gender ||
      !cleanSeat ||
      !regDate ||
      !expireDate ||
      !fee
    ) {
      alert("Please fill all fields");
      return;
    }

    if (!/^\d{10}$/.test(cleanMobile)) {
      alert("Enter valid 10 digit mobile number");
      return;
    }

    if (Number(fee) < 0) {
      alert("Invalid fee");
      return;
    }

    const seatUsed = students.some(
      (student) =>
        student.seat === cleanSeat &&
        student.status !== "Deleted"
    );

    if (seatUsed) {
      alert("This seat is already occupied");
      return;
    }

    try {
      await addDoc(collection(db, "students"), {
        name: cleanName,
        mobile: cleanMobile,
        gender,
        seat: cleanSeat,
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
      alert("Error: " + error.message);
    }
  };

  const updateStudent = async () => {
    if (!editId) return;

    const cleanName = name.trim();
    const cleanMobile = mobile.trim();
    const cleanSeat = seat.trim();

    if (
      !cleanName ||
      !cleanMobile ||
      !gender ||
      !cleanSeat ||
      !regDate ||
      !expireDate ||
      !fee
    ) {
      alert("Please fill all fields");
      return;
    }

    if (!/^\d{10}$/.test(cleanMobile)) {
      alert("Enter valid 10 digit mobile number");
      return;
    }

    const seatUsed = students.some(
      (student) =>
        student.firebaseId !== editId &&
        student.seat === cleanSeat
    );

    if (seatUsed) {
      alert("This seat is already occupied");
      return;
    }

    try {
      await updateDoc(
        doc(db, "students", editId),
        {
          name: cleanName,
          mobile: cleanMobile,
          gender,
          seat: cleanSeat,
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
      alert("Error: " + error.message);
    }
  };

  const editStudent = (student) => {
    setEditId(student.firebaseId);
    setName(student.name || "");
    setMobile(student.mobile || "");
    setGender(student.gender || "");
    setSeat(student.seat || "");
    setRegDate(student.regDate || "");
    setExpireDate(student.expireDate || "");
    setFee(student.fee ?? "");
    setPhotoPreview(student.photoURL || "");

    setActiveSection("add");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const renewStudent = (student) => {
    const startDate = new Date();

    const todayString = startDate
      .toISOString()
      .split("T")[0];

    const expiry = new Date(startDate);
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
    setFee(student.fee ?? "");
    setPhotoPreview(student.photoURL || "");

    setActiveSection("add");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteStudent = async (id) => {
    const yes = window.confirm(
      "Are you sure you want to delete this student?"
    );

    if (!yes) return;

    try {
      await deleteDoc(doc(db, "students", id));
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  const approveStudent = async (id) => {
    try {
      await updateDoc(
        doc(db, "students", id),
        {
          status: "Approved",
        }
      );
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

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

    if (number.length !== 10) {
      alert("Invalid mobile number");
      return;
    }

    window.open(
      `https://wa.me/91${number}?text=${encodeURIComponent(
        message
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const generateReceipt = (student) => {
    try {
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

      if (student.photoURL) {
        try {
          const format =
            String(student.photoURL).startsWith(
              "data:image/png"
            )
              ? "PNG"
              : "JPEG";

          pdf.addImage(
            student.photoURL,
            format,
            150,
            48,
            35,
            42
          );

          pdf.rect(150, 48, 35, 42);
        } catch (error) {
          console.warn(
            "Photo could not be added",
            error
          );
        }
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);

      pdf.text(
        "LIBRARY FEE RECEIPT",
        20,
        57
      );

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);

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
        `Skyline-Receipt-${String(
          student.name || "Student"
        ).replace(/[^a-z0-9]/gi, "_")}.pdf`
      );
    } catch (error) {
      console.error(error);
      alert(
        "Receipt generate nahi ho paya: " +
          error.message
      );
    }
  };

  const totalIncome = students.reduce(
    (total, student) =>
      total + Number(student.fee || 0),
    0
  );

  const StudentCard = ({
    student,
    expired = false,
    pending = false,
  }) => (
    <div
      className={
        expired
          ? "student-card expired-card"
          : pending
          ? "student-card pending-card"
          : "student-card"
      }
    >
      {student.photoURL ? (
        <img
          className="student-photo"
          src={student.photoURL}
          alt={student.name || "Student"}
        />
      ) : (
        <div className="student-photo no-photo">
          👤
        </div>
      )}

      <h3>{student.name || "Unknown Student"}</h3>

      <div className="student-info">
        <p>📞 {student.mobile || "-"}</p>
        <p>💺 Seat: {student.seat || "-"}</p>
        <p>🚻 {student.gender || "-"}</p>
        <p>📅 {student.regDate || "-"}</p>
        <p>⏰ {student.expireDate || "-"}</p>
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
          type="button"
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
      <span>{title}</span>
    </button>
  );

  const Dashboard = () => {
    const q = getSectionSearch("dashboard");

    const results = filterStudents(
      students,
      q
    );

    return (
      <div className="section-page">
        <div className="page-heading">
          <div>
            <h1>Dashboard</h1>
            <p>
              Welcome back to Skyline Library
            </p>
          </div>

          <button
            type="button"
            className="primary-btn small"
            onClick={() =>
              setActiveSection("add")
            }
          >
            ➕ Add Student
          </button>
        </div>

        <SearchBox
          value={q}
          onChange={(value) =>
            setSectionSearchValue(
              "dashboard",
              value
            )
          }
          placeholder="Search student, mobile, seat..."
        />

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

        {q.trim() && (
          <div className="dashboard-search-results">
            <h3>
              🔎 Matching Students ({results.length})
            </h3>

            {results.length ? (
              <div className="students-grid">
                {results.map((student) => (
                  <StudentCard
                    key={student.firebaseId}
                    student={student}
                    expired={isExpired(
                      student.expireDate
                    )}
                    pending={
                      student.status === "Pending"
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="empty">
                No matching students found.
              </div>
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
            type="button"
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
  };

  const SearchBox = ({
    value,
    onChange,
    placeholder,
  }) => (
    <div className="search-box">
      <span>🔍</span>

      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
      />
    </div>
  );

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
          <div>
            <label>Student Name</label>
            <input
              type="text"
              placeholder="Student Name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />
          </div>

          <div>
            <label>Mobile Number</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="10 digit mobile number"
              value={mobile}
              onChange={(e) =>
                setMobile(
                  e.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
            />
          </div>

          <div>
            <label>Gender</label>
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
              <option value="Other">
                Other
              </option>
            </select>
          </div>

          <div>
            <label>Seat</label>
            <select
              value={seat}
              onChange={(e) =>
                setSeat(e.target.value)
              }
            >
              <option value="">
                Select Seat
              </option>

              {editId &&
                seat &&
                !availableSeats.includes(
                  seat
                ) && (
                  <option value={seat}>
                    {seat}
                  </option>
                )}

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
          </div>

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
            <label>Expiry Date</label>

            <input
              type="date"
              value={expireDate}
              onChange={(e) =>
                setExpireDate(e.target.value)
              }
            />
          </div>

          <div>
            <label>Monthly Fee</label>

            <input
              type="number"
              min="0"
              placeholder="Monthly Fee"
              value={fee}
              onChange={(e) =>
                setFee(e.target.value)
              }
            />
          </div>

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
              <div className="photo-preview-wrap">
                <img
                  src={photoPreview}
                  className="form-photo"
                  alt="Student Preview"
                />

                <button
                  type="button"
                  className="red-btn"
                  onClick={() =>
                    setPhotoPreview("")
                  }
                >
                  Remove Photo
                </button>
              </div>
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

          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              resetForm();
              setActiveSection(
                editId
                  ? "students"
                  : "dashboard"
              );
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const Students = () => {
    const q =
      getSectionSearch("students");

    const list = filterStudents(
      approvedStudents,
      q
    );

    return (
      <div className="section-page">
        <div className="page-heading">
          <div>
            <h1>🟢 Active Students</h1>
            <p>
              All currently active members
            </p>
          </div>

          <button
            type="button"
            className="primary-btn small"
            onClick={() =>
              setActiveSection("add")
            }
          >
            ➕ Add Student
          </button>
        </div>

        <SearchBox
          value={q}
          onChange={(value) => {
            setSectionSearchValue(
              "students",
              value
            );
            setSearch(value);
          }}
          placeholder="Search student name, mobile, seat..."
        />

        {loading ? (
          <div className="empty">
            Loading students...
          </div>
        ) : list.length === 0 ? (
          <div className="empty">
            No active students found.
          </div>
        ) : (
          <div className="students-grid">
            {list.map((student) => (
              <StudentCard
                key={student.firebaseId}
                student={student}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const Pending = () => {
    const q =
      getSectionSearch("pending");

    const list = filterStudents(
      pendingStudents,
      q
    );

    return (
      <div className="section-page">
        <div className="page-heading">
          <div>
            <h1>🟡 Pending Students</h1>
            <p>
              Students waiting for approval
            </p>
          </div>
        </div>

        <SearchBox
          value={q}
          onChange={(value) =>
            setSectionSearchValue(
              "pending",
              value
            )
          }
          placeholder="Search pending student..."
        />

        {list.length === 0 ? (
          <div className="empty">
            {pendingStudents.length === 0
              ? "No pending students."
              : "No matching students found."}
          </div>
        ) : (
          <div className="students-grid">
            {list.map((student) => (
              <StudentCard
                key={student.firebaseId}
                student={student}
                pending
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const Expired = () => {
    const q =
      getSectionSearch("expired");

    const list = filterStudents(
      expiredStudents,
      q
    );

    return (
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

        <SearchBox
          value={q}
          onChange={(value) =>
            setSectionSearchValue(
              "expired",
              value
            )
          }
          placeholder="Search expired student..."
        />

        {list.length === 0 ? (
          <div className="empty">
            🎉 No expired students found.
          </div>
        ) : (
          <div className="students-grid">
            {list.map((student) => (
              <StudentCard
                key={student.firebaseId}
                student={student}
                expired
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const Expiring = () => {
    const q =
      getSectionSearch("expiring");

    const list = filterStudents(
      expiringSoon,
      q
    );

    return (
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

        <SearchBox
          value={q}
          onChange={(value) =>
            setSectionSearchValue(
              "expiring",
              value
            )
          }
          placeholder="Search expiring student..."
        />

        {list.length === 0 ? (
          <div className="empty">
            No memberships expiring within
            7 days.
          </div>
        ) : (
          <div className="students-grid">
            {list.map((student) => (
              <div
                className="student-card warning-card"
                key={student.firebaseId}
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
                  <p>
                    📞 {student.mobile}
                  </p>

                  <p>
                    💺 Seat: {student.seat}
                  </p>

                  <p>
                    ⏰ Expiry:{" "}
                    {student.expireDate}
                  </p>
                </div>

                <button
                  type="button"
                  className="green-btn full"
                  onClick={() =>
                    whatsapp(student)
                  }
                >
                  📲 Send Reminder
                </button>

                <button
                  type="button"
                  className="orange-btn full"
                  onClick={() =>
                    editStudent(student)
                  }
                >
                  ✏️ Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const Fees = () => {
    const q =
      getSectionSearch("fees");

    const list = filterStudents(
      students,
      q
    );

    return (
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

        <SearchBox
          value={q}
          onChange={(value) =>
            setSectionSearchValue(
              "fees",
              value
            )
          }
          placeholder="Search student, mobile, seat or fee..."
        />

        {list.length === 0 ? (
          <div className="empty">
            No matching students found.
          </div>
        ) : (
          <div className="fee-list">
            {list.map((student) => (
              <div
                className="fee-row"
                key={student.firebaseId}
              >
                <div className="fee-student">
                  {student.photoURL ? (
                    <img
                      src={student.photoURL}
                      alt={student.name}
                    />
                  ) : (
                    <div className="fee-avatar">
                      👤
                    </div>
                  )}

                  <div>
                    <b>{student.name}</b>

                    <small>
                      Seat {student.seat}
                    </small>

                    <small>
                      {student.mobile}
                    </small>
                  </div>
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
        )}
      </div>
    );
  };

  const Seats = () => {
    const q =
      getSectionSearch("seats")
        .toLowerCase()
        .trim();

    const renderSeats = (prefix) =>
      Array.from(
        { length: 36 },
        (_, index) => {
          const seatNo = prefix
            ? `N ${index + 1}`
            : String(index + 1);

          const student = students.find(
            (item) =>
              item.seat === seatNo
          );

          const expired =
            student &&
            isExpired(
              student.expireDate
            );

          const matches =
            !q ||
            seatNo
              .toLowerCase()
              .includes(q) ||
            String(
              student?.name || ""
            )
              .toLowerCase()
              .includes(q) ||
            String(
              student?.mobile || ""
            )
              .includes(q);

          if (!matches) return null;

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
                if (!student) return;

                alert(
                  `Name: ${student.name}\n` +
                    `Mobile: ${student.mobile}\n` +
                    `Seat: ${student.seat}\n` +
                    `Expiry: ${student.expireDate}`
                );
              }}
            >
              <b>{seatNo}</b>

              <small>
                {student
                  ? expired
                    ? "Expired"
                    : "Occupied"
                  : "Vacant"}
              </small>
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

        <SearchBox
          value={q}
          onChange={(value) =>
            setSectionSearchValue(
              "seats",
              value
            )
          }
          placeholder="Search seat no. or student name..."
        />

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

            <p>
              Library Management System
            </p>

            <input
              type="text"
              placeholder="Username"
              autoComplete="username"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  login();
                }
              }}
            />

            <input
              type="password"
              placeholder="Password"
              autoComplete="current-password"
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
              className="primary-btn login-btn"
              onClick={login}
            >
              🔐 Login
            </button>
          </div>
        </div>
      </>
    );
  }

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
            <small>Owner Contact</small>

            <b>
              📞 {OWNER_NUMBER}
            </b>

            <button
              type="button"
              className="logout-btn"
              onClick={() => {
                setIsLoggedIn(false);
                setUsername("");
                setPassword("");
              }}
            >
              🚪 Logout
            </button>
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

          {activeSection === "dashboard" && (
            <Dashboard />
          )}

          {activeSection === "add" && (
            <AddStudent />
          )}

          {activeSection === "students" && (
            <Students />
          )}

          {activeSection === "seats" && (
            <Seats />
          )}

          {activeSection === "fees" && (
            <Fees />
          )}

          {activeSection === "expiring" && (
            <Expiring />
          )}

          {activeSection === "expired" && (
            <Expired />
          )}

          {activeSection === "pending" && (
            <Pending />
          )}
        </main>
      </div>
    </>
  );
}

const styles = `
* {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  min-height: 100%;
  width: 100%;
}

body {
  font-family:
    Inter,
    Arial,
    Helvetica,
    sans-serif;

  background:
    radial-gradient(
      circle at top right,
      rgba(79, 70, 229, .20),
      transparent 32%
    ),
    linear-gradient(
      135deg,
      #f8fafc,
      #eef2ff 55%,
      #ecfeff
    );

  color: #0f172a;
}

button,
input,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  opacity: .6;
  cursor: not-allowed;
}

input,
select {
  outline: none;
}

input:focus,
select:focus {
  border-color: #4f46e5 !important;
  box-shadow:
    0 0 0 3px rgba(79,70,229,.12);
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
      #dbeafe,
      transparent 45%
    ),
    linear-gradient(
      135deg,
      #eef2ff,
      #ecfeff
    );
}

.login-box {
  width: 400px;
  max-width: 100%;

  padding: 42px;

  border-radius: 28px;

  background: rgba(255,255,255,.94);

  border:
    1px solid rgba(255,255,255,.8);

  box-shadow:
    0 30px 80px rgba(15,23,42,.16);

  text-align: center;
}

.logo-circle {
  width: 82px;
  height: 82px;

  margin: 0 auto 18px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 24px;

  background:
    linear-gradient(
      135deg,
      #4f46e5,
      #06b6d4
    );

  color: white;

  font-size: 38px;

  box-shadow:
    0 15px 30px rgba(79,70,229,.25);
}

.login-box h1 {
  margin: 0 0 6px;

  font-size: 28px;

  color: #1e1b4b;
}

.login-box p {
  margin: 0 0 22px;

  color: #64748b;
}

.login-box input {
  width: 100%;

  padding: 14px 15px;

  margin-top: 12px;

  border:
    1px solid #cbd5e1;

  border-radius: 13px;

  background: #f8fafc;

  color: #0f172a;
}

.login-btn {
  width: 100%;
  margin-top: 18px;
}

/* APP */

.app {
  min-height: 100vh;

  display: flex;

  background:
    linear-gradient(
      135deg,
      #f8fafc,
      #eef2ff 55%,
      #ecfeff
    );
}

/* SIDEBAR */

.sidebar {
  width: 255px;
  min-height: 100vh;

  position: sticky;
  top: 0;

  display: flex;
  flex-direction: column;

  padding: 20px;

  background:
    linear-gradient(
      180deg,
      #111827,
      #172554
    );

  color: white;

  box-shadow:
    10px 0 30px rgba(15,23,42,.10);

  z-index: 10;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;

  margin-bottom: 28px;
}

.brand-icon {
  width: 48px;
  height: 48px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 15px;

  background:
    linear-gradient(
      135deg,
      #6366f1,
      #06b6d4
    );

  font-size: 24px;
}

.brand h2 {
  margin: 0;

  font-size: 20px;
}

.brand span {
  color: #67e8f9;

  font-size: 13px;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.nav-btn {
  width: 100%;

  border: none;

  background: transparent;

  color: #cbd5e1;

  text-align: left;

  padding: 12px;

  border-radius: 12px;

  display: flex;
  align-items: center;
  gap: 12px;

  transition:
    .2s ease;
}

.nav-btn:hover {
  background: rgba(255,255,255,.09);
  color: white;
  transform: translateX(3px);
}

.nav-btn.active {
  color: white;

  background:
    linear-gradient(
      90deg,
      #4f46e5,
      #4338ca
    );

  box-shadow:
    0 8px 20px rgba(79,70,229,.25);
}

.sidebar-bottom {
  margin-top: auto;

  padding: 15px;

  border-radius: 16px;

  background: rgba(255,255,255,.07);

  display: flex;
  flex-direction: column;
  gap: 7px;
}

.sidebar-bottom small {
  color: #94a3b8;
}

.sidebar-bottom b {
  font-size: 13px;
}

.logout-btn {
  border: none;

  padding: 9px;

  margin-top: 5px;

  border-radius: 9px;

  background: rgba(239,68,68,.16);

  color: #fca5a5;
}

/* MAIN */

.main {
  flex: 1;
  min-width: 0;

  overflow-x: hidden;
}

.topbar {
  height: 68px;

  padding: 0 30px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  background: rgba(255,255,255,.75);

  border-bottom:
    1px solid #e2e8f0;

  backdrop-filter: blur(12px);

  position: sticky;
  top: 0;

  z-index: 5;
}

.topbar span {
  color: #64748b;

  font-size: 12px;

  font-weight: 700;

  letter-spacing: 1px;
}

.top-status {
  color: #16a34a;

  font-size: 13px;

  font-weight: 700;
}

/* PAGE */

.section-page {
  padding: 30px;

  animation:
    pageIn .25s ease;
}

@keyframes pageIn {
  from {
    opacity: 0;
    transform: translateY(5px);
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

  margin-bottom: 22px;
}

.page-heading h1 {
  margin: 0 0 5px;

  font-size: 30px;

  color: #0f172a;
}

.page-heading p {
  margin: 0;

  color: #64748b;
}

/* SEARCH */

.search-box {
  width: 480px;
  max-width: 100%;

  min-height: 50px;

  display: flex;
  align-items: center;
  gap: 9px;

  padding: 9px 15px;

  margin-bottom: 25px;

  border-radius: 14px;

  background: white;

  border:
    1px solid #e2e8f0;

  box-shadow:
    0 5px 20px rgba(15,23,42,.05);
}

.search-box input {
  width: 100%;

  border: none;

  background: transparent;

  color: #0f172a;

  outline: none;

  min-width: 0;
}

.search-box input::placeholder {
  color: #94a3b8;
}

/* STATS */

.stats-grid {
  display: grid;

  grid-template-columns:
    repeat(auto-fit, minmax(190px, 1fr));

  gap: 18px;
}

.stat-card {
  padding: 22px;

  border-radius: 20px;

  background: white;

  border:
    1px solid #e2e8f0;

  box-shadow:
    0 8px 25px rgba(15,23,42,.06);

  cursor: pointer;

  transition: .2s ease;
}

.stat-card:hover {
  transform: translateY(-5px);

  box-shadow:
    0 18px 35px rgba(15,23,42,.11);
}

.stat-card span {
  font-size: 28px;
}

.stat-card h3 {
  margin: 13px 0 5px;

  color: #64748b;

  font-size: 14px;
}

.stat-card strong {
  font-size: 29px;

  color: #0f172a;
}

.stat-card.blue {
  border-top: 4px solid #3b82f6;
}

.stat-card.green {
  border-top: 4px solid #22c55e;
}

.stat-card.yellow {
  border-top: 4px solid #eab308;
}

.stat-card.red {
  border-top: 4px solid #ef4444;
}

.stat-card.orange {
  border-top: 4px solid #f97316;
}

.stat-card.purple {
  border-top: 4px solid #9333ea;
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
      #eef2ff,
      #ecfeff
    );

  border:
    1px solid #c7d2fe;
}

.welcome-card h2 {
  margin-top: 0;
}

.welcome-card p {
  color: #64748b;
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

  transition: .2s ease;
}

.primary-btn {
  background:
    linear-gradient(
      135deg,
      #4f46e5,
      #4338ca
    );

  box-shadow:
    0 7px 16px rgba(79,70,229,.18);
}

.secondary-btn {
  background: #64748b;
}

.blue-btn {
  background: #4f46e5;
}

.green-btn {
  background: #16a34a;
}

.orange-btn {
  background: #ea580c;
}

.red-btn {
  background: #dc2626;
}

.purple-btn {
  background: #7c3aed;
}

.primary-btn:hover,
.secondary-btn:hover,
.blue-btn:hover,
.green-btn:hover,
.orange-btn:hover,
.red-btn:hover,
.purple-btn:hover {
  transform: translateY(-2px);

  filter: brightness(1.06);
}

.small {
  padding: 10px 16px;
}

.full {
  width: 100%;
}

/* FORM */

.form-card {
  max-width: 950px;

  padding: 27px;

  border-radius: 22px;

  background: white;

  border:
    1px solid #e2e8f0;

  box-shadow:
    0 10px 30px rgba(15,23,42,.07);
}

.form-grid {
  display: grid;

  grid-template-columns:
    repeat(2, 1fr);

  gap: 17px;
}

.form-grid > div {
  min-width: 0;
}

.form-grid input,
.form-grid select {
  width: 100%;

  padding: 13px;

  border:
    1px solid #cbd5e1;

  border-radius: 11px;

  background: #f8fafc;

  color: #0f172a;
}

.form-grid label {
  display: block;

  color: #475569;

  font-size: 13px;

  font-weight: 600;

  margin-bottom: 7px;
}

.photo-box {
  padding: 15px;

  border-radius: 15px;

  border:
    1px dashed #94a3b8;

  background: #f8fafc;
}

.photo-box input {
  width: 100%;

  margin-top: 5px;
}

.photo-preview-wrap {
  display: flex;

  flex-direction: column;

  align-items: center;

  gap: 10px;
}

.form-photo {
  width: 115px;
  height: 115px;

  display: block;

  margin: 15px auto 5px;

  object-fit: cover;

  border-radius: 50%;

  border: 4px solid #4f46e5;
}

.form-actions {
  display: flex;

  gap: 10px;

  margin-top: 22px;
}

/* STUDENTS */

.students-grid {
  display: grid;

  grid-template-columns:
    repeat(auto-fill, minmax(275px, 1fr));

  gap: 20px;
}

.student-card {
  padding: 20px;

  border-radius: 21px;

  background: white;

  border:
    1px solid #e2e8f0;

  box-shadow:
    0 8px 25px rgba(15,23,42,.06);

  transition: .22s ease;
}

.student-card:hover {
  transform: translateY(-4px);

  box-shadow:
    0 18px 38px rgba(15,23,42,.11);
}

.student-photo {
  width: 110px;
  height: 110px;

  object-fit: cover;

  display: block;

  margin: 0 auto 14px;

  border-radius: 50%;

  border: 4px solid #4f46e5;

  background: #eef2ff;
}

.no-photo {
  display: flex;

  align-items: center;
  justify-content: center;

  font-size: 36px;
}

.student-card h3 {
  text-align: center;

  margin: 8px 0 15px;

  color: #0f172a;

  font-size: 20px;
}

.student-info {
  color: #475569;
}

.student-info p {
  margin: 7px 0;
}

.card-buttons {
  display: flex;

  flex-direction: column;

  gap: 8px;

  margin-top: 16px;
}

.expired-card {
  border:
    1px solid #fecaca;

  background:
    linear-gradient(
      180deg,
      #fff,
      #fff7f7
    );
}

.pending-card {
  border:
    1px solid #fde68a;
}

.warning-card {
  border:
    1px solid #fde68a;

  background:
    linear-gradient(
      180deg,
      white,
      #fffbeb
    );
}

.expired-label,
.pending-label {
  text-align: center;

  padding: 8px;

  border-radius: 9px;

  margin: 11px 0;

  font-weight: 800;

  font-size: 13px;
}

.expired-label {
  background: #fee2e2;

  color: #dc2626;
}

.pending-label {
  background: #fef3c7;

  color: #b45309;
}

.red-text {
  color: #dc2626 !important;
}

.yellow-text {
  color: #ca8a04 !important;
}

/* DASHBOARD SEARCH */

.dashboard-search-results {
  margin: 25px 0;
}

.dashboard-search-results h3 {
  margin-bottom: 15px;
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
  padding: 23px;

  border-radius: 18px;

  background: white;

  border:
    1px solid #e2e8f0;

  box-shadow:
    0 8px 25px rgba(15,23,42,.05);
}

.fee-summary span {
  display: block;

  color: #64748b;

  margin-bottom: 8px;
}

.fee-summary strong {
  font-size: 28px;

  color: #16a34a;
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

  padding: 13px 17px;

  border-radius: 15px;

  background: white;

  border:
    1px solid #e2e8f0;
}

.fee-student {
  display: flex;

  align-items: center;

  gap: 12px;
}

.fee-student img,
.fee-avatar {
  width: 46px;
  height: 46px;

  object-fit: cover;

  border-radius: 50%;

  border: 2px solid #c7d2fe;
}

.fee-avatar {
  display: flex;

  align-items: center;
  justify-content: center;

  background: #eef2ff;

  font-size: 20px;
}

.fee-student div:last-child {
  display: flex;

  flex-direction: column;

  gap: 3px;
}

.fee-student small {
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
  min-height: 68px;

  padding: 13px 7px;

  border-radius: 13px;

  text-align: center;

  cursor: pointer;

  display: flex;

  flex-direction: column;

  justify-content: center;

  transition: .2s ease;
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

.seat.vacant {
  background: #dcfce7;

  border:
    1px solid #86efac;

  color: #166534;
}

.seat.occupied {
  background: #fee2e2;

  border:
    1px solid #fca5a5;

  color: #991b1b;
}

.seat.occupied-expired {
  background: #ffedd5;

  border:
    2px solid #fb923c;

  color: #c2410c;
}

/* EMPTY */

.empty {
  padding: 50px 20px;

  text-align: center;

  border-radius: 18px;

  background: white;

  border:
    1px solid #e2e8f0;

  color: #64748b;

  box-shadow:
    0 8px 25px rgba(15,23,42,.05);
}

/* MOBILE */

@media (max-width: 900px) {
  .sidebar {
    width: 220px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .seats-grid {
    grid-template-columns:
      repeat(6, 70px);

    overflow-x: auto;

    padding-bottom: 8px;
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

    padding: 8px 4px;

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

    gap: 12px;
  }

  .fee-row > strong {
    font-size: 22px;
  }
}

@media (max-width: 450px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .login-box {
    padding: 27px 20px;
  }

  .page-heading h1 {
    font-size: 25px;
  }

  .students-grid {
    grid-template-columns: 1fr;
  }

  .form-card {
    padding: 18px;
  }
}
`;

export default App;
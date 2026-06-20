import { useState, useEffect } from "react";

import jsPDF from "jspdf";

import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc
} from "firebase/firestore";

import { db } from "./firebase";

function App() {

  // LOGIN

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // SEARCH

  const [search, setSearch] = useState("");

  // STUDENTS

  const [students, setStudents] = useState([]);

  // FORM

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [gender, setGender] = useState("");
  const [seat, setSeat] = useState("");
  const [regDate, setRegDate] = useState("");
  const [expireDate, setExpireDate] = useState("");
  

  // RECEIPT

 const [editId, setEditId] = useState(null);
const [receiptNo, setReceiptNo] = useState(1001);
  // FIREBASE LIVE DATA

  useEffect(() => {

    const unsubscribe =
      onSnapshot(

        collection(db, "students"),

        (snapshot) => {

          const studentData =
            snapshot.docs.map((doc) => ({

              firebaseId: doc.id,

              ...doc.data()

            }));

          setStudents(studentData);

        }

      );

    return () => unsubscribe();

  }, []);

  // LOGIN

  const login = () => {

    if (
      username === "rupesh" &&
      password === "9993548283"
    ) {

      setIsLoggedIn(true);

    } else {

      alert("Wrong Username or Password");

    }

  };

// ADD STUDENT

const addStudent = async () => {
  alert("ADD FUNCTION RUNNING");

  try {

    if (
      !name ||
      !mobile ||
      !gender ||
      !seat ||
      !regDate ||
      !expireDate
    ) {
      alert("Fill all fields");
      return;
    }

    const newStudent = {
      id: receiptNo,
      name,
      mobile,
      gender,
      seat,
      regDate,
      expireDate,
      
    };

    await addDoc(
      collection(db, "students"),
      newStudent
    );
    alert("DATA SAVED");

    setReceiptNo(receiptNo + 1);

    setName("");
    setMobile("");
    setGender("");
    setSeat("");
    setRegDate("");
    setExpireDate("");
    setPhoto(null);

    alert("Student Added Successfully");

  } catch (error) {

    console.log(error);
    alert(error.message);

  }

};
const updateStudent = async () => {

  try {

    await updateDoc(
      doc(db, "students", editId),
      {
        name,
        mobile,
        gender,
        seat,
        regDate,
        expireDate
      }
    );

    alert("Student Updated Successfully");

    setEditId(null);

    setName("");
    setMobile("");
    setGender("");
    setSeat("");
    setRegDate("");
    setExpireDate("");
    setPhoto(null);

  } catch (error) {

    console.log(error);
    alert(error.message);

  }

};  
// DELETE

  const deleteStudent = async (id) => {

    await deleteDoc(
      doc(db, "students", id)
    );

  };

  // SEARCH

  const filteredStudents =
    students.filter((student) =>
      student.name
        .toLowerCase()
        .includes(search.toLowerCase())
    );
     const groundStudents = students.filter(
  (s) => String(s.seat).startsWith("N")
);

const topStudents = students.filter(
  (s) => !String(s.seat).startsWith("N")
);

const groundOccupied = groundStudents.length;
const topOccupied = topStudents.length;

const groundVacant = 36 - groundOccupied;
const topVacant = 36 - topOccupied;
const groundOccupiedSeats = groundStudents.map(
  (s) => Number(String(s.seat).replace("N", ""))
);

const groundVacantSeats = [];

for (let i = 1; i <= 36; i++) {
  if (!groundOccupiedSeats.includes(i)) {
    groundVacantSeats.push("N" + i);
  }
}

const topOccupiedSeats = topStudents.map(
  (s) => Number(s.seat)
);

const topVacantSeats = [];

for (let i = 1; i <= 36; i++) {
  if (!topOccupiedSeats.includes(i)) {
    topVacantSeats.push(i);
  }
}
  // WHATSAPP

  const sendWhatsApp = (student) => {

    let message = "";

    if (student.gender === "Male") {

      message =
        "Bhaiya apki library ki date over ho gai hai.";

    } else {

      message =
        "Didi apki library ki date over ho gai hai.";

    }

    const url =

`https://wa.me/91${student.mobile}?text=${encodeURIComponent(message)}`;

    window.open(url);

  };

  // PDF

  const generateReceipt = (student) => {

    const docPdf = new jsPDF();

    docPdf.setFontSize(28);

    docPdf.setTextColor(0, 102, 255);

    docPdf.text(
      "SKYLINE LIBRARY",
      35,
      20
    );

    docPdf.setFontSize(12);

    docPdf.setTextColor(0, 0, 0);

    docPdf.text(
      "ESTD - 2022",
      82,
      28
    );

      docPdf.text(
               "Near Hanuman Mandir, Front of Nupur Kirana Store",
      12,
      40
    );

     docPdf.text(
              "Pawan Puri Colony, Indore",
      58,
      48
    );

    docPdf.text(
                  "Mob. 9826157790",
      70,
      56
    );

    docPdf.line(10, 62, 200, 62);

    docPdf.setFontSize(18);

    docPdf.setTextColor(0, 102, 255);

    docPdf.text(
       "LIBRARY FEES RECEIPT",
      45,
      78
    );

    docPdf.setTextColor(0, 0, 0);

    docPdf.setFontSize(13);

    docPdf.text(
      `Receipt No : ${student.id}`,
      20,
      98
    );

    docPdf.text(
      `Student Name : ${student.name}`,
      20,
      115
    );

    docPdf.text(
      `Mobile Number : ${student.mobile}`,
      20,
      132
    );

    docPdf.text(
      `Gender : ${student.gender}`,
      20,
      149
    );

    docPdf.text(
      `Seat Number : ${student.seat}`,
      20,
      166
    );

    docPdf.text(
      `Registration Date : ${student.regDate}`,
      20,
      183
    );

    docPdf.text(
      `Expire Date : ${student.expireDate}`,
      20,
      200
    );

    docPdf.text(
      `Fees : Rs. 500`,
      20,
      217
    );

    docPdf.setTextColor(0, 180, 0);

    docPdf.setFontSize(24);

    docPdf.text(
      "PAID",
      20,
      238
    );

    docPdf.save(
      `${student.name}.pdf`
    );

  };

  // DUE STUDENTS

  const today = new Date();

  const dueStudents =
    students.filter(
      (student) =>
        new Date(student.expireDate)
          < today
    );

  // LOGIN PAGE

  if (!isLoggedIn) {

    return (

      <div style={{

        minHeight: "100vh",

        background:
          "linear-gradient(135deg,#0f172a,#1e293b,#312e81)",

        display: "flex",

        justifyContent: "center",

        alignItems: "center",

        fontFamily: "Arial"

      }}>

        <div style={{

          width: "340px",

          padding: "30px",

          borderRadius: "25px",

          background:
            "rgba(255,255,255,0.08)",

          backdropFilter: "blur(15px)"

        }}>

          <h1 style={{
            textAlign: "center",
            color: "#38bdf8"
          }}>
            Skyline Library
          </h1>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            style={inputStyle}
          />

          <button
            onClick={login}
            style={buttonBlue}
          >
            Login
          </button>

        </div>

      </div>

    );

  }

  // MAIN PAGE

  return (

    <div style={{

      minHeight: "100vh",

      background:
        "linear-gradient(135deg,#0f172a,#1e293b,#312e81)",

      padding: "25px",

      color: "white",

      fontFamily: "Arial"

    }}>

      <h1 style={{
        color: "#38bdf8"
      }}>
        Skyline Library
      </h1>

      <h2>
        👨‍🎓 Total Students:
        {students.length}
      </h2>

      <h2 style={{
        color: "#facc15"
      }}>
        ⚠ Fees Due:
        {dueStudents.length}
      </h2>
      <div
  style={{
    display: "flex",
    gap: "15px",
    marginBottom: "20px"
  }}
>

  <div style={cardStyle}>
    <h3>🏢 Ground Floor</h3>

<p>Occupied: {groundOccupied}</p>

<p>Vacant: {groundVacant}</p>

<p style={{ fontSize: "12px" }}>
  {groundVacantSeats.join(", ")}
</p>
  </div>

  <div style={cardStyle}>
    <h3>🏢 Top Floor</h3>

<p>Occupied: {topOccupied}</p>

<p>Vacant: {topVacant}</p>

<p style={{ fontSize: "12px" }}>
  {topVacantSeats.join(", ")}
</p>
  </div>

</div>

      {/* SEARCH */}

      <input
        type="text"
        placeholder="Search Student"
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
        style={inputStyle}
 
/>
      {/* FORM */}

      <div style={formStyle}>

        <input
          type="text"
          placeholder="Student Name"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="Mobile Number"
          value={mobile}
          onChange={(e) =>
            setMobile(e.target.value)
          }
          style={inputStyle}
        />

        <select
          value={gender}
          onChange={(e) =>
            setGender(e.target.value)
          }
          style={inputStyle}
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

        <input
          type="text"
          placeholder="Seat Number"
          value={seat}
          onChange={(e) =>
            setSeat(e.target.value)
          }
          style={inputStyle}
        />
        <input
  type="file"
  accept="image/*"
  onChange={(e) =>
    setPhoto(e.target.files[0])
  }
  style={inputStyle}
/>

        <label>
          Registration Date
        </label>

        <input
          type="date"
          value={regDate}
          onChange={(e) =>
            setRegDate(e.target.value)
          }
          style={inputStyle}
        />

        <label>
          Expire Date
        </label>

        <input
          type="date"
          value={expireDate}
          onChange={(e) =>
            setExpireDate(e.target.value)
          }
          style={inputStyle}
        />

      <button
  onClick={
    editId
      ? updateStudent
      : addStudent
  }
  style={buttonGreen}
>
  {
    editId
      ? "Update Student"
      : "Add Student"
  }
</button>

      </div>
      <div
  style={{
    width: "280px",
    background: "rgba(255,255,255,0.08)",
    padding: "15px",
    borderRadius: "15px"
  }}
></div>
      {/* STUDENTS */}

     
          {[...filteredStudents]
.sort((a,b)=>{

const aExpired=
new Date(a.expireDate)<new Date();

const bExpired=
new Date(b.expireDate)<new Date();

if(aExpired!==bExpired){

return bExpired-aExpired;

}

return a.name.localeCompare(
b.name
);

})
.map((student,index)=>( 
  

        <div
          key={index}
          style={cardStyle}
        >

          <h3>{student.name}</h3>

          <p>📞 {student.mobile}</p>

          <p>🚻 {student.gender}</p>

          <p>💺 Seat : {student.seat}</p>

          <p>📅 Registration : {student.regDate}</p>

          <p>⏳ Expire : {student.expireDate}</p>

          {
            new Date(student.expireDate)
              < new Date()

              &&

              <h3 style={{
                color: "red"
              }}>
                Fees Expired
              </h3>
          }

          <button
            onClick={() =>
              generateReceipt(student)
            }
            style={buttonBlue}
          >
            Receipt
          </button>

          <button
            onClick={() =>
              sendWhatsApp(student)
            }
            style={buttonGreen}
          >
            WhatsApp
          </button>
<button
  onClick={() => {
    setEditId(student.firebaseId);

    setName(student.name);
    setMobile(student.mobile);
    setGender(student.gender);
    setSeat(student.seat);
    setRegDate(student.regDate);
    setExpireDate(student.expireDate);
  }}
  style={buttonBlue}
>
  Edit
</button>

         <button
  onClick={() =>
    deleteStudent(
      student.firebaseId
    )
  }
  style={buttonRed}
>
  Delete
</button>

        </div>

      ))}

    </div>

  );

}


// STYLES

const formStyle = {

  width: "360px",

  padding: "25px",

  borderRadius: "20px",

  background:
    "rgba(255,255,255,0.08)",

  marginBottom: "25px"

};

const cardStyle = {

  width: "360px",

  padding: "20px",

  borderRadius: "20px",

  background:
    "rgba(255,255,255,0.08)",

  marginBottom: "20px"

};

const inputStyle = {

  width: "100%",

  padding: "14px",

  marginBottom: "12px",

  borderRadius: "12px",

  border: "none",

  background:
    "rgba(255,255,255,0.1)",

  color: "white"

};

const buttonBlue = {

  width: "100%",

  padding: "12px",

  marginTop: "10px",

  border: "none",

  borderRadius: "12px",

  color: "white",

  cursor: "pointer",

  background:
    "linear-gradient(to right,#06b6d4,#3b82f6)"

};

const buttonGreen = {

  width: "100%",

  padding: "12px",

  marginTop: "10px",

  border: "none",

  borderRadius: "12px",

  color: "white",

  cursor: "pointer",

  background:
    "linear-gradient(to right,#22c55e,#16a34a)"

};

const buttonRed = {

  width: "100%",

  padding: "12px",

  marginTop: "10px",

  border: "none",

  borderRadius: "12px",

  color: "white",

  cursor: "pointer",

  background:
    "linear-gradient(to right,#ef4444,#dc2626)"

};


export default App;
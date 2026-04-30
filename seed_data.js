const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, serverTimestamp } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyDwXgG11d-FJc1IkRLs9_H7tR6NBIKXDbw",
  authDomain: "tutor-website-c532a.firebaseapp.com",
  projectId: "tutor-website-c532a",
  storageBucket: "tutor-website-c532a.firebasestorage.app",
  messagingSenderId: "925264880105",
  appId: "1:925264880105:web:59a1d97951995179466b78"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log("Seeding dummy data...");

  // Tutors
  const tutors = [
    {
      id: "tutor_1",
      name: "Dr. Sarah Mitchell",
      email: "sarah.m@educra.com",
      phone: "9876543210",
      qualification: "PhD in Physics",
      experience: "5+ Years",
      status: "pending",
      role: "tutor",
      specialization: "Physics",
      subjects: ["Physics", "Quantum Mechanics"],
      createdAt: serverTimestamp(),
      avatar: "https://ui-avatars.com/api/?name=Sarah+Mitchell&background=f0f4ff&color=0047ab&bold=true"
    },
    {
      id: "tutor_2",
      name: "Prof. James Anderson",
      email: "james.a@educra.com",
      phone: "9876543211",
      qualification: "MSc Mathematics",
      experience: "3-5 Years",
      status: "pending",
      role: "tutor",
      specialization: "Mathematics",
      subjects: ["Calculus", "Linear Algebra"],
      createdAt: serverTimestamp(),
      avatar: "https://ui-avatars.com/api/?name=James+Anderson&background=f0f4ff&color=0047ab&bold=true"
    }
  ];

  for (const tutor of tutors) {
    await setDoc(doc(db, "users", tutor.id), tutor);
    console.log(`Added tutor: ${tutor.name}`);
  }

  // Students
  const students = [
    {
      id: "student_1",
      name: "Kevin Hart",
      email: "kevin.h@student.com",
      mobile: "9998887776",
      class: "12",
      board: "CBSE",
      subjects: ["Physics", "Mathematics"],
      totalBookings: 0,
      status: "active",
      createdAt: serverTimestamp(),
      avatar: "https://ui-avatars.com/api/?name=Kevin+Hart&background=f0f4ff&color=0047ab&bold=true"
    },
    {
      id: "student_2",
      name: "Emma Stone",
      email: "emma.s@student.com",
      mobile: "9998887775",
      class: "10",
      board: "ICSE",
      subjects: ["Science"],
      totalBookings: 0,
      status: "active",
      createdAt: serverTimestamp(),
      avatar: "https://ui-avatars.com/api/?name=Emma+Stone&background=f0f4ff&color=0047ab&bold=true"
    }
  ];

  for (const student of students) {
    await setDoc(doc(db, "students", student.id), student);
    console.log(`Added student: ${student.name}`);
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});

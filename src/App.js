/* global __initial_auth_token */
import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  getDoc
} from 'firebase/firestore';

// Your web app's Firebase configuration
// Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyC8ovYtPmE5QdeZnNQGTc0I2WfuvqLursM",
  authDomain: "hackathon-99817.firebaseapp.com",
  projectId: "hackathon-99817",
  storageBucket: "hackathon-99817.firebasestorage.app",
  messagingSenderId: "196635937156",
  appId: "1:196635937156:web:5289a52b9787a8493e35d1",
  measurementId: "G-3TLVSX088F"
};

// Initialize Firebase services outside the component to prevent re-initialization
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app); // Initialize Firebase Analytics

// AppContext provides Firebase instances and user-related states to child components
const AppContext = createContext(null);

// Custom hook to easily access the AppContext
const useAppContext = () => useContext(AppContext);

// --- Utility Components ---

/**
 * LoadingSpinner component displays a simple animated spinner.
 * It's shown while the application is loading or authenticating.
 */
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600 border-opacity-75"></div>
  </div>
);

/**
 * MessageBox component displays a modal-like message box for user feedback.
 * It replaces browser's alert() for better UI/UX.
 * @param {object} props - Component props.
 * @param {string} props.message - The message to display.
 * @param {function} props.onClose - Function to call when the message box is closed.
 */
const MessageBox = ({ message, onClose }) => (
  <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50 p-4">
    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center transform scale-100 animate-fade-in">
      <p className="text-xl font-semibold text-gray-800 mb-6">{message}</p>
      <button
        onClick={onClose}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full transition duration-300 transform hover:scale-105 shadow-lg"
      >
        Dismiss
      </button>
    </div>
  </div>
);

/**
 * FeatureCard component for displaying features on the home page.
 */
const FeatureCard = ({ icon, title, description, onClick }) => (
  <div
    className="bg-white p-6 rounded-2xl shadow-xl hover:shadow-2xl transition duration-300 transform hover:-translate-y-2 cursor-pointer flex flex-col items-center text-center border border-blue-200 hover:border-blue-400"
    onClick={onClick}
  >
    <div className="text-5xl mb-4 text-blue-500">{icon}</div>
    <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}</h3>
    <p className="text-gray-500 text-sm">{description}</p>
  </div>
);

/**
 * DashboardCard component for displaying key metrics on dashboards.
 */
const DashboardCard = ({ title, value, icon }) => (
  <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center text-center border border-indigo-200 transform transition duration-300 hover:scale-103 hover:shadow-2xl">
    <div className="text-5xl mb-4 text-indigo-500">{icon}</div>
    <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}</h3>
    <p className="text-3xl font-bold text-indigo-600">{value}</p>
  </div>
);


// --- Pages ---

/**
 * ForgotPasswordModal component for handling password reset requests.
 */
const ForgotPasswordModal = ({ auth, onClose, setMessage }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setModalMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setModalMessage('Password reset email sent! Check your inbox.');
      setMessage('Password reset email sent! Check your inbox.'); // Also show in main app message box
    } catch (error) {
      console.error("Password reset error:", error);
      setModalMessage(`Failed to send reset email: ${error.message}`);
      setMessage(`Failed to send reset email: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center transform scale-100 animate-fade-in">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">Reset Password</h3>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label htmlFor="resetEmail" className="sr-only">Email</label>
            <input
              type="email"
              id="resetEmail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Send Reset Email'
            )}
          </button>
        </form>
        {modalMessage && (
          <p className="mt-4 text-sm font-medium text-gray-700">{modalMessage}</p>
        )}
        <button
          onClick={onClose}
          className="mt-6 text-blue-600 hover:underline font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
};


/**
 * LoginPage component handles user login and registration.
 */
const LoginPage = ({ auth, onLoginSuccess, setMessage }) => {
  const { db, appId } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState('recruiter'); // Default role for new users
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  /**
   * Handles email/password authentication (login or registration).
   */
  const handleEmailPasswordAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      let userCredential;
      if (isRegistering) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        setMessage('Registration successful! You are now logged in.');
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        setMessage('Login successful!');
      }
      // Save user role and basic profile to Firestore
      const user = userCredential.user;
      if (db && user) {
        // Store role and initial profile in a single document for consistency
        await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/userProfile`, 'profile'), {
          role: userRole,
          email: user.email,
          name: '', // Initialize name
          skills: '',
          experience: '',
          desiredJobRole: '',
          resumeUrl: '',
          createdAt: new Date()
        }, { merge: true }); // Use merge to avoid overwriting if doc exists
      }
      onLoginSuccess(userRole); // Notify parent of successful login and user role
    } catch (error) {
      console.error("Authentication error:", error);
      let errorMessage = `Authentication failed: ${error.message}`;

      // More specific error messages for common Firebase auth errors
      if (error.code === 'auth/invalid-credential' ||
          error.code === 'auth/wrong-password' ||
          error.code === 'auth/user-not-found') {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered. Please log in instead.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters.";
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "Email/password authentication is not enabled. Please contact support.";
      }

      setMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles Google Sign-in.
   */
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      setMessage('Google Sign-In successful!');
      // Save user role and basic profile to Firestore
      const user = userCredential.user;
      if (db && user) {
        await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/userProfile`, 'profile'), {
          role: userRole, // Use the selected role for Google sign-in
          email: user.email,
          name: user.displayName || '',
          skills: '',
          experience: '',
          desiredJobRole: '',
          resumeUrl: '',
          createdAt: new Date()
        }, { merge: true });
      }
      onLoginSuccess(userRole); // Pass the role to the parent
    } catch (error) {
      console.error("Google Sign-In error:", error);
      setMessage(`Google Sign-In failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
      {showForgotPasswordModal && (
        <ForgotPasswordModal
          auth={auth}
          onClose={() => setShowForgotPasswordModal(false)}
          setMessage={setMessage}
        />
      )}
      <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 max-w-md w-full text-center border border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
          {isRegistering ? 'Register' : 'Login'} to RecruitFlow AI
        </h2>
        <form onSubmit={handleEmailPasswordAuth} className="space-y-6">
          <div>
            <label htmlFor="email" className="sr-only">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              required
            />
          </div>

          <div className="flex justify-center space-x-4 mb-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio h-5 w-5 text-blue-600"
                name="role"
                value="recruiter"
                checked={userRole === 'recruiter'}
                onChange={() => setUserRole('recruiter')}
              />
              <span className="ml-2 text-gray-700">I am a Recruiter</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio h-5 w-5 text-purple-600"
                name="role"
                value="jobSeeker"
                checked={userRole === 'jobSeeker'}
                onChange={() => setUserRole('jobSeeker')}
              />
              <span className="ml-2 text-gray-700">I am a Job Seeker</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              isRegistering ? 'Register' : 'Login'
            )}
          </button>
        </form>

        <div className="mt-6 text-gray-600">
          <p>
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-blue-600 hover:underline font-semibold"
            >
              {isRegistering ? 'Login here' : 'Register here'}
            </button>
          </p>
          {!isRegistering && ( // Only show forgot password if not registering
            <p className="mt-2">
              <button
                onClick={() => setShowForgotPasswordModal(true)}
                className="text-gray-500 hover:underline text-sm"
              >
                Forgot Password?
              </button>
            </p>
          )}
        </div>

        <div className="mt-8">
          <button
            onClick={handleGoogleSignIn}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.24 10.285V11.7h2.535c-.172 1.18-.766 2.166-1.577 2.828l2.09 1.62c1.22-.98 2.04-2.58 2.04-4.573 0-.756-.11-1.47-.31-2.135H12.24v-2.09h4.375c.162.75.253 1.54.253 2.34z" fill="#4285F4"/><path d="M12.24 18.03c1.78 0 3.273-.59 4.364-1.59l-2.09-1.62c-.57.38-1.3.6-2.274.6-1.758 0-3.25-1.18-3.79-2.75h-2.15c.98 1.9 2.97 3.2 5.94 3.2z" fill="#34A853"/><path d="M8.45 14.12c-.22-.6-.35-1.24-.35-1.92s.13-.68.35-1.28l-2.15-.4c-.45.92-.7 1.94-.7 3.02s.25 2.1.7 3.02l2.15-.4z" fill="#FBBC05"/><path d="M12.24 6.02c1.3 0 2.44.45 3.35 1.3L17.96 5.3c-1.17-1.07-2.7-1.7-4.72-1.7-2.97 0-4.96 1.3-5.94 3.2l2.15.4c.54-1.57 2.03-2.75 3.79-2.75z" fill="#EA4335"/></svg>
                Sign in with Google
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * HomePage component for recruiters, displaying an overview of features.
 */
const HomePage = ({ navigate }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 flex flex-col items-center justify-center p-4">
    <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center max-w-4xl w-full transform transition duration-500 hover:scale-105 border border-gray-200">
      <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-6 leading-tight">
        Recruit Smarter, Not Harder
      </h1>
      <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
        Revolutionize your hiring process with AI-powered tools for efficient, fair, and data-driven talent acquisition.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard
          icon="✨"
          title="AI-Powered Screening"
          description="Automatically evaluate and shortlist candidates based on skills and fit."
          onClick={() => navigate('candidateScreening')}
        />
        <FeatureCard
          icon="⚖️"
          title="Bias Detection & Reduction"
          description="Identify and reduce potential biases in job descriptions and interviews."
          onClick={() => navigate('biasDetection')}
        />
        <FeatureCard
          icon="🗓️"
          title="Automated Scheduling"
          description="Streamline interview bookings and reminders, saving valuable time."
          onClick={() => navigate('interviewScheduling')}
        />
        <FeatureCard
          icon="📊"
          title="Candidate Analytics"
          description="Gain deep insights into candidate strengths and potential with smart data."
          onClick={() => navigate('candidateDashboard')}
        />
        <FeatureCard
          icon="🤖"
          title="Interview Automation"
          description="Leverage AI chatbots for preliminary interviews and sentiment analysis."
          onClick={() => navigate('interviewAutomation')}
        />
        <FeatureCard
          icon="⚙️"
          title="Scalable Workflow"
          description="Adapt the process to fit any hiring need—from small teams to large enterprise recruitment."
          onClick={() => navigate('candidateScreening')}
        />
      </div>
    </div>
  </div>
);

/**
 * CandidateScreeningPage allows recruiters to add and screen candidates.
 */
const CandidateScreeningPage = () => {
  const { db, userId, appId, setMessage } = useAppContext();
  const [candidates, setCandidates] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [roleFit, setRoleFit] = useState('');
  const [screeningResult, setScreeningResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reference to the Firestore collection for candidates
  const candidatesCollectionRef = useMemo(() => {
    if (db && userId && appId) {
      return collection(db, `artifacts/${appId}/users/${userId}/candidates`);
    }
    return null;
  }, [db, userId, appId]);

  // Fetch candidates in real-time
  useEffect(() => {
    if (!candidatesCollectionRef) return;

    const unsubscribe = onSnapshot(candidatesCollectionRef, (snapshot) => {
      const candidatesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCandidates(candidatesData);
    }, (error) => {
      console.error("Error fetching candidates: ", error);
      setMessage("Failed to load candidates. Please try again.");
    });

    return () => unsubscribe();
  }, [candidatesCollectionRef, setMessage]);

  /**
   * Handles adding a new candidate and simulating AI screening.
   */
  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!name || !email || !skills || !experience || !roleFit) {
      setMessage("Please fill in all candidate fields.");
      return;
    }
    if (!candidatesCollectionRef) {
      setMessage("Database not ready. Please try again.");
      return;
    }

    setIsLoading(true);
    setScreeningResult('');
    try {
      // Simulate AI screening
      const aiScore = Math.floor(Math.random() * 100) + 1; // Random score 1-100
      const fitMessage = aiScore > 70 ? "Excellent fit!" : aiScore > 40 ? "Good potential." : "Needs more evaluation.";

      const newCandidate = {
        name,
        email,
        skills,
        experience: Number(experience), // Ensure experience is stored as a number
        roleFit,
        aiScore,
        fitMessage,
        timestamp: new Date(),
      };

      await addDoc(candidatesCollectionRef, newCandidate);
      setMessage("Candidate added and screened successfully!");
      setScreeningResult(`AI Screening Score: ${aiScore}% - ${fitMessage}`);
      // Clear form fields
      setName('');
      setEmail('');
      setSkills('');
      setExperience('');
      setRoleFit('');
    } catch (error) {
      console.error("Error adding candidate: ", error);
      setMessage("Failed to add candidate. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles deleting a candidate.
   */
  const handleDeleteCandidate = async (id) => {
    if (!candidatesCollectionRef) {
      setMessage("Database not ready. Please try again.");
      return;
    }
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/candidates`, id));
      setMessage("Candidate deleted successfully!");
    } catch (error) {
      console.error("Error deleting candidate: ", error);
      setMessage("Failed to delete candidate. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 p-4 md:p-8">
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 max-w-6xl mx-auto border border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8 text-center">AI-Powered Candidate Screening</h2>

        <form onSubmit={handleAddCandidate} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 p-6 border border-gray-300 rounded-2xl bg-gray-50 shadow-inner">
          <div className="md:col-span-2">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Add New Candidate</h3>
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              placeholder="john.doe@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
            <input
              type="text"
              id="skills"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              placeholder="React, JavaScript, Python"
              required
            />
          </div>
          <div>
            <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
            <input
              type="number"
              id="experience"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              placeholder="5"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="roleFit" className="block text-sm font-medium text-gray-700 mb-1">Desired Role Fit Description</label>
            <textarea
              id="roleFit"
              value={roleFit}
              onChange={(e) => setRoleFit(e.target.value)}
              rows="3"
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-y transition duration-200"
              placeholder="Looking for a senior frontend developer with leadership potential."
              required
            ></textarea>
          </div>
          <div className="md:col-span-2 flex justify-center">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="17" x2="12" y2="11"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
                  Add & Screen Candidate
                </>
              )}
            </button>
          </div>
          {screeningResult && (
            <div className="md:col-span-2 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 font-medium text-center shadow-md">
              {screeningResult}
            </div>
          )}
        </form>

        <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 text-center">Screened Candidates</h3>
        {candidates.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">No candidates added yet. Add a candidate above!</p>
        ) : (
          <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-100">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider rounded-tl-xl">Name</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Skills</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Experience</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">AI Score</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate, index) => (
                  <tr key={candidate.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100 transition duration-150'}>
                    <td className="py-3 px-4 text-sm text-gray-800">{candidate.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{candidate.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{candidate.skills}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{candidate.experience} years</td>
                    <td className="py-3 px-4 text-sm text-gray-800">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        candidate.aiScore > 70 ? 'bg-green-100 text-green-800' :
                        candidate.aiScore > 40 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {candidate.aiScore}% ({candidate.fitMessage})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-800">
                      <button
                        onClick={() => handleDeleteCandidate(candidate.id)}
                        className="text-red-500 hover:text-red-700 font-medium transition duration-200 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * BiasDetectionPage allows users to analyze job descriptions for biased language.
 */
const BiasDetectionPage = () => {
  const { setMessage } = useAppContext();
  const [jobDescription, setJobDescription] = useState('');
  const [biasAnalysis, setBiasAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const analyzeBias = async () => {
    if (!jobDescription.trim()) {
      setMessage("Please enter a job description to analyze.");
      return;
    }

    setIsLoading(true);
    setBiasAnalysis(null);

    try {
      // Simulate API call for bias detection
      // In a real application, you would send jobDescription to an NLP model
      const simulatedBiasWords = [
        { word: "rockstar", type: "gendered/aggressive", suggestion: "high-performing, exceptional" },
        { word: "ninja", type: "gendered/aggressive", suggestion: "skilled, expert" },
        { word: "guru", type: "gendered/aggressive", suggestion: "knowledgeable, experienced" },
        { word: "dominate", type: "aggressive", suggestion: "excel, lead" },
        { word: "competitive", type: "aggressive", suggestion: "driven, ambitious" },
        { word: "maternity", type: "gendered", suggestion: "parental leave" },
        { word: "paternity", type: "gendered", suggestion: "parental leave" },
        { word: "young", type: "age-related", suggestion: "energetic, dynamic" },
        { word: "mature", type: "age-related", suggestion: "experienced, seasoned" },
        { word: "digital native", type: "age-related", suggestion: "tech-savvy, proficient with technology" },
        { word: "fresh graduate", type: "experience-related", suggestion: "entry-level candidate" },
        { word: "he", type: "gendered", suggestion: "they, he/she, candidate's name" },
        { word: "she", type: "gendered", suggestion: "they, he/she, candidate's name" },
      ];

      let detectedBiases = [];
      let biasScore = 0;
      let cleanedDescription = jobDescription;

      simulatedBiasWords.forEach(bias => {
        const regex = new RegExp(`\\b${bias.word}\\b`, 'gi'); // Case-insensitive, whole word
        if (jobDescription.match(regex)) {
          detectedBiases.push({
            word: bias.word,
            type: bias.type,
            suggestion: bias.suggestion,
          });
          biasScore += 10; // Increase bias score for each detected word
          cleanedDescription = cleanedDescription.replace(regex, `[${bias.suggestion}]`);
        }
      });

      // Simple sentiment analysis simulation based on word count
      const wordCount = jobDescription.split(/\s+/).filter(word => word.length > 0).length;
      const biasPercentage = Math.min(100, (biasScore / (wordCount > 0 ? wordCount : 1)) * 5); // Scale bias score to percentage

      setBiasAnalysis({
        detectedBiases,
        biasScore: Math.round(biasPercentage),
        cleanedDescription,
      });

      setMessage("Bias analysis complete!");

    } catch (error) {
      console.error("Error analyzing bias: ", error);
      setMessage("Failed to analyze bias. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 p-4 md:p-8">
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 max-w-4xl mx-auto border border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8 text-center">Bias Detection and Reduction</h2>
        <p className="text-center text-gray-600 mb-8">
          Paste your job description below to identify and reduce potential biases, ensuring a fair hiring process.
        </p>
        <div className="mb-6">
          <label htmlFor="jobDescription" className="block text-lg font-medium text-gray-700 mb-2">Job Description</label>
          <textarea
            id="jobDescription"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows="10"
            className="mt-1 block w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 resize-y transition duration-200"
            placeholder="e.g., We are looking for a rockstar developer who can dominate the market..."
            required
          ></textarea>
        </div>
        <div className="flex justify-center mb-8">
          <button
            onClick={analyzeBias}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                Analyze for Bias
              </>
            )}
          </button>
        </div>
        {biasAnalysis && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 mt-8 shadow-inner">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.34"></path><polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon></svg>
              Analysis Results
            </h3>
            <p className="text-lg text-gray-800 mb-4">
              <strong>Overall Bias Score:</strong> <span className={`font-bold ${
                biasAnalysis.biasScore > 60 ? 'text-red-600' :
                biasAnalysis.biasScore > 30 ? 'text-yellow-600' :
                'text-green-600'
              }`}>{biasAnalysis.biasScore}%</span>
            </p>
            {biasAnalysis.detectedBiases.length > 0 ? (
              <>
                <p className="text-gray-700 mb-2 font-medium">Detected Biased Terms:</p>
                <ul className="list-disc list-inside text-gray-600 mb-4 ml-4">
                  {biasAnalysis.detectedBiases.map((bias, index) => (
                    <li key={index} className="mb-1">
                      "<span className="font-semibold text-red-500">{bias.word}</span>" (Type: {bias.type}) - Suggestion: "<span className="italic text-green-600">{bias.suggestion}</span>"
                    </li>
                  ))}
                </ul>
                <p className="text-gray-700 mb-2 font-medium">Suggested Neutralized Description:</p>
                <div className="bg-white p-4 rounded-lg border border-gray-200 text-gray-800 whitespace-pre-wrap shadow-sm">
                  {biasAnalysis.cleanedDescription}
                </div>
              </>
            ) : (
              <p className="text-gray-600">No significant biased terms detected. Good job!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * InterviewSchedulingPage allows recruiters to schedule interviews.
 */
const InterviewSchedulingPage = () => {
  const { db, userId, appId, setMessage } = useAppContext();
  const [candidateName, setCandidateName] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [link, setLink] = useState('');
  const [schedules, setSchedules] = useState([]);

  // Reference to the Firestore collection for schedules
  const schedulesCollectionRef = useMemo(() => {
    if (db && userId && appId) {
      return collection(db, `artifacts/${appId}/users/${userId}/schedules`);
    }
    return null;
  }, [db, userId, appId]);

  // Fetch schedules in real-time
  useEffect(() => {
    if (!schedulesCollectionRef) return;

    const unsubscribe = onSnapshot(schedulesCollectionRef, (snapshot) => {
      const schedulesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSchedules(schedulesData);
    }, (error) => {
      console.error("Error fetching schedules: ", error);
      setMessage("Failed to load schedules. Please try again.");
    });

    return () => unsubscribe();
  }, [schedulesCollectionRef, setMessage]);

  /**
   * Handles scheduling a new interview.
   */
  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    if (!candidateName || !interviewerName || !date || !time || !link) {
      setMessage("Please fill in all scheduling fields.");
      return;
    }
    if (!schedulesCollectionRef) {
      setMessage("Database not ready. Please try again.");
      return;
    }

    try {
      const newSchedule = {
        candidateName,
        interviewerName,
        date,
        time,
        link,
        timestamp: new Date(),
      };

      await addDoc(schedulesCollectionRef, newSchedule);
      setMessage("Interview scheduled successfully!");
      // Clear form fields
      setCandidateName('');
      setInterviewerName('');
      setDate('');
      setTime('');
      setLink('');
    } catch (error) {
      console.error("Error scheduling interview: ", error);
      setMessage("Failed to schedule interview. Please try again.");
    }
  };

  /**
   * Handles deleting a scheduled interview.
   */
  const handleDeleteSchedule = async (id) => {
    if (!schedulesCollectionRef) {
      setMessage("Database not ready. Please try again.");
      return;
    }
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/schedules`, id));
      setMessage("Schedule deleted successfully!");
    } catch (error) {
      console.error("Error deleting schedule: ", error);
      setMessage("Failed to delete schedule. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-100 to-cyan-100 p-4 md:p-8">
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 max-w-5xl mx-auto border border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8 text-center">Automated Interview Scheduling</h2>
        <form onSubmit={handleScheduleInterview} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 p-6 border border-gray-300 rounded-2xl bg-gray-50 shadow-inner">
          <div className="md:col-span-2">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Schedule a New Interview</h3>
          </div>
          <div>
            <label htmlFor="candidateName" className="block text-sm font-medium text-gray-700 mb-1">Candidate Name</label>
            <input
              type="text"
              id="candidateName"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition duration-200"
              placeholder="Jane Doe"
              required
            />
          </div>
          <div>
            <label htmlFor="interviewerName" className="block text-sm font-medium text-gray-700 mb-1">Interviewer Name</label>
            <input
              type="text"
              id="interviewerName"
              value={interviewerName}
              onChange={(e) => setInterviewerName(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition duration-200"
              placeholder="John Smith"
              required
            />
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition duration-200"
              required
            />
          </div>
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Time</label>
            <input
              type="time"
              id="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition duration-200"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="link" className="block text-sm font-medium text-gray-700 mb-1">Meeting Link</label>
            <input
              type="url"
              id="link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition duration-200"
              placeholder="https://meet.google.com/xyz-abc-pqr"
              required
            />
          </div>
          <div className="md:col-span-2 flex justify-center">
            <button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M12 16h.01"></path><path d="M7 16h.01"></path><path d="M17 16h.01"></path><path d="M7 12h.01"></path><path d="M12 12h.01"></path><path d="M17 12h.01"></path></svg>
              Schedule Interview
            </button>
          </div>
        </form>

        <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 text-center">Scheduled Interviews</h3>
        {schedules.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">No interviews scheduled yet. Schedule one above!</p>
        ) : (
          <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-100">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider rounded-tl-xl">Candidate</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Interviewer</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Link</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule, index) => (
                  <tr key={schedule.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100 transition duration-150'}>
                    <td className="py-3 px-4 text-sm text-gray-800">{schedule.candidateName}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{schedule.interviewerName}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{schedule.date}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{schedule.time}</td>
                    <td className="py-3 px-4 text-sm text-blue-600 underline truncate max-w-xs">
                      <a href={schedule.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-800">{schedule.link}</a>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-800">
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="text-red-500 hover:text-red-700 font-medium transition duration-200 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * CandidateDashboardPage displays analytics and a list of screened candidates.
 */
const CandidateDashboardPage = () => {
  const { db, userId, appId, setMessage } = useAppContext();
  const [candidates, setCandidates] = useState([]);

  // Reference to the Firestore collection for candidates
  const candidatesCollectionRef = useMemo(() => {
    if (db && userId && appId) {
      return collection(db, `artifacts/${appId}/users/${userId}/candidates`);
    }
    return null;
  }, [db, userId, appId]);

  // Fetch candidates in real-time
  useEffect(() => {
    if (!candidatesCollectionRef) return;

    const unsubscribe = onSnapshot(candidatesCollectionRef, (snapshot) => {
      const candidatesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCandidates(candidatesData);
    }, (error) => {
      console.error("Error fetching candidates for dashboard: ", error);
      setMessage("Failed to load candidate data. Please try again.");
    });

    return () => unsubscribe();
  }, [candidatesCollectionRef, setMessage]);

  // Calculate statistics
  const totalCandidates = candidates.length;
  const avgScore = totalCandidates > 0
    ? (candidates.reduce((sum, c) => sum + c.aiScore, 0) / totalCandidates).toFixed(1)
    : 0;
  const highPotentialCandidates = candidates.filter(c => c.aiScore >= 80).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-blue-100 p-4 md:p-8">
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 max-w-6xl mx-auto border border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8 text-center">Candidate Dashboard & Analytics</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <DashboardCard
            icon="👥"
            title="Total Candidates"
            value={totalCandidates}
          />
          <DashboardCard
            icon="📈"
            title="Average AI Score"
            value={`${avgScore}%`}
          />
          <DashboardCard
            icon="🌟"
            title="High Potential"
            value={highPotentialCandidates}
          />
        </div>

        <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 text-center">Candidate List</h3>
        {candidates.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">No candidates to display. Add candidates in Screening!</p>
        ) : (
          <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-100">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider rounded-tl-xl">Name</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Skills</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Experience</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider rounded-tr-xl">AI Score</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate, index) => (
                  <tr key={candidate.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100 transition duration-150'}>
                    <td className="py-3 px-4 text-sm text-gray-800">{candidate.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{candidate.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{candidate.skills}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{candidate.experience} years</td>
                    <td className="py-3 px-4 text-sm text-gray-800">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        candidate.aiScore > 70 ? 'bg-green-100 text-green-800' :
                        candidate.aiScore > 40 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {candidate.aiScore}% ({candidate.fitMessage})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * JobSeekerInterviewPrepPage provides an AI chatbot for interview preparation.
 */
const JobSeekerInterviewPrepPage = () => {
  const { db, userId, appId, setMessage } = useAppContext();
  const [candidateName, setCandidateName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [interviewRunning, setInterviewRunning] = useState(false);
  const [sentimentAnalysis, setSentimentAnalysis] = useState(null);

  // Use a different collection for job seeker interview prep chats
  const chatHistoryCollectionRef = useMemo(() => {
    if (db && userId && appId) {
      return collection(db, `artifacts/${appId}/users/${userId}/jobSeekerInterviewChats`);
    }
    return null;
  }, [db, userId, appId]);

  // Load user profile to pre-fill candidate name
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (db && userId && appId) {
        const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/userProfile`, 'profile');
        try {
          const docSnap = await getDoc(userProfileRef);
          if (docSnap.exists()) {
            const profileData = docSnap.data();
            setCandidateName(profileData.name || '');
            setJobRole(profileData.desiredJobRole || ''); // Pre-fill job role from profile
          }
        } catch (error) {
          console.error("Error fetching user profile for interview prep:", error);
        }
      }
    };
    fetchUserProfile();
  }, [db, userId, appId]);

  // Fetch chat history in real-time
  useEffect(() => {
    if (!chatHistoryCollectionRef) return;

    const unsubscribe = onSnapshot(chatHistoryCollectionRef, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChatHistory(chats.sort((a, b) => (a.timestamp?.toDate() || 0) - (b.timestamp?.toDate() || 0)));
    }, (error) => {
      console.error("Error fetching chat history: ", error);
      setMessage("Failed to load chat history. Please try again.");
    });

    return () => unsubscribe();
  }, [chatHistoryCollectionRef, setMessage]);

  /**
   * Starts the interview preparation session.
   */
  const startInterview = async () => {
    if (!candidateName.trim() || !jobRole.trim()) {
      setMessage("Please enter your name and the job role you are preparing for to start the interview.");
      return;
    }
    if (!chatHistoryCollectionRef) {
      setMessage("Database not ready. Please try again.");
      return;
    }

    setChatHistory([]);
    setSentimentAnalysis(null);
    setInterviewRunning(true);
    setMessage("Interview preparation started!");

    // Initial AI greeting for job seeker
    const initialAiMessage = {
      sender: 'AI',
      text: `Hello ${candidateName}, welcome to your interview preparation for the ${jobRole} position. I'm here to help you practice. Let's start with your experience.`,
      timestamp: new Date(),
    };
    await addDoc(chatHistoryCollectionRef, initialAiMessage);
  };

  /**
   * Sends a message to the AI chatbot and gets a response.
   */
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!currentMessage.trim() || !interviewRunning) return;
    if (!chatHistoryCollectionRef) {
      setMessage("Database not ready. Please try again.");
      return;
    }

    // Add user message to chat history
    const userMessage = {
      sender: 'User',
      text: currentMessage,
      timestamp: new Date(),
    };
    await addDoc(chatHistoryCollectionRef, userMessage);
    setCurrentMessage('');
    setIsLoadingResponse(true);

    try {
      // Format chat history for Gemini API
      const formattedHistory = chatHistory.map(msg => ({
        role: msg.sender === 'User' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      // Add current user message to history for the API call
      formattedHistory.push({
        role: 'user',
        parts: [{ text: userMessage.text }]
      });

      // Prepare the request payload
      const payload = {
        contents: formattedHistory,
        generationConfig: {
          temperature: 0.9,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
          stopSequences: []
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      };

      const apiKey = ""; // Canvas will inject this
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const result = await response.json();

      let aiResponseText = "I'm sorry, I couldn't generate a response at this time.";
      if (result.candidates && result.candidates[0]?.content?.parts) {
        aiResponseText = result.candidates[0].content.parts[0].text;
      }

      const aiMessage = {
        sender: 'AI',
        text: aiResponseText,
        timestamp: new Date(),
      };
      await addDoc(chatHistoryCollectionRef, aiMessage);

      // Simulate sentiment analysis
      const sentimentScore = Math.random() * 2 - 1; // Between -1 and 1
      const sentiment = sentimentScore > 0.5 ? 'Positive' : sentimentScore < -0.5 ? 'Negative' : 'Neutral';
      setSentimentAnalysis({ score: sentimentScore.toFixed(2), sentiment: sentiment });

    } catch (error) {
      console.error("Error generating AI response:", error);
      setMessage("Failed to get AI response. Please try again.");

      const errorMessage = {
        sender: 'AI',
        text: "I'm having trouble responding right now. Could you please rephrase your question?",
        timestamp: new Date(),
      };
      await addDoc(chatHistoryCollectionRef, errorMessage);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  /**
   * Ends the interview preparation session.
   */
  const endInterview = () => {
    setInterviewRunning(false);
    setMessage("Interview preparation ended. Review your chat history and sentiment analysis.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 to-red-100 p-4 md:p-8">
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 max-w-4xl mx-auto border border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8 text-center">AI Interview Preparation</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 border border-gray-300 rounded-2xl bg-gray-50 shadow-inner">
          <div>
            <label htmlFor="candidateNameInput" className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input
              type="text"
              id="candidateNameInput"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 transition duration-200"
              placeholder="Your Name"
              disabled={interviewRunning}
              required
            />
          </div>
          <div>
            <label htmlFor="jobRoleInput" className="block text-sm font-medium text-gray-700 mb-1">Job Role to Prepare For</label>
            <input
              type="text"
              id="jobRoleInput"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 transition duration-200"
              placeholder="e.g., Software Engineer"
              disabled={interviewRunning}
              required
            />
          </div>
          <div className="md:col-span-2 flex justify-center space-x-4">
            {!interviewRunning ? (
              <button
                onClick={startInterview}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                Start Preparation
              </button>
            ) : (
              <button
                onClick={endInterview}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                End Preparation
              </button>
            )}
          </div>
        </div>

        {interviewRunning && (
          <div className="bg-gray-50 p-6 rounded-2xl shadow-inner border border-gray-200 mb-8">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Chat Transcripts</h3>
            <div className="h-80 overflow-y-auto border border-gray-300 rounded-lg p-4 bg-white mb-4 custom-scrollbar">
              {chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-3 p-3 rounded-lg max-w-[80%] ${
                    msg.sender === 'User'
                      ? 'bg-blue-100 text-blue-800 ml-auto rounded-br-none'
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <p className="font-semibold">{msg.sender}:</p>
                  <p>{msg.text}</p>
                  <span className="block text-right text-xs text-gray-500 mt-1">
                    {msg.timestamp?.toDate ?
                      new Date(msg.timestamp.seconds * 1000).toLocaleTimeString() :
                      new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {isLoadingResponse && (
                <div className="mb-3 p-3 rounded-lg max-w-[80%] bg-gray-200 text-gray-800 rounded-bl-none">
                  <p className="font-semibold">AI:</p>
                  <div className="flex items-center">
                    <span className="animate-pulse">Typing...</span>
                    <svg className="animate-bounce h-4 w-4 text-gray-500 ml-2" viewBox="0 0 24 24">
                      <circle fill="currentColor" cx="4" cy="12" r="3" />
                      <circle fill="currentColor" cx="12" cy="12" r="3" />
                      <circle fill="currentColor" cx="20" cy="12" r="3" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={sendMessage} className="flex space-x-3">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500"
                placeholder="Type your message here..."
                disabled={isLoadingResponse}
              />
              <button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
                disabled={isLoadingResponse}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </form>
          </div>
        )}

        {sentimentAnalysis && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow-inner">
            <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-6h-2v6zm0-8h2V7h-2v2z"></path></svg>
              Sentiment Analysis
            </h3>
            <p className="text-lg text-gray-800">
              Overall Interview Sentiment: <span className={`font-bold ${
                sentimentAnalysis.sentiment === 'Positive' ? 'text-green-600' :
                sentimentAnalysis.sentiment === 'Negative' ? 'text-red-600' :
                'text-gray-600'
              }`}>{sentimentAnalysis.sentiment}</span> (Score: {sentimentAnalysis.score})
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * InterviewAutomationPage allows recruiters to conduct automated interviews with candidates.
 */
const InterviewAutomationPage = () => {
  const { db, userId, appId, setMessage } = useAppContext();
  const [candidateName, setCandidateName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [interviewRunning, setInterviewRunning] = useState(false);
  const [sentimentAnalysis, setSentimentAnalysis] = useState(null);

  // Reference to the Firestore collection for recruiter interview chats
  const chatHistoryCollectionRef = useMemo(() => {
    if (db && userId && appId) {
      return collection(db, `artifacts/${appId}/users/${userId}/recruiterInterviewChats`);
    }
    return null;
  }, [db, userId, appId]);

  // Fetch chat history in real-time
  useEffect(() => {
    if (!chatHistoryCollectionRef) return;

    const unsubscribe = onSnapshot(chatHistoryCollectionRef, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChatHistory(chats.sort((a, b) => (a.timestamp?.toDate() || 0) - (b.timestamp?.toDate() || 0)));
    }, (error) => {
      console.error("Error fetching chat history: ", error);
      setMessage("Failed to load chat history. Please try again.");
    });

    return () => unsubscribe();
  }, [chatHistoryCollectionRef, setMessage]);

  /**
   * Starts the automated interview session.
   */
  const startInterview = async () => {
    if (!candidateName.trim() || !jobRole.trim()) {
      setMessage("Please enter candidate name and job role to start the interview.");
      return;
    }
    if (!chatHistoryCollectionRef) {
      setMessage("Database not ready. Please try again.");
      return;
    }

    setChatHistory([]);
    setSentimentAnalysis(null);
    setInterviewRunning(true);
    setMessage("Interview started!");

    // Initial AI greeting for the candidate
    const initialAiMessage = {
      sender: 'AI',
      text: `Hello ${candidateName}, welcome to your interview for the ${jobRole} position. Could you please start by telling me a bit about your experience?`,
      timestamp: new Date(),
    };
    await addDoc(chatHistoryCollectionRef, initialAiMessage);
  };

  /**
   * Sends a message (as the recruiter/interviewer) to the AI chatbot.
   * The AI will respond as if it's the candidate.
   */
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!currentMessage.trim() || !interviewRunning) return;
    if (!chatHistoryCollectionRef) {
      setMessage("Database not ready. Please try again.");
      return;
    }

    // Add user message (recruiter's question) to chat history
    const userMessage = {
      sender: 'User', // User here means the recruiter
      text: currentMessage,
      timestamp: new Date(),
    };
    await addDoc(chatHistoryCollectionRef, userMessage);
    setCurrentMessage('');
    setIsLoadingResponse(true);

    try {
      // Format chat history for Gemini API
      // The AI will act as the candidate, so previous AI messages are candidate responses
      const formattedHistory = chatHistory.map(msg => ({
        role: msg.sender === 'User' ? 'user' : 'model', // User is recruiter, Model is AI (candidate)
        parts: [{ text: msg.text }]
      }));

      // Add current recruiter message to history for the API call
      formattedHistory.push({
        role: 'user',
        parts: [{ text: userMessage.text }]
      });

      // Prepare the request payload
      const payload = {
        contents: formattedHistory,
        generationConfig: {
          temperature: 0.9,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
          stopSequences: []
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      };

      const apiKey = ""; // Canvas will inject this
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const result = await response.json();

      let aiResponseText = "I'm sorry, I couldn't generate a response at this time.";
      if (result.candidates && result.candidates[0]?.content?.parts) {
        aiResponseText = result.candidates[0].content.parts[0].text;
      }

      // Add AI response (candidate's reply) to chat history
      const aiMessage = {
        sender: 'AI', // AI is acting as the candidate
        text: aiResponseText,
        timestamp: new Date(),
      };
      await addDoc(chatHistoryCollectionRef, aiMessage);

      // Simulate sentiment analysis (can be replaced with actual API call)
      const sentimentScore = Math.random() * 2 - 1; // Between -1 and 1
      const sentiment = sentimentScore > 0.5 ? 'Positive' : sentimentScore < -0.5 ? 'Negative' : 'Neutral';
      setSentimentAnalysis({ score: sentimentScore.toFixed(2), sentiment: sentiment });

    } catch (error) {
      console.error("Error generating AI response:", error);
      setMessage("Failed to get AI response. Please try again.");

      // Add error message to chat
      const errorMessage = {
        sender: 'AI',
        text: "I'm having trouble responding right now. Could you please rephrase your question?",
        timestamp: new Date(),
      };
      await addDoc(chatHistoryCollectionRef, errorMessage);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  /**
   * Ends the automated interview session.
   */
  const endInterview = () => {
    setInterviewRunning(false);
    setMessage("Interview ended. Review the chat history and sentiment analysis.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 to-red-100 p-4 md:p-8">
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 max-w-4xl mx-auto border border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8 text-center">AI Interview Automation (Recruiter View)</h2>
        <p className="text-center text-gray-600 mb-8">
          This section is for recruiters to conduct automated interviews. Job seekers can find their interview prep tool in their dashboard.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 border border-gray-300 rounded-2xl bg-gray-50 shadow-inner">
          <div>
            <label htmlFor="candidateNameInput" className="block text-sm font-medium text-gray-700 mb-1">Candidate Name</label>
            <input
              type="text"
              id="candidateNameInput"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 transition duration-200"
              placeholder="Alice Johnson"
              disabled={interviewRunning}
              required
            />
          </div>
          <div>
            <label htmlFor="jobRoleInput" className="block text-sm font-medium text-gray-700 mb-1">Job Role</label>
            <input
              type="text"
              id="jobRoleInput"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 transition duration-200"
              placeholder="Software Engineer"
              disabled={interviewRunning}
              required
            />
          </div>
          <div className="md:col-span-2 flex justify-center space-x-4">
            {!interviewRunning ? (
              <button
                onClick={startInterview}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                Start Interview
              </button>
            ) : (
              <button
                onClick={endInterview}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                End Interview
              </button>
            )}
          </div>
        </div>

        {interviewRunning && (
          <div className="bg-gray-50 p-6 rounded-2xl shadow-inner border border-gray-200 mb-8">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Chat Transcripts</h3>
            <div className="h-80 overflow-y-auto border border-gray-300 rounded-lg p-4 bg-white mb-4 custom-scrollbar">
              {chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-3 p-3 rounded-lg max-w-[80%] ${
                    msg.sender === 'User'
                      ? 'bg-blue-100 text-blue-800 ml-auto rounded-br-none'
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <p className="font-semibold">{msg.sender}:</p>
                  <p>{msg.text}</p>
                  <span className="block text-right text-xs text-gray-500 mt-1">
                    {msg.timestamp?.toDate ?
                      new Date(msg.timestamp.seconds * 1000).toLocaleTimeString() :
                      new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {isLoadingResponse && (
                <div className="mb-3 p-3 rounded-lg max-w-[80%] bg-gray-200 text-gray-800 rounded-bl-none">
                  <p className="font-semibold">AI:</p>
                  <div className="flex items-center">
                    <span className="animate-pulse">Typing...</span>
                    <svg className="animate-bounce h-4 w-4 text-gray-500 ml-2" viewBox="0 0 24 24">
                      <circle fill="currentColor" cx="4" cy="12" r="3" />
                      <circle fill="currentColor" cx="12" cy="12" r="3" />
                      <circle fill="currentColor" cx="20" cy="12" r="3" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={sendMessage} className="flex space-x-3">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500"
                placeholder="Type your message here..."
                disabled={isLoadingResponse}
              />
              <button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
                disabled={isLoadingResponse}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </form>
          </div>
        )}

        {sentimentAnalysis && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow-inner">
            <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-6h-2v6zm0-8h2V7h-2v2z"></path></svg>
              Sentiment Analysis
            </h3>
            <p className="text-lg text-gray-800">
              Overall Interview Sentiment: <span className={`font-bold ${
                sentimentAnalysis.sentiment === 'Positive' ? 'text-green-600' :
                sentimentAnalysis.sentiment === 'Negative' ? 'text-red-600' :
                'text-gray-600'
              }`}>{sentimentAnalysis.sentiment}</span> (Score: {sentimentAnalysis.score})
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * JobSeekerProfilePage allows job seekers to manage their profile.
 */
const JobSeekerProfilePage = () => {
  const { auth, db, userId, appId, setMessage } = useAppContext();
  const [profile, setProfile] = useState({
    name: '',
    email: auth.currentUser?.email || '',
    skills: '',
    experience: '',
    desiredJobRole: '',
    resumeUrl: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Reference to the Firestore document for user profile
  const userProfileDocRef = useMemo(() => {
    if (db && userId && appId) {
      return doc(db, `artifacts/${appId}/users/${userId}/userProfile`, 'profile');
    }
    return null;
  }, [db, userId, appId]);

  // Fetch profile data on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userProfileDocRef) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const docSnap = await getDoc(userProfileDocRef);
        if (docSnap.exists()) {
          const profileData = docSnap.data();
          setProfile(prev => ({
            ...prev,
            ...profileData,
            email: auth.currentUser?.email || prev.email // Ensure email is always current user's email
          }));
        } else {
          // If no profile exists, initialize with current user's email
          setProfile(prev => ({
            ...prev,
            email: auth.currentUser?.email || prev.email
          }));
        }
        setMessage("");
      } catch (error) {
        console.error("Error fetching profile: ", error);
        setMessage("Failed to load profile. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [auth.currentUser?.email, userProfileDocRef, setMessage]);

  /**
   * Handles saving the user's profile to Firestore.
   */
  const handleProfileSave = async () => {
    if (!userProfileDocRef) {
      setMessage("Database not ready. Please try again.");
      return;
    }
    setIsLoading(true);
    try {
      // Ensure role is also saved if it was determined at login
      const roleToSave = profile.role || (await getDoc(userProfileDocRef)).data()?.role || 'jobSeeker';
      await setDoc(userProfileDocRef, {
        ...profile,
        email: auth.currentUser?.email, // Always save current authenticated email
        role: roleToSave, // Ensure role is saved with profile
        updatedAt: new Date()
      }, { merge: true }); // Use merge to update existing fields without overwriting others
      setMessage("Profile saved successfully!");
    } catch (error) {
      console.error("Error saving profile: ", error);
      setMessage("Failed to save profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles changes in form input fields.
   */
  const handleChange = (e) => {
    const { id, value } = e.target;
    setProfile(prev => ({ ...prev, [id]: value }));
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-8">
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 max-w-4xl mx-auto border border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8 text-center">My Job Seeker Profile</h2>
        <p className="text-center text-gray-600 mb-8">
          Create or update your profile to get personalized job recommendations and prepare for interviews.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border border-gray-300 rounded-2xl bg-gray-50 shadow-inner">
          <div className="md:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              id="name"
              value={profile.name}
              onChange={handleChange}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              placeholder="Your Full Name"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email (Read-only)</label>
            <input
              type="email"
              id="email"
              value={profile.email}
              readOnly
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
            <textarea
              id="skills"
              value={profile.skills}
              onChange={handleChange}
              rows="3"
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-y transition duration-200"
              placeholder="e.g., JavaScript, React, Node.js, AWS"
            />
          </div>
          <div>
            <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
            <input
              type="number"
              id="experience"
              value={profile.experience}
              onChange={handleChange}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              placeholder="e.g., 5"
            />
          </div>
          <div>
            <label htmlFor="desiredJobRole" className="block text-sm font-medium text-gray-700 mb-1">Desired Job Role</label>
            <input
              type="text"
              id="desiredJobRole"
              value={profile.desiredJobRole}
              onChange={handleChange}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              placeholder="e.g., Senior Frontend Developer"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="resumeUrl" className="block text-sm font-medium text-gray-700 mb-1">Resume URL (Simulated Upload)</label>
            <input
              type="url"
              id="resumeUrl"
              value={profile.resumeUrl}
              onChange={handleChange}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              placeholder="e.g., https://your-resume-link.com/resume.pdf"
            />
            <p className="text-xs text-gray-500 mt-1">
              (In a real app, this would be a file upload. Here, we're simulating with a URL.)
            </p>
          </div>
          <div className="md:col-span-2 flex justify-center">
            <button
              onClick={handleProfileSave}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  Save Profile
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * JobSeekerDashboardPage displays job listings and the user's applications.
 */
const JobSeekerDashboardPage = ({ navigate }) => {
  const { db, userId, appId, setMessage } = useAppContext();
  const [applications, setApplications] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  // Reference to Firestore collections
  const applicationsCollectionRef = useMemo(() => {
    if (db && userId && appId) {
      return collection(db, `artifacts/${appId}/users/${userId}/applications`);
    }
    return null;
  }, [db, userId, appId]);

  const userProfileDocRef = useMemo(() => {
    if (db && userId && appId) {
      return doc(db, `artifacts/${appId}/users/${userId}/userProfile`, 'profile');
    }
    return null;
  }, [db, userId, appId]);

  // Fetch applications in real-time
  useEffect(() => {
    if (!applicationsCollectionRef) return;

    const unsubscribe = onSnapshot(applicationsCollectionRef, (snapshot) => {
      const appsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApplications(appsData);
    }, (error) => {
      console.error("Error fetching applications: ", error);
      setMessage("Failed to load applications. Please try again.");
    });

    return () => unsubscribe();
  }, [applicationsCollectionRef, setMessage]);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userProfileDocRef) return;
      try {
        const docSnap = await getDoc(userProfileDocRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        } else {
          setUserProfile({}); // Set empty object if no profile exists
        }
      } catch (error) {
        console.error("Error fetching user profile for job seeker dashboard:", error);
        setMessage("Failed to load your profile for job matching.");
      }
    };
    fetchProfile();
  }, [userProfileDocRef, setMessage]);

  /**
   * Handles applying for a job.
   */
  const handleApply = async (jobTitle) => {
    if (!applicationsCollectionRef) {
      setMessage("Database not ready. Please try again.");
      return;
    }
    try {
      const newApplication = {
        jobTitle,
        status: 'Pending',
        applicationDate: new Date(),
      };
      await addDoc(applicationsCollectionRef, newApplication);
      setMessage(`Successfully applied for ${jobTitle}!`);
    } catch (error) {
      console.error("Error applying for job: ", error);
      setMessage("Failed to apply for job. Please try again.");
    }
  };

  // Dummy job listings (replace with actual data fetched from Firestore or an API)
  const allJobListings = [
    { id: 1, title: "Frontend Developer", company: "Tech Solutions", description: "Develop and maintain user interfaces using React and JavaScript.", skills: ["React", "JavaScript", "HTML", "CSS"], role: "Frontend Developer" },
    { id: 2, title: "Backend Engineer", company: "Data Innovators", description: "Design and implement server-side logic with Node.js and Python.", skills: ["Node.js", "Python", "API", "Databases"], role: "Backend Engineer" },
    { id: 3, title: "UX Designer", company: "Creative Minds", description: "Create intuitive and appealing user experiences with Figma and Sketch.", skills: ["Figma", "Sketch", "UI/UX", "Prototyping"], role: "UX Designer" },
    { id: 4, title: "DevOps Engineer", company: "Cloud Services Inc.", description: "Manage cloud infrastructure and CI/CD pipelines using AWS and Docker.", skills: ["AWS", "Docker", "Kubernetes", "CI/CD"], role: "DevOps Engineer" },
    { id: 5, title: "Data Scientist", company: "Analytics Corp", description: "Analyze large datasets and build machine learning models using Python and R.", skills: ["Python", "R", "Machine Learning", "Data Analysis"], role: "Data Scientist" },
    { id: 6, title: "Mobile App Developer", company: "Innovate Mobile", description: "Develop cross-platform mobile applications with React Native.", skills: ["React Native", "JavaScript", "Mobile Development"], role: "Mobile App Developer" },
  ];

  // Simple job matching logic
  const matchedJobListings = useMemo(() => {
    if (!userProfile || (!userProfile.skills && !userProfile.desiredJobRole)) {
      return allJobListings; // Show all if no profile or no matching criteria
    }

    const userSkills = userProfile.skills ? userProfile.skills.toLowerCase().split(',').map(s => s.trim()) : [];
    const desiredRole = userProfile.desiredJobRole ? userProfile.desiredJobRole.toLowerCase() : '';

    return allJobListings.filter(job => {
      const jobSkills = job.skills.map(s => s.toLowerCase());
      const jobRole = job.role.toLowerCase();

      let skillMatch = false;
      if (userSkills.length > 0) {
        skillMatch = userSkills.some(userSkill => jobSkills.includes(userSkill));
      }

      let roleMatch = false;
      if (desiredRole) {
        roleMatch = jobRole.includes(desiredRole) || desiredRole.includes(jobRole);
      }

      // If no skills or desired role specified by user, all jobs match
      if (userSkills.length === 0 && !desiredRole) {
        return true;
      }
      // If both are specified, either skill or role must match
      if (userSkills.length > 0 && desiredRole) {
        return skillMatch || roleMatch;
      }
      // If only skills are specified
      if (userSkills.length > 0) {
        return skillMatch;
      }
      // If only desired role is specified
      if (desiredRole) {
        return roleMatch;
      }
      return false;
    });
  }, [userProfile, allJobListings]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 p-4 md:p-8">
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 max-w-6xl mx-auto border border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8 text-center">Job Seeker Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <DashboardCard icon="📄" title="Total Applications" value={applications.length} />
          <DashboardCard icon="⏳" title="Pending Applications" value={applications.filter(app => app.status === 'Pending').length} />
          <DashboardCard icon="✅" title="Approved Applications" value={applications.filter(app => app.status === 'Approved').length} />
        </div>

        <div className="flex justify-center space-x-4 mb-10">
          <button
            onClick={() => navigate('jobSeekerProfile')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            My Profile
          </button>
          <button
            onClick={() => navigate('jobSeekerInterviewPrep')}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"></path><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            Interview Prep
          </button>
        </div>


        <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 mt-10 text-center">
          {userProfile && (userProfile.skills || userProfile.desiredJobRole) ? 'Matched Job Listings' : 'Available Job Listings'}
        </h3>
        {matchedJobListings.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">
            No job listings match your profile yet. Try updating your profile or check back later!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matchedJobListings.map(job => (
              <div key={job.id} className="bg-gray-50 p-6 rounded-2xl shadow-md border border-gray-200 flex flex-col justify-between">
                <div>
                  <h4 className="text-xl font-semibold text-gray-800 mb-2">{job.title}</h4>
                  <p className="text-gray-600 text-sm mb-3">{job.company}</p>
                  <p className="text-gray-700 text-base mb-4">{job.description}</p>
                  <p className="text-gray-500 text-xs">Skills: {job.skills.join(', ')}</p>
                </div>
                <button
                  onClick={() => handleApply(job.title)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 flex items-center justify-center mt-4"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>
                  Apply Now
                </button>
              </div>
            ))}
          </div>
        )}

        <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 mt-10 text-center">Your Applications</h3>
        {applications.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">You haven't applied for any jobs yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-100">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider rounded-tl-xl">Job Title</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider rounded-tr-xl">Application Date</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app, index) => (
                  <tr key={app.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100 transition duration-150'}>
                    <td className="py-3 px-4 text-sm text-gray-800">{app.jobTitle}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        app.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        app.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-800">{new Date(app.applicationDate.seconds * 1000).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};


/**
 * Main App component that orchestrates the entire application.
 * Manages authentication, global state, and routing between pages.
 */
const App = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('login'); // Initial page state changed to 'login'
  const [message, setMessage] = useState('');
  const [userRole, setUserRole] = useState(null); // 'recruiter' or 'jobSeeker'

  // Extract appId from the configuration for Firestore paths
  const appId = firebaseConfig.appId.split(':')[2];

  // useEffect hook for Firebase Authentication State Listener
  useEffect(() => {
    const signInInitial = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try {
          await signInWithCustomToken(auth, __initial_auth_token);
        } catch (error) {
          console.error("Error signing in with custom token:", error);
          setMessage(`Authentication failed: ${error.message}`);
          await signInAnonymously(auth);
        }
      } else {
        await signInAnonymously(auth);
      }
    };

    signInInitial();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch user role from Firestore
        const userProfileDocRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/userProfile`, 'profile');
        const userProfileDocSnap = await getDoc(userProfileDocRef);
        if (userProfileDocSnap.exists() && userProfileDocSnap.data().role) {
          setUserRole(userProfileDocSnap.data().role);
          setCurrentPage(userProfileDocSnap.data().role === 'recruiter' ? 'home' : 'jobSeeker');
        } else {
          // If no role found (e.g., new anonymous user or new Google user without role set),
          // set a default role and create/update the profile document.
          const defaultRole = 'recruiter'; // Default to recruiter if not explicitly set
          setUserRole(defaultRole);
          setCurrentPage(defaultRole === 'recruiter' ? 'home' : 'jobSeeker');
          // Ensure a profile document exists with the default role
          await setDoc(userProfileDocRef, {
            email: currentUser.email || 'anonymous',
            role: defaultRole,
            createdAt: new Date()
          }, { merge: true });
        }
      } else {
        setUser(null);
        setUserRole(null);
        setCurrentPage('login'); // Redirect to login if no user
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db, appId]); // Dependencies for useEffect

  /**
   * Navigates to a different page within the application.
   * @param {string} page - The identifier of the page to navigate to.
   */
  const navigate = (page) => {
    setCurrentPage(page);
  };

  /**
   * Callback function for successful login from LoginPage.
   * @param {string} role - The role of the logged-in user ('recruiter' or 'jobSeeker').
   */
  const handleLoginSuccess = (role) => {
    setUserRole(role);
    setMessage('Logged in successfully!');
    // Redirect based on role after successful login
    if (role === 'recruiter') {
      navigate('home');
    } else if (role === 'jobSeeker') {
      navigate('jobSeeker');
    }
  };

  /**
   * Handles user logout.
   */
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMessage('Logged out successfully!');
      navigate('login'); // Redirect to login page after logout
    } catch (error) {
      console.error("Logout error:", error);
      setMessage(`Logout failed: ${error.message}`);
    }
  };

  /**
   * Renders the appropriate page component based on the current state.
   */
  const renderPage = () => {
    if (isLoading) {
      return <LoadingSpinner />;
    }

    if (!user) {
      return <LoginPage auth={auth} onLoginSuccess={handleLoginSuccess} setMessage={setMessage} />;
    }

    // Render pages based on currentPage and userRole
    switch (currentPage) {
      case 'home':
        return <HomePage navigate={navigate} />;
      case 'candidateScreening':
        return userRole === 'recruiter' ? <CandidateScreeningPage /> : <p className="p-8 text-red-600 text-center">Access Denied: Recruiters only.</p>;
      case 'biasDetection':
        return userRole === 'recruiter' ? <BiasDetectionPage /> : <p className="p-8 text-red-600 text-center">Access Denied: Recruiters only.</p>;
      case 'interviewScheduling':
        return userRole === 'recruiter' ? <InterviewSchedulingPage /> : <p className="p-8 text-red-600 text-center">Access Denied: Recruiters only.</p>;
      case 'candidateDashboard':
        return userRole === 'recruiter' ? <CandidateDashboardPage /> : <p className="p-8 text-red-600 text-center">Access Denied: Recruiters only.</p>;
      case 'interviewAutomation':
        return userRole === 'recruiter' ? <InterviewAutomationPage /> : <p className="p-8 text-red-600 text-center">Access Denied: Recruiters only.</p>;
      case 'jobSeeker':
        return userRole === 'jobSeeker' ? <JobSeekerDashboardPage navigate={navigate} /> : <p className="p-8 text-red-600 text-center">Access Denied: Job Seekers only.</p>;
      case 'jobSeekerProfile':
        return userRole === 'jobSeeker' ? <JobSeekerProfilePage /> : <p className="p-8 text-red-600 text-center">Access Denied: Job Seekers only.</p>;
      case 'jobSeekerInterviewPrep':
        return userRole === 'jobSeeker' ? <JobSeekerInterviewPrepPage /> : <p className="p-8 text-red-600 text-center">Access Denied: Job Seekers only.</p>;
      case 'login': // This case handles if currentPage is explicitly set to 'login' while user is logged in (should redirect)
        return <LoginPage auth={auth} onLoginSuccess={handleLoginSuccess} setMessage={setMessage} />;
      default:
        // Fallback to home page if an unknown page is requested
        return userRole === 'recruiter' ? <HomePage navigate={navigate} /> : <JobSeekerDashboardPage navigate={navigate} />;
    }
  };

  return (
    // AppContext.Provider makes Firebase instances and global states available to all children
    <AppContext.Provider value={{ app, auth, db, userId: user?.uid, appId, setMessage }}>
      <div className="min-h-screen bg-gray-100 font-sans antialiased">
        {/* Global Message Box */}
        {message && <MessageBox message={message} onClose={() => setMessage('')} />}

        {/* Navigation Bar: Only show if user is logged in and not in initial loading state */}
        {user && (
          <nav className="bg-white shadow-lg py-4 px-6 fixed w-full z-10 top-0">
            <div className="container mx-auto flex justify-between items-center">
              <div className="text-2xl font-bold text-blue-700">RecruitFlow AI</div>
              <div className="flex space-x-4">
                {/* Recruiter Navigation Items */}
                {userRole === 'recruiter' && (
                  <>
                    <NavItem onClick={() => navigate('home')} isActive={currentPage === 'home'}>Home</NavItem>
                    <NavItem onClick={() => navigate('candidateScreening')} isActive={currentPage === 'candidateScreening'}>Screening</NavItem>
                    <NavItem onClick={() => navigate('biasDetection')} isActive={currentPage === 'biasDetection'}>Bias Detection</NavItem>
                    <NavItem onClick={() => navigate('interviewScheduling')} isActive={currentPage === 'interviewScheduling'}>Scheduling</NavItem>
                    <NavItem onClick={() => navigate('candidateDashboard')} isActive={currentPage === 'candidateDashboard'}>Dashboard</NavItem>
                    <NavItem onClick={() => navigate('interviewAutomation')} isActive={currentPage === 'interviewAutomation'}>Automation</NavItem>
                  </>
                )}
                {/* Job Seeker Navigation Items */}
                {userRole === 'jobSeeker' && (
                  <>
                    <NavItem onClick={() => navigate('jobSeeker')} isActive={currentPage === 'jobSeeker'}>Job Seeker Dashboard</NavItem>
                    <NavItem onClick={() => navigate('jobSeekerProfile')} isActive={currentPage === 'jobSeekerProfile'}>My Profile</NavItem>
                    <NavItem onClick={() => navigate('jobSeekerInterviewPrep')} isActive={currentPage === 'jobSeekerInterviewPrep'}>Interview Prep</NavItem>
                  </>
                )}
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-full text-sm font-medium transition duration-300 bg-red-500 text-white hover:bg-red-600 shadow-md"
                >
                  Logout
                </button>
              </div>
            </div>
          </nav>
        )}

        {/* Main Page Content */}
        {/* Add padding-top to main content if navbar is present to prevent overlap */}
        <main className={user ? 'pt-20' : ''}>
          {renderPage()}
        </main>
      </div>
    </AppContext.Provider>
  );
};

/**
 * NavItem component for consistent styling of navigation buttons.
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - The content of the button.
 * @param {function} props.onClick - Function to call when the button is clicked.
 * @param {boolean} props.isActive - True if the current page is active, for styling.
 */
const NavItem = ({ children, onClick, isActive }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm font-medium transition duration-300
      ${isActive
        ? 'bg-blue-600 text-white shadow-md' // Active state styling
        : 'text-gray-700 hover:bg-blue-100 hover:text-blue-700' // Inactive state styling
      }`}
  >
    {children}
  </button>
);

export default App;

/* global __app_id, __initial_auth_token, __firebase_config */
import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
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
  sendPasswordResetEmail // Import sendPasswordResetEmail
} from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, onSnapshot, doc, updateDoc, deleteDoc, query, where, getDoc, setDoc } from 'firebase/firestore';

// Context for Firebase and User ID
const AppContext = createContext(null);

// Custom Hook to use App Context
const useAppContext = () => useContext(AppContext);

// --- Utility Components ---

// Loading Spinner
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600 border-opacity-75"></div>
  </div>
);

// Message Box for alerts
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

const DashboardCard = ({ title, value, icon }) => (
  <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center text-center border border-indigo-200 transform transition duration-300 hover:scale-103 hover:shadow-2xl">
    <div className="text-5xl mb-4 text-indigo-500">{icon}</div>
    <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}</h3>
    <p className="text-3xl font-bold text-indigo-600">{value}</p>
  </div>
);


// --- Pages ---

// Forgot Password Modal Component
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
      setMessage('Password reset email sent! Check your inbox.');
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


// Login Page Component
const LoginPage = ({ auth, onLoginSuccess, setMessage }) => {
  const { db, appId } = useAppContext(); // Get db and appId from context
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState('recruiter'); // Default role
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false); // New state for modal

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
      // Save user role to Firestore
      const user = userCredential.user;
      if (db && user) {
        await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/userProfile`, 'role'), { role: userRole });
      }
      onLoginSuccess(userRole); // Pass the role to the parent
    } catch (error) {
      console.error("Authentication error:", error);
      setMessage(`Authentication failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      setMessage('Google Sign-In successful!');
      // Save user role to Firestore
      const user = userCredential.user;
      if (db && user) {
        await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/userProfile`, 'role'), { role: userRole });
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
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-200"
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


const CandidateScreeningPage = () => {
  const { db, userId, appId } = useAppContext();
  const [candidates, setCandidates] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [roleFit, setRoleFit] = useState('');
  const [screeningResult, setScreeningResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const candidatesCollectionRef = db ? collection(db, `artifacts/${appId}/users/${userId}/candidates`) : null;

  useEffect(() => {
    if (!candidatesCollectionRef) return;

    // Listen for real-time updates
    const unsubscribe = onSnapshot(candidatesCollectionRef, (snapshot) => {
      const candidatesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCandidates(candidatesData);
    }, (error) => {
      console.error("Error fetching candidates: ", error);
      setMessage("Failed to load candidates. Please try again.");
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [candidatesCollectionRef]);

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!name || !email || !skills || !experience || !roleFit) {
      setMessage("Please fill in all candidate fields.");
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
        experience,
        roleFit,
        aiScore,
        fitMessage,
        timestamp: new Date(),
      };

      await addDoc(candidatesCollectionRef, newCandidate);
      setMessage("Candidate added and screened successfully!");
      setScreeningResult(`AI Screening Score: ${aiScore}% - ${fitMessage}`);
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

  const handleDeleteCandidate = async (id) => {
    if (!window.confirm("Are you sure you want to delete this candidate?")) return; // Using window.confirm for simplicity, in a real app use a custom modal.
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
      {message && <MessageBox message={message} onClose={() => setMessage('')} />}
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

const BiasDetectionPage = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [biasAnalysis, setBiasAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

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
      {message && <MessageBox message={message} onClose={() => setMessage('')} />}
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

const InterviewSchedulingPage = () => {
  const { db, userId, appId } = useAppContext();
  const [candidateName, setCandidateName] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [link, setLink] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [message, setMessage] = useState('');

  const schedulesCollectionRef = db ? collection(db, `artifacts/${appId}/users/${userId}/schedules`) : null;

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
  }, [schedulesCollectionRef]);

  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    if (!candidateName || !interviewerName || !date || !time || !link) {
      setMessage("Please fill in all scheduling fields.");
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

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm("Are you sure you want to delete this schedule?")) return;
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
      {message && <MessageBox message={message} onClose={() => setMessage('')} />}
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
              placeholder="Alice Johnson"
            />
          </div>
          {/* Corrected: Added missing div wrapper for interviewerName */}
          <div>
            <label htmlFor="interviewerName" className="block text-sm font-medium text-gray-700 mb-1">Interviewer Name</label>
            <input
              type="text"
              id="interviewerName"
              value={interviewerName}
              onChange={(e) => setInterviewerName(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition duration-200"
              placeholder="Bob Smith"
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
              placeholder="https://meet.google.com/xyz-abc"
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

        <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 text-center">Upcoming Interviews</h3>
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
                    <td className="py-3 px-4 text-sm text-gray-800">
                      <a href={schedule.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Join Meeting</a>
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


const CandidateDashboardPage = () => {
  const { db, userId, appId } = useAppContext();
  const [candidates, setCandidates] = useState([]);
  const [message, setMessage] = useState('');

  const candidatesCollectionRef = db ? collection(db, `artifacts/${appId}/users/${userId}/candidates`) : null;

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
  }, [candidatesCollectionRef]);

  // Process data for dashboard
  const totalCandidates = candidates.length;
  const avgScore = totalCandidates > 0 ? (candidates.reduce((sum, c) => sum + c.aiScore, 0) / totalCandidates).toFixed(1) : 0;
  const statusCounts = candidates.reduce((acc, c) => {
    const status = c.fitMessage.includes('Excellent') ? 'Excellent Fit' : c.fitMessage.includes('Good') ? 'Good Potential' : 'Needs Evaluation';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const topSkills = candidates.flatMap(c => c.skills.split(',').map(s => s.trim()))
    .reduce((acc, skill) => {
      acc[skill] = (acc[skill] || 0) + 1;
      return acc;
    }, {});

  const sortedSkills = Object.entries(topSkills).sort(([, a], [, b]) => b - a).slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-blue-100 p-4 md:p-8">
      {message && <MessageBox message={message} onClose={() => setMessage('')} />}
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 max-w-6xl mx-auto border border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8 text-center">Candidate Analytics Dashboard</h2>
        <p className="text-center text-gray-600 mb-8">
          Get detailed insights into your candidate pool with smart data analysis.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <DashboardCard title="Total Candidates" value={totalCandidates} icon="👥" />
          <DashboardCard title="Average AI Score" value={`${avgScore}%`} icon="📈" />
          <DashboardCard title="Top Skill" value={sortedSkills[0] ? sortedSkills[0][0] : 'N/A'} icon="🌟" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-50 p-6 rounded-2xl shadow-inner border border-gray-300">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Candidate Status Distribution</h3>
            {Object.keys(statusCounts).length > 0 ? (
              <ul className="space-y-3">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <li key={status} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                    <span className="text-gray-700 font-medium">{status}</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">No data to display. Add candidates to see status distribution.</p>
            )}
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl shadow-inner border border-gray-300">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Most Frequent Skills</h3>
            {sortedSkills.length > 0 ? (
              <ul className="space-y-3">
                {sortedSkills.map(([skill, count]) => (
                  <li key={skill} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                    <span className="text-gray-700 font-medium">{skill}</span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">No data to display. Add candidates with skills to see insights.</p>
            )}
          </div>
        </div>

        <div className="mt-10">
          <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 text-center">All Candidates</h3>
          {candidates.length === 0 ? (
            <p className="text-center text-gray-600 text-lg">No candidates to display. Add candidates via the screening page.</p>
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
                          {candidate.aiScore}%
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
    </div>
  );
};


const InterviewAutomationPage = () => {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [sentimentScore, setSentimentScore] = useState(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = { role: 'user', text: chatInput };
    setChatHistory((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      // Simulate LLM response
      const prompt = `User: ${chatInput}\nAI:`;
      const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
      const apiKey = "AIzaSyCKGzrV-Zgx4oaFwoHoM7jv0RnNbq90f2Q"; // Canvas will provide this at runtime
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const aiResponseText = result.candidates[0].content.parts[0].text;
        setChatHistory((prev) => [...prev, { role: 'ai', text: aiResponseText }]);
      } else {
        setChatHistory((prev) => [...prev, { role: 'ai', text: "I'm having trouble generating a response right now. Please try again." }]);
        console.error("Unexpected API response structure:", result);
      }

    } catch (error) {
      console.error("Error fetching AI response:", error);
      setChatHistory((prev) => [...prev, { role: 'ai', text: "An error occurred while getting a response." }]);
      setMessage("Failed to get AI response. Please try again.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const simulateVideoSentiment = () => {
    // Simulate sentiment analysis from a video interview
    const score = Math.floor(Math.random() * 101); // 0-100
    setSentimentScore(score);
    setMessage("Video sentiment analysis simulated!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 to-yellow-100 p-4 md:p-8">
      {message && <MessageBox message={message} onClose={() => setMessage('')} />}
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 max-w-5xl mx-auto border border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8 text-center">Interview & Assessment Automation</h2>
        <p className="text-center text-gray-600 mb-8">
          Leverage AI for preliminary interviews and sentiment analysis to gain deeper candidate insights.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI Chatbot for Preliminary Interviews */}
          <div className="bg-gray-50 p-6 rounded-2xl shadow-inner border border-gray-300 flex flex-col h-[500px]">
            <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              AI Interview Chatbot
            </h3>
            <div className="flex-grow overflow-y-auto border border-gray-300 rounded-lg p-4 bg-white mb-4 custom-scrollbar shadow-sm">
              {chatHistory.length === 0 ? (
                <p className="text-gray-500 text-center italic">Start a conversation with the AI interviewer...</p>
              ) : (
                chatHistory.map((msg, index) => (
                  <div key={index} className={`mb-3 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <span className={`inline-block p-3 rounded-xl ${
                      msg.role === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'
                    }`}>
                      {msg.text}
                    </span>
                  </div>
                ))
              )}
              {isChatLoading && (
                <div className="text-center text-gray-500">
                  <svg className="animate-spin h-5 w-5 text-gray-500 inline-block mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  AI is typing...
                </div>
              )}
            </div>
            <form onSubmit={handleChatSubmit} className="flex">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-grow p-3 border border-gray-300 rounded-l-lg focus:ring-orange-500 focus:border-orange-500 transition duration-200"
                placeholder="Ask the AI a question..."
                disabled={isChatLoading}
              />
              <button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-5 rounded-r-lg transition duration-300 shadow-md"
                disabled={isChatLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </form>
          </div>

          {/* Video Interview Tools with Sentiment Analysis */}
          <div className="bg-gray-50 p-6 rounded-2xl shadow-inner border border-gray-300 flex flex-col items-center justify-center">
            <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12H2"></path><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
              Video Interview Sentiment
            </h3>
            <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 mb-6 border border-gray-300 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m3-2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path><line x1="12" y1="12" x2="12" y2="12"></line></svg>
            </div>
            <button
              onClick={simulateVideoSentiment}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path><path d="M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path><path d="M12 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path><path d="M18 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path></svg>
              Simulate Sentiment Analysis
            </button>
            {sentimentScore !== null && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 font-medium text-center w-full shadow-md">
                Simulated Sentiment Score: <span className="font-bold text-xl">{sentimentScore}%</span>
                <p className="text-sm mt-1">
                  {sentimentScore > 75 ? 'Very Positive' :
                   sentimentScore > 50 ? 'Positive' :
                   sentimentScore > 25 ? 'Neutral/Slightly Negative' : 'Negative'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// New Job Seeker Page Component
const JobSeekerPage = () => {
  const { db, userId, appId } = useAppContext();
  const [jobSeekerProfile, setJobSeekerProfile] = useState({
    fullName: '',
    desiredRole: '',
    skills: '',
    experienceYears: '',
    resumeLink: '',
    portfolioLink: '',
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const jobSeekerProfileDocRef = db ? doc(db, `artifacts/${appId}/users/${userId}/jobSeekerProfile`, 'myProfile') : null;

  useEffect(() => {
    if (!jobSeekerProfileDocRef) return;

    const fetchProfile = async () => {
      setIsLoading(true);
      setMessage(''); // Clear previous messages
      try {
        const docSnap = await getDoc(jobSeekerProfileDocRef);
        if (docSnap.exists()) {
          setJobSeekerProfile(docSnap.data());
          setHasProfile(true);
        } else {
          setHasProfile(false);
          // Differentiate: If doc doesn't exist, it's not an error, just no profile yet.
          setMessage("Your profile is empty. Please fill it out and save.");
        }
      } catch (error) {
        console.error("Error fetching job seeker profile:", error); // Log the full error
        setMessage(`Failed to load your profile: ${error.message}. Please check console for details.`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [jobSeekerProfileDocRef]);

  const handleProfileChange = (e) => {
    const { id, value } = e.target;
    setJobSeekerProfile((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!jobSeekerProfile.fullName || !jobSeekerProfile.desiredRole || !jobSeekerProfile.skills) {
      setMessage("Please fill in required profile fields (Full Name, Desired Role, Skills).");
      return;
    }

    setIsLoading(true);
    try {
      await setDoc(jobSeekerProfileDocRef, jobSeekerProfile, { merge: true });
      setMessage("Profile saved successfully!");
      setHasProfile(true);
    } catch (error) {
      console.error("Error saving job seeker profile:", error);
      setMessage("Failed to save profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Mock Job Listings
  const mockJobListings = [
    {
      id: 'job1',
      title: 'Senior Frontend Developer',
      company: 'Tech Solutions Inc.',
      location: 'Remote',
      description: 'Seeking an experienced React developer for our dynamic team. Must have 5+ years experience with modern JavaScript frameworks.',
      skills: ['React', 'JavaScript', 'TypeScript', 'Node.js'],
    },
    {
      id: 'job2',
      title: 'AI/ML Engineer',
      company: 'Innovate AI Labs',
      location: 'New York, NY',
      description: 'Join our cutting-edge AI research team. Strong background in Python, machine learning, and deep learning frameworks required.',
      skills: ['Python', 'Machine Learning', 'TensorFlow', 'PyTorch', 'Data Science'],
    },
    {
      id: 'job3',
      title: 'Product Manager',
      company: 'Global Innovations',
      location: 'San Francisco, CA',
      description: 'We are looking for a visionary Product Manager to lead our new product line. Experience with agile methodologies and market analysis is a plus.',
      skills: ['Product Management', 'Agile', 'Market Research', 'UX/UI'],
    },
  ];


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-8">
      {message && <MessageBox message={message} onClose={() => setMessage('')} />}
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 max-w-6xl mx-auto border border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8 text-center">Job Seeker Dashboard</h2>
        <p className="text-center text-gray-600 mb-8">
          Manage your profile and explore job opportunities tailored for you.
        </p>

        {/* Profile Management Section */}
        <div className="mb-10 p-6 border border-blue-300 rounded-2xl bg-blue-50 shadow-inner">
          <h3 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            Your Profile
          </h3>
          <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" id="fullName" value={jobSeekerProfile.fullName} onChange={handleProfileChange}
                className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-200" placeholder="Jane Doe" required />
            </div>
            <div>
              <label htmlFor="desiredRole" className="block text-sm font-medium text-gray-700 mb-1">Desired Role</label>
              <input type="text" id="desiredRole" value={jobSeekerProfile.desiredRole} onChange={handleProfileChange}
                className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-200" placeholder="Software Engineer" required />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
              <textarea id="skills" value={jobSeekerProfile.skills} onChange={handleProfileChange} rows="2"
                className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-y transition duration-200" placeholder="JavaScript, React, Node.js" required></textarea>
            </div>
            <div>
              <label htmlFor="experienceYears" className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
              <input type="number" id="experienceYears" value={jobSeekerProfile.experienceYears} onChange={handleProfileChange}
                className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-200" placeholder="3" />
            </div>
            <div>
              <label htmlFor="resumeLink" className="block text-sm font-medium text-gray-700 mb-1">Resume Link (e.g., Google Drive)</label>
              <input type="url" id="resumeLink" value={jobSeekerProfile.resumeLink} onChange={handleProfileChange}
                className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-200" placeholder="https://drive.google.com/my-resume" />
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
                  hasProfile ? 'Update Profile' : 'Save Profile'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Job Listings Section */}
        <div className="p-6 border border-purple-300 rounded-2xl bg-purple-50 shadow-inner">
          <h3 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><path d="M17 2v4"></path><path d="M7 2v4"></path><path d="M2 12h20"></path><path d="M9 16h6"></path></svg>
            Job Listings
          </h3>
          {mockJobListings.length === 0 ? (
            <p className="text-center text-gray-600 text-lg">No job listings available at the moment.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mockJobListings.map((job) => (
                <div key={job.id} className="bg-white p-5 rounded-lg shadow-md border border-gray-200 transform transition duration-300 hover:scale-103 hover:shadow-lg">
                  <h4 className="text-xl font-semibold text-gray-800 mb-2">{job.title}</h4>
                  <p className="text-gray-600 mb-1"><span className="font-medium">Company:</span> {job.company}</p>
                  <p className="text-gray-600 mb-1"><span className="font-medium">Location:</span> {job.location}</p>
                  <p className="text-gray-700 text-sm mt-3">{job.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {job.skills.map((skill, idx) => (
                      <span key={idx} className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <button className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-5 rounded-full text-sm transition duration-300 shadow-md">
                    Apply Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// --- Main App Component ---
const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [firebaseApp, setFirebaseApp] = useState(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null); // New state for user role
  const [loadingFirebase, setLoadingFirebase] = useState(true);
  const [message, setMessage] = useState('');

  // Define appId and initialAuthToken directly for local development
  // MANDATORY: Use __app_id and __initial_auth_token if available (Canvas environment)
  // Access these global variables directly
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'my-recruitment-app-local';
  const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "AIzaSyC8ovYtPmE5QdeZnNQGTc0I2WfuvqLursM",
    authDomain: "hackathon-99817.firebaseapp.com",
    projectId: "hackathon-99817",
    storageBucket: "hackathon-99817.firebasestorage.app",
    messagingSenderId: "196635937156",
    appId: "1:196635937156:web:5289a52b9787a8493e35d1",
    measurementId: "G-3TLVSX088F"
  };


  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const firebaseAuth = getAuth(app);

        setFirebaseApp(app);
        setDb(firestore);
        setAuth(firebaseAuth);

        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
          if (user) {
            setUserId(user.uid);
            // Fetch user role
            const userRoleDocRef = doc(firestore, `artifacts/${appId}/users/${user.uid}/userProfile`, 'role');
            const docSnap = await getDoc(userRoleDocRef);
            if (docSnap.exists()) {
              setUserRole(docSnap.data().role);
            } else {
              // If role not found, it might be a new user or an existing one without a role defined yet.
              // For now, default to 'recruiter' or prompt for role on first login.
              // For this implementation, we'll default to 'recruiter' if not found,
              // and the LoginPage will set it on registration.
              setUserRole('recruiter');
            }
          } else {
            // If no user, try anonymous sign-in for local testing if no custom token
            try {
              if (initialAuthToken) { // Use custom token if available
                await signInWithCustomToken(firebaseAuth, initialAuthToken);
                setUserId(firebaseAuth.currentUser?.uid);
                // Fetch user role after custom token sign-in
                const userRoleDocRef = doc(firestore, `artifacts/${appId}/users/${firebaseAuth.currentUser.uid}/userProfile`, 'role');
                const docSnap = await getDoc(userRoleDocRef);
                if (docSnap.exists()) {
                  setUserRole(docSnap.data().role);
                } else {
                  setUserRole('recruiter'); // Default if not found
                }
              } else { // Fallback to anonymous sign-in if no custom token
                await signInAnonymously(firebaseAuth);
                setUserId(firebaseAuth.currentUser?.uid || crypto.randomUUID());
                setUserRole('recruiter'); // Default role for anonymous
              }
            } catch (authError) {
              console.error("Firebase Auth Error:", authError);
              setMessage("Authentication failed. Some features may not work.");
              setUserId(crypto.randomUUID()); // Use a random ID if auth fails
              setUserRole(null); // No role if auth fails
            }
          }
          setLoadingFirebase(false);
        });

        return () => unsubscribe(); // Cleanup auth listener
      } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        setMessage("Failed to initialize Firebase. Data persistence may not work.");
        setLoadingFirebase(false);
        setUserId(crypto.randomUUID()); // Fallback to a random ID
        setUserRole(null); // No role if firebase init fails
      }
    };

    if (!firebaseApp) {
      initializeFirebase();
    } else {
      setLoadingFirebase(false);
    }
  }, [firebaseApp, initialAuthToken, firebaseConfig, appId]); // Added appId to dependency array

  const navigate = (page) => {
    setCurrentPage(page);
  };

  const handleLogout = async () => {
    if (auth) {
      try {
        await signOut(auth);
        setUserId(null); // Clear userId on logout
        setUserRole(null); // Clear userRole on logout
        setCurrentPage('login'); // Navigate to login page after logout
        setMessage('Successfully logged out.');
      } catch (error) {
        console.error("Logout error:", error);
        setMessage(`Logout failed: ${error.message}`);
      }
    }
  };

  if (loadingFirebase) {
    return <LoadingSpinner />;
  }

  const renderPage = () => {
    if (!userId || userRole === null) { // Wait for userRole to be determined
      return <LoginPage auth={auth} onLoginSuccess={(role) => {
        setUserId(auth.currentUser?.uid);
        setUserRole(role);
        if (role === 'recruiter') {
          navigate('home');
        } else if (role === 'jobSeeker') {
          navigate('jobSeeker');
        }
      }} setMessage={setMessage} />;
    }

    switch (currentPage) {
      case 'home':
        return <HomePage navigate={navigate} />;
      case 'candidateScreening':
        return <CandidateScreeningPage />;
      case 'biasDetection':
        return <BiasDetectionPage />;
      case 'interviewScheduling':
        return <InterviewSchedulingPage />;
      case 'candidateDashboard':
        return <CandidateDashboardPage />;
      case 'interviewAutomation':
        return <InterviewAutomationPage />;
      case 'jobSeeker':
        return <JobSeekerPage />;
      default:
        // Default based on role if no specific page is set
        return userRole === 'recruiter' ? <HomePage navigate={navigate} /> : <JobSeekerPage />;
    }
  };

  return (
    <AppContext.Provider value={{ firebaseApp, db, auth, userId, appId }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        body {
          font-family: 'Inter', sans-serif;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
      <div className="min-h-screen bg-gray-50">
        {message && <MessageBox message={message} onClose={() => setMessage('')} />}
        {/* Navigation Bar - Only show if authenticated */}
        {userId && userRole && ( // Only show nav if userId and userRole are determined
          <nav className="bg-white shadow-lg p-4 sticky top-0 z-40">
            <div className="container mx-auto flex flex-wrap justify-between items-center">
              <div className="flex items-center space-x-2 mb-2 md:mb-0">
                <span className="text-2xl font-bold text-blue-700">RecruitFlow AI</span>
                {userId && (
                  <span className="text-sm text-gray-500 hidden sm:block">User ID: {userId}</span>
                )}
                 {userRole && (
                  <span className="text-sm text-gray-500 hidden sm:block capitalize">Role: {userRole}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 md:gap-4 justify-center md:justify-end">
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
                {userRole === 'jobSeeker' && (
                  <NavItem onClick={() => navigate('jobSeeker')} isActive={currentPage === 'jobSeeker'}>Job Seeker Dashboard</NavItem>
                )}
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


        {/* Page Content */}
        <main>
          {renderPage()}
        </main>
      </div>
    </AppContext.Provider>
  );
};

const NavItem = ({ children, onClick, isActive }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm font-medium transition duration-300
      ${isActive
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-gray-700 hover:bg-blue-100 hover:text-blue-700'
      }`}
  >
    {children}
  </button>
);

export default App;

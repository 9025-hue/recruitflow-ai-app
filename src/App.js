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
const firebaseConfig = {
  apiKey: "AIzaSyC8ovYtPmE5QdeZnNQGTc0I2WfuvqLursM",
  authDomain: "hackathon-99817.firebaseapp.com",
  projectId: "hackathon-99817",
  storageBucket: "hackathon-99817.appspot.com",
  messagingSenderId: "196635937156",
  appId: "1:196635937156:web:5289a52b9787a8493e35d1",
  measurementId: "G-3TLVSX088F"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// AppContext provides Firebase instances and user-related states to child components
const AppContext = createContext(null);

// Custom hook to easily access the AppContext
const useAppContext = () => useContext(AppContext);

// --- Utility Components ---
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600 border-opacity-75"></div>
  </div>
);

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

// ... (keep all other existing components like FeatureCard, DashboardCard, etc.)

/**
 * Main App component with updated authentication and profile handling
 */
const App = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('login');
  const [message, setMessage] = useState('');
  const [userRole, setUserRole] = useState(null);
  const appId = firebaseConfig.appId.split(':')[2];

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Try to sign in with custom token if available
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          // Fallback to anonymous authentication
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Initial authentication error:", error);
        setMessage(`Authentication error: ${error.message}`);
      }
    };

    initializeAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        try {
          const userProfileRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/userProfile`, 'profile');
          const userProfileSnap = await getDoc(userProfileRef);

          let role = 'recruiter'; // Default role
          
          if (userProfileSnap.exists()) {
            // Use existing role if profile exists
            role = userProfileSnap.data().role || 'recruiter';
          } else {
            // Create new profile with default role if doesn't exist
            await setDoc(userProfileRef, {
              email: currentUser.email || '',
              role: role,
              name: currentUser.displayName || '',
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }

          setUserRole(role);
          setCurrentPage(role === 'recruiter' ? 'home' : 'jobSeeker');
        } catch (error) {
          console.error("Profile access error:", error);
          setMessage(`Profile error: ${error.message}`);
          setCurrentPage('login');
        }
      } else {
        setUser(null);
        setUserRole(null);
        setCurrentPage('login');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [appId]);

  const navigate = (page) => {
    setCurrentPage(page);
  };

  const handleLoginSuccess = (role) => {
    setUserRole(role);
    setMessage('Logged in successfully!');
    navigate(role === 'recruiter' ? 'home' : 'jobSeeker');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMessage('Logged out successfully!');
      navigate('login');
    } catch (error) {
      console.error("Logout error:", error);
      setMessage(`Logout failed: ${error.message}`);
    }
  };

  // ... (keep all other existing component functions like renderPage, NavItem, etc.)

  return (
    <AppContext.Provider value={{ app, auth, db, userId: user?.uid, appId, setMessage }}>
      <div className="min-h-screen bg-gray-100 font-sans antialiased">
        {message && <MessageBox message={message} onClose={() => setMessage('')} />}

        {user && (
          <nav className="bg-white shadow-lg py-4 px-6 fixed w-full z-10 top-0">
            <div className="container mx-auto flex justify-between items-center">
              <div className="text-2xl font-bold text-blue-700">RecruitFlow AI</div>
              <div className="flex space-x-4">
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
                  <>
                    <NavItem onClick={() => navigate('jobSeeker')} isActive={currentPage === 'jobSeeker'}>Dashboard</NavItem>
                    <NavItem onClick={() => navigate('jobSeekerProfile')} isActive={currentPage === 'jobSeekerProfile'}>Profile</NavItem>
                    <NavItem onClick={() => navigate('jobSeekerInterviewPrep')} isActive={currentPage === 'jobSeekerInterviewPrep'}>Interview Prep</NavItem>
                  </>
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

        <main className={user ? 'pt-20' : ''}>
          {isLoading ? (
            <LoadingSpinner />
          ) : !user ? (
            <LoginPage auth={auth} onLoginSuccess={handleLoginSuccess} setMessage={setMessage} />
          ) : (
            (() => {
              switch (currentPage) {
                case 'home': return <HomePage navigate={navigate} />;
                case 'candidateScreening': return userRole === 'recruiter' ? <CandidateScreeningPage /> : <AccessDenied />;
                case 'biasDetection': return userRole === 'recruiter' ? <BiasDetectionPage /> : <AccessDenied />;
                case 'interviewScheduling': return userRole === 'recruiter' ? <InterviewSchedulingPage /> : <AccessDenied />;
                case 'candidateDashboard': return userRole === 'recruiter' ? <CandidateDashboardPage /> : <AccessDenied />;
                case 'interviewAutomation': return userRole === 'recruiter' ? <InterviewAutomationPage /> : <AccessDenied />;
                case 'jobSeeker': return userRole === 'jobSeeker' ? <JobSeekerDashboardPage navigate={navigate} /> : <AccessDenied />;
                case 'jobSeekerProfile': return userRole === 'jobSeeker' ? <JobSeekerProfilePage /> : <AccessDenied />;
                case 'jobSeekerInterviewPrep': return userRole === 'jobSeeker' ? <JobSeekerInterviewPrepPage /> : <AccessDenied />;
                case 'login': return <LoginPage auth={auth} onLoginSuccess={handleLoginSuccess} setMessage={setMessage} />;
                default: return userRole === 'recruiter' ? <HomePage navigate={navigate} /> : <JobSeekerDashboardPage navigate={navigate} />;
              }
            })()
          )}
        </main>
      </div>
    </AppContext.Provider>
  );
};

const AccessDenied = () => (
  <div className="p-8 text-red-600 text-center">
    Access Denied: You don't have permission to view this page.
  </div>
);

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
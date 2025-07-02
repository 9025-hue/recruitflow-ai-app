// src/LoginPage.js
import React, { useState } from 'react';
import { LogIn, UserPlus, Users, UserCheck } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth'; // Import Firebase auth function
import { auth } from './firebase'; // Import your initialized Firebase auth instance

const LoginPage = ({ onLogin, onGoToSignUp }) => {
  const [userType, setUserType] = useState('recruiter'); // This will still determine the 'role'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => { // Make function async
    e.preventDefault();
    setError('');

    try {
      // Use Firebase to sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User signed in successfully:', user.email);

      // Here's the trickier part for roles:
      // Firebase doesn't inherently store 'roles' like recruiter/jobseeker.
      // You have a few options:
      // 1. Store roles in a Firestore/Realtime Database collection
      // 2. Store roles in Firebase Custom Claims (more advanced, for backend/admin SDK)
      // 3. For a simple demo, you could use email domain or a hardcoded check (less secure/scalable)

      // Option 1 (Recommended for proper roles): Fetch role from a database
      // For now, we'll keep the dummy role check for simplicity in this example.
      // In a real app, after a successful login, you'd query your database
      // (e.g., Firestore 'users' collection) using `user.uid` to get their role.
      // Example (pseudo-code):
      // const userDoc = await getDoc(doc(db, "users", user.uid));
      // if (userDoc.exists()) {
      //   const userData = userDoc.data();
      //   onLogin(userData.role);
      // } else {
      //   setError("User data not found. Please contact support.");
      //   await auth.signOut(); // Log them out if no role found
      // }

      // Dummy role assignment (for now, assuming a specific email implies a role)
      if (email.includes('recruiter')) {
        onLogin('recruiter');
      } else if (email.includes('jobseeker')) {
        onLogin('jobseeker');
      } else {
        // Fallback or default role, or prompt for role selection on first login
        onLogin('jobseeker'); // Default to jobseeker if not explicitly recruiter
      }

    } catch (error) {
      console.error('Firebase Login Error:', error.code, error.message);
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('Invalid email or password.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/user-disabled':
          setError('Your account has been disabled.');
          break;
        default:
          setError('Login failed. Please try again later.');
          break;
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          {/* User type buttons can still be used for initial role preference during sign up or just for display */}
          <div className="mt-6 flex justify-center space-x-4">
            <button
              onClick={() => setUserType('recruiter')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                userType === 'recruiter' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="inline h-4 w-4 mr-2" /> Recruiter
            </button>
            <button
              onClick={() => setUserType('jobseeker')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                userType === 'jobseeker' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <UserCheck className="inline h-4 w-4 mr-2" /> Job Seeker
            </button>
          </div>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <LogIn className="h-5 w-5 text-blue-300 group-hover:text-white transition-colors" />
              </span>
              Sign In
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); onGoToSignUp(); }} className="font-medium text-blue-600 hover:text-blue-500">
                Sign Up
              </a>
            </p>
            {/* Remove dummy credentials reminder as we are now using Firebase */}
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
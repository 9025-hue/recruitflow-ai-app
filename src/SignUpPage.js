// src/SignUpPage.js
import React, { useState } from 'react';
import { UserPlus, ArrowLeft, Users, UserCheck } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth'; // Import Firebase auth function
import { auth } from './firebase'; // Import your initialized Firebase auth instance
// If you want to store user roles/additional data, you'd also need Firestore:
// import { doc, setDoc } from 'firebase/firestore';
// import { db } from './firebase'; // Assuming you exported db from firebase.js

const SignUpPage = ({ onRegisterSuccess, onGoBackToLogin }) => {
  const [userType, setUserType] = useState('recruiter'); // Recruiter or Job Seeker
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e) => { // Make function async
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      // Use Firebase to create a new user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User registered successfully:', user.email, 'UID:', user.uid);

      // --- Important for roles ---
      // After a user registers with Firebase Auth, you typically want to store
      // additional user information (like their role: recruiter/jobseeker)
      // in a database like Firebase Firestore.

      // Example with Firestore (if you uncommented Firestore imports in firebase.js):
      // await setDoc(doc(db, "users", user.uid), {
      //   email: user.email,
      //   role: userType, // Store the selected role
      //   createdAt: new Date()
      // });
      // console.log("User role saved to Firestore.");

      // For this example, we'll just proceed as if the role is noted.
      alert(`Registration successful for ${email} as ${userType}! Please sign in.`);
      onRegisterSuccess(); // Call the callback to switch back to login page

    } catch (error) {
      console.error('Firebase Registration Error:', error.code, error.message);
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError('This email address is already in use.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/weak-password':
          setError('Password should be at least 6 characters.');
          break;
        default:
          setError('Registration failed. Please try again.');
          break;
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create Your Account
          </h2>
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
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address-signup" className="sr-only">Email address</label>
              <input
                id="email-address-signup"
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
              <label htmlFor="password-signup" className="sr-only">Password</label>
              <input
                id="password-signup"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password-signup" className="sr-only">Confirm Password</label>
              <input
                id="confirm-password-signup"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <UserPlus className="h-5 w-5 text-green-300 group-hover:text-white transition-colors" />
              </span>
              Register New Account
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); onGoBackToLogin(); }}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign In
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUpPage;
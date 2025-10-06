import { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { auth } from '../firebase';
import { toast } from 'react-hot-toast';
import { LogIn, LogOut, UserPlus, User as UserIcon } from 'lucide-react';

interface AuthProps {
  currentUser: User | null;
}

export const Auth: React.FC<AuthProps> = ({ currentUser }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showAuthForm, setShowAuthForm] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Logged in successfully');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Account created successfully');
      }
      setShowAuthForm(false);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error(error.message || 'Logout failed');
    }
  };

  return (
    <div className="auth-container">
      {currentUser ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <UserIcon size={16} />
            <span className="text-sm">{currentUser.email?.split('@')[0]}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1 px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      ) : (
        <div>
          {showAuthForm ? (
            <div className="auth-form bg-white p-4 rounded shadow-lg absolute right-0 top-12 z-10 w-64">
              <form onSubmit={handleAuth}>
                <h3 className="text-lg font-medium mb-3">
                  {isLoginMode ? 'Login' : 'Sign Up'}
                </h3>
                <div className="mb-3">
                  <label className="block text-sm mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-sm mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                    required
                  />
                </div>
                <div className="flex justify-between items-center">
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    {isLoginMode ? 'Login' : 'Sign Up'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLoginMode(!isLoginMode)}
                    className="text-sm text-blue-500"
                  >
                    {isLoginMode ? 'Create account' : 'Login instead'}
                  </button>
                </div>
              </form>
              <button 
                onClick={() => setShowAuthForm(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsLoginMode(true);
                  setShowAuthForm(true);
                }}
                className="flex items-center gap-1 px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                <LogIn size={14} />
                Login
              </button>
              <button
                onClick={() => {
                  setIsLoginMode(false);
                  setShowAuthForm(true);
                }}
                className="flex items-center gap-1 px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
              >
                <UserPlus size={14} />
                Sign Up
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Auth;
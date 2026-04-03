import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../utils/authStore";
import { LogIn, Eye, EyeOff } from "lucide-react";

export function Login() {
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.signIn);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Password validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12">
      <div className="mx-auto max-w-md">
        <div className="flex justify-center">
          <LogIn className="h-12 w-12 text-indigo-600" />
        </div>

        <h2 className="mt-6 text-center text-3xl font-bold">
          Sign in to your account
        </h2>

        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded bg-red-100 p-3 text-red-600">{error}</div>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border p-2"
              autoComplete="email"
              required
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border p-2 pr-10"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-2 right-2 text-gray-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded py-2 text-white ${
                loading
                  ? "cursor-not-allowed bg-indigo-400"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">New to AI Quiz Maker?</p>

            <Link
              to="/register"
              className="mt-3 block text-indigo-600 hover:underline"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CreateQuiz } from "./components/CreateQuiz";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { AuthLayout } from "./components/AuthLayout";
import { TakeQuiz } from "./components/TakeQuiz";
import { EditQuiz } from "./components/EditQuiz";
import { Dashboard } from "./components/Dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-quiz" element={<CreateQuiz />} />
          <Route path="/quiz/:id" element={<TakeQuiz />} />
          <Route path="/quiz/:id/edit" element={<EditQuiz />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

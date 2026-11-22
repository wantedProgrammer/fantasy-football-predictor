import { useState } from "react";
import { useMutation } from "@apollo/client";
import { useNavigate, Link } from "react-router-dom";

import { REGISTER } from "../graphql/auth";
import logo from "../assets/logo.svg";

export default function Register() {
  const navigate = useNavigate();

  const [register, { loading }] = useMutation(REGISTER);

  const [form, setForm] = useState({
    name: "",
    surname: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");

  function updateField(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function submit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");

    if (
      !form.name ||
      !form.surname ||
      !form.email ||
      !form.mobile ||
      !form.password
    ) {
      setError("Please complete all fields.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!/^0\d{9}$/.test(form.mobile)) {
      setError(
        "Mobile number must start with 0 and contain 10 digits."
      );
      return;
    }

    if (
      !/(?=.*[A-Z]).{6,}/.test(form.password)
    ) {
      setError(
        "Password must be at least 6 characters and contain one uppercase letter."
      );
      return;
    }

    try {
      await register({
        variables: {
          input: {
            name: form.name,
            surname: form.surname,
            email: form.email,
            mobile: form.mobile,
            password: form.password,
          },
        },
      });

      alert("Registration successful!");

      navigate("/login");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration failed. Please try again."
      );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-700 via-emerald-500 to-sky-700 p-6">

      <div className="bg-white shadow-2xl rounded-3xl w-full max-w-md p-8">

        <img
          src={logo}
          alt="Fantasy Predictor"
          className="mx-auto mb-4 h-16 w-16"
        />

        <h1 className="text-3xl font-bold text-center text-slate-900">
          Create Account
        </h1>

        <p className="mt-2 mb-6 text-center text-sm text-slate-500">
          Get gameweek-by-gameweek team predictions for FPL and the
          Champions League.
        </p>

        <form
          onSubmit={submit}
          className="space-y-4"
        >

          <input
            name="name"
            placeholder="First Name"
            className="w-full border rounded-lg p-3"
            onChange={updateField}
          />

          <input
            name="surname"
            placeholder="Surname"
            className="w-full border rounded-lg p-3"
            onChange={updateField}
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full border rounded-lg p-3"
            onChange={updateField}
          />

          <input
            name="mobile"
            placeholder="Mobile"
            className="w-full border rounded-lg p-3"
            onChange={updateField}
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            className="w-full border rounded-lg p-3"
            onChange={updateField}
          />

          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            className="w-full border rounded-lg p-3"
            onChange={updateField}
          />

          {error && (
            <p className="text-red-500 text-sm">
              {error}
            </p>
          )}

          <button
            disabled={loading}
            className="w-full bg-emerald-600 text-white rounded-lg p-3 font-semibold hover:bg-emerald-700"
          >
            {loading
              ? "Creating..."
              : "Register"}
          </button>

        </form>

        <p className="text-center mt-5">

          Already have an account?

          <Link
            to="/login"
            className="text-emerald-700 ml-2"
          >
            Login
          </Link>

        </p>

      </div>

    </div>
  );
}
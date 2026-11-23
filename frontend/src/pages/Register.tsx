import { useState } from "react";
import { useMutation } from "@apollo/client";
import { useNavigate, Link } from "react-router-dom";

import { REGISTER } from "../graphql/auth";
import AuthShell, { FieldLabel, FormError, primaryButton } from "../components/AuthShell";

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

  const fields: {
    name: keyof typeof form;
    label: string;
    type?: string;
    autoComplete: string;
    placeholder: string;
    half?: boolean;
  }[] = [
    { name: "name", label: "First name", autoComplete: "given-name", placeholder: "Thandi", half: true },
    { name: "surname", label: "Surname", autoComplete: "family-name", placeholder: "Moyo", half: true },
    { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com" },
    { name: "mobile", label: "Mobile number", type: "tel", autoComplete: "tel", placeholder: "0612345678" },
    { name: "password", label: "Password", type: "password", autoComplete: "new-password", placeholder: "6+ characters, one uppercase", half: true },
    { name: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password", placeholder: "Repeat password", half: true },
  ];

  return (
    <AuthShell
      eyebrow="Join the dugout"
      title="Create account"
      subtitle="Get gameweek-by-gameweek team predictions for FPL and the Champions League."
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name} className={field.half ? "" : "sm:col-span-2"}>
            <FieldLabel htmlFor={field.name}>{field.label}</FieldLabel>
            <input
              id={field.name}
              name={field.name}
              type={field.type ?? "text"}
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
              value={form[field.name]}
              onChange={updateField}
              className="field"
            />
          </div>
        ))}

        {error && (
          <div className="sm:col-span-2">
            <FormError message={error} />
          </div>
        )}

        <button type="submit" disabled={loading} className={`${primaryButton} sm:col-span-2`}>
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?
        <Link to="/login" className="ml-1.5 font-medium text-mint hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}

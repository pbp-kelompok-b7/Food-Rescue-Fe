import AuthForm from '../../auth/AuthForm.tsx'

export const meta = () => [{ title: "Daftar akun | Food Rescue" }]

export default function Page() {
  return <AuthForm mode="register" />
}

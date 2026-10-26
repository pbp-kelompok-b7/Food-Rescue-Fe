import AuthForm from '../../auth/AuthForm.tsx'

export const meta = () => [{ title: "Masuk | Food Rescue" }]

export default function Page() {
  return <AuthForm mode="login" />
}

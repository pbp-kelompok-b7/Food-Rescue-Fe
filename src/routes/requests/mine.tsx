import BrowseRequests from '../../pages/requests/BrowseRequests.tsx'

export const meta = () => [{ title: "Request saya | Food Rescue" }]

export default function Page() {
  return <BrowseRequests mine />
}

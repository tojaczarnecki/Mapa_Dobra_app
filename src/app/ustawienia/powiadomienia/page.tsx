import { NotificationSettings } from "@/components/notifications/notification-settings";

export const metadata = { title: "Powiadomienia | Mapa Dobra" };

export default function NotificationSettingsPage() {
  return <main className="public-info-page notification-settings-page">
    <div className="public-info-shell">
      <p className="public-page-eyebrow">MAPA DOBRA</p>
      <h1>Powiadomienia</h1>
      <p className="public-info-lead">Zarządzaj powiadomieniami na tym urządzeniu. Subskrypcja nie wymaga konta.</p>
      <NotificationSettings />
    </div>
  </main>;
}

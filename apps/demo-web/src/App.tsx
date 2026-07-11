import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DemoApiClient } from './api/demo-api-client.js';
import { LandingPage } from './pages/LandingPage.js';
import { IndustryPage } from './pages/IndustryPage.js';
import { QualificationPage } from './pages/QualificationPage.js';
import { BookingConfirmPage } from './pages/BookingConfirmPage.js';
import { BookingConfirmedPage } from './pages/BookingConfirmedPage.js';
import { BookingPage } from './pages/BookingPage.js';
import { InstructionsPage } from './pages/InstructionsPage.js';
import { LiveExperiencePage } from './pages/LiveExperiencePage.js';
import { RecoveryPage } from './pages/RecoveryPage.js';
import { WaitlistConfirmedPage } from './pages/WaitlistConfirmedPage.js';

const demoApiClient = new DemoApiClient();

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo/industry" element={<IndustryPage />} />
        <Route path="/demo/qualify" element={<QualificationPage client={demoApiClient} />} />
        <Route path="/demo/waitlist-confirmed" element={<WaitlistConfirmedPage />} />
        <Route path="/demo/instructions" element={<InstructionsPage />} />
        <Route path="/demo/live" element={<LiveExperiencePage client={demoApiClient} />} />
        <Route path="/demo/booking" element={<BookingPage client={demoApiClient} />} />
        <Route path="/demo/booking/confirm" element={<BookingConfirmPage client={demoApiClient} />} />
        <Route path="/demo/booking/confirmed" element={<BookingConfirmedPage />} />
        <Route path="/demo/recover" element={<RecoveryPage client={demoApiClient} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export { demoApiClient };

import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import AppShell from '@/components/layout/AppShell';
import Dashboard from '@/pages/Dashboard';
import PaperList from '@/pages/PaperList';
import UploadPaper from '@/pages/UploadPaper';
import ReviewQuestions from '@/pages/ReviewQuestions';
import CreateQuestion from '@/pages/CreateQuestion';
import Analytics from '@/pages/Analytics';
import CreateMock from '@/pages/CreateMock';
import History from '@/pages/History';
import Instructions from '@/pages/Instructions';
import ExamScreen from '@/pages/ExamScreen';
import Result from '@/pages/Result';
import ComponentsDemo from '@/pages/ComponentsDemo';
import { Toaster } from '@/components/ui/sonner';
import './styles.css';

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="mocktest-theme">
      <Routes>
        {/* Full-screen realistic exam route without AppShell */}
        <Route path="/exam/:attemptId" element={<ExamScreen />} />

        {/* Regular application pages wrapped in AppShell (Sidebar + Header) */}
        <Route
          path="/*"
          element={
            <AppShell>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/papers" element={<PaperList />} />
                <Route path="/upload" element={<UploadPaper />} />
                <Route path="/review" element={<ReviewQuestions />} />
                <Route path="/create-question" element={<CreateQuestion />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/create-mock" element={<CreateMock />} />
                <Route path="/history" element={<History />} />
                <Route path="/instructions/:mockTestId" element={<Instructions />} />
                <Route path="/result/:attemptId" element={<Result />} />
                <Route path="/components-demo" element={<ComponentsDemo />} />
              </Routes>
            </AppShell>
          }
        />
      </Routes>
      <Toaster richColors closeButton position="top-right" />
    </ThemeProvider>
  );
}

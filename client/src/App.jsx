// App.jsx — Root component with routing

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from "./pages/Home.jsx";
import Room from "./pages/Room.jsx";

export default function App() {
  return (
    <>
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '14px',
            background: '#fff',
            color: '#1e1b4b',
            border: '1px solid #e0d9ff',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(108,92,231,0.15)',
          },
        }}
      />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
// src/app/maintenance/page.tsx
'use client'; // ⚠ Обов'язково, щоб були обробники подій

import React from "react";

export default function MaintenancePage() {
  const handleClick = () => {
    alert("Клікнув!");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Сторінка обслуговування</h1>
      <p className="mb-6 text-gray-700">Сайт тимчасово недоступний через технічне обслуговування.</p>
      <button
        className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        onClick={handleClick}
      >
        Натисни мене
      </button>
    </div>
  );
}

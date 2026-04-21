import { useState } from "react";
import ConvexClientProvider from "./ConvexClientProvider";
import DietaryProfileModal from "./DietaryProfileModal";

function DietaryProfileButtonInner() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-gray-600 hover:text-gray-900 transition"
        title="My Dietary Profile"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </button>
      <DietaryProfileModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export default function DietaryProfileButton() {
  return (
    <ConvexClientProvider>
      <DietaryProfileButtonInner />
    </ConvexClientProvider>
  );
}

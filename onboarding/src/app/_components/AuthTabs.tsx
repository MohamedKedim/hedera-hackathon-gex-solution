interface AuthTabsProps {
  activeTab: 'signin' | 'signup';
  onChange: (tab: 'signin' | 'signup') => void;
}

export default function AuthTabs({ activeTab, onChange }: AuthTabsProps) {
  return (
    <div className="flex border-b">
      <button
        onClick={() => onChange('signin')}
        className={`flex-1 py-4 font-medium transition-colors ${
          activeTab === 'signin'
            ? 'text-indigo-600 border-b-2 border-indigo-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Sign In
      </button>
      <button
        onClick={() => onChange('signup')}
        className={`flex-1 py-4 font-medium transition-colors ${
          activeTab === 'signup'
            ? 'text-indigo-600 border-b-2 border-indigo-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Sign Up
      </button>
    </div>
  );
}

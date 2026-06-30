'use client';

interface AuthBadgeProps {
  user: { email?: string } | null;
  onLogin: () => void;
  onLogout: () => void;
}

export function AuthBadge({ user, onLogin, onLogout }: AuthBadgeProps) {
  return (
    <div className="absolute top-4 right-4">
      {user ? (
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">Logged in as {user.email}</span>
          <button
            onClick={onLogout}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs transition-colors"
          >
            Logout
          </button>
        </div>
      ) : (
        <button
          onClick={onLogin}
          className="px-4 py-2 bg-white text-black rounded-md font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
          Login with Google
        </button>
      )}
    </div>
  );
}
